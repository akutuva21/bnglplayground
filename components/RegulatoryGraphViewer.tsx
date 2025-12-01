import React, { useEffect, useRef, useState } from 'react';
import { useTheme } from '../hooks/useTheme';
import cytoscape from 'cytoscape';
import type { RegulatoryGraph } from '../types/visualization';
import { Button } from './ui/Button';
import { LoadingSpinner } from './ui/LoadingSpinner';

interface RegulatoryGraphViewerProps {
  graph: RegulatoryGraph;
  onSelectRule?: (ruleId: string) => void;
}

const BASE_LAYOUT = {
  name: 'cose',
  animate: false,
  padding: 20,
  nodeDimensionsIncludeLabels: true,
  // Tuning for better separation
  componentSpacing: 100,
  nodeRepulsion: 10000,
  idealEdgeLength: 150,
  edgeElasticity: 100,
  nestingFactor: 5,
} as const;

export const RegulatoryGraphViewer: React.FC<RegulatoryGraphViewerProps> = ({ graph, onSelectRule }) => {
  const [theme] = useTheme();
  const [isLayoutRunning, setIsLayoutRunning] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const cyRef = useRef<cytoscape.Core | null>(null);

  // Create the Cytoscape instance once the container mounts
  useEffect(() => {
    if (!containerRef.current || cyRef.current) {
      return;
    }

    cyRef.current = cytoscape({
      container: containerRef.current,
      elements: [],
      style: [
        {
          selector: 'node',
          style: {
            label: 'data(label)',
            'text-wrap': 'wrap',
            'text-halign': 'center',
            'text-valign': 'center',
            'text-max-width': '100px',
            'font-size': '12px',
          },
        },
        {
          selector: 'node[type = "species"]',
          style: {
            'background-opacity': 0,
            'text-background-color': '#FFE9C7', // Light Orange
            'text-background-opacity': 1,
            'text-background-shape': 'roundrectangle',
            'text-background-padding': '10px',
            'text-border-color': '#999999',
            'text-border-width': 1,
            'text-border-opacity': 1,
            color: '#000000',
            width: 60, // Fixed hit area for dragging
            height: 40,
            'text-valign': 'center',
            'text-halign': 'center',
          },
        },
        {
          selector: 'node[type = "rule"]',
          style: {
            'background-opacity': 0,
            'text-background-color': '#CC99FF', // Light Purple
            'text-background-opacity': 1,
            'text-background-shape': 'roundrectangle',
            'text-background-padding': '10px',
            'text-border-color': '#999999',
            'text-border-width': 1,
            'text-border-opacity': 1,
            color: '#000000',
            width: 60, // Fixed hit area for dragging
            height: 40,
            'text-valign': 'center',
            'text-halign': 'center',
          },
        },
        {
          selector: 'edge',
          style: {
            width: 2,
            'curve-style': 'bezier',
            'target-arrow-shape': 'triangle',
          },
        },
        {
          selector: 'edge[type = "reactant"]',
          style: {
            'line-color': '#000000',
            'target-arrow-color': '#000000',
          },
        },
        {
          selector: 'edge[type = "product"]',
          style: {
            'line-color': '#000000',
            'target-arrow-color': '#000000',
          },
        },
        {
          selector: 'edge[type = "catalyst"]',
          style: {
            'line-color': '#AAAAAA', // Grey
            'target-arrow-color': '#AAAAAA',
          },
        },
      ],
      layout: { ...BASE_LAYOUT },
    });

    return () => {
      cyRef.current?.destroy();
      cyRef.current = null;
    };
  }, [theme]);

  // Refresh tap handlers
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;

    cy.off('tap');
    cy.on('tap', 'node[type = "rule"]', (event) => {
      const node = event.target;
      onSelectRule?.(node.id());
    });

    cy.on('tap', 'edge', (event) => {
      const edge = event.target;
      const source = edge.source();
      const target = edge.target();

      // If connected to a rule node, select that rule
      if (source.data('type') === 'rule') {
        onSelectRule?.(source.id());
      } else if (target.data('type') === 'rule') {
        onSelectRule?.(target.id());
      }
    });

  }, [onSelectRule]);

  // Update elements and layout whenever the graph changes
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) {
      return;
    }

    const elements = [
      ...graph.nodes.map((node) => ({
        data: {
          id: node.id,
          label: node.label,
          type: node.type,
          tooltip: node.label, // Store full label for tooltip if needed
        },
      })),
      ...graph.edges.map((edge, index) => ({
        data: {
          id: `edge-${index}`,
          source: edge.from,
          target: edge.to,
          type: edge.type,
        },
      })),
    ];

    cy.batch(() => {
      cy.elements().remove();
      cy.add(elements);
    });

    // Run layout with a slight delay to ensure container size is correct
    setTimeout(() => {
      runLayout();
    }, 50);

  }, [graph]);

  const runLayout = () => {
    const cy = cyRef.current;
    if (!cy) return;

    setIsLayoutRunning(true);
    try {
      const layout = cy.layout({
        name: 'cose',
        animate: true,
        randomize: false,
        fit: true,
        padding: 30,
        nodeDimensionsIncludeLabels: true,
        tile: true,
      } as any);
      layout.run();
      layout.on('layoutstop', () => setIsLayoutRunning(false));
    } catch (err) {
      console.error('Layout failed', err);
      setIsLayoutRunning(false);
    }
  };

  const handleFit = () => {
    const cy = cyRef.current;
    if (!cy) return;
    cy.fit(undefined, 30);
  };

  const handleExportPNG = () => {
    const cy = cyRef.current;
    if (!cy) return;
    try {
      const blob = cy.png({ output: 'blob', scale: 2, full: true }) as Blob;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'regulatory_graph.png';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export PNG failed', err);
    }
  };

  return (
    <div className="flex flex-col h-full gap-2">
      {/* Toolbar */}
      <div className="flex justify-end gap-2 bg-white dark:bg-slate-900 p-1 rounded-md border border-slate-200 dark:border-slate-700">
        <Button variant="subtle" onClick={handleFit} className="text-xs h-8 px-3">Fit View</Button>
        <Button variant="subtle" onClick={() => runLayout()} disabled={isLayoutRunning} className="text-xs h-8 px-3">
          {isLayoutRunning ? <LoadingSpinner className="w-4 h-4" /> : 'Re-Layout'}
        </Button>
        <Button variant="primary" onClick={handleExportPNG} className="text-xs h-8 px-3">Export PNG</Button>
      </div>

      {/* Graph Container */}
      <div className="relative flex-1 min-h-[500px] w-full rounded-lg border border-stone-200 bg-white dark:border-slate-700 dark:bg-slate-900 overflow-hidden">
        <div ref={containerRef} className="absolute inset-0 z-0" />
      </div>

      {/* Legend Box */}
      <div className="flex items-center gap-4 bg-white dark:bg-slate-900 p-2 rounded-md border border-slate-200 dark:border-slate-700">
        <h4 className="text-xs font-semibold text-slate-500 uppercase">Legend</h4>
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-[#FFE9C7] border border-[#999999]" />
            <span className="text-slate-700 dark:text-slate-300">Species / Pattern</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-[#CC99FF] border border-[#999999]" />
            <span className="text-slate-700 dark:text-slate-300">Rule</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-0 border-t-2 border-black" />
            <span className="text-slate-700 dark:text-slate-300">Reactant / Product</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-0 border-t-2 border-[#AAAAAA]" />
            <span className="text-slate-700 dark:text-slate-300">Catalyst / Modifier</span>
          </div>
        </div>
      </div>
    </div>
  );
};
