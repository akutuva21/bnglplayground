import React from 'react';
import { useTheme } from '../hooks/useTheme';
import { MoonIcon } from './icons/MoonIcon';
import { SunIcon } from './icons/SunIcon';
import { EmailIcon } from './icons/EmailIcon';
import { Button } from './ui/Button';

interface HeaderProps {
  onAboutClick: (focus?: string) => void;
  onTutorialsClick: () => void;
  tutorialPill?: string | null;
  onExportSBML?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onAboutClick, onTutorialsClick, tutorialPill = null, onExportSBML }) => {
  const [theme, toggleTheme] = useTheme();

  return (
    <header className="bg-white dark:bg-slate-800 border-b border-stone-200 dark:border-slate-700 shadow-sm sticky top-0 z-40">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-3">
          <div className="flex items-center gap-2">
            <div className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded bg-white shadow-sm ring-1 ring-slate-200 dark:bg-slate-700 dark:ring-slate-600">
              <img
                src="/bngplayground/logo.jpg"
                alt="BioNetGen Visualizer logo"
                className="h-full w-full object-contain object-center"
                loading="lazy"
              />
            </div>
            <div className="flex flex-col">
              <h1 className="text-xl font-semibold leading-tight text-slate-800 dark:text-slate-100 sm:text-2xl">BioNetGen Playground</h1>
              <p className="text-sm text-slate-500 dark:text-slate-300 sm:text-base">Write BNGL, parse models, simulate ODE/SSA, and visualize the results.</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Button onClick={onTutorialsClick} variant="ghost">Tutorials</Button>
            {tutorialPill && (
              <span className="ml-2 text-xs inline-flex items-center rounded bg-primary-100 dark:bg-primary-900/30 px-2 py-0.5 text-primary-800 dark:text-primary-200">{tutorialPill}</span>
            )}
            <Button onClick={() => onAboutClick('bngl')} variant="ghost">
              What is BNGL?
            </Button>
            <Button onClick={() => onAboutClick('viz')} variant="ghost">Viz conventions</Button>
            <Button onClick={() => onAboutClick()} variant="ghost">About</Button>
            <div className="text-xs text-slate-500 dark:text-slate-300 leading-tight">
              New here? Start with <strong>Simple Dimerization</strong> → Simulate
            </div>
            <a
              href="mailto:bionetgen.main@gmail.com?subject=BNG%20Playground%20Question"
              className="p-2 rounded-full text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-teal-600 dark:hover:text-teal-400 transition-colors"
              aria-label="Email us with questions"
              title="Questions? Email bionetgen.main@gmail.com"
            >
              <EmailIcon className="w-6 h-6" />
            </a>
            <button
              onClick={toggleTheme}
              className="p-2 rounded-full text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700"
              aria-label="Toggle theme"
            >
              {theme === 'light' ? <MoonIcon className="w-6 h-6" /> : <SunIcon className="w-6 h-6" />}
            </button>
            <Button onClick={onExportSBML} variant="ghost">Export SBML</Button>
          </div>
        </div>
      </div>
    </header>
  );
};
