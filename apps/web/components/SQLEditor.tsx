"use client";

import {
  autocompletion,
  closeBrackets,
  closeBracketsKeymap,
} from "@codemirror/autocomplete";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { SQLite, sql } from "@codemirror/lang-sql";
import {
  bracketMatching,
  defaultHighlightStyle,
  syntaxHighlighting,
} from "@codemirror/language";
import { type Diagnostic, linter, lintGutter } from "@codemirror/lint";
import { Compartment, EditorState } from "@codemirror/state";
import { oneDark } from "@codemirror/theme-one-dark";
import {
  drawSelection,
  EditorView,
  highlightActiveLine,
  highlightActiveLineGutter,
  keymap,
  lineNumbers,
  placeholder as placeholderExt,
} from "@codemirror/view";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTheme } from "@/lib/theme-context";

// Helper to get system color preference
function getSystemDarkMode(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

interface SQLEditorProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: () => void;
  onValidationChange?: (isValid: boolean, errors: string[]) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  autoFocus?: boolean;
  tables?: { name: string; columns: string[] }[];
}

// SQL keywords that should start a valid statement
const VALID_STATEMENT_STARTS = [
  "SELECT",
  "INSERT",
  "UPDATE",
  "DELETE",
  "CREATE",
  "DROP",
  "ALTER",
  "TRUNCATE",
  "BEGIN",
  "COMMIT",
  "ROLLBACK",
  "WITH",
  "EXPLAIN",
];

// Basic SQL syntax validation
function validateSQL(code: string): { isValid: boolean; errors: Diagnostic[] } {
  const trimmed = code.trim();
  const errors: Diagnostic[] = [];

  if (!trimmed) {
    return { isValid: true, errors: [] }; // Empty is valid (nothing to run)
  }

  // Split by semicolons for multiple statements
  const statements = trimmed.split(/;/).filter((s) => s.trim());

  for (const stmt of statements) {
    const stmtTrimmed = stmt.trim();
    const stmtUpper = stmtTrimmed.toUpperCase();
    if (!stmtUpper) continue;

    // Check if statement starts with a valid keyword
    const startsValid = VALID_STATEMENT_STARTS.some((kw) =>
      stmtUpper.startsWith(kw),
    );
    if (!startsValid) {
      const pos = code.indexOf(stmtTrimmed);
      errors.push({
        from: Math.max(0, pos),
        to: Math.max(0, pos) + stmtTrimmed.split(/\s/)[0].length,
        severity: "error",
        message: `Invalid SQL: Statement must start with a valid keyword (SELECT, INSERT, CREATE, etc.)`,
      });
    }

    // Check for unclosed parentheses
    // Strip string literals to avoid counting parens inside them
    const stripped = stmtTrimmed
      .replace(/'(?:[^']|'')*'/g, "''") // single-quoted strings
      .replace(/"(?:[^"]|"")*"/g, '""') // double-quoted identifiers
      .replace(/`(?:[^`]|``)*`/g, "``"); // backtick identifiers
    const openParens = (stripped.match(/\(/g) || []).length;
    const closeParens = (stripped.match(/\)/g) || []).length;
    if (openParens !== closeParens) {
      const pos = code.indexOf(stmtTrimmed);
      errors.push({
        from: Math.max(0, pos),
        to: Math.max(0, pos) + stmtTrimmed.length,
        severity: "error",
        message: `Unbalanced parentheses: ${openParens} open, ${closeParens} close`,
      });
    }

    // Check for unclosed single quotes (count in stripped — identifiers removed)
    // Use a simple state-machine approach instead of raw count
    let inSingleQuote = false;
    for (let i = 0; i < stmtTrimmed.length; i++) {
      if (stmtTrimmed[i] === "'") {
        // Check for escaped '' (two consecutive single quotes = escaped quote)
        if (inSingleQuote && stmtTrimmed[i + 1] === "'") {
          i++; // skip the escaped quote
        } else {
          inSingleQuote = !inSingleQuote;
        }
      }
      // Skip past double-quoted and backtick identifiers
      if (
        !inSingleQuote &&
        (stmtTrimmed[i] === '"' || stmtTrimmed[i] === "`")
      ) {
        const closer = stmtTrimmed[i];
        i++;
        while (i < stmtTrimmed.length) {
          if (stmtTrimmed[i] === closer) {
            // doubled = escaped
            if (stmtTrimmed[i + 1] === closer) {
              i++;
            } else {
              break;
            }
          }
          i++;
        }
      }
    }
    if (inSingleQuote) {
      const pos = code.indexOf(stmtTrimmed);
      errors.push({
        from: Math.max(0, pos),
        to: Math.max(0, pos) + stmtTrimmed.length,
        severity: "error",
        message: "Unclosed string literal (missing closing ')",
      });
    }

    // CREATE TABLE specific validation
    if (stmtUpper.startsWith("CREATE TABLE")) {
      // Check for table name
      const createMatch = stmtTrimmed.match(
        /CREATE\s+TABLE\s+(\w+|"[^"]+"|`[^`]+`)/i,
      );
      if (!createMatch) {
        const pos = code.indexOf(stmtTrimmed);
        errors.push({
          from: Math.max(0, pos),
          to: Math.max(0, pos) + 12,
          severity: "error",
          message: "CREATE TABLE requires a table name",
        });
      }

      // Check for column definitions
      if (!stmtTrimmed.includes("(")) {
        const pos = code.indexOf(stmtTrimmed);
        errors.push({
          from: Math.max(0, pos),
          to: Math.max(0, pos) + stmtTrimmed.length,
          severity: "error",
          message: "CREATE TABLE requires column definitions in parentheses",
        });
      }
    }

    // INSERT specific validation
    if (stmtUpper.startsWith("INSERT")) {
      if (!stmtUpper.includes("INTO")) {
        const pos = code.indexOf(stmtTrimmed);
        errors.push({
          from: Math.max(0, pos),
          to: Math.max(0, pos) + 6,
          severity: "error",
          message: "INSERT requires INTO keyword",
        });
      }
      if (!stmtUpper.includes("VALUES") && !stmtUpper.includes("SELECT")) {
        const pos = code.indexOf(stmtTrimmed);
        errors.push({
          from: Math.max(0, pos),
          to: Math.max(0, pos) + stmtTrimmed.length,
          severity: "warning",
          message: "INSERT typically requires VALUES or SELECT clause",
        });
      }
    }

    // SELECT specific validation — only warn if no FROM AND not a trivial literal SELECT
    if (stmtUpper.startsWith("SELECT")) {
      const hasFrom =
        stmtUpper.includes(" FROM ") || stmtUpper.endsWith(" FROM");
      if (!hasFrom) {
        // Allow things like SELECT 1, SELECT 'hello', SELECT NOW(), etc.
        const afterSelect = stmtUpper.replace(/^SELECT\s+/, "");
        // If it contains identifiers that look like column names (word chars without parens), warn
        const looksLikeColumnRef =
          /^[A-Z_][A-Z0-9_]*(\s*,\s*[A-Z_][A-Z0-9_]*)*$/.test(afterSelect) &&
          !/^(1|0|TRUE|FALSE|NULL|\d+(\.\d+)?)$/.test(afterSelect);
        if (looksLikeColumnRef) {
          const pos = code.indexOf(stmtTrimmed);
          errors.push({
            from: Math.max(0, pos),
            to: Math.max(0, pos) + stmtTrimmed.length,
            severity: "warning",
            message: "SELECT typically requires FROM clause",
          });
        }
      }
    }
  }

  return {
    isValid: errors.filter((e) => e.severity === "error").length === 0,
    errors,
  };
}

// Light theme
const lightTheme = EditorView.theme({
  "&": {
    backgroundColor: "transparent",
    fontSize: "14px",
  },
  ".cm-content": {
    caretColor: "#000",
    fontFamily:
      "ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, monospace",
    padding: "8px 0",
  },
  ".cm-cursor, .cm-dropCursor": {
    borderLeftColor: "#000",
    borderLeftWidth: "2px",
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
  ".cm-selectionMatch": {
    backgroundColor: "rgba(0, 100, 200, 0.1)",
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
  ".cm-focused": {
    outline: "none",
  },
  "&.cm-focused": {
    outline: "none",
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
    fontFamily:
      "ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, monospace",
    padding: "8px 0",
  },
  ".cm-cursor, .cm-dropCursor": {
    borderLeftColor: "#fff",
    borderLeftWidth: "2px",
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
  ".cm-selectionMatch": {
    backgroundColor: "rgba(100, 150, 255, 0.15)",
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
  ".cm-focused": {
    outline: "none",
  },
  "&.cm-focused": {
    outline: "none",
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
  tables = [],
}: SQLEditorProps) {
  const { colorMode } = useTheme();
  const [isDark, setIsDark] = useState(false);

  // Track effective dark mode (handles "system" mode and system changes)
  useEffect(() => {
    const updateDarkMode = () => {
      if (colorMode === "system") {
        setIsDark(getSystemDarkMode());
      } else {
        setIsDark(colorMode === "dark");
      }
    };

    updateDarkMode();

    if (colorMode === "system") {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      mq.addEventListener("change", updateDarkMode);
      return () => mq.removeEventListener("change", updateDarkMode);
    }
  }, [colorMode]);

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

    const sqlLinter = linter(
      (view) => {
        const code = view.state.doc.toString();
        const { isValid, errors } = validateSQL(code);

        if (onValidationChangeRef.current) {
          onValidationChangeRef.current(
            isValid,
            errors.map((e) => e.message),
          );
        }

        return errors;
      },
      { delay: 300 },
    );

    const state = EditorState.create({
      doc: value,
      extensions: [
        drawSelection(),
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
        themeCompartment.current.of(
          isDark ? [oneDark, darkTheme] : [lightTheme],
        ),
        readOnlyCompartment.current.of([
          EditorState.readOnly.of(disabled),
          EditorView.editable.of(!disabled),
        ]),
        placeholderExt(placeholder),
        keymap.of([...defaultKeymap, ...historyKeymap, ...closeBracketsKeymap]),
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
          isDark ? [oneDark, darkTheme] : [lightTheme],
        ),
      });
    }
  }, [isDark]);

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
