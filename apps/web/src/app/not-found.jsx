import Link from "next/link";

export default function NotFoundPage() {
  return (
    <main className="mx-auto max-w-md p-6">
      <h1 className="text-2xl font-bold">Page not found</h1>
      <Link href="/" className="mt-4 inline-block underline">
        Go home
      </Link>
    </main>
  );
}
