"use client";

import type { Schema, ColumnSchema } from "@/lib/types";

interface SchemaVisualizerProps {
  schema: Schema;
  className?: string;
  tableClassName?: string;
  columnClassName?: string;
}

function ColumnBadge({ type }: { type: "pk" | "fk" }) {
  const styles = {
    pk: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    fk: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  };

  return (
    <span
      className={`text-[10px] px-1.5 py-0.5 rounded border uppercase font-semibold tracking-wider ${styles[type]}`}
    >
      {type}
    </span>
  );
}

function ColumnRow({
  column,
  className = "",
}: {
  column: ColumnSchema;
  className?: string;
}) {
  return (
    <div className={`flex items-center justify-between gap-2 ${className}`}>
      <div className="flex items-center gap-2 min-w-0">
        <span className="truncate">{column.name}</span>
        {column.is_primary && <ColumnBadge type="pk" />}
        {column.is_foreign && <ColumnBadge type="fk" />}
      </div>
      <span className="text-xs opacity-50 shrink-0">
        {column.type || "unknown"}
        {column.nullable && "?"}
      </span>
    </div>
  );
}

export function SchemaVisualizer({
  schema,
  className = "",
  tableClassName = "",
  columnClassName = "",
}: SchemaVisualizerProps) {
  if (!schema.tables || schema.tables.length === 0) {
    return (
      <div className={`text-center opacity-50 ${className}`}>
        No tables detected
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {schema.tables.map((table) => (
        <div key={table.name} className={tableClassName}>
          <h3 className="font-semibold mb-2">{table.name}</h3>
          <div className="space-y-1">
            {table.columns.map((column) => (
              <ColumnRow
                key={column.name}
                column={column}
                className={columnClassName}
              />
            ))}
          </div>
        </div>
      ))}

      {schema.relationships && schema.relationships.length > 0 && (
        <div className="pt-4 border-t border-current/10">
          <h4 className="text-sm font-semibold mb-2 opacity-70">Relationships</h4>
          <div className="space-y-1 text-sm opacity-60">
            {schema.relationships.map((rel, i) => (
              <div key={i}>
                {rel.LeftTable}.{rel.LeftColumn} → {rel.RightTable}.{rel.RightColumn}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
