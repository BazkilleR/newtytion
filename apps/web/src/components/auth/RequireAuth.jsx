"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { FullPageSpinner } from "@/components/FullPageSpinner.jsx";
import { useAuth } from "@/lib/auth.jsx";

/** Layout guard: renders children only for logged-in users. */
export function RequireAuth({ children }) {
  const { user, isPending } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const loggedOut = !isPending && !user;

  useEffect(() => {
    // Remember where they were going so login can send them back.
    if (loggedOut) router.replace(`/login?from=${encodeURIComponent(pathname)}`);
  }, [loggedOut, router, pathname]);

  if (!user) return <FullPageSpinner />;
  return children;
}

/** Inverse guard for /login and /signup: logged-in users go to the app. */
export function GuestOnly({ children }) {
  const { user, isPending } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user) router.replace("/");
  }, [user, router]);

  if (isPending || user) return <FullPageSpinner />;
  return children;
}
