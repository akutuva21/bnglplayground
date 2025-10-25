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
            <svg width="32" height="32" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" className="text-primary">
                <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="10"/>
                <path d="M25 50 A 25 25 0 0 1 75 50" fill="none" stroke="currentColor" strokeWidth="8"/>
                <path d="M50 25 A 25 25 0 0 1 50 75" fill="none" stroke="currentColor" strokeWidth="8"/>
            </svg>
            <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">BioNetGen Playground</h1>
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
