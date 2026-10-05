import { Navigate, Outlet, useLocation } from "react-router";
import { FullPageSpinner } from "@/components/FullPageSpinner.jsx";
import { useSession } from "@/lib/auth-client.js";

/** Layout route guard: renders children only for logged-in users. */
export function RequireAuth() {
  const { data: session, isPending } = useSession();
  const location = useLocation();

  if (isPending) return <FullPageSpinner />;
  if (!session) {
    // Remember where they were going so login can send them back.
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return <Outlet />;
}

/** Inverse guard for /login and /signup: logged-in users go to the app. */
export function GuestOnly() {
  const { data: session, isPending } = useSession();

  if (isPending) return <FullPageSpinner />;
  if (session) return <Navigate to="/" replace />;
  return <Outlet />;
}
