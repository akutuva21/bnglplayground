// src/services/graph/core/BNGLParser.ts
import { Component } from './Component';
import { Molecule } from './Molecule';
import { SpeciesGraph } from './SpeciesGraph';
import { RxnRule } from './RxnRule';

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

    // Split by '.' for molecules
    const moleculeStrings = bnglString.split('.');

    for (const molStr of moleculeStrings) {
      const molecule = this.parseMolecule(molStr.trim());
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

      bondMap.forEach((partners) => {
        if (partners.length === 2) {
          const [p1, p2] = partners;
          graph.addBond(p1.molIdx, p1.compIdx, p2.molIdx, p2.compIdx);
        }
      });
    }

    return graph;
  }

  /**
   * Parse a BNGL molecule string
   * Example: "A(b!1,c~P)" -> Molecule with name A, components b (bonded) and c (phosphorylated)
   */
  static parseMolecule(molStr: string): Molecule {
    const match = molStr.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*(?:\(([^)]*)\))?\s*$/);
    if (!match) {
      // Molecule without components, e.g., "A"
      return new Molecule(molStr, []);
    }

    const name = match[1];
    const componentStr = match[2] || '';

    if (!componentStr.trim()) {
      return new Molecule(name, [], undefined, true);
    }

    const components: Component[] = [];
    const compStrings = componentStr.split(',');

    for (const compStr of compStrings) {
      const component = this.parseComponent(compStr.trim());
      components.push(component);
    }

    return new Molecule(name, components);
  }

  /**
   * Parse a BNGL component string
   * Examples: "b!1" (bonded), "c~P" (state), "d" (unbound)
   */
  static parseComponent(compStr: string): Component {
    const parts = compStr.split('!');
    const nameAndStates = parts[0].trim();
    const bondPart = parts[1];
    const stateParts = nameAndStates.split('~');
    const name = stateParts[0];
    const states = stateParts.slice(1);
    const component = new Component(name, states);
    if (states.length > 0) component.state = states[0];
    if (bondPart) {
      if (bondPart === '+' || bondPart === '?') {
        component.wildcard = bondPart;
      } else {
        const bond = parseInt(bondPart);
        if (!isNaN(bond)) {
          component.edges.set(bond, -1);
        }
      }
    }
    return component;
  }

  /**
   * Parse a BNGL reaction rule string into RxnRule
   * Example: "A(b) + B(a) -> A(b!1).B(a!1)"
   */
  static parseRxnRule(ruleStr: string, rateConstant: number, name?: string): RxnRule {
    // Handle bond formation operators !+
    let processedRuleStr = ruleStr;
    let bondCounter = 1;
    while (processedRuleStr.includes('!+')) {
      processedRuleStr = processedRuleStr.replace('!+', `!${bondCounter}`);
      bondCounter++;
    }

    // Detect arrow robustly (->, <-, <->, ~>) and split around the first arrow
    const arrowRegex = /(?:<->|->|<-|~>)/;
    const arrowMatch = processedRuleStr.match(arrowRegex);
    if (!arrowMatch) throw new Error(`Invalid rule (no arrow found): ${ruleStr}`);
  const parts = processedRuleStr.split(arrowRegex).map(p => p.trim()).filter(Boolean);
    if (parts.length < 2) throw new Error(`Invalid rule: ${ruleStr}`);

    const reactantsStr = parts[0];
    const productsStr = parts.slice(1).join(' ');

    // parseEntityList: split top-level entities by '+' or by multiple spaces, respecting parentheses depth
    const parseEntityList = (segment: string) => {
      if (!segment || !segment.trim()) return [] as string[];

      // First split on top-level '+' or runs of 2+ spaces (common alternate separator)
      const topLevelCandidates = segment.split(/\s*\+\s*|(?<=\S)\s{2,}(?=\S)/).map(s => s.trim()).filter(Boolean);

      const parts: string[] = [];
      for (const cand of topLevelCandidates) {
        let current = '';
        let depth = 0;
        for (let i = 0; i < cand.length; i++) {
          const ch = cand[i];
          if (ch === '(' || ch === '[' || ch === '{') depth++;
          else if (ch === ')' || ch === ']' || ch === '}') depth = Math.max(0, depth - 1);

          // Keep commas inside parentheses; top-level commas are not used to separate entities here
          // We only split on '+'/multi-space at the top level via the initial split above.
          current += ch;
        }
        if (current.trim()) parts.push(current.trim());
      }

      // As a fallback, if no splits found and segment contains whitespace separators (single spaces) that likely separate molecules,
      // attempt a more permissive split: split on single space when depth==0 and next token looks like a molecule name.
      if (parts.length === 1 && parts[0].includes(' ') ) {
        const moreParts: string[] = [];
        let cur = '';
        let d = 0;
        for (let i = 0; i < segment.length; i++) {
          const ch = segment[i];
          if (ch === '(') d++;
          else if (ch === ')') d = Math.max(0, d - 1);
          if (d === 0 && ch === ' ') {
            if (cur.trim()) moreParts.push(cur.trim());
            cur = '';
            // skip subsequent spaces
            while (i + 1 < segment.length && segment[i + 1] === ' ') i++;
            continue;
          }
          cur += ch;
        }
        if (cur.trim()) moreParts.push(cur.trim());
        if (moreParts.length > 1) return moreParts;
      }

      return parts;
    };

    const reactants = parseEntityList(reactantsStr).map(s => this.parseSpeciesGraph(s.trim(), true));
    const products = parseEntityList(productsStr).map(s => this.parseSpeciesGraph(s.trim(), false));

    // For now, assume no transformations (deleteBonds, addBonds, etc.)
    // TODO: Parse transformations from rule string

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
      const m = line.match(/^\s*(\S+(?:\([^)]*\))?(?:\.\S+(?:\([^)]*\))?)*)\s+(.+)$/);
      if (!m) continue;
      const speciesStr = m[1].trim();
      const amountExpr = m[2].trim();
      console.log('[parseSeedSpecies] Species:', speciesStr, 'Amount expr:', amountExpr);
      const amt = this.evaluateExpression(amountExpr, parameters);
      console.log('[parseSeedSpecies] Evaluated to:', amt);
      seed.set(speciesStr, amt);
    }
    return seed;
  }

  /**
   * Evaluate mathematical expressions with parameter substitution
   */
  static evaluateExpression(expr: string, parameters: Map<string, number>): number {
    try {
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

      console.log(`[evaluateExpression] "${expr}" => "${evaluable}"`);

      // Use Function constructor for safe evaluation
      const result = new Function(`return ${evaluable}`)();
      return typeof result === 'number' && !isNaN(result) ? result : 0;
    } catch (e) {
      console.error(`[evaluateExpression] Failed to evaluate: "${expr}"`, e);
      return 0;
    }
  }
}