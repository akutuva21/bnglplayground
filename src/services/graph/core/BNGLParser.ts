import { Component } from './Component.ts';
import { Molecule } from './Molecule.ts';
import { SpeciesGraph } from './SpeciesGraph.ts';
import { RxnRule } from './RxnRule.ts';

const shouldLogParser = false;


/**
 * Parser for BNGL strings to graph structures
 * Mirrors BioNetGen parsing logic
 */
export class BNGLParser {
  /**
   * Parse a BNGL species string into SpeciesGraph
   * Example: "A(b!1).B(a!1)" -> SpeciesGraph with two molecules connected by bond 1
   */
  static parseSpeciesGraph(bnglString: string, resolveBonds: boolean = true): SpeciesGraph {
    const graph = new SpeciesGraph();

    if (!bnglString.trim()) return graph;

    // Handle global compartment prefix like @nuc:A.B
    let globalCompartment: string | undefined;
    let content = bnglString.trim();

    const prefixMatch = content.match(/^@([A-Za-z0-9_]+):(.+)$/);
    if (prefixMatch) {
      globalCompartment = prefixMatch[1];
      content = prefixMatch[2];
      graph.compartment = globalCompartment;
    }

    // Helper to split by dot outside parentheses
    const splitMolecules = (str: string) => {
      const parts: string[] = [];
      let current = '';
      let depth = 0;
      for (let i = 0; i < str.length; i++) {
        const char = str[i];
        if (char === '(') depth++;
        else if (char === ')') depth--;
        else if (char === '.' && depth === 0) {
          parts.push(current);
          current = '';
          continue;
        }
        current += char;
      }
      if (current) parts.push(current);
      return parts;
    };

    const moleculeStrings = splitMolecules(content);

    for (const molStr of moleculeStrings) {
      const molecule = this.parseMolecule(molStr.trim());
      // If global compartment is set and molecule doesn't have one, inherit it
      if (globalCompartment && !molecule.compartment) {
        molecule.compartment = globalCompartment;
      }
      graph.molecules.push(molecule);
    }

    // Resolve bonds: connect components with same bond label
    if (resolveBonds) {
      const bondMap = new Map<number, { molIdx: number; compIdx: number }[]>();
      graph.molecules.forEach((mol, molIdx) => {
        mol.components.forEach((comp, compIdx) => {
          for (const bond of comp.edges.keys()) {
            if (!bondMap.has(bond)) bondMap.set(bond, []);
            bondMap.get(bond)!.push({ molIdx, compIdx });
          }
        });
      });

      bondMap.forEach((partners, label) => {
        if (partners.length === 2) {
          const [p1, p2] = partners;
          if (shouldLogParser) {
            // console.log(`[BNGLParser] Adding bond ${label} between ${p1.molIdx}.${p1.compIdx} and ${p2.molIdx}.${p2.compIdx}`);
          }
          graph.addBond(p1.molIdx, p1.compIdx, p2.molIdx, p2.compIdx, label);
        } else {
          if (shouldLogParser) {
            console.warn(`[BNGLParser] Bond ${label} has ${partners.length} partners (expected 2) in string: ${bnglString}`);
          }
        }
      });
    }

    return graph;
  }

  /**
   * Parse a BNGL molecule string
   * Example: "A(b!1,c~P)" -> Molecule with name A, components b (bonded) and c (phosphorylated)
   * Also handles "@comp:Name", "Name@comp", and tags "Name%1"
   */
  static parseMolecule(molStr: string): Molecule {
    if (shouldLogParser && molStr.includes('!+')) console.log(`[BNGLParser] parseMolecule input: '${molStr}'`);
    // Check for prefix notation: @comp:Name...
    let compartment: string | undefined;
    let cleanStr = molStr;

    const prefixMatch = molStr.match(/^@([A-Za-z0-9_]+):(.+)$/);
    if (prefixMatch) {
      compartment = prefixMatch[1];
      cleanStr = prefixMatch[2];
    }

    // Check for suffix notation: Name@comp
    // Be careful not to match inside parentheses
    const suffixMatch = cleanStr.match(/^([^\(]+)@([A-Za-z0-9_]+)(\(.*\))?$/);
    if (suffixMatch) {
      // This regex is simplistic, might need robustness
      // Actually, standard BNGL puts compartment after name before parens? Or after parens?
      // "A@cyt(b)" or "A(b)@cyt"? BioNetGen usually "A@cyt(b)".
      // Let's stick to the simpler regex for now:
    }

    // Parse name and components
    const match = cleanStr.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*(?:\(([^)]*)\))?(?:@([A-Za-z0-9_]+))?\s*$/);
    if (!match) {
      // Molecule without components, e.g., "A"
      return new Molecule(cleanStr, [], compartment);
    }

    const name = match[1];
    const componentStr = match[2] || '';
    const suffixCompartment = match[3];

    if (suffixCompartment) {
      compartment = suffixCompartment;
    }

    if (!componentStr.trim()) {
      return new Molecule(name, [], compartment, true);
    }

    const components: Component[] = [];
    const compStrings = componentStr.split(',');

    for (const compStr of compStrings) {
      const trimmed = compStr.trim();
      // Skip empty component strings (e.g., from double commas like "a,,b")
      if (!trimmed) continue;
      const component = this.parseComponent(trimmed);
      components.push(component);
    }

    return new Molecule(name, components, compartment);
  }

  /**
   * Parse a BNGL component string
   * Examples: "b!1" (bonded), "c~P" (state), "d" (unbound), "x!1!2" (multi-bonded)
   */
  static parseComponent(compStr: string): Component {
    const parts = compStr.split('!');
    const nameAndStates = parts[0].trim();
    const bondParts = parts.slice(1); // ALL bond parts, not just the first one
    const stateParts = nameAndStates.split('~');
    const name = stateParts[0];
    const states = stateParts.slice(1);
    const component = new Component(name, states);
    if (states.length > 0) component.state = states[0];
    
    // Handle ALL bonds (for multi-site bonding like !1!2)
    for (const bondPart of bondParts) {
      if (bondPart === '+' || bondPart === '?' || bondPart === '-') {
        component.wildcard = bondPart;
      } else {
        const bond = parseInt(bondPart);
        if (!isNaN(bond)) {
          component.edges.set(bond, -1);
        }
      }
    }
    if (compStr.includes('!+')) {
       if (shouldLogParser) console.log(`[BNGLParser] Parsing component '${compStr}': wildcard='${component.wildcard}'`);
    }
    return component;
  }

  /**
   * Parse a BNGL reaction rule string into RxnRule
   * Example: "A(b) + B(a) -> A(b!1).B(a!1)"
   * Also handles synthesis rules: "0 -> A()" or "" -> A()
   * Also handles degradation rules: "A() -> 0"
   */
  static parseRxnRule(ruleStr: string, rateConstant: number, name?: string): RxnRule {
    // Detect arrow robustly (->, <-, <->, ~>) and split around the first arrow
    const arrowRegex = /(?:<->|->|<-|~>)/;
    const arrowMatch = ruleStr.match(arrowRegex);
    if (!arrowMatch) throw new Error(`Invalid rule (no arrow found): ${ruleStr}`);
    const parts = ruleStr.split(arrowRegex).map(p => p.trim());
    // Filter but keep track of empty strings for synthesis rules
    const nonEmpty = parts.filter(Boolean);
    if (nonEmpty.length < 1) throw new Error(`Invalid rule: ${ruleStr}`);

    const reactantsStr = parts[0] || '';
    const productsStr = parts.slice(1).join(' ').trim();

    // parseEntityList: split top-level entities by '+' respecting parentheses depth
    const parseEntityList = (segment: string) => {
      if (!segment || !segment.trim()) return [] as string[];

      const parts: string[] = [];
      let current = '';
      let depth = 0;

      for (let i = 0; i < segment.length; i++) {
        const char = segment[i];

        if (char === '(') {
          depth++;
          current += char;
        } else if (char === ')') {
          depth--;
          current += char;
        } else if (depth === 0 && char === '+') {
          // Split on + at top level
          if (current.trim()) parts.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      if (current.trim()) parts.push(current.trim());

      return parts;
    };

    // Handle synthesis rules: "0 -> X" means empty reactants
    let reactantsList = parseEntityList(reactantsStr);
    if (reactantsList.length === 1 && reactantsList[0] === '0') {
      reactantsList = [];
    }

    // Handle degradation rules: "X -> 0" means empty products
    let productsList = parseEntityList(productsStr);
    if (productsList.length === 1 && productsList[0] === '0') {
      productsList = [];
    }

    if (shouldLogParser && reactantsStr.includes('!+')) {
      console.log(`[BNGLParser] parseRxnRule reactantsStr: '${reactantsStr}'`);
      console.log(`[BNGLParser] parseEntityList result:`, JSON.stringify(reactantsList));
    }
    const reactants = reactantsList.map(s => this.parseSpeciesGraph(s.trim(), true));
    const products = productsList.map(s => this.parseSpeciesGraph(s.trim(), true));

    return new RxnRule(name || '', reactants, products, rateConstant);
  }

  /**
   * Convert SpeciesGraph back to BNGL string
   */
  static speciesGraphToString(graph: SpeciesGraph): string {
    return graph.toString();
  }

  /**
   * Convert RxnRule back to BNGL string
   */
  static rxnRuleToString(rule: RxnRule): string {
    const reactants = rule.reactants.map(r => this.speciesGraphToString(r)).join(' + ');
    const products = rule.products.map(p => this.speciesGraphToString(p)).join(' + ');
    return `${reactants} -> ${products}`;
  }

  /**
   * Parse seed species block and evaluate expressions
   */
  static parseSeedSpecies(block: string, parameters: Map<string, number>): Map<string, number> {
    const seed = new Map<string, number>();
    for (const raw of block.split('\n')) {
      const line = raw.split('#')[0].trim();
      if (!line) continue;

      // Split by whitespace
      const parts = line.split(/\s+/);
      if (parts.length < 2) continue;

      const concentrationStr = parts.pop()!;

      // Determine start index for species pattern
      let startIndex = 0;
      if (/^\d+$/.test(parts[0])) {
        // Starts with number (index)
        startIndex = 1;
      } else if (parts[0].endsWith(':')) {
        // Starts with Label:
        startIndex = 1;
      }

      // Join remaining parts to form species pattern
      // Use join('') because BNGL patterns usually don't have spaces, 
      // but if they were split by space, we reconstruct.
      // However, if we have "A . B", split gives "A", ".", "B". join('') gives "A.B". Correct.
      const speciesStr = parts.slice(startIndex).join('');

      const amt = this.evaluateExpression(concentrationStr, parameters);
      seed.set(speciesStr, amt);
    }
    return seed;
  }

  /**
   * Evaluate mathematical expressions with parameter substitution
   * @param expr - The expression to evaluate
   * @param parameters - Map of parameter names to values
   * @param observables - Optional map of observable names (for validation, uses placeholder values)
   * @returns The evaluated number, or NaN if evaluation fails or expression is invalid
   */
  static evaluateExpression(
    expr: string, 
    parameters: Map<string, number>,
    observables?: Map<string, number> | Set<string>
  ): number {
    try {
      // Return NaN for empty or whitespace-only expressions
      if (!expr || expr.trim() === '') {
        return NaN;
      }

      // Replace parameter names with values
      let evaluable = expr;

      // Sort parameters by length (longest first) to avoid partial replacements
      const sortedParams = Array.from(parameters.entries()).sort((a, b) => b[0].length - a[0].length);

      for (const [name, value] of sortedParams) {
        // Use word boundary but allow underscores - escape special regex chars
        const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`\\b${escapedName}\\b`, 'g');
        evaluable = evaluable.replace(regex, value.toString());
      }

      // If observables are provided, replace observable names with placeholder values (1)
      // This allows rate expressions with observables to validate syntactically
      if (observables) {
        const obsNames = observables instanceof Set 
          ? Array.from(observables) 
          : Array.from(observables.keys());
        
        // Sort by length (longest first)
        obsNames.sort((a, b) => b.length - a.length);
        
        for (const name of obsNames) {
          const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const regex = new RegExp(`\\b${escapedName}\\b`, 'g');
          // Use 1 as placeholder to avoid division by zero issues
          evaluable = evaluable.replace(regex, '1');
        }
      }

      // Use Function constructor for safe evaluation
      const result = new Function(`return ${evaluable}`)();
      return typeof result === 'number' && !isNaN(result) ? result : NaN;
    } catch (e) {
      console.error(`[evaluateExpression] Failed to evaluate: "${expr}"`, e);
      return NaN;
    }
  }
}