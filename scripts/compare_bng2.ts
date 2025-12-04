/**
 * Compare our parser output against BNG2.pl reference output (.net files)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { NetworkGenerator } from '../src/services/graph/NetworkGenerator.ts';
import { BNGLParser } from '../src/services/graph/core/BNGLParser.ts';
import { parseBNGL } from '../services/parseBNGL.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

interface BNG2Species {
  index: number;
  pattern: string;
  concentration: string;
}

interface BNG2Reaction {
  index: number;
  reactants: number[];
  products: number[];
  rate: string;
}

interface BNG2Network {
  species: BNG2Species[];
  reactions: BNG2Reaction[];
}

/**
 * Parse a BNG2 .net file to extract species and reactions
 */
function parseBNG2NetFile(content: string): BNG2Network {
  const lines = content.split('\n');
  const species: BNG2Species[] = [];
  const reactions: BNG2Reaction[] = [];
  
  let inSpecies = false;
  let inReactions = false;
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    if (trimmed === 'begin species') {
      inSpecies = true;
      continue;
    }
    if (trimmed === 'end species') {
      inSpecies = false;
      continue;
    }
    if (trimmed === 'begin reactions') {
      inReactions = true;
      continue;
    }
    if (trimmed === 'end reactions') {
      inReactions = false;
      continue;
    }
    
    if (inSpecies && trimmed && !trimmed.startsWith('#')) {
      // Format: index pattern concentration
      const match = trimmed.match(/^\s*(\d+)\s+(\S+)\s+(\S+)/);
      if (match) {
        species.push({
          index: parseInt(match[1]),
          pattern: match[2],
          concentration: match[3]
        });
      }
    }
    
    if (inReactions && trimmed && !trimmed.startsWith('#')) {
      // Format: index reactant_indices product_indices rate
      // e.g., "1 1,2 3 kf"
      const match = trimmed.match(/^\s*(\d+)\s+([0-9,]+)\s+([0-9,]+)\s+(.+)/);
      if (match) {
        reactions.push({
          index: parseInt(match[1]),
          reactants: match[2].split(',').map(Number),
          products: match[3].split(',').map(Number),
          rate: match[4].trim()
        });
      }
    }
  }
  
  return { species, reactions };
}

/**
 * Normalize a species string for comparison
 * - Parse molecule and components, then sort them
 */
function normalizeSpecies(pattern: string): string {
  // Parse molecules and sort components within each molecule
  // Format: Mol1(comp1,comp2).Mol2(comp3,comp4)
  try {
    const molecules = pattern.split('.');
    const normalized = molecules.map(mol => {
      const match = mol.match(/^(\w+)\(([^)]*)\)$/);
      if (!match) return mol.toLowerCase();
      const [, name, compsStr] = match;
      const comps = compsStr.split(',').map(c => c.trim()).filter(c => c).sort();
      return `${name.toLowerCase()}(${comps.join(',')})`;
    }).sort();
    return normalized.join('.');
  } catch {
    return pattern.toLowerCase().replace(/\s+/g, '');
  }
}

/**
 * Find corresponding BNGL model for a .net file
 */
function findBnglModel(netFile: string): string | null {
  const baseName = path.basename(netFile, '.net');
  
  // Try different name patterns
  const patterns = [
    // temp_test_ModelName_bngl.net -> published-models/**/ModelName.bngl
    baseName.replace(/^temp_test_/, '').replace(/_bngl.*$/, ''),
    // temp_mapk.net -> published-models/**/mapk.bngl
    baseName.replace(/^temp_/, ''),
  ];
  
  const publishedModelsDir = path.join(ROOT_DIR, 'published-models');
  
  function searchDir(dir: string, targetName: string): string | null {
    const items = fs.readdirSync(dir, { withFileTypes: true });
    for (const item of items) {
      const fullPath = path.join(dir, item.name);
      if (item.isDirectory()) {
        const found = searchDir(fullPath, targetName);
        if (found) return found;
      } else if (item.name.toLowerCase() === targetName.toLowerCase() + '.bngl') {
        return fullPath;
      }
    }
    return null;
  }
  
  for (const pattern of patterns) {
    const found = searchDir(publishedModelsDir, pattern);
    if (found) return found;
  }
  
  return null;
}

interface ComparisonResult {
  netFile: string;
  bnglFile: string | null;
  bng2Species: number;
  ourSpecies: number;
  bng2Reactions: number;
  ourReactions: number;
  speciesMatch: boolean;
  reactionsMatch: boolean;
  speciesDiff: string[];
  error?: string;
}

async function compareModel(netFilePath: string): Promise<ComparisonResult> {
  const netFileName = path.basename(netFilePath);
  console.log(`\nComparing ${netFileName}...`);
  
  const result: ComparisonResult = {
    netFile: netFileName,
    bnglFile: null,
    bng2Species: 0,
    ourSpecies: 0,
    bng2Reactions: 0,
    ourReactions: 0,
    speciesMatch: false,
    reactionsMatch: false,
    speciesDiff: []
  };
  
  try {
    // Parse BNG2 .net file
    const netContent = fs.readFileSync(netFilePath, 'utf8');
    const bng2Network = parseBNG2NetFile(netContent);
    result.bng2Species = bng2Network.species.length;
    result.bng2Reactions = bng2Network.reactions.length;
    
    // Find corresponding BNGL model
    const bnglPath = findBnglModel(netFilePath);
    if (!bnglPath) {
      result.error = 'Could not find corresponding BNGL model';
      return result;
    }
    result.bnglFile = path.basename(bnglPath);
    
    // Parse with our parser
    const bnglCode = fs.readFileSync(bnglPath, 'utf8');
    const model = parseBNGL(bnglCode);
    
    const seedSpecies = model.species.map(s => BNGLParser.parseSpeciesGraph(s.name));
    
    const rules = model.reactionRules.flatMap(r => {
      const rate = model.parameters[r.rate] ?? parseFloat(r.rate);
      const reverseRate = r.reverseRate ? (model.parameters[r.reverseRate] ?? parseFloat(r.reverseRate)) : rate;
      const ruleStr = `${r.reactants.join(' + ')} -> ${r.products.join(' + ')}`;
      
      try {
        const forwardRule = BNGLParser.parseRxnRule(ruleStr, rate);
        if (r.constraints && r.constraints.length > 0) {
          forwardRule.applyConstraints(r.constraints, (s) => BNGLParser.parseSpeciesGraph(s));
        }
        
        if (r.isBidirectional) {
          const reverseRuleStr = `${r.products.join(' + ')} -> ${r.reactants.join(' + ')}`;
          const reverseRule = BNGLParser.parseRxnRule(reverseRuleStr, reverseRate);
          return [forwardRule, reverseRule];
        }
        return [forwardRule];
      } catch {
        return [];
      }
    });
    
    const generatorOptions = {
      maxSpecies: 5000,
      maxReactions: 5000,
      maxIterations: model.networkOptions?.maxIter ?? 50,
      maxAgg: model.networkOptions?.maxAgg ?? 50,
      maxStoich: (model.networkOptions?.maxStoich ?? 100) as any,
      partialReturnOnLimit: true
    };
    
    const generator = new NetworkGenerator(generatorOptions);
    const ourNetwork = await generator.generate(seedSpecies, rules, () => {});
    
    result.ourSpecies = ourNetwork.species.length;
    result.ourReactions = ourNetwork.reactions.length;
    
    // Compare species counts
    result.speciesMatch = result.bng2Species === result.ourSpecies;
    result.reactionsMatch = result.bng2Reactions === result.ourReactions;
    
    // Find species differences
    const bng2SpeciesSet = new Set(bng2Network.species.map(s => normalizeSpecies(s.pattern)));
    const ourSpeciesSet = new Set(ourNetwork.species.map(s => normalizeSpecies(s.toString())));
    
    // Species in BNG2 but not in ours
    const missingInOurs: string[] = [];
    for (const s of bng2Network.species) {
      const normalized = normalizeSpecies(s.pattern);
      if (!ourSpeciesSet.has(normalized)) {
        missingInOurs.push(s.pattern);
      }
    }
    
    // Species in ours but not in BNG2
    const extraInOurs: string[] = [];
    for (const s of ourNetwork.species) {
      const normalized = normalizeSpecies(s.toString());
      if (!bng2SpeciesSet.has(normalized)) {
        extraInOurs.push(s.toString());
      }
    }
    
    if (missingInOurs.length > 0) {
      result.speciesDiff.push(`Missing in ours (${missingInOurs.length}): ${missingInOurs.slice(0, 5).join(', ')}${missingInOurs.length > 5 ? '...' : ''}`);
    }
    if (extraInOurs.length > 0) {
      result.speciesDiff.push(`Extra in ours (${extraInOurs.length}): ${extraInOurs.slice(0, 5).join(', ')}${extraInOurs.length > 5 ? '...' : ''}`);
    }
    
  } catch (e: any) {
    result.error = e.message;
  }
  
  return result;
}

async function run() {
  const netFiles = fs.readdirSync(ROOT_DIR)
    .filter(f => f.startsWith('temp_') && f.endsWith('.net'))
    .map(f => path.join(ROOT_DIR, f));
  
  console.log(`Found ${netFiles.length} BNG2 .net files to compare against.\n`);
  
  const results: ComparisonResult[] = [];
  
  for (const netFile of netFiles) {
    const result = await compareModel(netFile);
    results.push(result);
    
    const speciesStatus = result.speciesMatch ? '✅' : (Math.abs(result.bng2Species - result.ourSpecies) <= 2 ? '⚠️' : '❌');
    const reactionsStatus = result.reactionsMatch ? '✅' : (Math.abs(result.bng2Reactions - result.ourReactions) <= 5 ? '⚠️' : '❌');
    
    if (result.error) {
      console.log(`❌ ${result.netFile}: ${result.error}`);
    } else {
      console.log(`${speciesStatus} Species: BNG2=${result.bng2Species} vs Ours=${result.ourSpecies}`);
      console.log(`${reactionsStatus} Reactions: BNG2=${result.bng2Reactions} vs Ours=${result.ourReactions}`);
      if (result.speciesDiff.length > 0) {
        result.speciesDiff.forEach(d => console.log(`   ${d}`));
      }
    }
  }
  
  console.log('\n=== SUMMARY ===');
  const matched = results.filter(r => r.speciesMatch && r.reactionsMatch && !r.error).length;
  const closeMatch = results.filter(r => !r.error && !r.speciesMatch && Math.abs(r.bng2Species - r.ourSpecies) <= 2).length;
  const failed = results.filter(r => r.error).length;
  const mismatch = results.length - matched - closeMatch - failed;
  
  console.log(`Exact match (species & reactions): ${matched}/${results.length}`);
  console.log(`Close match (within 2 species): ${closeMatch}/${results.length}`);
  console.log(`Mismatch: ${mismatch}/${results.length}`);
  console.log(`Errors/Missing: ${failed}/${results.length}`);
  
  // Print detailed mismatches
  const mismatches = results.filter(r => !r.error && !r.speciesMatch);
  if (mismatches.length > 0) {
    console.log('\n=== MISMATCHES ===');
    for (const m of mismatches) {
      console.log(`\n${m.netFile} (${m.bnglFile}):`);
      console.log(`  BNG2: ${m.bng2Species} species, ${m.bng2Reactions} reactions`);
      console.log(`  Ours: ${m.ourSpecies} species, ${m.ourReactions} reactions`);
      m.speciesDiff.forEach(d => console.log(`  ${d}`));
    }
  }
}

run();
