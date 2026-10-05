import { CalendarDays, LogOut } from "lucide-react";
import { NavLink, Outlet, useNavigate } from "react-router";
import { Button } from "@/components/ui/button.jsx";
import { signOut, useSession } from "@/lib/auth-client.js";
import { cn } from "@/lib/utils.js";

const NAV_ITEMS = [{ to: "/", label: "Today", icon: CalendarDays, end: true }];

export function AppLayout() {
  const { data: session } = useSession();
  const navigate = useNavigate();

  async function handleLogout() {
    await signOut();
    navigate("/login", { replace: true });
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b bg-background/95 px-4 py-3 backdrop-blur">
        <span className="font-semibold">Fitness Log</span>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">{session?.user.name}</span>
          <Button variant="ghost" size="icon-lg" onClick={handleLogout} aria-label="Log out">
            <LogOut />
          </Button>
        </div>
      </header>

      <main className="flex-1 px-4 py-4 pb-24">
        <Outlet />
      </main>

      {/* Bottom nav: thumb-reachable on phones */}
      <nav className="fixed inset-x-0 bottom-0 border-t bg-background pb-[env(safe-area-inset-bottom)]">
        <ul className="mx-auto flex max-w-lg">
          {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
            <li key={to} className="flex-1">
              <NavLink
                to={to}
                end={end}
                className={({ isActive }) =>
                  cn(
                    "flex h-16 flex-col items-center justify-center gap-1 text-xs",
                    isActive ? "text-foreground" : "text-muted-foreground",
                  )
                }
              >
                <Icon className="size-5" />
                {label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
