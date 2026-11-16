import { Navigate, Outlet, useLocation } from "react-router";
import { FullPageSpinner } from "@/components/FullPageSpinner.jsx";
import { useAuth } from "@/lib/auth.jsx";

/** Layout route guard: renders children only for logged-in users. */
export function RequireAuth() {
  const { user, isPending } = useAuth();
  const location = useLocation();

  if (isPending) return <FullPageSpinner />;
  if (!user) {
    // Remember where they were going so login can send them back.
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return <Outlet />;
}

/** Inverse guard for /login and /signup: logged-in users go to the app. */
export function GuestOnly() {
  const { user, isPending } = useAuth();

  if (isPending) return <FullPageSpinner />;
  if (user) return <Navigate to="/" replace />;
  return <Outlet />;
}
