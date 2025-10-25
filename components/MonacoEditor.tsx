import React, { useRef, useEffect } from 'react';
import { useTheme } from '../hooks/useTheme';

declare const window: any;

// Use a module-level singleton promise to ensure the Monaco loader script is fetched and executed only once.
let monacoLoadPromise: Promise<any> | null = null;

function loadMonaco() {
  if (monacoLoadPromise) {
    return monacoLoadPromise;
  }

  monacoLoadPromise = new Promise((resolve, reject) => {
    // If Monaco is already available, resolve immediately.
    if (window.monaco) {
      resolve(window.monaco);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs/loader.js';
    script.async = true;

    script.onload = () => {
      window.require.config({
        paths: { 'vs': 'https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs' }
      });
      window.require(['vs/editor/editor.main'],
        (monaco: any) => {
          resolve(monaco);
        },
        (error: any) => {
          reject(error);
        }
      );
    };

    script.onerror = (error) => {
      reject(error);
    };

    document.body.appendChild(script);
  });

  return monacoLoadPromise;
}


interface MonacoEditorProps {
  value: string;
  language: string;
  onChange: (value: string | undefined) => void;
}

const MonacoEditor: React.FC<MonacoEditorProps> = ({ value, language, onChange }) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const editorInstanceRef = useRef<any>(null);
  const monacoRef = useRef<any>(null);
  const [theme] = useTheme();

  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);
  
  useEffect(() => {
    let isCancelled = false;
    let editor: any = null;

    loadMonaco().then(monaco => {
      if (isCancelled || !editorRef.current) return;

      monacoRef.current = monaco;

      // Register the custom BNGL language if it hasn't been already.
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
                    [/(\w+)\s*\(/, 'type.identifier'],
                    [/\d+(\.\d+)?(e[+-]?\d+)?/, 'number'],
                    [/->|<->/, 'operator'],
                    [/[()\[\]{},.!~+@]/, 'delimiter'],
                ],
            },
        });
      }

      // Create the editor instance
      editor = monaco.editor.create(editorRef.current, {
        value,
        language,
        theme: theme === 'dark' ? 'vs-dark' : 'vs',
        automaticLayout: true,
        minimap: { enabled: false },
        wordWrap: 'on',
      });
      
      editorInstanceRef.current = editor;

      // Attach the change listener
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
        editor.dispose();
      }
      editorInstanceRef.current = null;
    };
  }, []); // Empty dependency array ensures this effect runs only once.

  // Effect to update the editor's value when the `value` prop changes from outside
  useEffect(() => {
    const editor = editorInstanceRef.current;
    if (editor && editor.getValue() !== value) {
        const model = editor.getModel();
        if (model) {
            model.setValue(value);
        } else {
            editor.setValue(value);
        }
    }
  }, [value]);

  // Effect to update the theme
  useEffect(() => {
    if (monacoRef.current && editorInstanceRef.current) {
      monacoRef.current.editor.setTheme(theme === 'dark' ? 'vs-dark' : 'vs');
    }
  }, [theme]);

  return <div ref={editorRef} className="w-full h-full border border-stone-300 dark:border-slate-700 rounded-md" />;
};

export default MonacoEditor;