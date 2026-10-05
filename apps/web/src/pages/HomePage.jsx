import { useApi } from "@/lib/use-api.js";

export function HomePage() {
  const health = useApi("/health");

  return (
    <main className="mx-auto max-w-md p-6">
      <h1 className="text-2xl font-bold">Fitness Log</h1>
      <p className="mt-4 text-sm">
        API:{" "}
        {health.isLoading
          ? "checking…"
          : health.error
            ? `error — ${health.error.message}`
            : `${health.data.status} (db ${health.data.db})`}
      </p>
    </main>
  );
}
