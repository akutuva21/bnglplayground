import React from 'react';
import { useTheme } from '../hooks/useTheme';
import { MoonIcon } from './icons/MoonIcon';
import { SunIcon } from './icons/SunIcon';
import { Button } from './ui/Button';
import { AboutModal } from './AboutModal';

interface HeaderProps {
    onAboutClick: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onAboutClick }) => {
  const [theme, toggleTheme] = useTheme();

  return (
    <header className="bg-white dark:bg-slate-800 border-b border-stone-200 dark:border-slate-700 shadow-sm sticky top-0 z-40">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-3">
          <div className="flex items-center gap-2">
            <div className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded bg-white shadow-sm ring-1 ring-slate-200 dark:bg-slate-700 dark:ring-slate-600">
              <img
                src="/bnglplayground/logo.jpg"
                alt="BioNetGen Visualizer logo"
                className="h-full w-full object-contain object-center"
                loading="lazy"
              />
            </div>
            <div className="flex flex-col">
              <h1 className="text-xl font-semibold leading-tight text-slate-800 dark:text-slate-100 sm:text-2xl">BioNetGen Visualizer</h1>
              <p className="text-sm text-slate-500 dark:text-slate-300 sm:text-base">Explore, simulate, and understand rule-based biological models</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Button onClick={onAboutClick} variant="ghost">About</Button>
            <button
              onClick={toggleTheme}
              className="p-2 rounded-full text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700"
              aria-label="Toggle theme"
            >
              {theme === 'light' ? <MoonIcon className="w-6 h-6" /> : <SunIcon className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
