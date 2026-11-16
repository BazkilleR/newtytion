import { GuestOnly } from "@/components/auth/RequireAuth.jsx";

export default function Layout({ children }) {
  return <GuestOnly>{children}</GuestOnly>;
}
