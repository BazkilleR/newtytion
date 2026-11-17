import { RequireAuth } from "@/components/auth/RequireAuth.jsx";
import { AppLayout } from "@/components/layout/AppLayout.jsx";

export default function Layout({ children }) {
  return (
    <RequireAuth>
      <AppLayout>{children}</AppLayout>
    </RequireAuth>
  );
}
