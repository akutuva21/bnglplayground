import React, { useEffect, useRef } from 'react';
import cytoscape from 'cytoscape';
import type { AtomRuleGraph } from '../types/visualization';

interface ARGraphViewerProps {
  arGraph: AtomRuleGraph;
  selectedRuleId?: string | null;
  selectedAtomId?: string | null;
  onSelectRule?: (ruleId: string) => void;
  onSelectAtom?: (atomId: string) => void;
}

export const ARGraphViewer: React.FC<ARGraphViewerProps> = ({ arGraph, selectedRuleId, selectedAtomId, onSelectRule, onSelectAtom }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const cyRef = useRef<cytoscape.Core | null>(null);

  useEffect(() => {
    if (!containerRef.current) {
      return undefined;
    }

    const elements = [
      ...arGraph.nodes.map((node) => ({
        data: {
          id: node.id,
          label: node.label,
          type: node.type,
          details: node.details,
        },
      })),
      ...arGraph.edges.map((edge, index) => ({
        data: {
          id: `edge-${index}`,
          source: edge.from,
          target: edge.to,
          edgeType: edge.edgeType,
        },
      })),
    ];

    cyRef.current?.destroy();

    const cy = cytoscape({
      container: containerRef.current,
      elements,
      style: [
        {
          selector: 'node[type = "rule"]',
          style: {
            shape: 'round-rectangle',
            width: 110,
            height: 40,
            label: 'data(label)',
            'text-halign': 'center',
            'text-valign': 'center',
            'font-size': 11,
            'background-color': '#E15759',
            color: '#ffffff',
          },
        },
        {
          selector: 'node[type = "atom"]',
          style: {
            shape: 'ellipse',
            width: 90,
            height: 50,
            label: 'data(label)',
            'text-wrap': 'wrap',
            'text-max-width': '85px',
            'text-halign': 'center',
            'text-valign': 'center',
            'font-size': 11,
            'background-color': '#76B7B2',
            color: '#0f172a',
          },
        },
        {
          selector: 'edge',
          style: {
            width: 2,
            'curve-style': 'bezier',
            'target-arrow-shape': 'triangle',
            'font-size': 9,
            'line-color': '#94A3B8',
            'target-arrow-color': '#94A3B8',
          },
        },
        {
          selector: 'edge[edgeType = "produces"]',
          style: {
            'line-color': '#59A14F',
            'target-arrow-color': '#59A14F',
          },
        },
        {
          selector: 'edge[edgeType = "consumes"]',
          style: {
            'line-color': '#F28E2B',
            'target-arrow-color': '#F28E2B',
          },
        },
        {
          selector: 'edge[edgeType = "modifies"]',
          style: {
            'line-style': 'dashed',
            'line-color': '#4E79A7',
            'target-arrow-color': '#4E79A7',
          },
        },
        {
          selector: '.highlighted',
          style: {
            'border-width': 4,
            'border-color': '#0ea5e9',
            'line-color': '#0ea5e9',
            'target-arrow-color': '#0ea5e9',
          },
        },
      ],
      layout: {
        name: 'cose',
        animate: false,
        padding: 20,
      },
    });

    cy.on('tap', 'node[type = "rule"]', (event) => {
      const tappedId = event.target.id();
      onSelectRule?.(tappedId);
    });

    cy.on('tap', 'node[type = "atom"]', (event) => {
      const tappedId = event.target.id();
      onSelectAtom?.(tappedId);
    });

    cyRef.current = cy;

    return () => {
      cy.destroy();
      cyRef.current = null;
    };
  }, [arGraph, onSelectRule]);

  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) {
      return;
    }

    cy.elements().removeClass('highlighted');
    if (selectedRuleId) {
      const ruleNode = cy.getElementById(selectedRuleId);
      if (ruleNode && ruleNode.nonempty()) {
        ruleNode.addClass('highlighted');
        ruleNode.connectedEdges().addClass('highlighted');
        ruleNode.connectedEdges().sources().addClass('highlighted');
        ruleNode.connectedEdges().targets().addClass('highlighted');
      }
    }

    if (selectedAtomId) {
      const atomNode = cy.getElementById(selectedAtomId);
      if (atomNode && atomNode.nonempty()) {
        atomNode.addClass('highlighted');
        atomNode.connectedEdges().addClass('highlighted');
        atomNode.connectedEdges().sources().addClass('highlighted');
        atomNode.connectedEdges().targets().addClass('highlighted');
      }
    }
  }, [selectedRuleId, selectedAtomId]);

  const handleExport = () => {
    const cy = cyRef.current;
    if (!cy) {
      return;
    }

    const pngData = cy.png({ full: true, scale: 2 });
    const link = document.createElement('a');
    link.href = pngData;
    link.download = 'atom-rule-graph.png';
    link.click();
  };

  return (
    <div className="relative">
      <div className="absolute right-3 top-3 z-10">
        <button
          type="button"
          onClick={handleExport}
          className="rounded bg-slate-800 px-3 py-1 text-xs font-medium text-white shadow hover:bg-slate-700 dark:bg-slate-200 dark:text-slate-900 dark:hover:bg-slate-100"
        >
          Export PNG
        </button>
      </div>
      <div
        ref={containerRef}
        className="h-96 w-full rounded-lg border border-stone-200 bg-white dark:border-slate-700 dark:bg-slate-900"
      />
    </div>
  );
};
