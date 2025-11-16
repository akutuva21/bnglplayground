import React, { useMemo } from 'react';
import { BNGLModel } from '../../types';
import { RuleCartoon } from '../RuleCartoon';
import { CompactRuleVisualization } from '../CompactRuleVisualization';
import { parseRuleForVisualization } from '../../services/visualization/ruleParser';
import { buildCompactRule } from '../../services/visualization/compactRuleBuilder';
import { Tabs, TabList, Tab, TabPanels, TabPanel } from '../ui/Tabs';

interface CartoonTabProps {
  model: BNGLModel | null;
  selectedRuleId?: string | null;
  onSelectRule?: (ruleId: string) => void;
}

export const CartoonTab: React.FC<CartoonTabProps> = ({ model, selectedRuleId, onSelectRule }) => {
  const ruleDescriptors = useMemo(() => {
    if (!model) {
      return [];
    }

    return model.reactionRules.map((rule, index) => {
      const ruleId = rule.name ?? `rule_${index + 1}`;
      const displayName = rule.name ?? `Rule ${index + 1}`;

      return {
        id: ruleId,
        displayName,
        visualization: parseRuleForVisualization(rule, index),
        compact: buildCompactRule(rule, displayName),
      };
    });
  }, [model]);

  if (!model) {
    return <div className="text-slate-500 dark:text-slate-400">Parse a model to visualize reaction rules.</div>;
  }

  if (model.reactionRules.length === 0) {
    return <div className="text-slate-500 dark:text-slate-400">This model has no reaction rules defined.</div>;
  }

  return (
    <Tabs>
      <TabList>
        <Tab>Rule Cartoons</Tab>
        <Tab>Compact Rules</Tab>
      </TabList>
      <TabPanels>
        <TabPanel>
          <div className="mb-3 text-sm text-slate-600">Compact rule icons: 🔗 bind • ✂️ unbind • 🌀 state change</div>
          <div className="max-h-[60vh] space-y-6 overflow-y-auto pr-2">
            {ruleDescriptors.map((rule) => (
              <RuleCartoon
                key={rule.id}
                ruleId={rule.id}
                displayName={rule.displayName}
                rule={rule.visualization}
                isSelected={rule.id === selectedRuleId}
                onSelect={onSelectRule}
              />
            ))}
          </div>
        </TabPanel>
        <TabPanel>
          <div className="max-h-[60vh] space-y-4 overflow-y-auto pr-2">
            {ruleDescriptors.map((rule) => (
              <CompactRuleVisualization
                key={rule.id}
                rule={rule.compact}
                ruleId={rule.id}
                displayName={rule.displayName}
                isSelected={rule.id === selectedRuleId}
                onSelect={onSelectRule}
              />
            ))}
          </div>
        </TabPanel>
      </TabPanels>
    </Tabs>
  );
};
