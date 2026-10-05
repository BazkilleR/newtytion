import { Link } from "react-router";

export function NotFoundPage() {
  return (
    <main className="mx-auto max-w-md p-6">
      <h1 className="text-2xl font-bold">Page not found</h1>
      <Link to="/" className="mt-4 inline-block underline">
        Go home
      </Link>
    </main>
  );
}
