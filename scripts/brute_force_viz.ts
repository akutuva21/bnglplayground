
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { fileURLToPath } from 'url';
import { parseBNGL } from '../services/parseBNGL';
import { buildContactMap } from '../services/visualization/contactMapBuilder';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const execAsync = promisify(exec);

const BNG2_PATH = String.raw`C:\Users\Achyudhan\anaconda3\envs\Research\Lib\site-packages\bionetgen\bng-win\BNG2.pl`;
const EXAMPLES_DIR = path.resolve(__dirname, '../example-models');
const TEMP_DIR = path.resolve(__dirname, '../temp_bng_output');

if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR);
}

// Robust GraphML parser for BNG contact maps
function parseGraphML(content: string) {
  const nodes: { id: string; label: string; color: string }[] = [];
  const edges: { source: string; target: string }[] = [];

  let pos = 0;
  const stack: any[] = [];

  const getAttr = (tag: string, attr: string) => {
    const match = tag.match(new RegExp(`${attr}="([^"]+)"`));
    return match ? match[1] : null;
  };

  while (pos < content.length) {
    const nextTagStart = content.indexOf('<', pos);
    if (nextTagStart === -1) break;

    const nextTagEnd = content.indexOf('>', nextTagStart);
    if (nextTagEnd === -1) break;

    const tagContent = content.substring(nextTagStart + 1, nextTagEnd);
    const isClosing = tagContent.startsWith('/');
    const tagName = tagContent.split(' ')[0].replace('/', '');

    if (tagName === 'node') {
      if (!isClosing) {
        const id = getAttr(tagContent, 'id');
        if (id) {
          const node = { id, label: '', color: '' };
          nodes.push(node);
          stack.push(node);
        }
      } else {
        stack.pop();
      }
    } else if (tagName === 'y:NodeLabel') {
      if (!isClosing && stack.length > 0) {
        const textEnd = content.indexOf('<', nextTagEnd);
        if (textEnd !== -1) {
          const text = content.substring(nextTagEnd + 1, textEnd).trim();
          stack[stack.length - 1].label = text;
        }
      }
    } else if (tagName === 'y:Fill') {
      if (!isClosing && stack.length > 0) {
        const color = getAttr(tagContent, 'color');
        if (color) stack[stack.length - 1].color = color;
      }
    } else if (tagName === 'edge') {
      if (!isClosing) {
        const source = getAttr(tagContent, 'source');
        const target = getAttr(tagContent, 'target');
        if (source && target) {
          edges.push({ source, target });
        }
      }
    }

    pos = nextTagEnd + 1;
  }

  return { nodes, edges };
}

async function runTest() {
  const files = fs.readdirSync(EXAMPLES_DIR).filter(f => f.endsWith('.bngl'));
  console.log(`Found ${files.length} models.`);

  const results: any[] = [];

  for (const file of files) {
    const filePath = path.join(EXAMPLES_DIR, file);
    const modelName = path.basename(file, '.bngl');

    try {
      // 1. Run BNG2.pl
      const tempFilePath = path.join(TEMP_DIR, file);
      let bnglContentForBNG = fs.readFileSync(filePath, 'utf-8');

      if (!bnglContentForBNG.includes('visualize({type=>"contactmap"})')) {
        if (bnglContentForBNG.includes('end model')) {
          bnglContentForBNG = bnglContentForBNG.replace('end model', 'visualize({type=>"contactmap"})\nend model');
        } else {
          bnglContentForBNG += '\nvisualize({type=>"contactmap"})';
        }
      }

      fs.writeFileSync(tempFilePath, bnglContentForBNG);

      const cmd = `perl "${BNG2_PATH}" "${tempFilePath}"`;
      await execAsync(cmd, { cwd: TEMP_DIR });

      // 2. Parse BNG Output
      const dirFiles = fs.readdirSync(TEMP_DIR);
      const gmlFile = dirFiles.find(f => f.startsWith(modelName) && f.endsWith('.graphml') && f.includes('contactmap'));

      if (!gmlFile) {
        results.push({ name: modelName, status: 'NO_GML' });
        continue;
      }

      const gmlPath = path.join(TEMP_DIR, gmlFile);
      const gmlContent = fs.readFileSync(gmlPath, 'utf-8');
      const bngGraph = parseGraphML(gmlContent);

      // Filter BNG Nodes
      const bngMolecules = bngGraph.nodes.filter(n => n.color.toUpperCase() === '#D2D2D2');
      const bngComponents = bngGraph.nodes.filter(n => n.color.toUpperCase() === '#FFFFFF');
      const bngStates = bngGraph.nodes.filter(n => n.color.toUpperCase() === '#FFCC00');

      // Filter BNG Edges
      const stateNodeIds = new Set(bngStates.map(n => n.id));
      const bngBindingEdges = bngGraph.edges.filter(e => !stateNodeIds.has(e.source) && !stateNodeIds.has(e.target));

      // 3. Run Web Sim Logic
      const bnglContent = fs.readFileSync(filePath, 'utf-8');
      const model = parseBNGL(bnglContent);
      const webGraph = buildContactMap(model.reactionRules, model.moleculeTypes);

      // 4. Compare
      const webMolecules = webGraph.nodes.filter(n => n.type === 'molecule');
      const webComponents = webGraph.nodes.filter(n => n.type === 'component');
      // @ts-ignore
      const webStates = webGraph.nodes.filter(n => n.type === 'state');
      const webEdges = webGraph.edges.filter(e => e.interactionType === 'binding');

      const discrepancy = {
        name: modelName,
        status: 'OK',
        webMols: webMolecules.length,
        bngMols: bngMolecules.length,
        webComps: webComponents.length,
        bngComps: bngComponents.length,
        webStates: webStates.length,
        bngStates: bngStates.length,
        webEdges: webEdges.length,
        bngEdges: bngBindingEdges.length,
      };

      if (discrepancy.webMols !== discrepancy.bngMols ||
        discrepancy.webComps !== discrepancy.bngComps ||
        discrepancy.webStates !== discrepancy.bngStates ||
        discrepancy.webEdges !== discrepancy.bngEdges) {
        discrepancy.status = 'MISMATCH';
        console.log(`MISMATCH ${modelName}: Mols ${discrepancy.webMols}/${discrepancy.bngMols}, Comps ${discrepancy.webComps}/${discrepancy.bngComps}, States ${discrepancy.webStates}/${discrepancy.bngStates}, Edges ${discrepancy.webEdges}/${discrepancy.bngEdges}`);
      }

      results.push(discrepancy);

    } catch (error) {
      console.error(`ERROR ${modelName}:`, error);
      results.push({ name: modelName, status: 'ERROR', error: String(error) });
    }
  }

  // Summary
  console.log('\n--- SUMMARY ---');
  const mismatches = results.filter(r => r.status === 'MISMATCH');
  const errors = results.filter(r => r.status === 'ERROR');
  const noGml = results.filter(r => r.status === 'NO_GML');

  console.log(`Total: ${results.length}`);
  console.log(`Matches: ${results.length - mismatches.length - errors.length - noGml.length}`);
  console.log(`Mismatches: ${mismatches.length}`);
  console.log(`Errors: ${errors.length}`);
  console.log(`No GML: ${noGml.length}`);
}

runTest();
