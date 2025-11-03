/// <reference lib="webworker" />

import type {
  BNGLModel,
  BNGLSpecies,
  SimulationOptions,
  SimulationResults,
  WorkerRequest,
  WorkerResponse,
  SerializedWorkerError,
  NetworkGeneratorOptions,
  GeneratorProgress,
} from '../types';
import { NetworkGenerator } from '../src/services/graph/NetworkGenerator';
import { BNGLParser } from '../src/services/graph/core/BNGLParser';
import { Species } from '../src/services/graph/core/Species';
import { Rxn } from '../src/services/graph/core/Rxn';
import { parseBNGL as parseBNGLModel } from './parseBNGL';

const ctx: DedicatedWorkerGlobalScope = self as unknown as DedicatedWorkerGlobalScope;

type JobState = {
  cancelled: boolean;
  controller?: AbortController;
};

const jobStates = new Map<number, JobState>();

// Ring buffer for logs to prevent memory blowup
class LogRingBuffer {
  private buffer: string[] = [];
  private maxSize: number;
  private writeIndex = 0;

  constructor(maxSize: number = 1000) {
    this.maxSize = maxSize;
  }

  add(message: string) {
    this.buffer[this.writeIndex] = `[${new Date().toISOString()}] ${message}`;
    this.writeIndex = (this.writeIndex + 1) % this.maxSize;
  }

  getAll(): string[] {
    const result: string[] = [];
    for (let i = 0; i < this.maxSize; i++) {
      const index = (this.writeIndex - 1 - i + this.maxSize) % this.maxSize;
      if (this.buffer[index]) {
        result.push(this.buffer[index]);
      } else {
        break;
      }
    }
    return result.reverse();
  }

  clear() {
    this.buffer = [];
    this.writeIndex = 0;
  }
}

const logBuffer = new LogRingBuffer(1000);

// Override console.log to use ring buffer
const originalConsoleLog = console.log;
console.log = (...args: any[]) => {
  const message = args.map(arg => typeof arg === 'string' ? arg : JSON.stringify(arg)).join(' ');
  logBuffer.add(message);
  originalConsoleLog(...args); // Still log to actual console for debugging
};
const cachedModels = new Map<number, BNGLModel>();
let nextModelId = 1;
// LRU cache size limit for cached models inside the worker
const MAX_CACHED_MODELS = 8;

const touchCachedModel = (modelId: number) => {
  const m = cachedModels.get(modelId);
  if (!m) return;
  // move to the end to mark as recently used
  cachedModels.delete(modelId);
  cachedModels.set(modelId, m);
};

const registerJob = (id: number) => {
  if (typeof id !== 'number' || Number.isNaN(id)) return;
  jobStates.set(id, { cancelled: false, controller: new AbortController() });
};

const markJobComplete = (id: number) => {
  jobStates.delete(id);
};

const cancelJob = (id: number) => {
  const entry = jobStates.get(id);
  if (entry) {
    entry.cancelled = true;
    if (entry.controller) {
      entry.controller.abort();
    }
  }
};

const ensureNotCancelled = (id: number) => {
  const entry = jobStates.get(id);
  if (entry && entry.cancelled) {
    throw new DOMException('Operation cancelled by main thread', 'AbortError');
  }
};

const serializeError = (error: unknown): SerializedWorkerError => {
  if (error instanceof DOMException) {
    return { name: error.name, message: error.message, stack: error.stack ?? undefined };
  }
  if (error instanceof Error) {
    return { name: error.name, message: error.message, stack: error.stack ?? undefined };
  }
  if (error && typeof error === 'object' && 'message' in error) {
    const message = typeof (error as { message?: unknown }).message === 'string' ? (error as { message: string }).message : 'Unknown error';
    const name = 'name' in error && typeof (error as { name?: unknown }).name === 'string' ? (error as { name: string }).name : undefined;
    const stack = 'stack' in error && typeof (error as { stack?: unknown }).stack === 'string' ? (error as { stack: string }).stack : undefined;
    return { name, message, stack };
  }
  return { message: typeof error === 'string' ? error : 'Unknown error' };
};

ctx.addEventListener('error', (event) => {
  const payload: SerializedWorkerError = {
    ...serializeError(event.error ?? event.message ?? 'Unknown worker error'),
    details: {
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    },
  };
  ctx.postMessage({ id: -1, type: 'worker_internal_error', payload });
  event.preventDefault();
});

ctx.addEventListener('unhandledrejection', (event) => {
  const payload: SerializedWorkerError = serializeError(event.reason ?? 'Unhandled rejection in worker');
  ctx.postMessage({ id: -1, type: 'worker_internal_error', payload });
  event.preventDefault();
});

// --- Existing BNGL worker implementation (migrated from String.raw) ---

function parseBNGL(jobId: number, bnglCode: string): BNGLModel {
  return parseBNGLModel(bnglCode, {
    checkCancelled: () => ensureNotCancelled(jobId),
  });
}

function generateNetwork(jobId: number, inputModel: BNGLModel): BNGLModel {
  const model: BNGLModel = JSON.parse(JSON.stringify(inputModel));

  const trim = (value: string | undefined) => (typeof value === 'string' ? value.trim() : '');

  const splitComponents = (componentString: string | undefined) => {
    if (!componentString) return [] as string[];
    return componentString
      .split(',')
      .map((component) => component.trim())
      .filter((component) => component.length > 0);
  };

  const componentBase = (component: string) => component.split('~')[0].split('!')[0];

  const completeComponentDefaults = (typedComponent: string) => {
    const componentMatch = typedComponent.match(/^([^~]+)~(.+)$/);
    if (componentMatch) {
      const componentName = componentMatch[1];
      const firstState = componentMatch[2].split('~')[0];
      return `${componentName}~${firstState}`;
    }
    return typedComponent;
  };

  const completeSpeciesName = (partialSpecies: string): string => {
    if (partialSpecies.includes('.')) {
      return partialSpecies
        .split('.')
        .map((molecule) => completeSpeciesName(molecule.trim()))
        .join('.');
    }

    const moleculeMatch = partialSpecies.match(/^([A-Za-z0-9_]+)\(([^)]*)\)/);
    if (!moleculeMatch) {
      const moleculeType = model.moleculeTypes.find((molecule) => molecule.name === partialSpecies);
      if (moleculeType && moleculeType.components.length > 0) {
        const defaultComponents = moleculeType.components.map(completeComponentDefaults);
        return `${partialSpecies}(${defaultComponents.join(',')})`;
      }
      return partialSpecies;
    }

    const moleculeName = moleculeMatch[1];
    const specifiedComponents = moleculeMatch[2].split(',').map((component) => component.trim()).filter(Boolean);
    const moleculeType = model.moleculeTypes.find((molecule) => molecule.name === moleculeName);
    if (!moleculeType) return partialSpecies;

    const completedComponents: string[] = [];
    moleculeType.components.forEach((typedComponent) => {
      const baseName = componentBase(typedComponent);
      const specifiedComponent = specifiedComponents.find((component) => componentBase(component) === baseName);
      if (specifiedComponent) {
        completedComponents.push(specifiedComponent);
      } else {
        completedComponents.push(completeComponentDefaults(typedComponent));
      }
    });

    specifiedComponents.forEach((specifiedComponent) => {
      const specifiedName = componentBase(specifiedComponent);
      if (!completedComponents.some((component) => componentBase(component) === specifiedName)) {
        completedComponents.push(specifiedComponent);
      }
    });

    return `${moleculeName}(${completedComponents.join(',')})`;
  };

  const patternMatchesSpecies = (pattern: string, speciesName: string): boolean => {
    if (pattern === speciesName) return true;

    const matchesSingleMolecule = (patternMolStr: string, speciesMolStr: string) => {
      const patternMol = patternMolStr.match(/^([A-Za-z0-9_]+)\(([^)]*)\)/);
      const speciesMol = speciesMolStr.match(/^([A-Za-z0-9_]+)\(([^)]*)\)/);
      if (!patternMol || !speciesMol) {
        return patternMolStr === speciesMolStr;
      }

      if (patternMol[1] !== speciesMol[1]) return false;

      const patternComponents = splitComponents(patternMol[2]);
      const speciesComponents = splitComponents(speciesMol[2]);

      return patternComponents.every((patternComponent) => {
        const patternBase = componentBase(patternComponent);
        return speciesComponents.some((speciesComponent) => {
          const speciesBase = componentBase(speciesComponent);
          if (patternBase !== speciesBase) return false;
          if (patternComponent.includes('~') || patternComponent.includes('!')) {
            return patternComponent === speciesComponent;
          }
          if (speciesComponent.includes('!')) {
            return false;
          }
          return true;
        });
      });
    };

    const patternHasComplex = pattern.includes('.');
    const speciesHasComplex = speciesName.includes('.');

    if (patternHasComplex) {
      const patternMolecules = pattern.split('.').map((value) => trim(value));
      if (!speciesHasComplex) return false;
      const speciesMolecules = speciesName.split('.').map((value) => trim(value));
      if (patternMolecules.length !== speciesMolecules.length) return false;
      for (let index = 0; index < patternMolecules.length; index += 1) {
        if (!matchesSingleMolecule(patternMolecules[index], speciesMolecules[index])) return false;
      }
      return true;
    }

    if (speciesHasComplex) {
      const speciesMolecules = speciesName.split('.').map((value) => trim(value));
      return speciesMolecules.some((molecule) => matchesSingleMolecule(pattern, molecule));
    }

    return matchesSingleMolecule(pattern, speciesName);
  };

  const applyUnimolecularProductToSpecies = (reactantName: string, productPattern: string): string | null => {
    if (!reactantName || !productPattern || productPattern.includes('.')) return null;

    const productMatch = productPattern.match(/^([A-Za-z0-9_]+)\(([^)]*)\)$/);
    if (!productMatch) return null;

    const productMoleculeName = productMatch[1];
    const productComponents = splitComponents(productMatch[2]);
    const molecules = reactantName.split('.').map((value) => trim(value));
    let replaced = false;

    const newMolecules = molecules.map((molecule) => {
      const moleculeMatch = molecule.match(/^([A-Za-z0-9_]+)\(([^)]*)\)$/);
      if (!moleculeMatch || moleculeMatch[1] !== productMoleculeName) return molecule;

      const reactantComponents = splitComponents(moleculeMatch[2]);
      const componentMap: Record<string, string> = {};
      reactantComponents.forEach((component) => {
        componentMap[componentBase(component)] = component;
      });
      productComponents.forEach((component) => {
        componentMap[componentBase(component)] = component;
      });

      const finalComponents: string[] = [];
      reactantComponents.forEach((component) => {
        const base = componentBase(component);
        if (Object.prototype.hasOwnProperty.call(componentMap, base)) {
          finalComponents.push(componentMap[base]);
          delete componentMap[base];
        } else {
          finalComponents.push(component);
        }
      });

      Object.keys(componentMap).forEach((base) => {
        finalComponents.push(componentMap[base]);
      });

      replaced = true;
      return `${productMoleculeName}(${finalComponents.join(',')})`;
    });

    if (!replaced) return null;
    return newMolecules.join('.');
  };

  const generateCombinations = (arrays: BNGLSpecies[][], index = 0, current: BNGLSpecies[] = []) => {
    if (index === arrays.length) return [current];
    const results: BNGLSpecies[][] = [];
    const level = arrays[index] ?? [];
    for (let levelIndex = 0; levelIndex < level.length; levelIndex += 1) {
      const item = level[levelIndex];
      const newCurrent = current.concat([item]);
      const combos = generateCombinations(arrays, index + 1, newCurrent);
      for (let comboIndex = 0; comboIndex < combos.length; comboIndex += 1) {
        results.push(combos[comboIndex]);
      }
    }
    return results;
  };

  const rules = JSON.parse(JSON.stringify(model.reactions)) as BNGLModel['reactions'];
  const speciesMap = new Map<string, BNGLSpecies>(model.species.map((species) => [species.name, { ...species }]));
  const expandedReactionMap = new Map<string, BNGLModel['reactions'][number]>();

  let speciesAdded = true;

  while (speciesAdded) {
    ensureNotCancelled(jobId);
    speciesAdded = false;
    const speciesArray = Array.from(speciesMap.values());

    for (const rule of rules) {
      ensureNotCancelled(jobId);
      const reactantMatches = rule.reactants.map((reactantPattern) => {
        const matches = speciesArray.filter((species) => patternMatchesSpecies(reactantPattern, species.name));
        if (matches.length === 0 && (reactantPattern.includes('!') || reactantPattern.includes('.'))) {
          return [{ name: reactantPattern, initialConcentration: 0 } as BNGLSpecies];
        }
        return matches;
      });

      if (reactantMatches.some((match) => match.length === 0)) {
        continue;
      }

      const combinations = generateCombinations(reactantMatches);

      combinations.forEach((reactantSpecies) => {
        ensureNotCancelled(jobId);
        const concreteReaction = {
          reactants: reactantSpecies.map((species) => species.name),
          products: rule.products.map((productPattern) => {
            if (rule.reactants.length === 1 && rule.products.length === 1 && reactantSpecies.length === 1) {
              const updated = applyUnimolecularProductToSpecies(reactantSpecies[0].name, productPattern);
              if (updated) {
                return updated;
              }
            }

            if (productPattern.includes('(')) {
              const productMolecules = productPattern.split('.');
              const newProductMolecules = productMolecules.map((productMolecule) => {
                const productMoleculeMatch = productMolecule.match(/^([A-Za-z0-9_]+)\(([^)]*)\)/);
                if (!productMoleculeMatch) return productMolecule;

                const productMoleculeName = productMoleculeMatch[1];
                const productComponents = productMoleculeMatch[2];

                let matchingReactant = reactantSpecies.find((species) => species.name.startsWith(`${productMoleculeName}(`));
                if (!matchingReactant) {
                  for (const species of reactantSpecies) {
                    if (species.name.includes('.')) {
                      const molecules = species.name.split('.');
                      const foundMolecule = molecules.find((molecule) => molecule.startsWith(`${productMoleculeName}(`));
                      if (foundMolecule) {
                        matchingReactant = { name: foundMolecule, initialConcentration: species.initialConcentration };
                        break;
                      }
                    }
                  }
                }

                if (matchingReactant) {
                  const reactantMatch = matchingReactant.name.match(/^([A-Za-z0-9_]+)\(([^)]*)\)/);
                  if (reactantMatch) {
                    const reactantComponents = reactantMatch[2].split(',').map((component) => component.trim()).filter(Boolean);
                    const productComponentList = productComponents.split(',').map((component) => component.trim()).filter(Boolean);
                    const compBase = (component: string) => component.split('~')[0].split('!')[0];
                    const newComponentList = productComponentList.slice();

                    const specifiedBases = productComponentList.reduce<Record<string, string>>((map, component) => {
                      map[compBase(component)] = component;
                      return map;
                    }, {});

                    reactantComponents.forEach((reactantComponent) => {
                      const reactantBase = compBase(reactantComponent);
                      if (!Object.prototype.hasOwnProperty.call(specifiedBases, reactantBase)) {
                        const alreadyPresent = newComponentList.some((component) => compBase(component) === reactantBase);
                        if (!alreadyPresent) {
                          newComponentList.push(reactantComponent);
                        }
                      }
                    });

                    return `${productMoleculeName}(${newComponentList.join(',')})`;
                  }
                }

                return productMolecule;
              });

              return newProductMolecules.join('.');
            }

            return productPattern;
          }),
          rate: rule.rate,
          rateConstant: rule.rateConstant,
        } satisfies BNGLModel['reactions'][number];

        const cacheKey = JSON.stringify({
          reactants: concreteReaction.reactants,
          products: concreteReaction.products,
          rate: concreteReaction.rate,
          rateConstant: concreteReaction.rateConstant,
        });

        if (!expandedReactionMap.has(cacheKey)) {
          expandedReactionMap.set(cacheKey, concreteReaction);
        }

        concreteReaction.products.forEach((productPattern) => {
          const completed = completeSpeciesName(productPattern);
          if (!speciesMap.has(completed)) {
            speciesMap.set(completed, { name: completed, initialConcentration: 0 });
            speciesAdded = true;
          }
        });
      });
    }
  }

  model.reactions = Array.from(expandedReactionMap.values());
  model.species = Array.from(speciesMap.values());

  const speciesList = model.species.map((species) => species.name);

  for (const reaction of model.reactions) {
    ensureNotCancelled(jobId);
    reaction.reactants = reaction.reactants.map((reactant) => {
      const completed = completeSpeciesName(reactant);
      if (speciesList.includes(completed)) return completed;
      if (speciesList.includes(reactant)) return reactant;
      const found = speciesList.find((species) => patternMatchesSpecies(completed, species) || patternMatchesSpecies(reactant, species));
      if (found && found !== reactant) {
        return found;
      }
      return completed !== reactant ? completed : reactant;
    });
    reaction.products = reaction.products.map((product) => {
      if (speciesList.includes(product)) return product;
      const found = speciesList.find((species) => patternMatchesSpecies(product, species));
      if (found && found !== product) {
        return found;
      }
      return product;
    });
  }

  const allProductSpecies = new Set<string>();
  for (const reaction of model.reactions) {
    ensureNotCancelled(jobId);
    reaction.products.forEach((product) => {
      const completed = completeSpeciesName(product);
      allProductSpecies.add(completed);
      reaction.products = reaction.products.map((existingProduct) => (existingProduct === product ? completed : existingProduct));
    });
  }

  const speciesNames = new Set(model.species.map((species) => species.name));
  for (const name of allProductSpecies) {
    ensureNotCancelled(jobId);
    if (!speciesNames.has(name)) {
      model.species.push({ name, initialConcentration: 0 });
      speciesNames.add(name);
    }
  }

  return model;
}

async function generateExpandedNetwork(jobId: number, inputModel: BNGLModel): Promise<BNGLModel> {
  console.log('[Worker] Starting network generation for model with', inputModel.species.length, 'species and', inputModel.reactionRules.length, 'rules');

  // Convert BNGLModel to graph structures
  const seedSpecies = inputModel.species.map(s => {
    console.log('[generateNetwork] parsing seed:', s.name);
    const graph = BNGLParser.parseSpeciesGraph(s.name);
    console.log('[generateNetwork] parsed graph =>', BNGLParser.speciesGraphToString(graph));
    return graph;
  });

  const formatSpeciesList = (list: string[]) => (list.length > 0 ? list.join(' + ') : '0');

  const rules = inputModel.reactionRules.flatMap(r => {
    const rate = inputModel.parameters[r.rate] ?? parseFloat(r.rate);
    const reverseRate = r.reverseRate ? (inputModel.parameters[r.reverseRate] ?? parseFloat(r.reverseRate)) : rate;
    const ruleStr = `${formatSpeciesList(r.reactants)} -> ${formatSpeciesList(r.products)}`;
    const forwardRule = BNGLParser.parseRxnRule(ruleStr, rate);
    forwardRule.name = r.reactants.join('+') + '->' + r.products.join('+');

    if (r.isBidirectional) {
      const reverseRuleStr = `${formatSpeciesList(r.products)} -> ${formatSpeciesList(r.reactants)}`;
      const reverseRule = BNGLParser.parseRxnRule(reverseRuleStr, reverseRate);
      reverseRule.name = r.products.join('+') + '->' + r.reactants.join('+');
      return [forwardRule, reverseRule];
    } else {
      return [forwardRule];
    }
  });

  // Use the new NetworkGenerator
  const generator = new NetworkGenerator({ maxSpecies: 10000, maxIterations: 100 });
  const result = await generator.generate(seedSpecies, rules);

  console.log('[Worker] Network generation complete. Generated', result.species.length, 'species and', result.reactions.length, 'reactions');

  // Convert result back to BNGLModel
  const generatedModel: BNGLModel = {
    ...inputModel,
    species: result.species.map((s: Species) => {
      const name = BNGLParser.speciesGraphToString(s.graph);
      // Find the original concentration if this species existed in the input
      const originalSpecies = inputModel.species.find(orig => orig.name === name);
      const concentration = originalSpecies ? originalSpecies.initialConcentration : (s.concentration || 0);
      return { name, initialConcentration: concentration };
    }),
    reactions: result.reactions.map((r: Rxn) => {
      const reaction = {
        reactants: r.reactants.map((idx: number) => BNGLParser.speciesGraphToString(result.species[idx].graph)),
        products: r.products.map((idx: number) => BNGLParser.speciesGraphToString(result.species[idx].graph)),
        rate: r.rate.toString(),
        rateConstant: r.rate
      };
      return reaction;
    }),
  };

  return generatedModel;
}

async function simulate(jobId: number, inputModel: BNGLModel, options: SimulationOptions): Promise<SimulationResults> {
  ensureNotCancelled(jobId);
  console.log('[Worker] Starting simulation with', inputModel.species.length, 'species and', inputModel.reactions.length, 'reactions');
  console.log('[Worker] Initial species:', inputModel.species.map(s => `${s.name}: ${s.initialConcentration}`));
  console.log('[Worker] Observables:', inputModel.observables.map(o => `${o.name}: ${o.pattern}`));

  // Use the new graph-based network generator instead of the old one
  const expandedModel = await generateExpandedNetwork(jobId, inputModel);
  console.log('[Worker] After network expansion:', expandedModel.species.length, 'species and', expandedModel.reactions.length, 'reactions');
  console.log('[Worker] Expanded species:', expandedModel.species.map(s => `${s.name}: ${s.initialConcentration}`));
  console.log('[Worker] Expanded reactions:', expandedModel.reactions.map(r => `${r.reactants.join(' + ')} -> ${r.products.join(' + ')} (rate: ${r.rateConstant})`));

  const model: BNGLModel = JSON.parse(JSON.stringify(expandedModel));

  const { t_end, n_steps, method } = options;
  const speciesNames = model.species.map((species) => species.name);

  const headers = ['time', ...model.observables.map((observable) => observable.name)];

  const evaluateObservables = (concs: Record<string, number>) => {
    ensureNotCancelled(jobId);
    const obsValues: Record<string, number> = {};

    for (const obs of model.observables) {
      ensureNotCancelled(jobId);
      let total = 0;
      const pattern = obs.pattern.trim();

      for (const [speciesName, concentration] of Object.entries(concs)) {
        ensureNotCancelled(jobId);
        const speciesStr = speciesName.trim();

        if (speciesStr === pattern) {
          total += concentration;
          continue;
        }

        if (pattern.includes('!+')) {
          const patternMol = pattern.match(/^([A-Za-z0-9_]+)\(([^)]+)\)/);
          if (patternMol) {
            const molName = patternMol[1];
            const componentWithWildcard = patternMol[2];
            const componentName = componentWithWildcard.split('!')[0];

            if (speciesStr.includes(`${molName}(`)) {
              const molRegex = new RegExp(`${molName}\\(([^)]*)\\)`);
              const molMatch = speciesStr.match(molRegex);
              if (molMatch) {
                const molComponents = molMatch[1];
                const componentRegex = new RegExp(`${componentName}!`);
                if (componentRegex.test(molComponents)) {
                  total += concentration;
                }
              }
            }
          }
          continue;
        }

        if (pattern.includes('!') && !pattern.includes('!+')) {
          if (speciesStr === pattern) {
            total += concentration;
          }
          continue;
        }

        if (pattern.includes('(')) {
          // Handle complex patterns (molecules connected with dots)
          if (pattern.includes('.')) {
            // Split complex pattern into individual molecules
            const patternMolecules = pattern.split('.').map(s => s.trim());
            const speciesMolecules = speciesStr.split('.').map(s => s.trim());

            if (patternMolecules.length === speciesMolecules.length) {
              const allMatch = patternMolecules.every((patMol, idx) => {
                const specMol = speciesMolecules[idx];
                const patMatch = patMol.match(/^([A-Za-z0-9_]+)\(([^)]*)\)/);
                const specMatch = specMol.match(/^([A-Za-z0-9_]+)\(([^)]*)\)/);

                if (!patMatch || !specMatch) {
                  return patMol === specMol;
                }

                if (patMatch[1] !== specMatch[1]) return false;

                const patComps = patMatch[2].split(',').map(s => s.trim()).filter(Boolean);
                const specComps = specMatch[2].split(',').map(s => s.trim()).filter(Boolean);

                return patComps.every(patComp => {
                  const patBase = patComp.split('~')[0].split('!')[0];
                  const stateReq = patComp.includes('~') ? patComp.split('~')[1].split('!')[0] : null;
                  const bondReq = patComp.includes('!') ? patComp.split('!')[1] : null;

                  return specComps.some(specComp => {
                    const specBase = specComp.split('~')[0].split('!')[0];
                    if (specBase !== patBase) return false;

                    if (stateReq && !specComp.includes(`~${stateReq}`)) return false;
                    if (bondReq && !specComp.includes(`!${bondReq}`)) return false;

                    return true;
                  });
                });
              });

              if (allMatch) {
                total += concentration;
              }
            }
          } else {
            // Single molecule pattern
            const molMatch = pattern.match(/^([A-Za-z0-9_]+)\(([^)]*)\)/);
            if (molMatch) {
              const molName = molMatch[1];
              const componentSpec = molMatch[2].trim();

              if (speciesStr.includes(`${molName}(`)) {
                const molRegex = new RegExp(`${molName}\\(([^)]*)\\)`);
                const molMatchResult = speciesStr.match(molRegex);
                if (molMatchResult) {
                  const speciesComponents = molMatchResult[1]
                    .split(',')
                    .map((part) => part.trim())
                    .filter(Boolean);

                  const requiredComponents = componentSpec
                    ? componentSpec.split(',').map((part) => part.trim()).filter(Boolean)
                    : [];

                  const satisfiesComponents = requiredComponents.every((reqComp) => {
                    const compBase = reqComp.split('~')[0].split('!')[0];
                    const stateRequired = reqComp.includes('~') ? reqComp.split('~')[1].split('!')[0] : null;
                    const bondRequired = reqComp.includes('!') ? reqComp.split('!')[1] : null;
                    const requiresUnbound = reqComp.length > 0 && !reqComp.includes('!') && !reqComp.includes('~');

                    return speciesComponents.some((specComp) => {
                      const specBase = specComp.split('~')[0].split('!')[0];
                      if (specBase !== compBase) return false;

                      if (stateRequired && !specComp.includes(`~${stateRequired}`)) {
                        return false;
                      }

                      if (requiresUnbound && specComp.includes('!')) {
                        return false;
                      }

                      if (bondRequired && !specComp.includes(`!${bondRequired}`)) {
                        return false;
                      }

                      return true;
                    });
                  });

                  if (satisfiesComponents || requiredComponents.length === 0) {
                    total += concentration;
                  }
                }
              }
            }
          }
        } else if (speciesStr === pattern) {
          total += concentration;
        }
      }

      obsValues[obs.name] = total;
    }
    return obsValues;
  };

  const data: Record<string, number>[] = [];

  if (method === 'ssa') {
    let counts = Object.fromEntries(model.species.map((s) => [s.name, Math.round(s.initialConcentration)])) as Record<
      string,
      number
    >;
    const dtOut = t_end / n_steps;
    let t = 0;
    let nextTOut = 0;

    data.push({ time: t, ...evaluateObservables(counts) });

    while (t < t_end) {
      ensureNotCancelled(jobId);
      const propensities: number[] = [];
      for (const reaction of model.reactions) {
        ensureNotCancelled(jobId);
        let a = reaction.rateConstant;
        for (const reactant of reaction.reactants) {
          const count = counts[reactant];
          if (count === undefined) {
            console.warn('[SSA] Missing reactant in counts:', reactant, 'Available:', Object.keys(counts));
          }
          a *= count || 0;
        }
        propensities.push(a);
      }

      const aTotal = propensities.reduce((sum, a) => sum + a, 0);
      if (aTotal === 0) {
        break;
      }

      const r1 = Math.random();
      const tau = (1 / aTotal) * Math.log(1 / r1);

      t += tau;

      const r2 = Math.random() * aTotal;
      let sumA = 0;
      let reactionIndex = propensities.length - 1;
      for (let j = 0; j < propensities.length; j += 1) {
        ensureNotCancelled(jobId);
        sumA += propensities[j];
        if (r2 <= sumA) {
          reactionIndex = j;
          break;
        }
      }

      const firedReaction = model.reactions[reactionIndex];
      for (const reactant of firedReaction.reactants) {
        const before = counts[reactant] || 0;
        counts[reactant] = before - 1;
      }
      for (const product of firedReaction.products) {
        const before = counts[product] || 0;
        counts[product] = before + 1;
      }

      while (t >= nextTOut && nextTOut <= t_end) {
        ensureNotCancelled(jobId);
        data.push({ time: Math.round(nextTOut * 1e10) / 1e10, ...evaluateObservables(counts) });
        nextTOut += dtOut;
      }
    }

    while (nextTOut <= t_end) {
      ensureNotCancelled(jobId);
      data.push({ time: Math.round(nextTOut * 1e10) / 1e10, ...evaluateObservables(counts) });
      nextTOut += dtOut;
    }

    return { headers, data } satisfies SimulationResults;
  }

  if (method === 'ode') {
    let y = model.species.map((s) => s.initialConcentration);

    const checkCancelled = () => ensureNotCancelled(jobId);

    const matchSpeciesPattern = (pattern: string, speciesName: string) => {
      checkCancelled();
      if (pattern === speciesName) return true;

      const splitComponents = (input: string) =>
        input
          .split(',')
          .map((part) => part.trim())
          .filter(Boolean);

      const componentBase = (comp: string) => comp.split('~')[0].split('!')[0];
      const trim = (value: string) => value.trim();

      const matchesSingleMolecule = (patternMolStr: string, speciesMolStr: string) => {
        const patternMol = patternMolStr.match(/^([A-Za-z0-9_]+)\(([^)]*)\)/);
        const speciesMol = speciesMolStr.match(/^([A-Za-z0-9_]+)\(([^)]*)\)/);
        if (!patternMol || !speciesMol) {
          return patternMolStr === speciesMolStr;
        }

        if (patternMol[1] !== speciesMol[1]) return false;

        const patternComps = splitComponents(patternMol[2]);
        const speciesComps = splitComponents(speciesMol[2]);

        return patternComps.every((pComp) => {
          const pBase = componentBase(pComp);
          return speciesComps.some((sComp) => {
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
        const patternMolecules = pattern.split('.').map((value) => trim(value));
        if (!speciesHasComplex) return false;
        const speciesMolecules = speciesName.split('.').map((value) => trim(value));
        if (patternMolecules.length !== speciesMolecules.length) return false;
        for (let idx = 0; idx < patternMolecules.length; idx += 1) {
          if (!matchesSingleMolecule(patternMolecules[idx], speciesMolecules[idx])) return false;
        }
        return true;
      }

      if (speciesHasComplex) {
        const speciesMolecules = speciesName.split('.').map((value) => trim(value));
        return speciesMolecules.some((molecule) => matchesSingleMolecule(pattern, molecule));
      }

      return matchesSingleMolecule(pattern, speciesName);
    };

    const derivatives = (yIn: number[], logStep?: boolean) => {
      checkCancelled();
      const rates: Record<string, number> = {};
      speciesNames.forEach((name, i) => {
        rates[name] = yIn[i];
      });
      const dydt = new Array<number>(speciesNames.length).fill(0);

      model.reactions.forEach((reaction) => {
        checkCancelled();
        const hasExactMatch = reaction.reactants.every((reactant) => speciesNames.includes(reactant));

        if (hasExactMatch) {
          let velocity = reaction.rateConstant;
          reaction.reactants.forEach((reactant) => {
            velocity *= rates[reactant] || 0;
          });

          reaction.reactants.forEach((reactant) => {
            const rIdx = speciesNames.indexOf(reactant);
            if (rIdx !== -1) dydt[rIdx] -= velocity;
          });
          reaction.products.forEach((product) => {
            const pIdx = speciesNames.indexOf(product);
            if (pIdx !== -1) {
              dydt[pIdx] += velocity;
            } else {
              for (let idx = 0; idx < speciesNames.length; idx += 1) {
                if (matchSpeciesPattern(product, speciesNames[idx])) {
                  dydt[idx] += velocity;
                  break;
                }
              }
            }
          });
        } else {
          const matchedSpecies = reaction.reactants.map((reactantPattern) => {
            const matches: { name: string; idx: number }[] = [];
            speciesNames.forEach((speciesName, idx) => {
              if (matchSpeciesPattern(reactantPattern, speciesName)) {
                matches.push({ name: speciesName, idx });
              }
            });
            return matches;
          });

          if (!matchedSpecies.every((m) => m.length === 1)) {
            return;
          }

          let velocity = reaction.rateConstant;
          matchedSpecies.forEach((matches) => {
            velocity *= rates[matches[0].name] || 0;
          });

          if (velocity === 0) return;

          matchedSpecies.forEach((matches) => {
            dydt[matches[0].idx] -= velocity;
          });

          reaction.products.forEach((productPattern) => {
            const pIdx = speciesNames.indexOf(productPattern);
            if (pIdx !== -1) {
              dydt[pIdx] += velocity;
            } else {
              for (let idx = 0; idx < speciesNames.length; idx += 1) {
                if (matchSpeciesPattern(productPattern, speciesNames[idx])) {
                  dydt[idx] += velocity;
                  break;
                }
              }
            }
          });
        }
      });

      return dydt;
    };

    const rk4Step = (yCurr: number[], h: number, logStep?: boolean) => {
      checkCancelled();
      const k1 = derivatives(yCurr, logStep);
      const yK1 = yCurr.map((yi, i) => yi + 0.5 * h * k1[i]);
      const k2 = derivatives(yK1);
      const yK2 = yCurr.map((yi, i) => yi + 0.5 * h * k2[i]);
      const k3 = derivatives(yK2);
      const yK3 = yCurr.map((yi, i) => yi + h * k3[i]);
      const k4 = derivatives(yK3);
      const yNext = yCurr.map((yi, i) => yi + (h / 6) * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]));
      return yNext.map((val) => Math.max(0, val));
    };

    const dtOut = t_end / n_steps;
    let t = 0;

    const currentConcs: Record<string, number> = {};
    speciesNames.forEach((name, i) => {
      currentConcs[name] = y[i];
    });
    data.push({ time: t, ...evaluateObservables(currentConcs) });

    const tolerance = options.steadyStateTolerance ?? 1e-6;
    const window = options.steadyStateWindow ?? 5;
    const enforceSteadyState = !!options.steadyState;
    let consecutiveStable = 0;
    let shouldStop = false;

    for (let i = 1; i <= n_steps && !shouldStop; i += 1) {
      checkCancelled();
      const tTarget = i * dtOut;
      const maxRate = model.reactions.reduce((max, rxn) => Math.max(max, rxn.rateConstant || 0), 0);

      const rateFactor = Math.max(1, maxRate * 100);
      const subSteps = Math.max(10, Math.ceil(dtOut * 10 * rateFactor));
      const baseStep = (tTarget - t) / subSteps;
      let localTime = t;
      let firstSubstep = true;

      while (localTime < tTarget - 1e-12) {
        checkCancelled();
        let stepSize = Math.min(baseStep, tTarget - localTime);
        let attempts = 0;
        let nextY: number[] | null = null;
        const maxAdaptiveAttempts = 12;
        const overflowThreshold = 1e12;

        while (attempts < maxAdaptiveAttempts) {
          checkCancelled();
          const candidate = rk4Step(y, stepSize, firstSubstep && attempts === 0);

          const hasOverflow = candidate.some((val) => !Number.isFinite(val) || Math.abs(val) > overflowThreshold);
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
          throw new Error(
            'Simulation became unstable (adaptive RK4 step failed). Try adjusting parameters or using the SSA solver.'
          );
        }

        const maxDelta = Math.max(...nextY.map((val, idx) => Math.abs(val - y[idx])));
        y = nextY;
        localTime += stepSize;
        firstSubstep = false;

        if (enforceSteadyState) {
          if (maxDelta <= tolerance) {
            consecutiveStable += 1;
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
      const stepConcs: Record<string, number> = {};
      speciesNames.forEach((name, k) => {
        stepConcs[name] = y[k];
      });

      data.push({ time: Math.round(t * 1e10) / 1e10, ...evaluateObservables(stepConcs) });

      if (shouldStop) {
        break;
      }
    }

    return { headers, data } satisfies SimulationResults;
  }

  throw new Error(`Unsupported simulation method: ${method}`);
}

ctx.addEventListener('message', (event: MessageEvent<WorkerRequest>) => {
  const message = event.data;
  if (!message || typeof message !== 'object') {
    console.warn('[Worker] Received malformed message', message);
    return;
  }

  const { id, type, payload } = message;

  if (typeof id !== 'number' || typeof type !== 'string') {
    console.warn('[Worker] Missing id or type on message', message);
    return;
  }

  if (type === 'cancel') {
    const targetId = payload && typeof payload === 'object' ? (payload as { targetId?: unknown }).targetId : undefined;
    if (typeof targetId === 'number') {
      cancelJob(targetId);
    }
    return;
  }

  if (type === 'parse') {
    registerJob(id);
    try {
      const code = typeof payload === 'string' ? payload : '';
      const model = parseBNGL(id, code);
      const response: WorkerResponse = { id, type: 'parse_success', payload: model };
      ctx.postMessage(response);
    } catch (error) {
      const response: WorkerResponse = { id, type: 'parse_error', payload: serializeError(error) };
      ctx.postMessage(response);
    } finally {
      markJobComplete(id);
    }
    return;
  }

  if (type === 'simulate') {
    registerJob(id);
    const jobEntry = jobStates.get(id);
    if (!jobEntry) return; // Should not happen
    (async () => {
      try {
        if (!payload || typeof payload !== 'object') {
          throw new Error('Simulation payload missing');
        }

        // Backwards-compatible: payload can be { model, options } or { modelId, parameterOverrides?, options }
        const p = payload as any;
        let model: BNGLModel | undefined = undefined;
        const options: SimulationOptions | undefined = p.options;

        if (p.model) {
          model = p.model as BNGLModel;
        } else if (typeof p.modelId === 'number') {
          const cached = cachedModels.get(p.modelId);
          if (!cached) throw new Error('Cached model not found in worker');
          // mark as recently used
          touchCachedModel(p.modelId);
          // If there are parameter overrides, create a shallow copy and update rate constants
          if (!p.parameterOverrides || Object.keys(p.parameterOverrides).length === 0) {
            model = cached;
          } else {
            const overrides: Record<string, number> = p.parameterOverrides;
            const nextModel: BNGLModel = {
              ...cached,
              parameters: { ...(cached.parameters || {}), ...overrides },
              reactions: [],
            } as BNGLModel;

            // Update reaction rate constants using new parameters
            (cached.reactions || []).forEach((r) => {
              const rateConst = nextModel.parameters[r.rate] ?? parseFloat(r.rate as unknown as string);
              nextModel.reactions.push({ ...r, rateConstant: rateConst });
            });
            model = nextModel;
          }
        }

        if (!model || !options) {
          throw new Error('Simulation payload incomplete');
        }

        const results = await simulate(id, model, options);
        const response: WorkerResponse = { id, type: 'simulate_success', payload: results };
        ctx.postMessage(response);
      } catch (error) {
        const response: WorkerResponse = { id, type: 'simulate_error', payload: serializeError(error) };
        ctx.postMessage(response);
      } finally {
        markJobComplete(id);
      }
    })();
    return;
  }

  if (type === 'cache_model') {
    registerJob(id);
    try {
      const p = payload as any;
      const model = p && p.model ? (p.model as BNGLModel) : undefined;
      if (!model) throw new Error('Cache model payload missing');
      const modelId = nextModelId++;
      // Store a shallow clone to avoid accidental mutation from main thread
      const stored: BNGLModel = {
        ...model,
        parameters: { ...(model.parameters || {}) },
        moleculeTypes: (model.moleculeTypes || []).map((m) => ({ ...m })),
        species: (model.species || []).map((s) => ({ ...s })),
        observables: (model.observables || []).map((o) => ({ ...o })),
        reactions: (model.reactions || []).map((r) => ({ ...r })),
        reactionRules: (model.reactionRules || []).map((r) => ({ ...r })),
      };
      cachedModels.set(modelId, stored);
      // Enforce LRU eviction if we exceed the cache size
      try {
        if (cachedModels.size > MAX_CACHED_MODELS) {
          const it = cachedModels.keys();
          const oldest = it.next().value as number | undefined;
          if (typeof oldest === 'number') {
            cachedModels.delete(oldest);
            // best-effort notification
            // eslint-disable-next-line no-console
            console.warn('[Worker] Evicted cached model (LRU) id=', oldest);
          }
        }
      } catch (e) {
        // ignore eviction errors
      }
      const response: WorkerResponse = { id, type: 'cache_model_success', payload: { modelId } };
      ctx.postMessage(response);
    } catch (error) {
      const response: WorkerResponse = { id, type: 'cache_model_error', payload: serializeError(error) };
      ctx.postMessage(response);
    } finally {
      markJobComplete(id);
    }
    return;
  }

  if (type === 'release_model') {
    registerJob(id);
    try {
      const p = payload as any;
      const modelId = p && typeof p === 'object' ? (p as { modelId?: unknown }).modelId : undefined;
      if (typeof modelId !== 'number') throw new Error('release_model payload missing modelId');
      const existed = cachedModels.delete(modelId);
      const response: WorkerResponse = { id, type: 'release_model_success', payload: { modelId } };
      ctx.postMessage(response);
    } catch (error) {
      const response: WorkerResponse = { id, type: 'release_model_error', payload: serializeError(error) };
      ctx.postMessage(response);
    } finally {
      markJobComplete(id);
    }
    return;
  }

  if (type === 'generate_network') {
    registerJob(id);
    const jobEntry = jobStates.get(id);
    if (!jobEntry) return; // Should not happen
    (async () => {
      try {
        if (!payload || typeof payload !== 'object') {
          throw new Error('Generate network payload missing');
        }

        const p = payload as { model: BNGLModel; options?: NetworkGeneratorOptions };
        const { model, options } = p;

        if (!model) {
          throw new Error('Model missing in generate_network payload');
        }

        // Convert BNGLModel to graph structures (instrumented)
        console.log('[generate_network handler] seed species raw:', model.species.map(s => s.name));
        const seedSpecies = model.species.map(s => {
          console.log('[generate_network handler] parsing seed:', s.name);
          const graph = BNGLParser.parseSpeciesGraph(s.name);
          console.log('[generate_network handler] parsed graph =>', BNGLParser.speciesGraphToString(graph));
          return graph;
        });
        ensureNotCancelled(id);

        const formatSpeciesList = (list: string[]) => (list.length > 0 ? list.join(' + ') : '0');

        const rules = model.reactionRules.map(r => {
          const rate = model.parameters[r.rate] ?? parseFloat(r.rate);
          const ruleStr = `${formatSpeciesList(r.reactants)} ${r.isBidirectional ? '<->' : '->'} ${formatSpeciesList(r.products)}`;
          return BNGLParser.parseRxnRule(ruleStr, rate);
        });
        ensureNotCancelled(id);

        // Use the controller from jobStates
        const controller = jobEntry.controller!;

        // Set up progress callback to stream to main thread (throttled to 4Hz)
        let lastProgressTime = 0;
        const progressCallback = (progress: GeneratorProgress) => {
          const now = Date.now();
          if (now - lastProgressTime >= 250) { // 250ms = 4Hz
            lastProgressTime = now;
            ctx.postMessage({ id, type: 'generate_network_progress', payload: progress });
          }
        };

        // Instantiate NetworkGenerator with options
        const generatorOptions = {
          maxSpecies: options?.maxSpecies ?? 10000,
          maxReactions: options?.maxReactions ?? 100000,
          maxIterations: options?.maxIterations ?? 100,
          maxAgg: options?.maxAgg ?? 500,
          maxStoich: options?.maxStoich ?? 500,
          checkInterval: options?.checkInterval ?? 500,
          memoryLimit: options?.memoryLimit ?? 1e9,
        } satisfies NetworkGeneratorOptions;

        const generator = new NetworkGenerator(generatorOptions);

        // Generate network
        const result = await generator.generate(seedSpecies, rules, progressCallback, controller.signal);
        ensureNotCancelled(id);

        // Convert result back to BNGLModel
        const generatedModel: BNGLModel = {
          ...model,
          species: result.species.map(s => ({ name: BNGLParser.speciesGraphToString(s.graph), initialConcentration: s.concentration || 0 })),
          reactions: result.reactions.map(r => ({
            reactants: r.reactants.map(idx => BNGLParser.speciesGraphToString(result.species[idx].graph)),
            products: r.products.map(idx => BNGLParser.speciesGraphToString(result.species[idx].graph)),
            rate: r.rate.toString(),
            rateConstant: r.rate
          })),
        };
        ensureNotCancelled(id);

        const response: WorkerResponse = { id, type: 'generate_network_success', payload: generatedModel };
        ctx.postMessage(response);
      } catch (error) {
        const response: WorkerResponse = { id, type: 'generate_network_error', payload: serializeError(error) };
        ctx.postMessage(response);
      } finally {
        markJobComplete(id);
      }
    })();
    return;
  }

  console.warn('[Worker] Unknown message type received:', type);
});

export {};
