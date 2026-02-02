"use client"

import { cn } from "@/lib/utils"
import { Database, Table2, Columns, Key } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface Column {
  name: string
  type: string
  isPrimary?: boolean
  isForeign?: boolean
  references?: string
}

interface Table {
  name: string
  columns: Column[]
}

interface Schema {
  tables: Table[]
  relationships?: Array<{
    from: string
    to: string
    type: string
  }>
}

interface SchemaViewerProps {
  schema: Schema | null
  className?: string
}

export function SchemaViewer({ schema, className }: SchemaViewerProps) {
  if (!schema || !schema.tables || schema.tables.length === 0) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center h-48 text-muted-foreground border rounded-lg bg-muted/50 gap-3",
          className
        )}
      >
        <Database className="h-8 w-8 opacity-50" />
        <p className="text-sm">No schema defined yet</p>
        <p className="text-xs text-muted-foreground/70">
          Create tables to see the schema visualization
        </p>
      </div>
    )
  }

  return (
    <TooltipProvider>
      <div className={cn("space-y-4", className)}>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Database className="h-4 w-4" />
          <span>{schema.tables.length} table(s) defined</span>
        </div>

        <div className="grid gap-4">
          {schema.tables.map((table) => (
            <div
              key={table.name}
              className="border rounded-lg p-4 bg-card hover:bg-accent/50 transition-colors"
            >
              <div className="flex items-center gap-2 mb-3">
                <Table2 className="h-4 w-4 text-primary" />
                <span className="font-semibold">{table.name}</span>
                <Badge variant="secondary" className="text-xs">
                  {table.columns.length} columns
                </Badge>
              </div>

              <div className="space-y-2">
                {table.columns.map((column) => (
                  <div
                    key={column.name}
                    className="flex items-center justify-between text-sm py-1 px-2 rounded bg-muted/50"
                  >
                    <div className="flex items-center gap-2">
                      <Columns className="h-3 w-3 text-muted-foreground" />
                      <span className="font-mono text-xs">{column.name}</span>
                      {column.isPrimary && (
                        <Tooltip>
                          <TooltipTrigger>
                            <Key className="h-3 w-3 text-yellow-500" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Primary Key</p>
                          </TooltipContent>
                        </Tooltip>
                      )}
                      {column.isForeign && (
                        <Tooltip>
                          <TooltipTrigger>
                            <span className="text-xs text-blue-500">FK</span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Foreign Key → {column.references}</p>
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                    <Badge variant="outline" className="text-xs font-mono">
                      {column.type}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {schema.relationships && schema.relationships.length > 0 && (
          <div className="mt-4 pt-4 border-t">
            <h4 className="text-sm font-medium mb-2">Relationships</h4>
            <div className="space-y-1">
              {schema.relationships.map((rel) => (
                <div key={`${rel.from}-${rel.to}-${rel.type}`} className="text-xs text-muted-foreground flex items-center gap-2">
                  <span className="font-mono text-primary">{rel.from}</span>
                  <span>→</span>
                  <span className="font-mono text-primary">{rel.to}</span>
                  <Badge variant="outline" className="text-[10px]">
                    {rel.type}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  )
}
