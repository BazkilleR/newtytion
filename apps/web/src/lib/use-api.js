import { useCallback, useEffect, useState } from "react";
import { api } from "./api.js";

/**
 * Fetch JSON from the API when the component mounts or `path`/`query` change.
 * Returns { data, error, isLoading, refetch }.
 *
 * A stale request is aborted when inputs change or the component unmounts, so
 * a slow old response can never overwrite a newer one.
 */
export function useApi(path, { query, enabled = true } = {}) {
  const [state, setState] = useState({ data: undefined, error: null, isLoading: enabled });
  const [version, setVersion] = useState(0);

  // Objects are new on every render, so compare the query by its serialized value.
  const queryKey = JSON.stringify(query ?? {});

  // biome-ignore lint/correctness/useExhaustiveDependencies: `version` triggers refetch; queryKey stands in for `query`
  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    setState((s) => ({ ...s, isLoading: true, error: null }));

    api(path, { query: JSON.parse(queryKey), signal: controller.signal })
      .then((data) => setState({ data, error: null, isLoading: false }))
      .catch((error) => {
        if (error.name === "AbortError") return;
        setState((s) => ({ ...s, error, isLoading: false }));
      });

    return () => controller.abort();
  }, [path, queryKey, enabled, version]);

  const refetch = useCallback(() => setVersion((v) => v + 1), []);

  return { ...state, refetch };
}
