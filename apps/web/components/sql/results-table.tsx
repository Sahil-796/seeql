"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"

interface ResultsTableProps {
  data: Array<Record<string, any>>
  className?: string
  maxHeight?: string
}

export function ResultsTable({
  data,
  className,
  maxHeight = "400px",
}: ResultsTableProps) {
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  if (!data || data.length === 0) {
    return (
      <div
        className={cn(
          "flex items-center justify-center h-48 text-muted-foreground border rounded-lg bg-muted/50",
          className
        )}
      >
        No results to display
      </div>
    )
  }

  const columns = Object.keys(data[0])
  const totalPages = Math.ceil(data.length / itemsPerPage)
  const paginatedData = data.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  return (
    <div className={cn("border rounded-lg overflow-hidden bg-card", className)}>
      <div className="overflow-auto" style={{ maxHeight }}>
        <table className="w-full text-sm">
          <thead className="bg-muted sticky top-0">
            <tr>
              {columns.map((column) => (
                <th
                  key={column}
                  className="px-4 py-3 text-left font-medium text-muted-foreground border-b"
                >
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginatedData.map((row, rowIndex) => (
              <tr
                key={`data-row-${rowIndex}-${columns.map(c => row[c]).join('-')}`}
                className="border-b last:border-0 hover:bg-muted/50 transition-colors"
              >
                {columns.map((column) => (
                  <td
                    key={`row-${rowIndex}-col-${column}`}
                    className="px-4 py-3 text-foreground font-mono text-xs"
                  >
                    {formatValue(row[column])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/50">
          <span className="text-sm text-muted-foreground">
            Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
            {Math.min(currentPage * itemsPerPage, data.length)} of{" "}
            {data.length} results
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

function formatValue(value: any): string {
  if (value === null || value === undefined) return "NULL"
  if (typeof value === "boolean") return value ? "true" : "false"
  if (typeof value === "object") return JSON.stringify(value)
  return String(value)
}
