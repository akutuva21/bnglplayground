import { BNGLParser } from '../../src/services/graph/core/BNGLParser';
import type { SpeciesGraph } from '../../src/services/graph/core/SpeciesGraph';
import type {
  VisualizationComponent,
  VisualizationMolecule,
} from '../../types/visualization';
import { colorFromName, foregroundForBackground } from './colorUtils';

export interface BondInfo {
  key: string;
  mol1: string;
  mol2: string;
  comp1: string;
  comp2: string;
  label?: string;
}

export interface StateSnapshot {
  molecule: string;
  component: string;
  state?: string;
}

export const parseSpeciesGraphs = (patterns: string[]): SpeciesGraph[] => {
  return patterns.map((pattern) => BNGLParser.parseSpeciesGraph(pattern, true));
};

export const buildVisualizationMolecule = (
  graph: SpeciesGraph,
  molIdx: number,
): VisualizationMolecule => {
  const molecule = graph.molecules[molIdx];

  const components: VisualizationComponent[] = molecule.components.map((component, compIdx) => {
    const visualComponent: VisualizationComponent = {
      name: component.name,
    };

    if (component.state) {
      visualComponent.state = component.state;
    }

    // translate BNGL wildcard bond hints into a UI-friendly bond requirement
    if (component.wildcard) {
      switch (component.wildcard) {
        case '+':
          visualComponent.bondRequirement = 'bound';
          break;
        case '?':
          visualComponent.bondRequirement = 'either';
          break;
        case '-':
          visualComponent.bondRequirement = 'free';
          break;
        default:
          visualComponent.bondRequirement = null;
      }
    } else {
      visualComponent.bondRequirement = null;
    }

    const bonds = Array.from(component.edges.entries());
    if (bonds.length > 0) {
      const partnerKey = graph.adjacency.get(`${molIdx}.${compIdx}`);
      if (partnerKey) {
        const [partnerMolIdxStr, partnerCompIdxStr] = partnerKey.split('.');
        const partnerMolIdx = Number.parseInt(partnerMolIdxStr, 10);
        const partnerCompIdx = Number.parseInt(partnerCompIdxStr, 10);
        const partnerMolecule = graph.molecules[partnerMolIdx];
        const partnerComponent = partnerMolecule?.components[partnerCompIdx];
        if (partnerMolecule && partnerComponent) {
          const match = bonds.find(([, targetCompIdx]) => targetCompIdx === partnerCompIdx);
          const bondLabel = match ? match[0] : bonds[0]?.[0];
          if (bondLabel !== undefined) {
            visualComponent.bondLabel = `!${bondLabel}`;
            visualComponent.bondPartner = `${partnerMolecule.name}:${partnerComponent.name}`;
          }
        }
      }
    }

    return visualComponent;
  });

    // set a molecule color and derive text color for good contrast
    const color = colorFromName(molecule.name);
    const fg = foregroundForBackground(color);

    return {
      name: molecule.name,
      components,
      color,
      // expose a human readable text color so svg/cytoscape can pick readable labels
      textColor: fg,
    } as VisualizationMolecule & { textColor?: string };
};

export const convertSpeciesGraph = (graph: SpeciesGraph): VisualizationMolecule[] => {
  return graph.molecules.map((_, molIdx) => buildVisualizationMolecule(graph, molIdx));
};

export const extractBonds = (graphs: SpeciesGraph[]): Map<string, BondInfo> => {
  const bonds = new Map<string, BondInfo>();

  graphs.forEach((graph) => {
    graph.molecules.forEach((molecule, molIdx) => {
      molecule.components.forEach((component, compIdx) => {
        const partnerKey = graph.adjacency.get(`${molIdx}.${compIdx}`);
        if (!partnerKey) {
          return;
        }

        const [partnerMolIdxStr, partnerCompIdxStr] = partnerKey.split('.');
        const partnerMolIdx = Number.parseInt(partnerMolIdxStr, 10);
        const partnerCompIdx = Number.parseInt(partnerCompIdxStr, 10);

        if (
          Number.isNaN(partnerMolIdx) ||
          Number.isNaN(partnerCompIdx) ||
          (partnerMolIdx === molIdx && partnerCompIdx === compIdx)
        ) {
          return;
        }

        if (partnerMolIdx < molIdx || (partnerMolIdx === molIdx && partnerCompIdx < compIdx)) {
          return;
        }

        const partnerMolecule = graph.molecules[partnerMolIdx];
        const partnerComponent = partnerMolecule?.components[partnerCompIdx];
        if (!partnerMolecule || !partnerComponent) {
          return;
        }

        const endpoints = [
          `${molecule.name}:${component.name}`,
          `${partnerMolecule.name}:${partnerComponent.name}`,
        ].sort();
        const key = endpoints.join('|');

        let bondLabel: string | undefined;
        component.edges.forEach((targetCompIdx, edgeLabel) => {
          if (targetCompIdx === partnerCompIdx) {
            bondLabel = `!${edgeLabel}`;
          }
        });

        bonds.set(key, {
          key,
          mol1: molecule.name,
          mol2: partnerMolecule.name,
          comp1: component.name,
          comp2: partnerComponent.name,
          label: bondLabel,
        });
      });
    });
  });

  return bonds;
};

export const snapshotComponentStates = (graphs: SpeciesGraph[]): Map<string, StateSnapshot> => {
  const states = new Map<string, StateSnapshot>();

  graphs.forEach((graph) => {
    graph.molecules.forEach((molecule) => {
      molecule.components.forEach((component) => {
        const key = `${molecule.name}:${component.name}`;
        if (!states.has(key)) {
          states.set(key, {
            molecule: molecule.name,
            component: component.name,
            state: component.state,
          });
        }
      });
    });
  });

  return states;
};

export const extractAtoms = (graphs: SpeciesGraph[]): Set<string> => {
  const atoms = new Set<string>();

  const states = snapshotComponentStates(graphs);
  states.forEach((snapshot) => {
    if (snapshot.state) {
      atoms.add(`${snapshot.molecule}.${snapshot.component}~${snapshot.state}`);
    }
  });

  const bonds = extractBonds(graphs);
  bonds.forEach((bond) => {
    atoms.add(`bond:${bond.key}`);
  });

  return atoms;
};
