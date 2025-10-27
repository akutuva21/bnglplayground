import React, { useRef, useEffect } from 'react';

interface MonacoEditorProps {
  value: string;
  onChange: (value: string) => void;
  language?: string;
  theme?: 'light' | 'dark';
}

declare const window: any;

let monacoLoadPromise: Promise<any> | null = null;

function loadMonaco() {
  if (monacoLoadPromise) {
    return monacoLoadPromise;
  }
  
  monacoLoadPromise = new Promise((resolve, reject) => {
    if (window.monaco) {
      resolve(window.monaco);
      return;
    }
    
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs/loader.js';
    script.async = true;
    script.onload = () => {
      window.require.config({ paths: { vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs' } });
      window.require(['vs/editor/editor.main'], () => {
        resolve(window.monaco);
      });
    };
    script.onerror = reject;
    document.head.appendChild(script);
  });
  
  return monacoLoadPromise;
}

export const MonacoEditor: React.FC<MonacoEditorProps> = ({ 
  value, 
  onChange, 
  language = 'bngl', 
  theme = 'light' 
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const monacoRef = useRef<any>(null);
  const editorInstanceRef = useRef<any>(null);
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // Effect 1: Create/dispose editor when language or theme changes
  useEffect(() => {
    let isCancelled = false;
    let editor: any = null;

    loadMonaco().then(monaco => {
      if (isCancelled || !editorRef.current) return;
      monacoRef.current = monaco;

      // Register BNGL language once
      if (!monaco.languages.getLanguages().some(({ id }: {id: string}) => id === 'bngl')) {
        monaco.languages.register({ id: 'bngl' });
        monaco.languages.setMonarchTokensProvider('bngl', {
          keywords: [
            'begin', 'end', 'model', 'parameters', 'molecule', 'types', 'seed',
            'species', 'observables', 'functions', 'reaction', 'rules', 'actions',
            'generate_network', 'simulate', 'method', 't_end', 'n_steps', 'ode', 'ssa',
            'overwrite'
          ],
          tokenizer: {
            root: [
              [/#.*$/, 'comment'],
              [/[a-zA-Z_]\w*/, {
                cases: {
                  '@keywords': 'keyword',
                  '@default': 'identifier'
                }
              }],
              [/([a-zA-Z_]\w*)\s*\(/, 'type.identifier'],
              [/\d+(\.\d+)?(e[+-]?\d+)?/, 'number'],
              [/->|<->/, 'operator'],
              [/[()\[\]{},.!~+@]/, 'delimiter'],
            ],
          },
        });
      }

      // Create editor
      editor = monaco.editor.create(editorRef.current, {
        value,
        language,
        theme: theme === 'dark' ? 'vs-dark' : 'vs',
        automaticLayout: true,
        minimap: { enabled: false },
        wordWrap: 'on',
        fontSize: 13,
        lineNumbers: 'on',
        scrollBeyondLastLine: false,
      });
      
      editorInstanceRef.current = editor;

      editor.onDidChangeModelContent(() => {
        onChangeRef.current(editor.getValue());
      });
    }).catch(error => {
      if (!isCancelled) {
        console.error("Failed to initialize Monaco Editor:", error);
      }
    });

    return () => {
      isCancelled = true;
      if (editor) {
        try {
          editor.dispose();
        } catch (e) {
          console.warn('Error disposing Monaco editor:', e);
        }
      }
      editorInstanceRef.current = null;
    };
  }, [language, theme, value]);  // ← CRITICAL: Must include 'value'

  // Effect 2: Sync external value changes
  useEffect(() => {
    const editor = editorInstanceRef.current;
    if (editor && editor.getValue() !== value) {
      const model = editor.getModel();
      if (model) {
        model.setValue(value);
      }
    }
  }, [value]);

  return <div ref={editorRef} className="w-full h-full border border-stone-300 dark:border-slate-700 rounded-md" />;
};

export default MonacoEditor;