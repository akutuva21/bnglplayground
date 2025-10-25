import React, { useState } from 'react';
import { BNGLModel, SimulationOptions, SimulationResults } from '../types';
import { Tabs, TabList, Tab, TabPanels, TabPanel } from './ui/Tabs';
import { ResultsChart } from './ResultsChart';
import { NetworkGraph } from './NetworkGraph';
import { StructureAnalysisTab } from './tabs/StructureAnalysisTab';
import { SteadyStateTab } from './tabs/SteadyStateTab';
import { ParameterScanTab } from './tabs/ParameterScanTab';
import { CartoonTab } from './tabs/CartoonTab';

interface VisualizationPanelProps {
  model: BNGLModel | null;
  results: SimulationResults | null;
  onSimulate: (options: SimulationOptions) => void;
  isSimulating: boolean;
}

export const VisualizationPanel: React.FC<VisualizationPanelProps> = ({ model, results, onSimulate, isSimulating }) => {
  const [visibleSpecies, setVisibleSpecies] = useState<Set<string>>(new Set());

  React.useEffect(() => {
    if (model) {
      setVisibleSpecies(new Set(model.observables.map((o) => o.name)));
    } else {
      setVisibleSpecies(new Set());
    }
  }, [model]);

  return (
    <div className="h-full">
      <Tabs>
        <TabList>
          <Tab>Time Course</Tab>
          <Tab>Network Graph</Tab>
          <Tab>Rule Cartoons</Tab>
          <Tab>Structure</Tab>
          <Tab>Steady State</Tab>
          <Tab>Parameter Scan</Tab>
        </TabList>
        <TabPanels>
          <TabPanel>
            <ResultsChart results={results} model={model} visibleSpecies={visibleSpecies} onVisibleSpeciesChange={setVisibleSpecies} />
          </TabPanel>
          <TabPanel>
            <NetworkGraph model={model} results={results} />
          </TabPanel>
          <TabPanel>
            <CartoonTab model={model} />
          </TabPanel>
          <TabPanel>
             <StructureAnalysisTab model={model} />
          </TabPanel>
          <TabPanel>
            <SteadyStateTab model={model} onSimulate={onSimulate} isSimulating={isSimulating} />
          </TabPanel>
          <TabPanel>
            <ParameterScanTab model={model} />
          </TabPanel>
        </TabPanels>
      </Tabs>
    </div>
  );
};
