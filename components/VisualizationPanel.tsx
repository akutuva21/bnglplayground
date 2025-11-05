import React, { useState } from 'react';
import { BNGLModel, SimulationOptions, SimulationResults } from '../types';
import { Tabs, TabList, Tab, TabPanels, TabPanel } from './ui/Tabs';
import { ResultsChart } from './ResultsChart';
import { StructureAnalysisTab } from './tabs/StructureAnalysisTab';
import { SteadyStateTab } from './tabs/SteadyStateTab';
import { ParameterScanTab } from './tabs/ParameterScanTab';
import { FIMTab } from './tabs/FIMTab';
import { CartoonTab } from './tabs/CartoonTab';
import { RegulatoryTab } from './tabs/RegulatoryTab';

interface VisualizationPanelProps {
  model: BNGLModel | null;
  results: SimulationResults | null;
  onSimulate: (options: SimulationOptions) => void;
  isSimulating: boolean;
  onCancelSimulation: () => void;
}

export const VisualizationPanel: React.FC<VisualizationPanelProps> = ({ model, results, onSimulate, isSimulating, onCancelSimulation }) => {
  const [visibleSpecies, setVisibleSpecies] = useState<Set<string>>(new Set());
  const [selectedRuleId, setSelectedRuleId] = useState<string | null>(null);

  React.useEffect(() => {
    if (model) {
      setVisibleSpecies(new Set(model.observables.map((o) => o.name)));
    } else {
      setVisibleSpecies(new Set());
    }
  }, [model]);

  React.useEffect(() => {
    if (!model || model.reactionRules.length === 0) {
      setSelectedRuleId(null);
      return;
    }

    setSelectedRuleId((prev) => {
      if (!prev) {
        return model.reactionRules[0].name ?? 'rule_1';
      }

      const hasRule = model.reactionRules.some((rule, index) => {
        const ruleId = rule.name ?? `rule_${index + 1}`;
        return ruleId === prev;
      });

      return hasRule ? prev : model.reactionRules[0].name ?? 'rule_1';
    });
  }, [model]);

  return (
    <div className="flex h-full min-w-0 flex-col overflow-hidden">
      <Tabs>
        <TabList>
          <Tab>Time Course</Tab>
          <Tab>Regulation</Tab>
          <Tab>Rule Cartoons</Tab>
          <Tab>Structure</Tab>
          <Tab>Steady State</Tab>
          <Tab>Parameter Scan</Tab>
          <Tab>Identifiability</Tab>
        </TabList>
        <TabPanels>
          <TabPanel>
            <ResultsChart results={results} model={model} visibleSpecies={visibleSpecies} onVisibleSpeciesChange={setVisibleSpecies} />
          </TabPanel>
          <TabPanel>
            <RegulatoryTab
              model={model}
              results={results}
              selectedRuleId={selectedRuleId}
              onSelectRule={setSelectedRuleId}
            />
          </TabPanel>
          <TabPanel>
            <CartoonTab model={model} selectedRuleId={selectedRuleId} onSelectRule={setSelectedRuleId} />
          </TabPanel>
          <TabPanel>
             <StructureAnalysisTab model={model} />
          </TabPanel>
          <TabPanel>
            <SteadyStateTab model={model} onSimulate={onSimulate} onCancelSimulation={onCancelSimulation} isSimulating={isSimulating} />
          </TabPanel>
          <TabPanel>
            <ParameterScanTab model={model} />
          </TabPanel>
          <TabPanel>
            <FIMTab model={model} />
          </TabPanel>
        </TabPanels>
      </Tabs>
    </div>
  );
};
