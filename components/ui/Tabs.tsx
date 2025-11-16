import React, { createContext, useContext, useState, Children } from 'react';

interface TabsContextType {
  activeIndex: number;
  setActiveIndex: (index: number) => void;
}

const TabsContext = createContext<TabsContextType | null>(null);

export const Tabs: React.FC<{ children: React.ReactNode; activeIndex?: number; onActiveIndexChange?: (idx: number) => void }> = ({ children, activeIndex: activeIndexProp, onActiveIndexChange }) => {
  const [activeIndex, setActiveIndex] = useState(activeIndexProp ?? 0);
  React.useEffect(() => {
    if (typeof activeIndexProp === 'number' && activeIndexProp !== activeIndex) {
      setActiveIndex(activeIndexProp);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndexProp]);
  return (
    <TabsContext.Provider value={{ activeIndex, setActiveIndex }}>
      <div className="flex h-full min-h-0 flex-col">{children}</div>
    </TabsContext.Provider>
  );
};

export const TabList: React.FC<{ children: React.ReactNode[] | React.ReactNode }> = ({ children }) => {
  const context = useContext(TabsContext);
  if (!context) throw new Error('TabList must be used within a Tabs component');
  const { activeIndex, setActiveIndex } = context;

  return (
    <div className="border-b border-stone-200 dark:border-slate-700">
      <nav className="-mb-px flex space-x-6 overflow-x-auto" aria-label="Tabs">
        {Children.map(children, (child, index) =>
          React.cloneElement(child as React.ReactElement<TabProps>, {
            isActive: index === activeIndex,
            onClick: () => {
              setActiveIndex(index);
              if (onActiveIndexChange) onActiveIndexChange(index);
            },
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

  return <div className="mt-4 flex-1 min-h-0 overflow-hidden">{Children.toArray(children)[context.activeIndex]}</div>;
};

export const TabPanel: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <div>{children}</div>;
};
