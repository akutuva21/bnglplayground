import React, { useEffect, useRef, useState } from 'react';
import { useTheme } from '../hooks/useTheme';
import cytoscape from 'cytoscape';
import type { ContactMap } from '../types/visualization';
import { Button } from './ui/Button';
import { LoadingSpinner } from './ui/LoadingSpinner';
import { colorFromName, foregroundForBackground } from '../services/visualization/colorUtils';

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
            'text-max-width': '70px',
            'font-size': '12px',
          },
        },
        {
          selector: 'node[type = "molecule"]',
          style: {
            'background-color': '#D2D2D2', // Match BNG2 molecule color
            'border-color': '#000000',
            'border-width': 1,
            'text-valign': 'top',
            'text-halign': 'center',
            label: 'data(label)',
            shape: 'round-rectangle',
            padding: '10px',
            'font-size': 12,
            'font-weight': 600,
            color: '#000000',
          },
        },
        {
          selector: 'node[type = "compartment"]',
          style: {
            'background-color': '#eef2ff',
            'border-color': '#6366f1',
            'border-width': 2,
            'text-valign': 'top',
            'text-halign': 'center',
            label: 'data(label)',
            shape: 'round-rectangle',
            padding: '12px',
            'font-size': 13,
            'font-weight': 700,
          },
        },
        {
          selector: 'node[type = "component"]',
          style: {
            'background-color': '#E8E8E8', // Light grey instead of white to be visible
            'border-color': '#000000',
            'border-width': 1,
            width: 24,
            height: 24,
            label: 'data(label)',
            'font-size': 10,
            shape: 'round-rectangle',
            color: '#000000',
          },
        },
        {
          selector: 'node[color]',
          style: {
            'background-color': 'data(color)',
            color: 'data(fgColor)',
          },
        },
        {
          selector: 'edge',
          style: {
            width: 3,
            'curve-style': 'bezier',
            'line-color': theme === 'dark' ? '#94A3B8' : '#94A3B8',
            'target-arrow-color': theme === 'dark' ? '#94A3B8' : '#94A3B8',
            'target-arrow-shape': 'triangle',
            // edge labels are handled below for edges that have a label
          },
        },
        {
          selector: 'edge[label]',
          style: {
            label: 'data(label)',
            'text-rotation': 'autorotate',
            'font-size': '10px',
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
  }, [theme]);

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
        data: {
          id: node.id,
          label: node.label,
          parent: node.parent,
          type: node.type,
          color: node.type === 'molecule' ? colorFromName(node.label) : '#fbbf24',
          fgColor: node.type === 'molecule' ? foregroundForBackground(colorFromName(node.label)) : '#0f172a',
        },
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

  const runLayout = async () => {
    const cy = cyRef.current;
    if (!cy) return;

    setIsLayoutRunning(true);
    let useFcose = false;
    try {
    // Try dynamic import of cytoscape-fcose (optional); if present, register it
    // @ts-ignore - optional dependency, types may not exist
    const fcose = await import('cytoscape-fcose');
      const plugin = (fcose as any).default ?? fcose;
      if (plugin) cytoscape.use(plugin);
      useFcose = true;
    } catch (e) {
      // ignore if fcose is not installed
      // eslint-disable-next-line no-console
      console.debug('fcose not found; falling back to cose layout');
      useFcose = false;
    }

    try {
      const layout = cy.layout({
        name: useFcose ? 'fcose' : 'cose',
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
      // eslint-disable-next-line no-console
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
      a.download = 'contact_map.png';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Export PNG failed', err);
    }
  };

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
        edge.connectedNodes().parents().addClass('highlighted');
      }
    });
  }, [selectedRuleId, contactMap]);

  return (
    <div className="flex flex-col h-full gap-2">
      {/* Toolbar */}
      <div className="flex justify-end gap-2 bg-white dark:bg-slate-900 p-1 rounded-md border border-slate-200 dark:border-slate-700">
        <Button variant="subtle" onClick={handleFit} className="text-xs h-8 px-3">Fit View</Button>
        <Button variant="subtle" onClick={() => runLayout()} disabled={isLayoutRunning} className="text-xs h-8 px-3">
          {isLayoutRunning ? <LoadingSpinner className="w-4 h-4" /> : 'Re-Layout'}
        </Button>
        <Button variant="primary" onClick={handleExportPNG} className="text-xs h-8 px-3">Export PNG</Button>
        <Button variant="subtle" onClick={async () => {
          // Try to export SVG; fall back to PNG if unsupported
          const cy = cyRef.current;
          if (!cy) return;

          try {
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            // @ts-ignore optional dependency
            const cySvg = await import('cytoscape-svg');
            const plugin = (cySvg as any).default ?? cySvg;
            if (plugin) cytoscape.use(plugin);
            // @ts-ignore - extension introduces svg() method
            const svgContent: string = cy.svg({ scale: 1, full: true });
            const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'contact_map.svg';
            a.click();
            URL.revokeObjectURL(url);
            return;
          } catch (svgErr) {
            // fallback to PNG
            try {
              const blob = cy.png({ output: 'blob', scale: 2, full: true }) as Blob;
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = 'contact_map.png';
              a.click();
              URL.revokeObjectURL(url);
              return;
            } catch (pngErr) {
              // eslint-disable-next-line no-console
              console.error('Export failed:', svgErr, pngErr);
            }
          }
        }} className="text-xs h-8 px-3">Export SVG</Button>
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
            <div className="w-3 h-3 rounded bg-slate-200 border border-slate-400" />
            <span className="text-slate-700 dark:text-slate-300">Molecule</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-amber-400 border border-amber-600" />
            <span className="text-slate-700 dark:text-slate-300">Component / Site</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-0 border-t-2 border-slate-400" />
            <span className="text-slate-700 dark:text-slate-300">Binding</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-0 border-t-2 border-blue-400 border-dashed" />
            <span className="text-slate-700 dark:text-slate-300">State Change</span>
          </div>
        </div>
      </div>
    </div>
  );
};
