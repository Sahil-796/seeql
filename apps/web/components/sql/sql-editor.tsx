"use client"

import { useRef, useState } from "react"
import Editor, { type OnMount } from "@monaco-editor/react"
import { cn } from "@/lib/utils"

interface SQLEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  height?: string
  readOnly?: boolean
  className?: string
}

export function SQLEditor({
  value,
  onChange,
  placeholder = "-- Write your SQL query here...",
  height = "300px",
  readOnly = false,
  className,
}: SQLEditorProps) {
  const editorRef = useRef<any>(null)
  const [isReady, setIsReady] = useState(false)

  const handleEditorDidMount: OnMount = (editor, monaco) => {
    editorRef.current = editor
    setIsReady(true)

    // Configure SQL language support
    monaco.languages.registerCompletionItemProvider("sql", {
      provideCompletionItems: () => ({
        suggestions: [
          {
            label: "SELECT",
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: "SELECT",
          },
          {
            label: "FROM",
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: "FROM",
          },
          {
            label: "WHERE",
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: "WHERE",
          },
          {
            label: "JOIN",
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: "JOIN",
          },
          {
            label: "INNER JOIN",
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: "INNER JOIN",
          },
          {
            label: "LEFT JOIN",
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: "LEFT JOIN",
          },
          {
            label: "GROUP BY",
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: "GROUP BY",
          },
          {
            label: "ORDER BY",
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: "ORDER BY",
          },
          {
            label: "LIMIT",
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: "LIMIT",
          },
          {
            label: "INSERT INTO",
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: "INSERT INTO",
          },
          {
            label: "UPDATE",
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: "UPDATE",
          },
          {
            label: "DELETE FROM",
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: "DELETE FROM",
          },
          {
            label: "CREATE TABLE",
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: "CREATE TABLE",
          },
          {
            label: "DROP TABLE",
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: "DROP TABLE",
          },
        ],
      }),
    })
  }

  return (
    <div className={cn("relative rounded-lg overflow-hidden border border-border", className)}>
      <Editor
        height={height}
        defaultLanguage="sql"
        value={value}
        onChange={(value) => onChange(value || "")}
        onMount={handleEditorDidMount}
        options={{
          minimap: { enabled: false },
          fontSize: 14,
          lineNumbers: "on",
          roundedSelection: false,
          scrollBeyondLastLine: false,
          readOnly: readOnly,
          automaticLayout: true,
          padding: { top: 16, bottom: 16 },
          fontFamily: "var(--font-geist-mono)",
          placeholder: isReady ? placeholder : undefined,
        }}
        theme="vs-dark"
      />
    </div>
  )
}
