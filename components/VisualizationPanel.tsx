import React, { useState } from 'react';
import { BNGLModel, SimulationOptions, SimulationResults } from '../types';
import { Tabs, TabList, Tab, TabPanels, TabPanel } from './ui/Tabs';

import { Button } from './ui/Button';
import { ResultsChart } from './ResultsChart';
import { ContactMapTab } from './tabs/ContactMapTab';
import { SteadyStateTab } from './tabs/SteadyStateTab';
import { FIMTab } from './tabs/FIMTab';
import { CartoonTab } from './tabs/CartoonTab';
import { RegulatoryTab } from './tabs/RegulatoryTab';

interface VisualizationPanelProps {
  model: BNGLModel | null;
  results: SimulationResults | null;
  onSimulate: (options: SimulationOptions) => void;
  isSimulating: boolean;
  onCancelSimulation: () => void;
  activeTabIndex?: number;
  onActiveTabIndexChange?: (idx: number) => void;
}

export const VisualizationPanel: React.FC<VisualizationPanelProps> = ({ model, results, onSimulate, isSimulating, onCancelSimulation, activeTabIndex, onActiveTabIndexChange }) => {
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
    <div className="flex min-w-0 flex-col gap-4">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <Tabs activeIndex={activeTabIndex} onActiveIndexChange={onActiveTabIndexChange}>
            <TabList>
              <Tab>Time Courses</Tab>
              <Tab>Contact Map</Tab>
              <Tab>Regulatory Graph</Tab>
              <Tab>Rule Cartoons</Tab>
              <Tab>Identifiability</Tab>
              <Tab>Steady State</Tab>

            </TabList>
            <TabPanels>
              <TabPanel>
                <div className="mb-3 text-sm text-slate-600">Time Courses – plot observables vs time</div>
                <ResultsChart results={results} model={model} visibleSpecies={visibleSpecies} onVisibleSpeciesChange={setVisibleSpecies} />
              </TabPanel>
              <TabPanel>
                <div className="mb-3 text-sm text-slate-600">Contact Map – visualization of molecule interactions</div>
                <ContactMapTab model={model} onSelectRule={setSelectedRuleId} />
              </TabPanel>
              <TabPanel>
                <div className="mb-3 text-sm text-slate-600">Regulatory Graph – how rules influence molecular states</div>
                <RegulatoryTab
                  model={model}
                  results={results}
                  selectedRuleId={selectedRuleId}
                  onSelectRule={setSelectedRuleId}
                />
              </TabPanel>
              <TabPanel>
                <div className="mb-3 text-sm text-slate-600">Rule Cartoons – compact visualization of rules and their effects</div>
                <CartoonTab model={model} selectedRuleId={selectedRuleId} onSelectRule={setSelectedRuleId} />
              </TabPanel>
              <TabPanel>
                <div className="mb-3 text-sm text-slate-600">Identifiability – which parameters can be estimated from the data</div>
                <FIMTab model={model} />
              </TabPanel>
              <TabPanel>
                <SteadyStateTab model={model} onSimulate={onSimulate} onCancelSimulation={onCancelSimulation} isSimulating={isSimulating} />
              </TabPanel>

            </TabPanels>
          </Tabs>
        </div>

      </div>
    </div>
  );
};
