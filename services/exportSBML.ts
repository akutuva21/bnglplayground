import type { BNGLModel } from '../types';

export const exportToSBML = (model: BNGLModel): string => {
  const xmlParts: string[] = [];
  xmlParts.push(`<?xml version="1.0" encoding="UTF-8"?>`);
  xmlParts.push(`<sbml xmlns="http://www.sbml.org/sbml/level3/version1/core" level="3" version="1">`);
  xmlParts.push(`<model id="bngl_export" name="BioNetGen Export">`);
  xmlParts.push(`<listOfCompartments>`);

  // Collect compartments from model.compartments if provided; otherwise use default
  const compartments = new Set<string>();
  if (model.compartments && model.compartments.length) {
    model.compartments.forEach((c) => compartments.add(c.name));
  } else {
    compartments.add('default');
  }

  if (compartments.size === 0) compartments.add('default');
  compartments.forEach((c) => {
    xmlParts.push(`<compartment id="${c}" size="1" constant="true"/>`);
  });

  xmlParts.push(`</listOfCompartments>`);
  xmlParts.push(`<listOfSpecies>`);

  (model.species || []).forEach((s, i) => {
    const id = `s${i}`;
    const name = s.name.replace(/"/g, '');
    const init = Number.isFinite(s.initialConcentration) ? s.initialConcentration : 0;
    xmlParts.push(
      `  <species id="${id}" name="${name}" compartment="default" initialConcentration="${init}" hasOnlySubstanceUnits="false" boundaryCondition="false" constant="false"/>`
    );
  });

  xmlParts.push(`</listOfSpecies>`);
  xmlParts.push(`<listOfReactions>`);

  (model.reactions || []).forEach((r, i) => {
    const rid = `r${i}`;
    xmlParts.push(`  <reaction id="${rid}" reversible="false" fast="false">`);
    xmlParts.push(`    <listOfReactants>`);
    (r.reactants || []).forEach((reactName) => {
      const sIdx = (model.species || []).findIndex((s) => s.name === reactName);
      if (sIdx < 0) return;
      xmlParts.push(`      <speciesReference species="s${sIdx}" stoichiometry="1" constant="true"/>`);
    });
    xmlParts.push(`    </listOfReactants>`);
    xmlParts.push(`    <listOfProducts>`);
    (r.products || []).forEach((prodName) => {
      const sIdx = (model.species || []).findIndex((s) => s.name === prodName);
      if (sIdx < 0) return;
      xmlParts.push(`      <speciesReference species="s${sIdx}" stoichiometry="1" constant="true"/>`);
    });
    xmlParts.push(`    </listOfProducts>`);

    // Kinetic law (mass action) - naive
    xmlParts.push(`    <kineticLaw>`);
    xmlParts.push(`      <math xmlns="http://www.w3.org/1998/Math/MathML">`);
    xmlParts.push(`        <apply><times/>`);
    xmlParts.push(`          <ci> k${i} </ci>`);
    (r.reactants || []).forEach((reactName) => {
      const sIdx = (model.species || []).findIndex((s) => s.name === reactName);
      if (sIdx < 0) return;
      xmlParts.push(`          <ci> s${sIdx} </ci>`);
    });
    xmlParts.push(`        </apply>`);
    xmlParts.push(`      </math>`);
    xmlParts.push(`    </kineticLaw>`);
    xmlParts.push(`  </reaction>`);
  });

  xmlParts.push(`</listOfReactions>`);
  xmlParts.push(`</model>`);
  xmlParts.push(`</sbml>`);

  return xmlParts.join('\n');
};

export default exportToSBML;
