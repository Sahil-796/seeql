"use client";

import { useEffect, useRef, useCallback, useMemo } from "react";
import { EditorView, keymap, placeholder as placeholderExt, lineNumbers, highlightActiveLine, highlightActiveLineGutter } from "@codemirror/view";
import { EditorState, Compartment } from "@codemirror/state";
import { sql, SQLite } from "@codemirror/lang-sql";
import { oneDark } from "@codemirror/theme-one-dark";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { autocompletion, closeBrackets, closeBracketsKeymap } from "@codemirror/autocomplete";
import { linter, type Diagnostic, lintGutter } from "@codemirror/lint";
import { syntaxHighlighting, defaultHighlightStyle, bracketMatching } from "@codemirror/language";

interface SQLEditorProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: () => void;
  onValidationChange?: (isValid: boolean, errors: string[]) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  autoFocus?: boolean;
  theme?: "light" | "dark";
  tables?: { name: string; columns: string[] }[];
}

// SQL keywords that should start a valid statement
const VALID_STATEMENT_STARTS = [
  "SELECT", "INSERT", "UPDATE", "DELETE", "CREATE", "DROP", "ALTER",
  "TRUNCATE", "BEGIN", "COMMIT", "ROLLBACK", "WITH", "EXPLAIN"
];

// Basic SQL syntax validation
function validateSQL(code: string): { isValid: boolean; errors: Diagnostic[] } {
  const trimmed = code.trim();
  const errors: Diagnostic[] = [];
  
  if (!trimmed) {
    return { isValid: true, errors: [] }; // Empty is valid (nothing to run)
  }

  // Split by semicolons for multiple statements
  const statements = trimmed.split(/;/).filter(s => s.trim());
  
  for (const stmt of statements) {
    const stmtTrimmed = stmt.trim().toUpperCase();
    if (!stmtTrimmed) continue;

    // Check if statement starts with a valid keyword
    const startsValid = VALID_STATEMENT_STARTS.some(kw => stmtTrimmed.startsWith(kw));
    if (!startsValid) {
      const pos = code.indexOf(stmt.trim());
      errors.push({
        from: pos,
        to: pos + stmt.trim().split(/\s/)[0].length,
        severity: "error",
        message: `Invalid SQL: Statement must start with a valid keyword (SELECT, INSERT, CREATE, etc.)`
      });
    }

    // Check for unclosed parentheses
    const openParens = (stmt.match(/\(/g) || []).length;
    const closeParens = (stmt.match(/\)/g) || []).length;
    if (openParens !== closeParens) {
      const pos = code.indexOf(stmt.trim());
      errors.push({
        from: pos,
        to: pos + stmt.trim().length,
        severity: "error",
        message: `Unbalanced parentheses: ${openParens} open, ${closeParens} close`
      });
    }

    // Check for unclosed quotes
    const singleQuotes = (stmt.match(/'/g) || []).length;
    const doubleQuotes = (stmt.match(/"/g) || []).length;
    if (singleQuotes % 2 !== 0) {
      const pos = code.indexOf(stmt.trim());
      errors.push({
        from: pos,
        to: pos + stmt.trim().length,
        severity: "error",
        message: "Unclosed single quote (')"
      });
    }
    if (doubleQuotes % 2 !== 0) {
      const pos = code.indexOf(stmt.trim());
      errors.push({
        from: pos,
        to: pos + stmt.trim().length,
        severity: "error",
        message: 'Unclosed double quote (")'
      });
    }

    // CREATE TABLE specific validation
    if (stmtTrimmed.startsWith("CREATE TABLE")) {
      // Check for table name
      const createMatch = stmt.trim().match(/CREATE\s+TABLE\s+(\w+)/i);
      if (!createMatch) {
        const pos = code.indexOf(stmt.trim());
        errors.push({
          from: pos,
          to: pos + 12,
          severity: "error",
          message: "CREATE TABLE requires a table name"
        });
      }
      
      // Check for column definitions
      if (!stmt.includes("(") || !stmt.includes(")")) {
        const pos = code.indexOf(stmt.trim());
        errors.push({
          from: pos,
          to: pos + stmt.trim().length,
          severity: "error",
          message: "CREATE TABLE requires column definitions in parentheses"
        });
      }
    }

    // INSERT specific validation
    if (stmtTrimmed.startsWith("INSERT")) {
      if (!stmtTrimmed.includes("INTO")) {
        const pos = code.indexOf(stmt.trim());
        errors.push({
          from: pos,
          to: pos + 6,
          severity: "error",
          message: "INSERT requires INTO keyword"
        });
      }
      if (!stmtTrimmed.includes("VALUES") && !stmtTrimmed.includes("SELECT")) {
        const pos = code.indexOf(stmt.trim());
        errors.push({
          from: pos,
          to: pos + stmt.trim().length,
          severity: "warning",
          message: "INSERT typically requires VALUES or SELECT clause"
        });
      }
    }

    // SELECT specific validation  
    if (stmtTrimmed.startsWith("SELECT")) {
      if (!stmtTrimmed.includes("FROM") && !stmtTrimmed.match(/SELECT\s+\d+|SELECT\s+'/i)) {
        // Allow SELECT without FROM for literals like SELECT 1, SELECT 'hello'
        const hasOnlyLiterals = /SELECT\s+[\d'"\w\s,+\-*/()]+$/i.test(stmtTrimmed);
        if (!hasOnlyLiterals) {
          const pos = code.indexOf(stmt.trim());
          errors.push({
            from: pos,
            to: pos + stmt.trim().length,
            severity: "warning", 
            message: "SELECT typically requires FROM clause"
          });
        }
      }
    }
  }

  return { isValid: errors.filter(e => e.severity === "error").length === 0, errors };
}

// Light theme
const lightTheme = EditorView.theme({
  "&": {
    backgroundColor: "transparent",
    fontSize: "14px",
  },
  ".cm-content": {
    caretColor: "#000",
    fontFamily: "ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, monospace",
  },
  ".cm-cursor": {
    borderLeftColor: "#000",
  },
  ".cm-activeLine": {
    backgroundColor: "rgba(0, 0, 0, 0.04)",
  },
  ".cm-activeLineGutter": {
    backgroundColor: "rgba(0, 0, 0, 0.04)",
  },
  ".cm-gutters": {
    backgroundColor: "transparent",
    borderRight: "1px solid rgba(0, 0, 0, 0.1)",
    color: "rgba(0, 0, 0, 0.4)",
  },
  ".cm-lineNumbers .cm-gutterElement": {
    padding: "0 8px 0 16px",
  },
  "&.cm-focused .cm-selectionBackground, .cm-selectionBackground": {
    backgroundColor: "rgba(0, 100, 200, 0.15)",
  },
  ".cm-lintRange-error": {
    backgroundImage: "none",
    borderBottom: "2px wavy #ef4444",
  },
  ".cm-lintRange-warning": {
    backgroundImage: "none",
    borderBottom: "2px wavy #f59e0b",
  },
  ".cm-tooltip-lint": {
    backgroundColor: "white",
    border: "1px solid #e5e7eb",
    borderRadius: "6px",
    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
    padding: "8px 12px",
    fontSize: "13px",
  },
});

// Dark theme extension
const darkTheme = EditorView.theme({
  "&": {
    backgroundColor: "transparent",
    fontSize: "14px",
  },
  ".cm-content": {
    caretColor: "#fff",
    fontFamily: "ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, monospace",
  },
  ".cm-cursor": {
    borderLeftColor: "#fff",
  },
  ".cm-activeLine": {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
  },
  ".cm-activeLineGutter": {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
  },
  ".cm-gutters": {
    backgroundColor: "transparent",
    borderRight: "1px solid rgba(255, 255, 255, 0.1)",
    color: "rgba(255, 255, 255, 0.4)",
  },
  ".cm-lineNumbers .cm-gutterElement": {
    padding: "0 8px 0 16px",
  },
  "&.cm-focused .cm-selectionBackground, .cm-selectionBackground": {
    backgroundColor: "rgba(100, 150, 255, 0.2)",
  },
  ".cm-lintRange-error": {
    backgroundImage: "none",
    borderBottom: "2px wavy #ef4444",
  },
  ".cm-lintRange-warning": {
    backgroundImage: "none",
    borderBottom: "2px wavy #f59e0b",
  },
  ".cm-tooltip-lint": {
    backgroundColor: "#1f2937",
    border: "1px solid #374151",
    borderRadius: "6px",
    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.3)",
    padding: "8px 12px",
    fontSize: "13px",
    color: "#f3f4f6",
  },
});

export function SQLEditor({
  value,
  onChange,
  onSubmit,
  onValidationChange,
  placeholder = "SELECT * FROM users WHERE...",
  className = "",
  disabled = false,
  autoFocus = false,
  theme = "light",
  tables = [],
}: SQLEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const themeCompartment = useRef(new Compartment());
  const readOnlyCompartment = useRef(new Compartment());
  
  // Use refs for callbacks to avoid recreating editor
  const onChangeRef = useRef(onChange);
  const onSubmitRef = useRef(onSubmit);
  const onValidationChangeRef = useRef(onValidationChange);
  
  // Keep refs updated
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);
  
  useEffect(() => {
    onSubmitRef.current = onSubmit;
  }, [onSubmit]);
  
  useEffect(() => {
    onValidationChangeRef.current = onValidationChange;
  }, [onValidationChange]);
  
  // Memoize schema for SQL autocomplete
  const sqlSchema = useMemo(() => {
    const schema: Record<string, string[]> = {};
    for (const table of tables) {
      schema[table.name] = table.columns;
    }
    return schema;
  }, [tables]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: CodeMirror editor should only be created once, updates are handled imperatively via separate effects
  useEffect(() => {
    if (!editorRef.current || viewRef.current) return;

    const submitKeymap = keymap.of([
      {
        key: "Mod-Enter",
        run: (view) => {
          const code = view.state.doc.toString();
          const { isValid } = validateSQL(code);
          if (isValid && onSubmitRef.current) {
            onSubmitRef.current();
          }
          return true;
        },
      },
    ]);

    const sqlLinter = linter((view) => {
      const code = view.state.doc.toString();
      const { isValid, errors } = validateSQL(code);
      
      if (onValidationChangeRef.current) {
        onValidationChangeRef.current(isValid, errors.map(e => e.message));
      }
      
      return errors;
    }, { delay: 300 });

    const state = EditorState.create({
      doc: value,
      extensions: [
        lineNumbers(),
        highlightActiveLine(),
        highlightActiveLineGutter(),
        history(),
        bracketMatching(),
        closeBrackets(),
        autocompletion(),
        lintGutter(),
        sqlLinter,
        sql({ dialect: SQLite, schema: sqlSchema }),
        syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
        themeCompartment.current.of(theme === "dark" ? [oneDark, darkTheme] : [lightTheme]),
        readOnlyCompartment.current.of([
          EditorState.readOnly.of(disabled),
          EditorView.editable.of(!disabled),
        ]),
        placeholderExt(placeholder),
        keymap.of([
          ...defaultKeymap,
          ...historyKeymap,
          ...closeBracketsKeymap,
        ]),
        submitKeymap,
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            onChangeRef.current(update.state.doc.toString());
          }
        }),
      ],
    });

    const view = new EditorView({
      state,
      parent: editorRef.current,
    });

    viewRef.current = view;

    if (autoFocus) {
      view.focus();
    }

    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, []);

  // Update theme
  useEffect(() => {
    if (viewRef.current) {
      viewRef.current.dispatch({
        effects: themeCompartment.current.reconfigure(
          theme === "dark" ? [oneDark, darkTheme] : [lightTheme]
        ),
      });
    }
  }, [theme]);

  // Update disabled state
  useEffect(() => {
    if (viewRef.current) {
      viewRef.current.dispatch({
        effects: readOnlyCompartment.current.reconfigure([
          EditorState.readOnly.of(disabled),
          EditorView.editable.of(!disabled),
        ]),
      });
    }
  }, [disabled]);

  // Sync external value changes
  useEffect(() => {
    if (viewRef.current) {
      const currentValue = viewRef.current.state.doc.toString();
      if (currentValue !== value) {
        viewRef.current.dispatch({
          changes: {
            from: 0,
            to: currentValue.length,
            insert: value,
          },
        });
      }
    }
  }, [value]);

  return (
    <div 
      ref={editorRef} 
      className={`min-h-[120px] rounded-md border bg-background overflow-hidden ${className} ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
    />
  );
}

// Export validation function for use elsewhere
export { validateSQL };
