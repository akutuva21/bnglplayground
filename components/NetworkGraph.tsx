
import React, { useEffect, useRef, useState, useMemo } from 'react';
import cytoscape from 'cytoscape';
import cola from 'cytoscape-cola';
import coseBilkent from 'cytoscape-cose-bilkent';
import type { BNGLModel, SimulationResults } from '../types';
import { CHART_COLORS } from '../constants';
import { Button } from './ui/Button';
import { Tooltip } from './ui/Tooltip';
import { Input } from './ui/Input';
import { SearchIcon } from './icons/SearchIcon';
import { LoadingSpinner } from './ui/LoadingSpinner';

cytoscape.use(cola);
cytoscape.use(coseBilkent);

type LayoutName = 'cose' | 'cola' | 'circle' | 'grid';
type ColorMode = 'default' | 'moleculeType' | 'concentration';
type EdgeMode = 'uniform' | 'rate';

interface NetworkGraphProps {
  model: BNGLModel | null;
  results: SimulationResults | null;
}

const lowConcColor = '#90e0ef'; // light blue
const highConcColor = '#f94144'; // red

function interpolateColor(color1: string, color2: string, factor: number) {
    const r1 = parseInt(color1.substring(1, 3), 16);
    const g1 = parseInt(color1.substring(3, 5), 16);
    const b1 = parseInt(color1.substring(5, 7), 16);
    const r2 = parseInt(color2.substring(1, 3), 16);
    const g2 = parseInt(color2.substring(3, 5), 16);
    const b2 = parseInt(color2.substring(5, 7), 16);
    const r = Math.round(r1 + factor * (r2 - r1));
    const g = Math.round(g1 + factor * (g2 - g1));
    const b = Math.round(b1 + factor * (b2 - b1));
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

export const NetworkGraph: React.FC<NetworkGraphProps> = ({ model, results }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<cytoscape.Core | null>(null);
  const [layout, setLayout] = useState<LayoutName>('cose');
  const [colorMode, setColorMode] = useState<ColorMode>('default');
  const [edgeMode, setEdgeMode] = useState<EdgeMode>('uniform');
  const [concRange, setConcRange] = useState<{min: number, max: number} | null>(null);
  const [tooltip, setTooltip] = useState<{content: string, x: number, y: number} | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const isMountedRef = useRef(false);

  const modelDerivedData = useMemo(() => {
    if (!model) return null;

    const speciesToMoleculeType = new Map<string, string>();
    const moleculeTypes = new Set<string>();
    model.species.forEach(s => {
        const type = s.name.split('(')[0];
        speciesToMoleculeType.set(s.name, type);
        moleculeTypes.add(type);
    });

    const typeColorMap = new Map<string, string>();
    [...moleculeTypes].forEach((type, i) => {
        typeColorMap.set(type, CHART_COLORS[i % CHART_COLORS.length]);
    });

    const allRates = model.reactions.map(r => r.rateConstant).filter(r => r > 0);
    const minRate = allRates.length > 0 ? Math.min(...allRates) : 0;
    const maxRate = allRates.length > 0 ? Math.max(...allRates) : 0;

    return { speciesToMoleculeType, typeColorMap, minRate, maxRate };
  }, [model]);

  const handleSearch = () => {
    const cy = cyRef.current;
    if (!cy || !searchTerm) return;

    cy.elements().style({ 'border-width': 0, 'opacity': 1 });

    const nodes = cy.nodes(`[id @* "${searchTerm}"]`);
    if (nodes.length > 0) {
        cy.animate({ center: { eles: nodes }, zoom: 2 }, { duration: 500 });
        nodes.style({ 'border-width': 4, 'border-color': '#f97316' });
    }
  };
  
  const resetView = () => {
      const cy = cyRef.current;
      if (!cy) return;
      cy.fit(undefined, 30);
      cy.elements().style({ 'opacity': 1, 'border-width': 0 });
      setSearchTerm('');
  };

  useEffect(() => {
  isMountedRef.current = true;

  if (!model || !containerRef.current) {
    // mark unmounted before destroying
    isMountedRef.current = false;
    cyRef.current?.destroy();
    cyRef.current = null;
    return;
  }

    const elements = model.species.map(s => ({
        data: { id: s.name, label: s.name.replace(/\./g, '.\n') },
    }));

    model.reactions.forEach(r => {
        r.reactants.forEach(reactant => {
            r.products.forEach(product => {
                if (model.species.find(s => s.name === reactant) && model.species.find(s => s.name === product)) {
                    elements.push({ data: { source: reactant, target: product, rate: r.rateConstant } } as any);
                }
            });
        });
    });

    cyRef.current = cytoscape({
      container: containerRef.current,
      elements: elements,
      style: [
        {
          selector: 'node',
            style: {
            'label': 'data(label)',
            'color': 'white',
            'text-outline-color': '#333',
            'text-outline-width': 2,
            'font-size': 10,
            'text-valign': 'center', 'text-halign': 'center',
            'width': 60, 'height': 60,
            'text-wrap': 'wrap',
            // FIX: The type definition for 'text-max-width' expects a string, so the number has been converted to a string.
            'text-max-width': '80px',
            'border-width': 0, 'border-color': '#f97316',
            'transition-property': 'background-color, opacity, border-width',
            // FIX: Changed string value with units to a number to avoid potential type errors.
            'transition-duration': 300,
          }
        },
        {
          selector: 'edge',
          style: {
            'line-color': '#ccc', 'target-arrow-color': '#ccc',
            'target-arrow-shape': 'triangle', 'curve-style': 'bezier',
            'transition-property': 'width, line-color, target-arrow-color, opacity',
            // FIX: Changed string value with units to a number to avoid potential type errors.
            'transition-duration': 300,
          }
        }
      ],
    });

    const cy = cyRef.current;

  cy.on('tap', 'node', (event) => {
    const node = event.target;
    // Use direct style updates for instant changes to opacity
    cy.elements().style('opacity', 0.2);
    node.neighborhood().add(node).style('opacity', 1);
  });

  cy.on('tap', (event) => {
    if (event.target === cy) {
      cy.elements().style('opacity', 1);
    }
  });

    cy.on('mouseover', 'node, edge', (event) => {
        const target = event.target;
        const content = target.isNode() ? `<b>Species:</b> ${target.id()}` : `<b>Rate:</b> ${target.data('rate')}`;
        setTooltip({ content, x: event.renderedPosition.x, y: event.renderedPosition.y });
    });
    cy.on('mouseout', 'node, edge', () => setTooltip(null));
    cy.on('drag', 'node', () => setTooltip(null));
    cy.on('zoom pan', () => setTooltip(null));

  return () => {
    isMountedRef.current = false;
    cyRef.current?.destroy();
    cyRef.current = null;
  };
  }, [model]);

  useEffect(() => {
    const cy = cyRef.current;
    if (!cy || !model || !modelDerivedData) return;

    if (colorMode === 'concentration' && results) {
      const finalTimePoint = results.data[results.data.length - 1];
      if (finalTimePoint) {
        const concentrations = model.species.map(s => finalTimePoint[s.name]).filter(c => typeof c !== 'undefined') as number[];
        const minConc = concentrations.length > 0 ? Math.min(...concentrations) : 0;
        const maxConc = concentrations.length > 0 ? Math.max(...concentrations) : 0;
        setConcRange({min: minConc, max: maxConc});

        cy.nodes().forEach(node => {
          const name = node.id();
          const conc = finalTimePoint[name];
          let color = '#ccc';
          if (typeof conc !== 'undefined' && conc !== null) {
              const factor = maxConc > minConc ? (conc - minConc) / (maxConc - minConc) : 0.5;
              color = interpolateColor(lowConcColor, highConcColor, factor);
          }
          node.style('background-color', color);
        });
      }
    } else if (colorMode === 'moleculeType') {
      setConcRange(null);
      cy.nodes().forEach(node => {
        const name = node.id();
        const type = modelDerivedData.speciesToMoleculeType.get(name);
        const color = type ? modelDerivedData.typeColorMap.get(type) : '#ccc';
        node.style('background-color', color);
      });
    } else {
      setConcRange(null);
      cy.nodes().forEach((node, i) => {
        node.style('background-color', CHART_COLORS[i % CHART_COLORS.length]);
      });
    }

    if (edgeMode === 'rate') {
      const { minRate, maxRate } = modelDerivedData;
      cy.edges().forEach(edge => {
        const rate = edge.data('rate');
        let width = 2;
        if (typeof rate !== 'undefined' && rate !== null && maxRate > minRate) {
          width = 1 + ((rate - minRate) / (maxRate - minRate)) * 7;
        } else if (maxRate > 0 && maxRate === minRate) {
            width = 4;
        }
        edge.style('width', width);
      });
    } else {
      cy.edges().style('width', 2);
    }
    
    // Run layout asynchronously so the spinner can render and the UI stays responsive
    if (isMountedRef.current) setLoading(true);
    const layoutOptions = { name: layout === 'cose' || layout === 'cola' ? 'cose-bilkent' : layout, animate: true, animationDuration: 500, padding: 30, nodeRepulsion: 4500, idealEdgeLength: 100, edgeLength: 120 } as any;
    const layoutInstance = cy.layout(layoutOptions);
    const onLayoutStop = () => {
      if (!isMountedRef.current) return;
      setLoading(false);
      layoutInstance.removeListener('layoutstop', onLayoutStop);
    };
    layoutInstance.on('layoutstop', onLayoutStop);
    // schedule the run to allow react to paint the loading state
    const t = window.setTimeout(() => layoutInstance.run(), 10);

    // cleanup for this layout run
    return () => {
      layoutInstance.stop();
      layoutInstance.removeListener('layoutstop', onLayoutStop);
      clearTimeout(t);
    };
  }, [model, results, colorMode, edgeMode, layout, modelDerivedData]);

  if (!model) {
      return (
        <div className="h-96 flex items-center justify-center text-slate-500 bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-700 rounded-lg">
            Parse a model to generate network graph.
        </div>
      );
  }

  return (
    <div className="w-full flex flex-col">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-2 p-2 bg-slate-50 dark:bg-slate-800 border border-stone-200 dark:border-slate-700 rounded-md">
            <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Layout:</span>
                <Button variant={layout === 'cose' ? 'secondary' : 'ghost'} onClick={() => setLayout('cose')} className="text-xs px-2 py-1">Cose</Button>
                <Button variant={layout === 'cola' ? 'secondary' : 'ghost'} onClick={() => setLayout('cola')} className="text-xs px-2 py-1">Cola</Button>
                <Button variant={layout === 'circle' ? 'secondary' : 'ghost'} onClick={() => setLayout('circle')} className="text-xs px-2 py-1">Circle</Button>
            </div>
             <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Node Color:</span>
                <Button variant={colorMode === 'moleculeType' ? 'secondary' : 'ghost'} onClick={() => setColorMode('moleculeType')} className="text-xs px-2 py-1">Type</Button>
                <Tooltip content={!results ? "Run simulation to enable" : "Color by final concentration"}>
                    <span className={!results ? 'cursor-not-allowed' : ''}>
                        <Button variant={colorMode === 'concentration' ? 'secondary' : 'ghost'} onClick={() => setColorMode('concentration')} disabled={!results} className="text-xs px-2 py-1">Conc.</Button>
                    </span>
                </Tooltip>
            </div>
             <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Edge Width:</span>
                <Button variant={edgeMode === 'uniform' ? 'secondary' : 'ghost'} onClick={() => setEdgeMode('uniform')} className="text-xs px-2 py-1">Uniform</Button>
                <Button variant={edgeMode === 'rate' ? 'secondary' : 'ghost'} onClick={() => setEdgeMode('rate')} className="text-xs px-2 py-1">Rate</Button>
            </div>
             <div className="lg:col-span-2 xl:col-span-1 flex items-center gap-2">
                 <Input 
                    type="text" 
                    placeholder="Find species..." 
                    className="h-8 text-xs" 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                 />
                 <Button onClick={handleSearch} variant="secondary" className="text-xs px-2 py-1 h-8"><SearchIcon className="w-4 h-4"/></Button>
            </div>
             <div className="flex items-center gap-2">
                 <Button onClick={resetView} variant="subtle" className="text-xs px-2 py-1 h-8">Reset View</Button>
            </div>
        </div>
        <div className="relative w-full">
            <div ref={containerRef} className="w-full h-96 border border-stone-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900" />
            {tooltip && (
                <div 
                    style={{ position: 'absolute', top: tooltip.y, left: tooltip.x, pointerEvents: 'none' }}
                    className="p-1 px-2 bg-slate-800 text-white text-xs rounded-md shadow-lg z-10 transform -translate-y-full -translate-x-1/2"
                    dangerouslySetInnerHTML={{ __html: tooltip.content }}
                />
            )}
            <div className="absolute bottom-2 right-2 flex flex-col items-end gap-2">
              {colorMode === 'concentration' && concRange && results && (
                  <div className="bg-white/80 dark:bg-slate-800/80 p-2 rounded-md shadow-lg text-slate-800 dark:text-slate-200">
                      <div className="text-xs font-bold mb-1 text-center">Concentration</div>
                      <div className="flex items-center gap-2">
                          <span className="text-xs w-12 text-left">{concRange.min.toPrecision(2)}</span>
                          <div className="w-24 h-3 rounded-full" style={{ background: `linear-gradient(to right, ${lowConcColor}, ${highConcColor})` }}></div>
                          <span className="text-xs w-12 text-right">{concRange.max.toPrecision(2)}</span>
                      </div>
                  </div>
              )}
            </div>
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/60 dark:bg-slate-900/60 rounded-lg z-20">
                <div className="flex flex-col items-center gap-2">
                  <LoadingSpinner className="w-12 h-12" />
                  <div className="text-xs text-slate-700 dark:text-slate-200">Laying out network...</div>
                </div>
              </div>
            )}
             <div className="absolute bottom-2 left-2 flex flex-col items-start gap-2">
                {colorMode === 'moleculeType' && modelDerivedData && (
                    <div className="bg-white/80 dark:bg-slate-800/80 p-2 rounded-md shadow-lg">
                        <div className="text-xs font-bold mb-1 text-slate-800 dark:text-slate-200">Molecule Types</div>
                        <div className="flex flex-col gap-1 max-h-32 overflow-y-auto">
                            {[...modelDerivedData.typeColorMap.entries()].map(([type, color]) => (
                                <div key={type} className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }}></div>
                                    <span className="text-xs text-slate-800 dark:text-slate-200">{type}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    </div>
  );
};
