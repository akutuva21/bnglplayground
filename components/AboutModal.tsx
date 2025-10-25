import React from 'react';
import { Modal } from './ui/Modal';

interface AboutModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose }) => {
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="About BioNetGen Playground">
            <div className="prose dark:prose-invert max-w-none">
                <p>
                    This is an interactive web-based playground for the BioNetGen Language (BNGL), a language for specifying rule-based models of biochemical systems.
                </p>
                <p>
                    You can write, edit, and simulate BNGL models directly in your browser. The application provides visualizations of simulation results and the underlying reaction network.
                </p>
                <h4>Features:</h4>
                <ul>
                    <li>BNGL code editor with example gallery.</li>
                    <li>ODE-based simulation performed in a web worker.</li>
                    <li>Interactive time-course plots of species concentrations.</li>
                    <li>Network graph visualization of species and reactions.</li>
                    <li>Steady-state finder that automatically stops when concentrations converge.</li>
                </ul>
                <p>
                    This project is for educational and demonstration purposes. The BNGL parser and simulator are simplified and may not support all features of the official BioNetGen software.
                </p>
            </div>
        </Modal>
    );
};
