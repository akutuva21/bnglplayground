import React, { useState, useMemo } from 'react';
import { Modal } from './ui/Modal';
import { Card } from './ui/Card';
import { Input } from './ui/Input';
import { SearchIcon } from './icons/SearchIcon';
import { EXAMPLES } from '../constants';

interface ExampleGalleryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (code: string) => void;
}

const allTags = [...new Set(EXAMPLES.flatMap(ex => ex.tags))];

export const ExampleGalleryModal: React.FC<ExampleGalleryModalProps> = ({ isOpen, onClose, onSelect }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [focusedExample, setFocusedExample] = useState<string | null>(null);

  const filteredExamples = useMemo(() => {
    return EXAMPLES.filter(example => {
      const searchMatch =
        example.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        example.description.toLowerCase().includes(searchTerm.toLowerCase());
      
      const tagMatch = selectedTags.size === 0 || [...selectedTags].every(tag => example.tags.includes(tag));
      
      return searchMatch && tagMatch;
    });
  }, [searchTerm, selectedTags]);

  React.useEffect(() => {
    if (!isOpen) {
      setFocusedExample(null);
    }
  }, [isOpen]);
  
  const handleTagClick = (tag: string) => {
      const newTags = new Set(selectedTags);
      if (newTags.has(tag)) {
          newTags.delete(tag);
      } else {
          newTags.add(tag);
      }
      setSelectedTags(newTags);
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Example Model Gallery" size="3xl">
      <div className="mt-4">
        <div className="flex flex-col md:flex-row gap-4 mb-4">
          <div className="relative flex-grow">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <Input 
              type="text" 
              placeholder="Search examples..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-2 mb-6 border-b border-stone-200 dark:border-slate-700 pb-4">
            {allTags.map(tag => (
                <button 
                  key={tag}
                  onClick={() => handleTagClick(tag)}
                  className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                      selectedTags.has(tag) 
                      ? 'bg-primary text-white' 
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-600'
                  }`}
                >
                    {tag}
                </button>
            ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 max-h-[75vh] overflow-y-auto pr-2">
          {filteredExamples.length > 0 ? filteredExamples.map(example => (
            <Card key={example.id} className="flex flex-col">
              <div className="flex items-center justify-between">
                {focusedExample === example.id ? (
                  <div className="text-xs text-primary">Focused</div>
                ) : (
                  <div className="text-xs text-slate-500">&nbsp;</div>
                )}
              </div>
              <div className="flex-grow">
                <h3 className="font-semibold text-slate-800 dark:text-slate-100">{example.name}</h3>
                <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">{example.description}</p>
                <div className="flex flex-wrap gap-1 mt-3">
                    {example.tags.map(tag => (
                        <span key={tag} className="px-2 py-0.5 text-xs bg-primary-100 dark:bg-primary-900/50 text-primary-800 dark:text-primary-300 rounded-full">{tag}</span>
                    ))}
                </div>
              </div>
                <button 
                onClick={() => onSelect(example.code)}
                className="mt-4 w-full text-center px-4 py-2 text-sm font-semibold bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-md transition-colors text-slate-800 dark:text-slate-100"
              >
                Load Example
              </button>
            </Card>
          )) : (
              <p className="text-slate-500 dark:text-slate-400 col-span-full text-center">No examples match your criteria.</p>
          )}
        </div>
      </div>
    </Modal>
  );
};


