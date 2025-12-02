import type { BNGLModel } from '../types';
import { BNGLParser } from '../src/services/graph/core/BNGLParser';

export type ParseBNGLOptions = {
  checkCancelled?: () => void;
  debug?: boolean;
};

const speciesPattern = /^[A-Za-z0-9_]+(?:\([^)]*\))?(?:\.[A-Za-z0-9_]+(?:\([^)]*\))?)*$/;

const escapeRegex = (value: string) => {
  const ESCAPE_CODES: Record<number, true> = {
    92: true,
    94: true,
    36: true,
    42: true,
    43: true,
    63: true,
    46: true,
    40: true,
    41: true,
    124: true,
    91: true,
    93: true,
    123: true,
    125: true,
  };

  let result = '';
  for (let i = 0; i < value.length; i++) {
    const codePoint = value.charCodeAt(i);
    if (ESCAPE_CODES[codePoint]) {
      result += '\\';
    }
    result += value[i];
  }
  return result;
};

const cleanLine = (line: string) => {
  if (typeof line !== 'string') return '';
  return line.replace(/#.*$/, '').trim();
};

const extractInlineComment = (line: string) => {
  if (typeof line !== 'string') return undefined;
  const m = line.match(/#(.*)$/);
  if (!m) return undefined;
  return m[1].trim();
};

const parseEntityList = (segment: string) => {
  const parts: string[] = [];
  let current = '';
  let depth = 0;
  for (let i = 0; i < segment.length; i++) {
    const ch = segment[i];
    if (ch === '(') depth++;
    else if (ch === ')') depth--;
    else if (ch === '+' && depth === 0) {
      if (current.trim()) parts.push(current.trim());
      current = '';
      continue;
    }
    current += ch;
  }
  if (current.trim()) parts.push(current.trim());
  return parts;
};

const splitProductsAndRates = (segment: string, parameters: Record<string, number>) => {
  // Improved splitting logic:
  // 1. Tokenize by whitespace
  // 2. Iterate from end to find rate constants
  // Rate constants are typically numbers, parameter names, or expressions.
  // Products are molecule patterns.
  
  const tokens = segment
    .trim()
    .split(/\s+/)
    .filter((token) => token.length > 0);

  if (tokens.length === 0) {
    return { productChunk: '', rateChunk: '' };
  }

  const rateTokens: string[] = [];
  
  // Heuristic: Scan from the end.
  // A token is part of the rate if:
  // - It is a number
  // - It is a known parameter
  // - It contains math operators (*, /, +, -) and NOT molecule syntax (like @, :, . inside parens)
  // - It is a keyword (exclude_reactants, etc.)
  // - It is a comma (separator between forward/reverse rates)
  
  // However, "0" can be a product (degradation) or a rate.
  // If we have "A -> 0 k", "0" is product, "k" is rate.
  // If we have "A -> B k", "B" is product.
  
  // Let's try to identify the boundary.
  // We assume rates are at the end.
  
  let splitIndex = tokens.length;
  
  for (let i = tokens.length - 1; i >= 0; i--) {
      const token = tokens[i];
      const cleaned = token.replace(/,$/, '');
      
      const isNumber = !Number.isNaN(parseFloat(cleaned));
      const isParam = Object.prototype.hasOwnProperty.call(parameters, cleaned);
      const isKeyword = /^(exclude_reactants|include_reactants|DeleteMolecules|MoveMolecules)/.test(cleaned);
      const isMath = /[*/+-]/.test(cleaned) && !/@/.test(cleaned) && !/:/.test(cleaned); // Avoid @comp:Mol
      const isComma = token === ',';
      
      // If it looks like a rate/param/keyword, we include it in rate chunk.
      // If it looks like a molecule (has parens, @, :), it's likely a product.
      // Exception: "0" could be ambiguous.
      
      const looksLikeMolecule = /[():@]/.test(cleaned) || (cleaned.match(/^[A-Za-z0-9_]+$/) && !isParam && !isNumber && !isKeyword);
      
      if (looksLikeMolecule && !isKeyword) {
          // Found a product, stop scanning
          break;
      }
      
      // If it's "0" and it's the ONLY token left, it might be the product "0".
      // But if we have "-> 0 k", then "0" is product.
      // If we have "-> k", then "k" is rate.
      
      splitIndex = i;
  }
  
  // Special case: if splitIndex is 0, it means everything looks like rate tokens.
  // But there might be a product "0".
  // If the first token is "0" and there are other tokens, "0" is likely the product.
  if (splitIndex === 0 && tokens.length > 1 && tokens[0] === '0') {
      splitIndex = 1;
  }
  
  // If splitIndex is tokens.length, no rate found? (e.g. "A -> B") - invalid in BNGL usually
  
  const productTokens = tokens.slice(0, splitIndex);
  const rateChunkTokens = tokens.slice(splitIndex);
  
  return {
      productChunk: productTokens.join(' '),
      rateChunk: rateChunkTokens.join(' ')
  };
};

export function parseBNGL(code: string, options: ParseBNGLOptions = {}): BNGLModel {
  const { checkCancelled, debug } = options;
  const logDebug = (...args: unknown[]) => {
    if (debug) {
      console.log(...args);
    }
  };
  // compartments are parsed later once model is constructed
  const maybeCancel = () => {
    if (checkCancelled) {
      checkCancelled();
    }
  };

  const getBlockContent = (blockName: string, sourceCode: string) => {
    const escapedBlock = escapeRegex(blockName);
    const beginPattern = new RegExp('^\\s*begin\\s+' + escapedBlock + '\\b', 'i');
    const endPattern = new RegExp('^\\s*end\\s+' + escapedBlock + '\\b', 'i');

    const lines = sourceCode.split(/\r?\n/);
    const collected: string[] = [];
    let inBlock = false;

    for (const rawLine of lines) {
      maybeCancel();
      const lineWithoutComments = rawLine.replace(/#.*$/, '').trim();
      if (!inBlock) {
        if (beginPattern.test(lineWithoutComments)) {
          inBlock = true;
        }
        continue;
      }

      if (endPattern.test(lineWithoutComments)) {
        break;
      }

      collected.push(lineWithoutComments);
    }

    return collected.join('\n').trim();
  };

  const model: BNGLModel = {
    parameters: {},
    moleculeTypes: [],
    species: [],
    observables: [],
    reactions: [],
    reactionRules: [],
  } as BNGLModel;

  const paramsContent = getBlockContent('parameters', code);
  if (paramsContent) {
    for (const line of paramsContent.split(/\r?\n/)) {
      maybeCancel();
      const cleaned = cleanLine(line);
      if (cleaned) {
        const parts = cleaned.split(/\s+/);
        if (parts.length >= 2) {
          const value = parseFloat(parts[1]);
          model.parameters[parts[0]] = value;
          logDebug('[parseBNGL] parameter', parts[0], value);
        }
      }
    }
  }

  // Support both "molecule types" and "molecules" blocks
  let molTypesContent = getBlockContent('molecule types', code);
  if (!molTypesContent) {
    molTypesContent = getBlockContent('molecules', code);
  }
  if (molTypesContent) {
    for (const line of molTypesContent.split(/\r?\n/)) {
      maybeCancel();
      const cleaned = cleanLine(line);
        if (cleaned) {
        const match = cleaned.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*(?:\(([^)]*)\))?\s*$/);
        if (match) {
          const name = match[1];
          const componentsStr = match[2] || '';
          const components = componentsStr ? componentsStr.split(',').map((c) => c.trim()).filter(Boolean) : [];
          model.moleculeTypes.push({ name, components, comment: extractInlineComment(line) });
        } else {
          model.moleculeTypes.push({ name: cleaned, components: [], comment: extractInlineComment(line) });
        }
      }
    }
  }

  let speciesContent = getBlockContent('seed species', code);
  if (!speciesContent) {
    speciesContent = getBlockContent('species', code);
  }
  if (speciesContent) {
    const parametersMap = new Map(Object.entries(model.parameters));
    const seedSpeciesMap = BNGLParser.parseSeedSpecies(speciesContent, parametersMap);

    const completeSpeciesName = (partial: string): string => {
      if (partial.includes('.')) {
        return partial
          .split('.')
          .map((m) => completeSpeciesName(m.trim()))
          .join('.');
      }
      // allow optional @Compartment suffix after molecule or after parentheses
      const mm = partial.match(/^([A-Za-z0-9_]+)(\(([^)]*)\))?(?:@([A-Za-z0-9_]+))?$/);
      if (!mm) return partial;
      const name = mm[1];
      const specified = (mm[3] || '').trim();
      const compartment = mm[4];
      if (specified) return `${name}(${specified})${compartment ? `@${compartment}` : ''}`;
      const mt = model.moleculeTypes.find((m) => m.name === name);
      if (!mt) return partial;
      const comps = mt.components.map((c) => {
        const [base, ...states] = c.split('~');
        return states.length ? `${base}~${states[0]}` : base;
      });
      return `${name}(${comps.join(',')})${compartment ? `@${compartment}` : ''}`;
    };

    for (const [s, amt] of seedSpeciesMap.entries()) {
      maybeCancel();
      const completed = completeSpeciesName(s);
      logDebug('[parseBNGL] seed species', s, '=>', completed, amt);
      model.species.push({ name: completed, initialConcentration: amt });
    }
  }

  // Now we can parse compartments once the model has been created and helper functions are available
  const compartmentsContent = getBlockContent('compartments', code);
  if (compartmentsContent) {
    model.compartments = [];
    for (const rawLine of compartmentsContent.split(/\r?\n/)) {
      maybeCancel();
      const cleaned = cleanLine(rawLine);
      if (!cleaned) continue;
      const parts = cleaned.split(/\s+/).filter(Boolean);
      // Expect at least name dim size
      if (parts.length >= 3) {
        const name = parts[0];
        const dimension = parseInt(parts[1], 10) || 3;
        // size may be a parameter name; try to parse float, otherwise 1.0
        const rawSize = parts[2];
        const sizeVal = parseFloat(rawSize);
        const size = Number.isNaN(sizeVal) ? 1.0 : sizeVal;
        const parent = parts[3];
        model.compartments.push({ name, dimension, size, parent });
      }
    }
  }

  const observablesContent = getBlockContent('observables', code);
  if (observablesContent) {
    for (const line of observablesContent.split(/\r?\n/)) {
      maybeCancel();
      const cleaned = cleanLine(line);
        if (cleaned) {
        const parts = cleaned.split(/\s+/);
        if (parts.length >= 2) {
             let type = 'molecules';
             let name = parts[0];
             let pattern = parts.slice(1).join(' ');
             
             if (parts.length >= 3 && (parts[0].toLowerCase() === 'molecules' || parts[0].toLowerCase() === 'species')) {
                 type = parts[0].toLowerCase();
                 name = parts[1];
                 pattern = parts.slice(2).join(' ');
             }
             
             model.observables.push({ type: type as 'molecules' | 'species', name, pattern, comment: extractInlineComment(line) });
        }
      }
    }
  }

  let rulesContent = getBlockContent('reaction rules', code);
  if (!rulesContent) {
    rulesContent = getBlockContent('reactions', code);
  }
  if (rulesContent) {
    const statements: string[] = [];
    let current = '';

    for (const line of rulesContent.split(/\r?\n/)) {
      maybeCancel();
      const cleaned = cleanLine(line);
      if (!cleaned) continue;

      if (cleaned.endsWith('\\')) {
        current += cleaned.slice(0, -1).trim() + ' ';
      } else {
        current += cleaned;
        statements.push(current.trim());
        current = '';
      }
    }

    if (current.trim()) {
      statements.push(current.trim());
    }

    statements.forEach((statement) => {
      maybeCancel();
      let ruleLine = statement;
      let ruleName: string | undefined;
      
      // Check for Label: ...
      const labelMatch = ruleLine.match(/^([^:]+):\s*(.*)$/);
      if (labelMatch) {
        const labelSegment = labelMatch[1].trim();
        if (labelSegment) {
          ruleName = labelSegment;
        }
        ruleLine = labelMatch[2];
      } else {
        // Check for Label ... (no colon, but space separated at start)
        const spaceMatch = ruleLine.match(/^([A-Za-z0-9_]+)\s+(.*)$/);
        if (spaceMatch) {
             const potentialLabel = spaceMatch[1];
             const rest = spaceMatch[2];
             
             // If potentialLabel starts with digit, it's a label
             if (/^\d/.test(potentialLabel)) {
                 ruleName = potentialLabel;
                 ruleLine = rest;
             }
        }
      }

      const arrowRegex = /(?:<->|->|<-|~>|-)/;
      const arrowMatch = ruleLine.match(arrowRegex);
      if (!arrowMatch) {
        console.warn('[parseBNGL] Rule parsing failed - no arrow found:', statement);
        return;
      }
      const arrow = arrowMatch[0];
      const isBidirectional = arrow === '<->' || arrow === '-';

      const arrowIndex = ruleLine.indexOf(arrow);
      if (arrowIndex < 0) {
        console.warn('[parseBNGL] Rule parsing failed - arrow index not found:', statement);
        return;
      }

      const reactantsPart = ruleLine.slice(0, arrowIndex).trim();
      const productsAndRatesPart = ruleLine.slice(arrowIndex + arrow.length).trim();

      const reactants = parseEntityList(reactantsPart);
      if (reactants.length === 0) {
        console.warn('[parseBNGL] Rule parsing: no reactants parsed for:', statement);
        return;
      }

      const { productChunk, rateChunk } = splitProductsAndRates(productsAndRatesPart, model.parameters);
      const rawProducts = productChunk ? parseEntityList(productChunk) : [];
      const products = rawProducts.length === 1 && rawProducts[0] === '0' ? [] : rawProducts;

      // Tokenize rate chunk respecting parentheses to handle function calls like exclude_reactants(2,R)
      // FIX: Split by comma only to preserve math expressions like "2.0 * 602.0"
      const tokenizeRateChunk = (chunk: string) => {
        const tokens: string[] = [];
        let current = '';
        let depth = 0;
        
        for (let i = 0; i < chunk.length; i++) {
          const ch = chunk[i];
          if (ch === '(') depth++;
          else if (ch === ')') depth--;
          
          // Only split on comma at top level
          if (ch === ',' && depth === 0) {
            if (current.trim()) tokens.push(current.trim());
            current = '';
          } else {
            current += ch;
          }
        }
        if (current.trim()) tokens.push(current.trim());
        return tokens;
      };

      const allRateTokens = tokenizeRateChunk(rateChunk);
      
      const constraints: string[] = [];
      const rateConstants: string[] = [];
      
      allRateTokens.forEach(token => {
        if (token.startsWith('exclude_reactants') || token.startsWith('include_reactants')) {
          constraints.push(token);
        } else {
          rateConstants.push(token);
        }
      });

      const forwardRateLabel = rateConstants[0] ?? '';
      const reverseRateLabel = rateConstants[1];

      if (products.length === 0 && forwardRateLabel === '') {
        console.warn('[parseBNGL] Rule parsing: could not determine products or rate for:', statement);
        return;
      }

      model.reactionRules.push({
        name: ruleName,
        reactants,
        products,
        rate: forwardRateLabel,
        isBidirectional,
        reverseRate: isBidirectional ? reverseRateLabel : undefined,
        constraints,
        comment: extractInlineComment(statement),
      });
    });
  }

  const parametersMap = new Map(Object.entries(model.parameters));

  model.reactionRules.forEach((rule) => {
    maybeCancel();
    // FIX: Use evaluateExpression to handle math in rates (e.g. "2.0 * 602.0")
    const forwardRate = BNGLParser.evaluateExpression(rule.rate, parametersMap);
    
    if (!Number.isNaN(forwardRate)) {
      model.reactions.push({
        reactants: rule.reactants,
        products: rule.products,
        rate: rule.rate,
        rateConstant: forwardRate,
      });
    }

    if (rule.isBidirectional && rule.reverseRate) {
      const reverseRate = BNGLParser.evaluateExpression(rule.reverseRate, parametersMap);
      if (!Number.isNaN(reverseRate)) {
        model.reactions.push({
          reactants: rule.products,
          products: rule.reactants,
          rate: rule.reverseRate,
          rateConstant: reverseRate,
        });
      }
    }
  });

  return model;
}