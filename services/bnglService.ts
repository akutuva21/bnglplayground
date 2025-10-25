import { BNGLModel, SimulationResults, SimulationOptions } from '../types';

const workerScript = String.raw`
self.addEventListener('error', (event) => {
    const payload = {
        message: event.message || (event.error && event.error.message) || 'Unknown worker error',
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        stack: event.error && event.error.stack
    };
    try {
        self.postMessage({ id: -1, type: 'worker_internal_error', payload });
    } catch (postError) {
        // Last resort: log to console inside worker
        console.error('Failed to post worker error message', postError);
    }
    event.preventDefault();
});

self.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason || {};
    const payload = {
        message: typeof reason === 'string' ? reason : reason.message || 'Unhandled rejection in worker',
        stack: reason && reason.stack ? reason.stack : undefined
    };
    try {
        self.postMessage({ id: -1, type: 'worker_internal_error', payload });
    } catch (postError) {
        console.error('Failed to post worker rejection', postError);
    }
    event.preventDefault();
});

function parseBNGL(bnglCode) {
    const model = {
        parameters: {},
        moleculeTypes: [],
        species: [],
        observables: [],
        reactions: [],
        reactionRules: []
    };

    const getBlockContent = (blockName, code) => {
        const escapeRegex = (value) => {
            const ESCAPE_CODES = {
                92: true,  // \
                94: true,  // ^
                36: true,  // $
                42: true,  // *
                43: true,  // +
                63: true,  // ?
                46: true,  // .
                40: true,  // (
                41: true,  // )
                124: true, // |
                91: true,  // [
                93: true,  // ]
                123: true, // {
                125: true  // }
            };

            let result = '';
            for (let i = 0; i < value.length; i++) {
                const code = value.charCodeAt(i);
                if (ESCAPE_CODES[code]) {
                    result += '\\\\';
                }
                result += value[i];
            }
            return result;
        };

        const escapedBlock = escapeRegex(blockName);
        const beginPattern = new RegExp('^\\s*begin\\s+' + escapedBlock + '\\b', 'i');
        const endPattern = new RegExp('^\\s*end\\s+' + escapedBlock + '\\b', 'i');

        const lines = code.split(/\r?\n/);
        const collected = [];
        let inBlock = false;

        for (const rawLine of lines) {
            const lineWithoutComments = rawLine.split('#')[0];
            if (!inBlock) {
                if (beginPattern.test(lineWithoutComments)) {
                    inBlock = true;
                }
                continue;
            }

            if (endPattern.test(lineWithoutComments)) {
                break;
            }

            collected.push(rawLine);
        }

        return collected.join('\n').trim();
    };

    const cleanLine = (line) => line.trim().split('#')[0].trim();


    const splitProductsAndRates = (segment, parameters) => {
        const tokens = segment.trim().split(/\s+/);
        if (tokens.length === 0) {
            return { productChunk: '', rateChunk: '' };
        }

        const rateTokens = [];
        // Walk tokens from the right, capturing trailing rate constants while leaving complex species intact.
        while (tokens.length > 0) {
            let token = tokens[tokens.length - 1];
            const cleaned = token.replace(/,$/, '');
            const isParam = Object.prototype.hasOwnProperty.call(parameters, cleaned);
            const numeric = cleaned !== '' && !isNaN(parseFloat(cleaned));
            const singleZeroProduct = tokens.length === 1 && cleaned === '0';
            if ((!isParam && !numeric) || singleZeroProduct) break;

            rateTokens.push(cleaned);
            tokens.pop();
        }

        return {
            productChunk: tokens.join(' ').trim(),
            rateChunk: rateTokens.reverse().join(' ').trim()
        };
    };

    const parseEntityList = (segment) => {
        const parts = [];
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

    // 1. Parse Parameters
    const paramsContent = getBlockContent('parameters', bnglCode);
    if (paramsContent) {
        paramsContent.split(/\r?\n/).forEach(line => {
            const cleaned = cleanLine(line);
            if (cleaned) {
                const parts = cleaned.split(/\s+/);
                if (parts.length >= 2) {
                    model.parameters[parts[0]] = parseFloat(parts[1]);
                }
            }
        });
    }

    // 2. Parse Molecule Types
    const molTypesContent = getBlockContent('molecule types', bnglCode);
    if (molTypesContent) {
        molTypesContent.split(/\r?\n/).forEach(line => {
            const cleaned = cleanLine(line);
            if (cleaned) {
                const match = cleaned.match(/(\\w+)\\((.*?)\\)/);
                if (match) {
                    const name = match[1];
                    const components = match[2].split(',').map(c => c.trim()).filter(Boolean);
                    model.moleculeTypes.push({ name, components });
                } else {
                     model.moleculeTypes.push({ name: cleaned, components: [] });
                }
            }
        });
    }

    // 3. Parse Seed Species
    const speciesContent = getBlockContent('seed species', bnglCode);
    if (speciesContent) {
        speciesContent.split(/\r?\n/).forEach(line => {
            const cleaned = cleanLine(line);
            if (cleaned) {
                const parts = cleaned.split(/\s+/);
                const concentrationStr = parts.pop();
                const name = parts.join(' ');
                let concentration;
                if (concentrationStr in model.parameters) {
                    concentration = model.parameters[concentrationStr];
                } else {
                    concentration = parseFloat(concentrationStr);
                }
                
                if (name && !isNaN(concentration)) {
                    model.species.push({ name, initialConcentration: concentration });
                }
            }
        });
    }

    // 4. Parse Observables
    const observablesContent = getBlockContent('observables', bnglCode);
    if (observablesContent) {
        observablesContent.split(/\r?\n/).forEach(line => {
            const cleaned = cleanLine(line);
            if (cleaned) {
                const parts = cleaned.split(/\s+/);
                if (parts.length >= 3 && (parts[0].toLowerCase() === 'molecules' || parts[0].toLowerCase() === 'species')) {
                    model.observables.push({ name: parts[1], pattern: parts.slice(2).join(' ') });
                }
            }
        });
    }

    // 5. Parse Reaction Rules
    const rulesContent = getBlockContent('reaction rules', bnglCode);
    if (rulesContent) {
        const statements = [];
        let current = '';

        rulesContent.split(/\r?\n/).forEach(line => {
            const cleaned = cleanLine(line);
            if (!cleaned) return;

            if (cleaned.endsWith('\\\\')) {
                current += cleaned.slice(0, -1).trim() + ' ';
            } else {
                current += cleaned;
                statements.push(current.trim());
                current = '';
            }
        });

        if (current.trim()) {
            statements.push(current.trim());
        }

        statements.forEach(statement => {
            let ruleLine = statement;
            const labelMatch = ruleLine.match(/^[^:]+:\s*(.*)$/);
            if (labelMatch) {
                ruleLine = labelMatch[1];
            }

            const isBidirectional = ruleLine.includes('<->');
            const parts = ruleLine.split(isBidirectional ? '<->' : '->');
            if (parts.length < 2) {
                console.log('[Worker] Rule parsing failed - not enough parts:', statement);
                return;
            }

            const reactantsPart = parts[0].trim();
            const productsAndRatesPart = parts[1].trim();

            const reactants = parseEntityList(reactantsPart);
            if (reactants.length === 0) {
                return;
            }

            const { productChunk, rateChunk } = splitProductsAndRates(productsAndRatesPart, model.parameters);
            if (!rateChunk) {
                return;
            }

            const products = parseEntityList(productChunk);
            if (products.length === 0) {
                return;
            }

            const rateConstants = rateChunk
                .split(',')
                .reduce((acc, part) => {
                    part
                        .trim()
                        .split(/\s+/)
                        .filter(Boolean)
                        .forEach(token => acc.push(token));
                    return acc;
                }, []);
            if (rateConstants.length === 0) {
                return;
            }

            const forwardRateLabel = rateConstants[0];
            const reverseRateLabel = rateConstants[1] || undefined;

            const rule = {
                reactants,
                products,
                rate: forwardRateLabel,
                isBidirectional,
                reverseRate: isBidirectional ? reverseRateLabel : undefined
            };
            model.reactionRules.push(rule);
        });
    }

    // 6. Generate Reactions from Rules for simulation
    model.reactionRules.forEach(rule => {
        const forwardRate = model.parameters[rule.rate] ?? parseFloat(rule.rate);
        if (!isNaN(forwardRate)) {
            model.reactions.push({
                reactants: rule.reactants,
                products: rule.products,
                rate: rule.rate,
                rateConstant: forwardRate
            });
        }
        
        if (rule.isBidirectional && rule.reverseRate) {
            const reverseRate = model.parameters[rule.reverseRate] ?? parseFloat(rule.reverseRate);
             if (!isNaN(reverseRate)) {
                model.reactions.push({
                    reactants: rule.products,
                    products: rule.reactants,
                    rate: rule.reverseRate,
                    rateConstant: reverseRate
                });
            }
        }
    });

    // Note: Network generation (expanding reaction rules into concrete reactions)
    // happens in the simulate() function, not here during parsing.
    // This prevents double-expansion when simulate() is called multiple times.

    return model;
}

function generateNetwork(inputModel) {
    const model = JSON.parse(JSON.stringify(inputModel));

    function trim(str) {
        return typeof str === 'string' ? str.trim() : '';
    }

    function splitComponents(compStr) {
        if (!compStr) return [];
        return compStr.split(',').map(function(c) {
            return c.trim();
        }).filter(function(c) {
            return c.length > 0;
        });
    }

    function componentBase(comp) {
        return comp.split('~')[0].split('!')[0];
    }

    function completeComponentDefaults(typedComp) {
        const compMatch = typedComp.match(/^([^~]+)~(.+)$/);
        if (compMatch) {
            const compName = compMatch[1];
            const firstState = compMatch[2].split('~')[0];
            return compName + '~' + firstState;
        }
        return typedComp;
    }

    function completeSpeciesName(partialSpec) {
        if (partialSpec.includes('.')) {
            return partialSpec
                .split('.')
                .map(mol => completeSpeciesName(mol.trim()))
                .join('.');
        }

        const molMatch = partialSpec.match(/^([A-Za-z0-9_]+)[(]([^)]*)[)]/);
        if (!molMatch) {
            const molType = model.moleculeTypes.find(m => m.name === partialSpec);
            if (molType && molType.components.length > 0) {
                const defaultComps = molType.components.map(completeComponentDefaults);
                return partialSpec + '(' + defaultComps.join(',') + ')';
            }
            return partialSpec;
        }

        const molName = molMatch[1];
        const specifiedComps = molMatch[2].split(',').map(c => c.trim()).filter(Boolean);
        const molType = model.moleculeTypes.find(m => m.name === molName);
        if (!molType) return partialSpec;

        const completedComps = [];
        molType.components.forEach(typedComp => {
            const compName = componentBase(typedComp);
            const specifiedComp = specifiedComps.find(sc => componentBase(sc) === compName);
            if (specifiedComp) {
                completedComps.push(specifiedComp);
            } else {
                completedComps.push(completeComponentDefaults(typedComp));
            }
        });

        specifiedComps.forEach(specComp => {
            const specName = componentBase(specComp);
            if (!completedComps.some(c => componentBase(c) === specName)) {
                completedComps.push(specComp);
            }
        });

        return molName + '(' + completedComps.join(',') + ')';
    }

    function patternMatchesSpecies(pattern, speciesName) {
        if (pattern === speciesName) return true;

        const matchesSingleMolecule = function(patternMolStr, speciesMolStr) {
            const patternMol = patternMolStr.match(/^([A-Za-z0-9_]+)[(]([^)]*)[)]/);
            const speciesMol = speciesMolStr.match(/^([A-Za-z0-9_]+)[(]([^)]*)[)]/);
            if (!patternMol || !speciesMol) {
                return patternMolStr === speciesMolStr;
            }

            if (patternMol[1] !== speciesMol[1]) return false;

            const patternComps = splitComponents(patternMol[2]);
            const speciesComps = splitComponents(speciesMol[2]);

            return patternComps.every(function(pComp) {
                const pBase = componentBase(pComp);
                return speciesComps.some(function(sComp) {
                    const sBase = componentBase(sComp);
                    if (pBase !== sBase) return false;
                    if (pComp.includes('~') || pComp.includes('!')) {
                        return pComp === sComp;
                    }
                    if (sComp.includes('!')) {
                        return false;
                    }
                    return true;
                });
            });
        };

        const patternHasComplex = pattern.includes('.');
        const speciesHasComplex = speciesName.includes('.');

        if (patternHasComplex) {
            const patternMols = pattern.split('.').map(trim);
            if (!speciesHasComplex) return false;
            const speciesMols = speciesName.split('.').map(trim);
            if (patternMols.length !== speciesMols.length) return false;
            for (let i = 0; i < patternMols.length; i++) {
                if (!matchesSingleMolecule(patternMols[i], speciesMols[i])) return false;
            }
            return true;
        }

        if (speciesHasComplex) {
            const speciesMols = speciesName.split('.').map(trim);
            for (let i = 0; i < speciesMols.length; i++) {
                if (matchesSingleMolecule(pattern, speciesMols[i])) return true;
            }
            return false;
        }

        return matchesSingleMolecule(pattern, speciesName);
    }

    function applyUnimolecularProductToSpecies(reactantName, productPattern) {
        if (!reactantName || !productPattern || productPattern.includes('.')) return null;

        const prodMatch = productPattern.match(/^([A-Za-z0-9_]+)[(]([^)]*)[)]$/);
        if (!prodMatch) return null;

        const prodMolName = prodMatch[1];
        const prodComponents = splitComponents(prodMatch[2]);
        const molecules = reactantName.split('.').map(trim);
        let replaced = false;

        const newMolecules = molecules.map(function(mol) {
            const molMatch = mol.match(/^([A-Za-z0-9_]+)[(]([^)]*)[)]/);
            if (!molMatch || molMatch[1] !== prodMolName) return mol;

            const reactantComps = splitComponents(molMatch[2]);
            const compMap = {};

            reactantComps.forEach(function(c) {
                compMap[componentBase(c)] = c;
            });

            prodComponents.forEach(function(c) {
                compMap[componentBase(c)] = c;
            });

            const finalComponents = [];
            reactantComps.forEach(function(c) {
                const base = componentBase(c);
                if (Object.prototype.hasOwnProperty.call(compMap, base)) {
                    finalComponents.push(compMap[base]);
                    delete compMap[base];
                } else {
                    finalComponents.push(c);
                }
            });

            Object.keys(compMap).forEach(function(base) {
                finalComponents.push(compMap[base]);
            });

            replaced = true;
            return prodMolName + '(' + finalComponents.join(',') + ')';
        });

        if (!replaced) return null;
        return newMolecules.join('.');
    }

    function generateCombinations(arrays, index, current) {
        const nextIndex = typeof index === 'number' ? index : 0;
        const nextCurrent = Array.isArray(current) ? current : [];
        if (nextIndex === arrays.length) return [nextCurrent];
        const results = [];
        const level = arrays[nextIndex] || [];
        for (let i = 0; i < level.length; i++) {
            const item = level[i];
            const newCurrent = nextCurrent.concat([item]);
            const combos = generateCombinations(arrays, nextIndex + 1, newCurrent);
            for (let j = 0; j < combos.length; j++) {
                results.push(combos[j]);
            }
        }
        return results;
    }

    const rules = JSON.parse(JSON.stringify(model.reactions));
    const speciesMap = new Map(model.species.map(s => [s.name, { name: s.name, initialConcentration: s.initialConcentration } ]));
    const expandedReactionMap = new Map();

    let iteration = 0;
    let speciesAdded = true;

    while (speciesAdded) {
        iteration += 1;
        speciesAdded = false;
        const speciesArray = Array.from(speciesMap.values());

        rules.forEach(rule => {
            const reactantMatches = rule.reactants.map(reactantPattern => {
                const matches = speciesArray.filter(function(s) {
                    return patternMatchesSpecies(reactantPattern, s.name);
                });

                if (matches.length === 0 && (reactantPattern.includes('!') || reactantPattern.includes('.'))) {
                    return [{ name: reactantPattern, initialConcentration: 0 }];
                }

                return matches;
            });

            if (reactantMatches.some(m => m.length === 0)) {
                return;
            }

            const combinations = generateCombinations(reactantMatches);

            combinations.forEach(reactantSpecies => {
                const concreteReaction = {
                    reactants: reactantSpecies.map(s => s.name),
                    products: rule.products.map(productPattern => {
                        if (rule.reactants.length === 1 && rule.products.length === 1 && reactantSpecies.length === 1) {
                            const updated = applyUnimolecularProductToSpecies(reactantSpecies[0].name, productPattern);
                            if (updated) {
                                return updated;
                            }
                        }
                        if (productPattern.includes('(')) {
                            const productMolecules = productPattern.split('.');
                            const newProductMolecules = productMolecules.map(prodMol => {
                                const prodMolMatch = prodMol.match(/^([A-Za-z0-9_]+)[(]([^)]*)[)]/);
                                if (!prodMolMatch) return prodMol;

                                const prodMolName = prodMolMatch[1];
                                const prodComponents = prodMolMatch[2];

                                let matchingReactant = reactantSpecies.find(r => r.name.startsWith(prodMolName + '('));
                                if (!matchingReactant) {
                                    for (const r of reactantSpecies) {
                                        if (r.name.includes('.')) {
                                            const mols = r.name.split('.');
                                            const foundMol = mols.find(m => m.startsWith(prodMolName + '('));
                                            if (foundMol) {
                                                matchingReactant = { name: foundMol };
                                                break;
                                            }
                                        }
                                    }
                                }

                                if (matchingReactant) {
                                    const reactantMatch = matchingReactant.name.match(/^([A-Za-z0-9_]+)[(]([^)]*)[)]/);
                                    if (reactantMatch) {
                                        const reactantComponents = reactantMatch[2].split(',').map(c => c.trim()).filter(Boolean);
                                        const prodCompList = prodComponents.split(',').map(c => c.trim()).filter(Boolean);
                                        const compBase = function(comp) {
                                            return comp.split('~')[0].split('!')[0];
                                        };
                                        const newCompList = prodCompList.slice();

                                        const specifiedBases = prodCompList.reduce(function(map, comp) {
                                            map[compBase(comp)] = comp;
                                            return map;
                                        }, {});

                                        reactantComponents.forEach(function(rComp) {
                                            const rBase = compBase(rComp);
                                            if (!Object.prototype.hasOwnProperty.call(specifiedBases, rBase)) {
                                                const alreadyPresent = newCompList.some(function(c) {
                                                    return compBase(c) === rBase;
                                                });
                                                if (!alreadyPresent) {
                                                    newCompList.push(rComp);
                                                }
                                            }
                                        });

                                        return prodMolName + '(' + newCompList.join(',') + ')';
                                    }
                                }
                                return prodMol;
                            });

                            return newProductMolecules.join('.');
                        }
                        return productPattern;
                    }),
                    rate: rule.rate,
                    rateConstant: rule.rateConstant
                };

                const key = JSON.stringify({
                    reactants: concreteReaction.reactants,
                    products: concreteReaction.products,
                    rate: concreteReaction.rate,
                    rateConstant: concreteReaction.rateConstant
                });

                if (!expandedReactionMap.has(key)) {
                    expandedReactionMap.set(key, concreteReaction);
                }

                concreteReaction.products.forEach(productPattern => {
                    const completed = completeSpeciesName(productPattern);
                    if (!speciesMap.has(completed)) {
                        speciesMap.set(completed, { name: completed, initialConcentration: 0 });
                        speciesAdded = true;
                    }
                });
            });
        });
    }

    model.reactions = Array.from(expandedReactionMap.values());
    model.species = Array.from(speciesMap.values());

    const speciesList = model.species.map(s => s.name);

    model.reactions.forEach((rxn, idx) => {
        rxn.reactants = rxn.reactants.map(r => {
            const completed = completeSpeciesName(r);
            if (speciesList.includes(completed)) return completed;
            if (speciesList.includes(r)) return r;
            const found = speciesList.find(s => patternMatchesSpecies(completed, s) || patternMatchesSpecies(r, s));
            if (found && found !== r) {
                return found;
            }
            return completed !== r ? completed : r;
        });
        rxn.products = rxn.products.map(p => {
            if (speciesList.includes(p)) return p;
            const found = speciesList.find(s => patternMatchesSpecies(p, s));
            if (found && found !== p) {
                return found;
            }
            return p;
        });
    });

    const allProductSpecies = new Set();
    model.reactions.forEach((r, idx) => {
        r.products.forEach(s => {
            const completed = completeSpeciesName(s);
            allProductSpecies.add(completed);
            r.products = r.products.map(function(prod) {
                return prod === s ? completed : prod;
            });
        });
    });

    const speciesNames = new Set(model.species.map(s => s.name));

    allProductSpecies.forEach(name => {
        if (!speciesNames.has(name)) {
            model.species.push({ name, initialConcentration: 0 });
            speciesNames.add(name);
        }
    });

    return model;
}

function simulate(inputModel, options) {
    // Perform network generation first to expand rules into concrete reactions
    const expandedModel = generateNetwork(inputModel);
    
    // Create a deep copy to avoid mutating the expanded model
    const model = JSON.parse(JSON.stringify(expandedModel));
    
    const { t_end, n_steps } = options;
    const speciesNames = model.species.map(s => s.name);
    
    const headers = ['time', ...model.observables.map(o => o.name)];
    
    const evaluateObservables = (concs) => {
        const obsValues = {};
        model.observables.forEach(obs => {
            let total = 0;
            const pattern = obs.pattern.trim();
            const matchedSpecies = [];
            
            // For each species, check if it matches the observable pattern
            for (const [speciesName, concentration] of Object.entries(concs)) {
                const speciesStr = speciesName.trim();
                let matched = false;
                
                // Try exact match first
                if (speciesStr === pattern) {
                    total += concentration;
                    matched = true;
                    matchedSpecies.push(speciesStr + ':' + concentration.toFixed(2));
                    continue;
                }
                
                // Handle wildcard patterns like EGFR(l!+) - match any species with bound l
                if (pattern.includes('!+')) {
                    // Pattern like EGFR(l!+) means EGFR with a bond on l (regardless of other components/states)
                    // Must match species that have the molecule with a bond on that component
                    const patternMol = pattern.match(/^([A-Za-z0-9_]+)[(]([^)]+)[)]/);
                    if (patternMol) {
                        const molName = patternMol[1];
                        const componentWithWildcard = patternMol[2]; // e.g., "l!+"
                        const componentName = componentWithWildcard.split('!')[0]; // e.g., "l"
                        
                        // Only match species that contain this molecule (as a free molecule or in a complex)
                        if (speciesStr.includes(molName + '(')) {
                            // Check if this molecule in the species has a bond on the specified component
                            // e.g., for EGFR(l!+), look for EGFR(...,l!... or EGFR(l!...
                            const molRegex = new RegExp(molName + '\\(([^)]*)\\)');
                            const molMatch = speciesStr.match(molRegex);
                            if (molMatch) {
                                const molComponents = molMatch[1];
                                // Check if the component has a bond
                                const componentRegex = new RegExp(componentName + '!');
                                if (componentRegex.test(molComponents)) {
                                    total += concentration;
                                    matched = true;
                                    matchedSpecies.push(speciesStr + ':' + concentration.toFixed(2));
                                }
                            }
                        }
                    }
                    continue;
                }
                
                // Handle patterns with specific bonds like A(b!1).B(a!1)
                if (pattern.includes('!') && !pattern.includes('!+')) {
                    if (speciesStr === pattern) {
                        total += concentration;
                        matched = true;
                        matchedSpecies.push(speciesStr + ':' + concentration.toFixed(2));
                    }
                    continue;
                }
                
                // Handle molecule patterns like S(), EGFR(l), or EGFR(y~P)
                if (pattern.includes('(')) {
                    const molMatch = pattern.match(/^([A-Za-z0-9_]+)[(]([^)]*)[)]/);
                    if (molMatch) {
                        const molName = molMatch[1];
                        const componentSpec = molMatch[2].trim();

                        if (speciesStr.includes(molName + '(')) {
                            const molRegex = new RegExp(molName + '\\(([^)]*)\\)');
                            const molMatchResult = speciesStr.match(molRegex);
                            if (molMatchResult) {
                                const speciesComponents = molMatchResult[1]
                                    .split(',')
                                    .map(part => part.trim())
                                    .filter(Boolean);

                                const requiredComponents = componentSpec
                                    ? componentSpec.split(',').map(part => part.trim()).filter(Boolean)
                                    : [];

                                const satisfiesComponents = requiredComponents.every(reqComp => {
                                    const compBase = reqComp.split('~')[0].split('!')[0];
                                    const stateRequired = reqComp.includes('~')
                                        ? reqComp.split('~')[1].split('!')[0]
                                        : null;
                                    const bondRequired = reqComp.includes('!')
                                        ? reqComp.split('!')[1]
                                        : null;
                                    const requiresUnbound = reqComp.length > 0 && !reqComp.includes('!') && !reqComp.includes('~');

                                    return speciesComponents.some(specComp => {
                                        const specBase = specComp.split('~')[0].split('!')[0];
                                        if (specBase !== compBase) return false;

                                        if (stateRequired && !specComp.includes('~' + stateRequired)) {
                                            return false;
                                        }

                                        if (requiresUnbound && specComp.includes('!')) {
                                            return false;
                                        }

                                        if (bondRequired && !specComp.includes('!' + bondRequired)) {
                                            return false;
                                        }

                                        return true;
                                    });
                                });

                                if (satisfiesComponents || requiredComponents.length === 0) {
                                    total += concentration;
                                    matched = true;
                                    matchedSpecies.push(speciesStr + ':' + concentration.toFixed(2));
                                }
                            }
                        }
                    }
                } else {
                    // Simple molecule name only - exact match
                    if (speciesStr === pattern) {
                        total += concentration;
                        matched = true;
                        matchedSpecies.push(speciesStr + ':' + concentration.toFixed(2));
                    }
                }
            }
            obsValues[obs.name] = total;
        });
        return obsValues;
    };
    
    const data = [];
    
    if (options.method === 'ssa') {
        let counts = Object.fromEntries(model.species.map(s => [s.name, Math.round(s.initialConcentration)]));
        const dt_out = t_end / n_steps;
        let t = 0;
        let next_t_out = 0;
        
        data.push({ time: t, ...evaluateObservables(counts) });

        while (t < t_end) {
            const propensities = model.reactions.map(reaction => {
                let a = reaction.rateConstant;
                reaction.reactants.forEach(r => { 
                    const count = counts[r];
                    if (count === undefined) {
                        console.warn('[SSA] Missing reactant in counts:', r, 'Available:', Object.keys(counts));
                    }
                    a *= count || 0;
                });
                return a;
            });

            // Debug: log propensities and total so we can trace why events may not fire
            const a_total = propensities.reduce((sum, a) => sum + a, 0);
            if (a_total === 0) {
                break;
            }

            const r1 = Math.random();
            const tau = (1 / a_total) * Math.log(1 / r1);
            
            t += tau;

            const r2 = Math.random() * a_total;
            let sum_a = 0;
            let reaction_index = propensities.length - 1;
            for(let j=0; j < propensities.length; j++) {
                sum_a += propensities[j];
                if (r2 <= sum_a) {
                    reaction_index = j;
                    break;
                }
            }
            
            const fired_reaction = model.reactions[reaction_index];
            // Update counts for the affected species
            fired_reaction.reactants.forEach(r => { 
                const before = counts[r] || 0;
                counts[r] = before - 1;
            });
            fired_reaction.products.forEach(p => { 
                const before = counts[p] || 0;
                counts[p] = before + 1;
            });

            while(t >= next_t_out && next_t_out <= t_end) {
                data.push({ time: Math.round(next_t_out * 1e10) / 1e10, ...evaluateObservables(counts) });
                next_t_out += dt_out;
            }
        }
        
        while(next_t_out <= t_end) {
             data.push({ time: Math.round(next_t_out * 1e10) / 1e10, ...evaluateObservables(counts) });
             next_t_out += dt_out;
        }

        return { headers, data };

    } else if (options.method === 'ode') {
        let y = model.species.map(s => s.initialConcentration);

        const matchSpeciesPattern = (pattern, speciesName) => {
            // Exact match first
            if (pattern === speciesName) return true;
            
            // If pattern has no bonds, don't match complexes (species with bonds)
            const patternHasBonds = pattern.includes('!');
            const speciesIsComplex = speciesName.includes('!') || speciesName.includes('.');
            
            if (!patternHasBonds && speciesIsComplex) {
                return false; // Pattern asks for free molecule, species is in a complex
            }
            
            // Check if pattern is a partial specification that matches the full species
            // e.g., pattern "EGFR(l)" should match species "EGFR(l,y~U)"
            const patternMol = pattern.match(/^([A-Za-z0-9_]+)[(]([^)]*)[)]/);
            const speciesMol = speciesName.match(/^([A-Za-z0-9_]+)[(]([^)]*)[)]/);
            
            if (patternMol && speciesMol && patternMol[1] === speciesMol[1]) {
                // Same molecule type, check if all components in pattern exist in species
                const patternComps = patternMol[2].split(',').map(c => c.trim()).filter(Boolean);
                const speciesComps = speciesMol[2].split(',').map(c => c.trim()).filter(Boolean);
                
                // For each component in pattern, check if it exists in species
                return patternComps.every(pComp => {
                    const pCompName = pComp.split('~')[0].split('!')[0];
                    return speciesComps.some(sComp => {
                        const sCompName = sComp.split('~')[0].split('!')[0];
                        if (pCompName !== sCompName) return false;
                        
                        // If pattern specifies state, check state matches
                        if (pComp.includes('~')) {
                            return pComp === sComp;
                        }
                        // If pattern specifies bond, check bond matches
                        if (pComp.includes('!')) {
                            return pComp === sComp;
                        }
                        return true;
                    });
                });
            }
            
            return false;
        };
        
        const derivatives = (y_in, logStep) => {
            const rates = {};
            speciesNames.forEach((name, i) => rates[name] = y_in[i]);
            const dydt = new Array(speciesNames.length).fill(0);

            model.reactions.forEach((reaction, rxnIdx) => {
                // Try exact match first
                let hasExactMatch = reaction.reactants.every(r => speciesNames.includes(r));
                
                if (hasExactMatch) {
                    // Exact species match - calculate velocity normally
                    let velocity = reaction.rateConstant;
                    reaction.reactants.forEach(r => { velocity *= rates[r] || 0; });
                    
                    reaction.reactants.forEach(r => {
                        const r_idx = speciesNames.indexOf(r);
                        if (r_idx !== -1) dydt[r_idx] -= velocity;
                    });
                    reaction.products.forEach(p => {
                        const p_idx = speciesNames.indexOf(p);
                        if (p_idx !== -1) {
                            dydt[p_idx] += velocity;
                        } else {
                            // Product doesn't exist as exact match, try pattern matching
                            // Only add to the FIRST matching species to prevent explosion
                            for (let idx = 0; idx < speciesNames.length; idx++) {
                                if (matchSpeciesPattern(p, speciesNames[idx])) {
                                    dydt[idx] += velocity;
                                    break; // Only match first species
                                }
                            }
                        }
                    });
                } else {
                    // Need pattern matching - find which actual species match the reactant patterns
                    const matchedSpecies = reaction.reactants.map(reactantPattern => {
                        // Find all species that match this pattern
                        const matches = [];
                        speciesNames.forEach((speciesName, idx) => {
                            if (matchSpeciesPattern(reactantPattern, speciesName)) {
                                matches.push({ name: speciesName, idx: idx });
                            }
                        });
                        return matches;
                    });
                    
                    // If multiple matches, just skip this reaction for now
                    // Proper BNGL would require network generation to handle this correctly
                    // For now, only apply if we have exactly one match per reactant
                    if (!matchedSpecies.every(m => m.length === 1)) {
                        return;
                    }
                    
                    // Single match per reactant - apply the reaction
                    let velocity = reaction.rateConstant;
                    matchedSpecies.forEach(matches => {
                        velocity *= rates[matches[0].name] || 0;
                    });
                    
                    if (velocity === 0) return;
                    
                    // Consume reactants
                    matchedSpecies.forEach(matches => {
                        dydt[matches[0].idx] -= velocity;
                    });
                    
                    // Produce products
                    reaction.products.forEach(productPattern => {
                        // Try exact match first
                        const p_idx = speciesNames.indexOf(productPattern);
                        if (p_idx !== -1) {
                            dydt[p_idx] += velocity;
                        } else {
                            // For pattern matching products, only match ONE species (the first match)
                            // This prevents creating multiple products from a single reaction
                            for (let idx = 0; idx < speciesNames.length; idx++) {
                                if (matchSpeciesPattern(productPattern, speciesNames[idx])) {
                                    dydt[idx] += velocity;
                                    break; // Only match the first species
                                }
                            }
                        }
                    });
                }
            });
            return dydt;
        };

        const rk4Step = (y_curr, h, logStep) => {
            const k1 = derivatives(y_curr, logStep);
            const y_k1 = y_curr.map((y_i, i) => y_i + 0.5 * h * k1[i]);
            const k2 = derivatives(y_k1);
            const y_k2 = y_curr.map((y_i, i) => y_i + 0.5 * h * k2[i]);
            const k3 = derivatives(y_k2);
            const y_k3 = y_curr.map((y_i, i) => y_i + h * k3[i]);
            const k4 = derivatives(y_k3);
            const y_next = y_curr.map((y_i, i) => y_i + (h / 6) * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]));
            return y_next.map(val => Math.max(0, val));
        };
        
        const dt_out = t_end / n_steps;
        let t = 0;

        const currentConcs = {};
        speciesNames.forEach((name, i) => currentConcs[name] = y[i]);
        data.push({ time: t, ...evaluateObservables(currentConcs) });
        
        const tolerance = options.steadyStateTolerance ?? 1e-6;
        const window = options.steadyStateWindow ?? 5;
        const enforceSteadyState = !!options.steadyState;
        let consecutiveStable = 0;
        let shouldStop = false;
        
        for (let i = 1; i <= n_steps && !shouldStop; i++) {
            const t_target = i * dt_out;
            // Find maximum rate constant to adjust time step for faster kinetics
            const maxRate = model.reactions.reduce((max, rxn) => Math.max(max, rxn.rateConstant || 0), 0);
            
            // Rate-aware adaptive sub_steps that scales with rate constants
            // Base: h ≈ 0.1 when k≈0.1; increase density aggressively for faster kinetics
            // so that stiff systems stay stable without switching to SSA automatically
            const rateFactor = Math.max(1, maxRate * 100);
            const sub_steps = Math.max(10, Math.ceil(dt_out * 10 * rateFactor));
            const baseStep = (t_target - t) / sub_steps;
            let localTime = t;
            let firstSubstep = true;

            while (localTime < t_target - 1e-12) {
                let stepSize = Math.min(baseStep, t_target - localTime);
                let attempts = 0;
                let nextY = null;
                const maxAdaptiveAttempts = 12;
                const overflowThreshold = 1e12;

                while (attempts < maxAdaptiveAttempts) {
                    const candidate = rk4Step(y, stepSize, firstSubstep && attempts === 0);

                    const hasOverflow = candidate.some(val => !isFinite(val) || Math.abs(val) > overflowThreshold);
                    if (!hasOverflow) {
                        nextY = candidate;
                        break;
                    }

                    stepSize /= 2;
                    attempts += 1;
                    if (stepSize < 1e-12) {
                        break;
                    }
                }

                if (!nextY) {
                    throw new Error('Simulation became unstable (adaptive RK4 step failed). Try adjusting parameters or using the SSA solver.');
                }

                const maxDelta = Math.max(...nextY.map((val, idx) => Math.abs(val - y[idx])));
                y = nextY;
                localTime += stepSize;
                firstSubstep = false;

                if (enforceSteadyState) {
                    if (maxDelta <= tolerance) {
                        consecutiveStable++;
                        if (consecutiveStable >= window) {
                            shouldStop = true;
                            break;
                        }
                    } else {
                        consecutiveStable = 0;
                    }
                }
            }
            t = localTime;
            const stepConcs = {};
            speciesNames.forEach((name, k) => stepConcs[name] = y[k]);
            
            data.push({ time: Math.round(t * 1e10) / 1e10, ...evaluateObservables(stepConcs) });

            if (shouldStop) {
                break;
            }
        }

        return { headers, data };
    } else {
        throw new Error('Unsupported simulation method: ' + options.method);
    }
}

self.onmessage = (e) => {
    const { id, type, payload } = e.data;
    try {
        if (type === 'parse') {
            const model = parseBNGL(payload);

            self.postMessage({ id, type: 'parse_success', payload: model });
        } else if (type === 'simulate') {
            const results = simulate(payload.model, payload.options);
            self.postMessage({ id, type: 'simulate_success', payload: results });
        }
    } catch (error) {
        console.error('[Worker] Caught error:', error);
        self.postMessage({ id, type: type + '_error', payload: error.message });
    }
};
`;

class BnglService {
    private worker: Worker;
    private messageId = 0;
    private promises = new Map<number, { resolve: (value: any) => void; reject: (reason?: any) => void }>();

    constructor() {
        // Try to detect syntax errors before creating worker
        try {
            new Function(workerScript);
        } catch (syntaxError) {
            console.error('[BnglService] Worker script has syntax error:', syntaxError);
            throw syntaxError;
        }
        
        const blob = new Blob([workerScript], { type: 'application/javascript' });
        const blobUrl = URL.createObjectURL(blob);
        this.worker = new Worker(blobUrl);

        this.worker.onmessage = (e) => {
            const { id, type, payload } = e.data;
            if (id === -1 && type === 'worker_internal_error') {
                const detail = payload?.message ? `${payload.message} (${payload.filename ?? 'unknown'}:${payload.lineno ?? '?'}:${payload.colno ?? '?'})` : 'Worker internal error';
                if (payload?.stack) {
                    console.error(detail, '\n', payload.stack);
                } else {
                    console.error(detail);
                }
                return;
            }
            if (this.promises.has(id)) {
                const { resolve, reject } = this.promises.get(id)!;
                if (type.endsWith('_success')) {
                    resolve(payload);
                } else {
                    reject(new Error(payload));
                }
                this.promises.delete(id);
            }
        };
        
        this.worker.onerror = (e) => {
            const baseMessage = e.message || (e.error && e.error.message) || 'unknown error';
            const details = `Worker error: ${baseMessage} at ${e.filename ?? 'unknown file'}:${e.lineno ?? '?'}:${e.colno ?? '?'}`;
            if (e.error && e.error.stack) {
                console.error(details, '\n', e.error.stack);
            } else {
                console.error(details, e);
            }
            this.promises.forEach(({ reject }) => reject(new Error(details)));
            this.promises.clear();
        };
    }

    private postMessage<T>(type: string, payload: any): Promise<T> {
        const id = this.messageId++;
        return new Promise((resolve, reject) => {
            this.promises.set(id, { resolve, reject });
            this.worker.postMessage({ id, type, payload });
        });
    }

    public parse(code: string): Promise<BNGLModel> {
        return this.postMessage('parse', code);
    }

    public simulate(model: BNGLModel, options: SimulationOptions): Promise<SimulationResults> {
        return this.postMessage('simulate', { model, options });
    }
}

export const bnglService = new BnglService();