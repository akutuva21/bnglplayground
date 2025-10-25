import React, { createContext, useContext, useState, Children } from 'react';

interface TabsContextType {
  activeIndex: number;
  setActiveIndex: (index: number) => void;
}

const TabsContext = createContext<TabsContextType | null>(null);

export const Tabs: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  return (
    <TabsContext.Provider value={{ activeIndex, setActiveIndex }}>
      <div>{children}</div>
    </TabsContext.Provider>
  );
};

export const TabList: React.FC<{ children: React.ReactNode[] | React.ReactNode }> = ({ children }) => {
  const context = useContext(TabsContext);
  if (!context) throw new Error('TabList must be used within a Tabs component');

  return (
    <div className="border-b border-stone-200 dark:border-slate-700">
      <nav className="-mb-px flex space-x-6 overflow-x-auto" aria-label="Tabs">
        {Children.map(children, (child, index) =>
          React.cloneElement(child as React.ReactElement<TabProps>, {
            isActive: index === context.activeIndex,
            onClick: () => context.setActiveIndex(index),
          })
        )}
      </nav>
    </div>
  );
};

interface TabProps {
  children: React.ReactNode;
  isActive?: boolean;
  onClick?: () => void;
}

export const Tab: React.FC<TabProps> = ({ children, isActive, onClick }) => {
  const activeClasses = 'border-primary text-primary dark:text-primary-400';
  const inactiveClasses = 'border-transparent text-slate-500 hover:text-slate-700 hover:border-stone-300 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:border-slate-600';
  return (
    <button
      onClick={onClick}
      className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors ${isActive ? activeClasses : inactiveClasses}`}
    >
      {children}
    </button>
  );
};

export const TabPanels: React.FC<{ children: React.ReactNode[] | React.ReactNode }> = ({ children }) => {
  const context = useContext(TabsContext);
  if (!context) throw new Error('TabPanels must be used within a Tabs component');
  
  return <div className="mt-4">{Children.toArray(children)[context.activeIndex]}</div>;
};

export const TabPanel: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <div>{children}</div>;
};
