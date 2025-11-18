import React from 'react';
import { Modal } from './ui/Modal';
import { MoleculeGlyph } from './MoleculeGlyph';
import type { VisualizationMolecule } from '../types/visualization';

interface VisualizationConventionsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const exampleMol: VisualizationMolecule = {
  name: 'A',
  components: [
    { name: 'a', state: 'U', bondLabel: '!1', bondRequirement: 'bound' },
    { name: 'b', state: undefined, bondLabel: undefined, bondRequirement: 'free' },
    { name: 'c', state: 'P', bondRequirement: 'either' },
  ],
  color: '#f97316',
};

export const VisualizationConventionsModal: React.FC<VisualizationConventionsModalProps> = ({ isOpen, onClose }) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Visualization conventions">
      <div className="prose max-w-none dark:prose-invert">
        <h4>Hashed colors</h4>
        <p>Each molecule's color is deterministically derived from its name to make it consistent across diagrams.</p>
        <h4>Sites & states</h4>
        <p>Internal states (e.g. ~P) are shown inline next to the site name using site glyphs.</p>
        <h4>Bond requirements</h4>
        <p>Small glyphs under sites show whether the rule requires a bond (🔗), a free site (–), or either (?).</p>
        <div className="mt-3">
          <MoleculeGlyph molecule={exampleMol} showBondLabels={true} />
        </div>
      </div>
    </Modal>
  );
};

export default VisualizationConventionsModal;
