"use client";

import { useState, useCallback, useTransition } from "react";
import { api } from "./api";
import type { Schema, QueryState } from "./types";

const DEFAULT_ROWS_PER_TABLE = 10;

export function useSeeql() {
  const [state, setState] = useState<QueryState>({
    sql: "",
    schema: null,
    data: null,
    columns: undefined,
    rows: undefined,
    rowCount: undefined,
    isLoading: false,
    error: null,
  });

  const [isPending, startTransition] = useTransition();

  const setSql = useCallback((sql: string) => {
    setState((prev) => ({ ...prev, sql }));
  }, []);

  const inferSchema = useCallback(async (sql: string): Promise<Schema | null> => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await api.inferSchema(sql);

      if (response.error) {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: response.error ?? null,
          schema: null,
        }));
        return null;
      }

      const schema = response.schema ?? null;
      setState((prev) => ({
        ...prev,
        isLoading: false,
        schema,
        error: null,
      }));
      return schema;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to infer schema";
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: message,
        schema: null,
      }));
      return null;
    }
  }, []);

  const generateData = useCallback(
    async (sql: string, rowsPerTable: number = DEFAULT_ROWS_PER_TABLE) => {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      try {
        const response = await api.generateData(sql, rowsPerTable);

        if (response.error) {
          setState((prev) => ({
            ...prev,
            isLoading: false,
            error: response.error ?? null,
            data: null,
          }));
          return null;
        }

        const data = response.data ?? null;
        setState((prev) => ({
          ...prev,
          isLoading: false,
          data,
          error: null,
        }));
        return data;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to generate data";
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: message,
          data: null,
        }));
        return null;
      }
    },
    []
  );

  const runQuery = useCallback(
    async (sql: string, _rowsPerTable: number = DEFAULT_ROWS_PER_TABLE) => {
      setState((prev) => ({ ...prev, sql, isLoading: true, error: null }));

      try {
        // Use execute endpoint - full pipeline in one call
        const response = await api.execute(sql);

        if (response.error) {
          setState((prev) => ({
            ...prev,
            isLoading: false,
            error: response.error ?? null,
          }));
          return;
        }

        startTransition(() => {
          setState({
            sql,
            schema: response.schema ?? null,
            data: null, // Execute doesn't return generated data
            columns: response.columns,
            rows: response.rows,
            rowCount: response.row_count,
            isLoading: false,
            error: null,
          });
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to run query";
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: message,
        }));
      }
    },
    []
  );

  const reset = useCallback(() => {
    setState({
      sql: "",
      schema: null,
      data: null,
      columns: undefined,
      rows: undefined,
      rowCount: undefined,
      isLoading: false,
      error: null,
    });
  }, []);

  return {
    ...state,
    isTransitioning: isPending,
    setSql,
    inferSchema,
    generateData,
    runQuery,
    reset,
  };
}
