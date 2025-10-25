import React, { useMemo } from 'react';
import { BNGLModel } from '../../types';
import { DataTable } from '../ui/DataTable';

interface StructureAnalysisTabProps {
  model: BNGLModel | null;
}

// FIX: Moved from bnglService.ts to resolve an import error.
/**
 * Calculates structural properties of the BNGL model's reaction network.
 * @param model The BNGLModel to analyze.
 * @returns An object containing connectivity and conservation law information.
 */
function calculateStructuralProperties(model: BNGLModel) {
  const connectivity: { species: string; degree: number }[] = [];
  const speciesDegree = new Map<string, number>();

  model.species.forEach(s => speciesDegree.set(s.name, 0));

  model.reactions.forEach(r => {
    const participants = new Set([...r.reactants, ...r.products]);
    participants.forEach(p => {
      if (speciesDegree.has(p)) {
        speciesDegree.set(p, speciesDegree.get(p)! + 1);
      }
    });
  });
  
  speciesDegree.forEach((degree, species) => {
    connectivity.push({ species, degree });
  });

  const conservationLaws: string[] = [];
  model.moleculeTypes.forEach(mt => {
    const relatedSpecies = model.species.filter(s => s.name.startsWith(mt.name + '(') || s.name === mt.name)
      .map(s => s.name);
    
    if (relatedSpecies.length > 1) {
      let isConserved = true;
      model.reactions.forEach(r => {
        const reactantsInGroup = r.reactants.some(reactant => relatedSpecies.includes(reactant));
        const productsInGroup = r.products.some(product => relatedSpecies.includes(product));
        
        if (reactantsInGroup || productsInGroup) {
          const allParticipants = new Set([...r.reactants, ...r.products]);
          for (const p of allParticipants) {
            if (!relatedSpecies.includes(p)) {
              isConserved = false;
              break;
            }
          }
        }
        if (!isConserved) return;
      });

      if (isConserved) {
        conservationLaws.push(`${mt.name}_total = ${relatedSpecies.join(' + ')}`);
      }
    }
  });

  return { connectivity, conservationLaws };
}


export const StructureAnalysisTab: React.FC<StructureAnalysisTabProps> = ({ model }) => {
  const structuralProperties = useMemo(() => {
    if (!model) return null;
    return calculateStructuralProperties(model);
  }, [model]);

  if (!model) {
    return <div className="text-slate-500 dark:text-slate-400">Parse a model to analyze its structure.</div>;
  }
  
  if (!structuralProperties) {
      return <div>Calculating properties...</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium mb-2 text-slate-800 dark:text-slate-200">Species Connectivity</h3>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
          The "degree" of a species is the number of reactions it participates in (as either a reactant or a product).
        </p>
        <DataTable
          headers={['Species', 'Degree']}
          rows={structuralProperties.connectivity.sort((a,b) => b.degree - a.degree).map(c => [c.species, c.degree])}
        />
      </div>
      <div>
        <h3 className="text-lg font-medium mb-2 text-slate-800 dark:text-slate-200">Conservation Laws (Approximated)</h3>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
          Lists of species whose total concentration remains constant throughout the simulation. This is a simplified analysis for basic cases.
        </p>
        {structuralProperties.conservationLaws.length > 0 ? (
            <ul className="list-disc list-inside bg-slate-100 dark:bg-slate-800 p-4 rounded-md text-slate-700 dark:text-slate-200 font-mono text-sm">
                {structuralProperties.conservationLaws.map((law, i) => (
                    <li key={i}>{law}</li>
                ))}
            </ul>
        ) : (
            <p className="text-slate-500 dark:text-slate-400">No simple conservation laws were detected.</p>
        )}
      </div>
    </div>
  );
};
