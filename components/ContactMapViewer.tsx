import React, { useEffect, useRef } from 'react';
import cytoscape from 'cytoscape';
import type { ContactMap } from '../types/visualization';

interface ContactMapViewerProps {
  contactMap: ContactMap;
  selectedRuleId?: string | null;
  onSelectRule?: (ruleId: string) => void;
}

const BASE_LAYOUT = {
  name: 'cose',
  animate: false,
  padding: 20,
} as const;

export const ContactMapViewer: React.FC<ContactMapViewerProps> = ({ contactMap, selectedRuleId, onSelectRule }) => {
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
            'text-max-width': '70px',
            'background-color': '#2563EB',
            color: '#ffffff',
            'font-size': '12px',
            width: 80,
            height: 80,
          },
        },
        {
          selector: 'edge',
          style: {
            width: 3,
            'curve-style': 'bezier',
            'line-color': '#94A3B8',
            'target-arrow-color': '#94A3B8',
            'target-arrow-shape': 'triangle',
            label: 'data(label)',
            'font-size': '10px',
            'text-rotation': 'autorotate',
          },
        },
        {
          selector: 'edge[type = "binding"]',
          style: {
            'line-color': '#F97316',
            'target-arrow-color': '#F97316',
          },
        },
        {
          selector: 'edge[type = "state_change"]',
          style: {
            'line-color': '#0EA5E9',
            'target-arrow-color': '#0EA5E9',
            'line-style': 'dashed',
          },
        },
        {
          selector: '.highlighted',
          style: {
            'border-width': 4,
            'border-color': '#0ea5e9',
            'line-color': '#0ea5e9',
            'target-arrow-color': '#0ea5e9',
            'transition-property': 'border-width, border-color, line-color, target-arrow-color',
            'transition-duration': 150,
          },
        },
      ],
      layout: { ...BASE_LAYOUT },
    });

    return () => {
      cyRef.current?.destroy();
      cyRef.current = null;
    };
  }, []);

  // Refresh tap handlers whenever the callback changes
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) {
      return;
    }

    cy.off('tap', 'edge');
    cy.on('tap', 'edge', (event) => {
      const edge = event.target;
      const ruleIds = edge.data('ruleIds') as string[] | undefined;
      if (ruleIds && ruleIds.length > 0) {
        onSelectRule?.(ruleIds[0]);
      }
    });
  }, [onSelectRule]);

  // Update elements and layout whenever the contact map changes
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) {
      return;
    }

    const elements = [
      ...contactMap.nodes.map((node) => ({
        data: { id: node, label: node },
      })),
      ...contactMap.edges.map((edge, index) => ({
        data: {
          id: `edge-${index}`,
          source: edge.from,
          target: edge.to,
          label: edge.componentPair ? `${edge.componentPair[0]}-${edge.componentPair[1]}` : '',
          type: edge.interactionType,
          ruleIds: edge.ruleIds,
          ruleLabels: edge.ruleLabels,
        },
      })),
    ];

    cy.batch(() => {
      cy.elements().remove();
      cy.add(elements);
    });

    cy.layout({ ...BASE_LAYOUT }).run();
  }, [contactMap]);

  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) {
      return;
    }

    cy.elements().removeClass('highlighted');
    if (!selectedRuleId) {
      return;
    }

    cy.edges().forEach((edge) => {
      const ruleIds = edge.data('ruleIds') as string[] | undefined;
      if (ruleIds && ruleIds.includes(selectedRuleId)) {
        edge.addClass('highlighted');
        edge.connectedNodes().addClass('highlighted');
      }
    });
  }, [selectedRuleId, contactMap]);

  return <div ref={containerRef} className="h-96 w-full rounded-lg border border-stone-200 bg-white dark:border-slate-700 dark:bg-slate-900" />;
};
