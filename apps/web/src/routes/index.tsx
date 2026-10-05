import { queryOptions, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { api } from "@/lib/api.ts";

const healthQuery = queryOptions({
  queryKey: ["health"],
  queryFn: () => api<{ status: string; db: string; time: string }>("/health"),
});

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  const health = useQuery(healthQuery);

  return (
    <main className="mx-auto max-w-md p-6">
      <h1 className="text-2xl font-bold">Fitness Log</h1>
      <p className="mt-4 text-sm">
        API:{" "}
        {health.isPending
          ? "checking…"
          : health.isError
            ? `error — ${health.error.message}`
            : `${health.data.status} (db ${health.data.db})`}
      </p>
    </main>
  );
}
