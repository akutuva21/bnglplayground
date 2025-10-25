import React from 'react';
import { ReactionRule } from '../../types';

interface RuleCartoonProps {
  rule: ReactionRule;
}

const renderMolecule = (mol: string) => {
    // A very basic visualization
    const parts = mol.split('(');
    const name = parts[0];
    const sites = parts[1]?.replace(')', '').split(',').map(s => s.trim()).filter(Boolean) || [];

    return (
        <div className="flex items-center gap-1 p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-slate-100 dark:bg-slate-800">
            <span className="font-bold text-primary-600 dark:text-primary-400">{name}</span>
            {sites.length > 0 && <div className="flex gap-1">
                {sites.map(site => {
                     const isBound = site.includes('!');
                     const state = site.includes('~') ? site.split('~')[1] : null;
                     const siteName = site.split('~')[0].split('!')[0];
                     return <div key={siteName} className={`px-2 py-0.5 text-xs rounded-full ${isBound ? 'bg-red-200 dark:bg-red-800' : 'bg-green-200 dark:bg-green-800'}`}>{siteName}{state && `~${state}`}</div>
                })}
            </div>}
        </div>
    )
}

export const RuleCartoon: React.FC<RuleCartoonProps> = ({ rule }) => {
  return (
    <div className="p-4 border border-stone-200 dark:border-slate-700 rounded-lg">
        <div className="flex items-center justify-center gap-4 flex-wrap">
           <div className="flex items-center gap-2">
            {rule.reactants.map((r, i) => (
                <React.Fragment key={i}>
                    {renderMolecule(r)}
                    {i < rule.reactants.length - 1 && <span className="text-2xl font-light text-slate-400">+</span>}
                </React.Fragment>
            ))}
           </div>
           <div className="flex flex-col items-center">
            <span className="text-sm font-mono text-slate-500">{rule.rate}</span>
            <svg className="w-12 h-6" viewBox="0 0 24 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M1 6H22M22 6L17 1M22 6L17 11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            {rule.isBidirectional && rule.reverseRate && <>
                 <svg className="w-12 h-6 rotate-180" viewBox="0 0 24 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M1 6H22M22 6L17 1M22 6L17 11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span className="text-sm font-mono text-slate-500">{rule.reverseRate}</span>
            </>}
           </div>
           <div className="flex items-center gap-2">
            {rule.products.map((p, i) => (
                <React.Fragment key={i}>
                    {renderMolecule(p)}
                    {i < rule.products.length - 1 && <span className="text-2xl font-light text-slate-400">+</span>}
                </React.Fragment>
            ))}
           </div>
        </div>
    </div>
  );
};
