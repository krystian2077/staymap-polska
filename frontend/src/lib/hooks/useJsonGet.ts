"use client";

import { useCallback, useEffect, useState } from "react";

import { authJsonFetcher, jsonFetcher } from "@/lib/swrFetcher";

type Opts = { enabled?: boolean };

/**
 * Prosty odpowiednik useSWR dla GET JSON (bez zależności swr).
 */
export function useJsonGet<T>(url: string | null, opts?: Opts) {
  const enabled = opts?.enabled !== false;
  const [data, setData] = useState<T | undefined>(undefined);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(url && enabled));

  const reload = useCallback(async () => {
    if (!url || !enabled) {
      setData(undefined);
      setError(null);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const result = await jsonFetcher<T>(url);
      setData(result);
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
      setData(undefined);
    } finally {
      setIsLoading(false);
    }
  }, [url, enabled]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { data, error, isLoading, mutate: reload };
}

export function useAuthJsonGet<T>(url: string | null, opts?: Opts) {
  const enabled = opts?.enabled !== false;
  const [data, setData] = useState<T | undefined>(undefined);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(url && enabled));

  const reload = useCallback(async () => {
    if (!url || !enabled) {
      setData(undefined);
      setError(null);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const result = await authJsonFetcher<T>(url);
      setData(result);
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
      setData(undefined);
    } finally {
      setIsLoading(false);
    }
  }, [url, enabled]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { data, error, isLoading, mutate: reload };
}
