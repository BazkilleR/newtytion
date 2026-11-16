"use client";

import { CalendarDays, Dumbbell, LogOut, Scale, Settings, TrendingUp } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button.jsx";
import { useAuth } from "@/lib/auth.jsx";
import { cn } from "@/lib/utils.js";

const NAV_ITEMS = [
  { to: "/", label: "Today", icon: CalendarDays, end: true },
  { to: "/workouts", label: "Workouts", icon: Dumbbell },
  { to: "/body", label: "Body", icon: Scale },
  { to: "/exercises", label: "Progress", icon: TrendingUp },
  { to: "/settings", label: "Settings", icon: Settings },
];

export function AppLayout({ children }) {
  const { user, logOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  async function handleLogout() {
    await logOut();
    router.replace("/login");
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b bg-background/95 px-4 py-3 backdrop-blur">
        <span className="font-semibold">Fitness Log</span>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">{user?.name}</span>
          <Button variant="ghost" size="icon-lg" onClick={handleLogout} aria-label="Log out">
            <LogOut />
          </Button>
        </div>
      </header>

      <main className="flex-1 px-4 py-4 pb-24">{children}</main>

      {/* Bottom nav: thumb-reachable on phones */}
      <nav className="fixed inset-x-0 bottom-0 border-t bg-background pb-[env(safe-area-inset-bottom)]">
        <ul className="mx-auto flex max-w-lg">
          {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => {
            const isActive = pathname === to || (!end && pathname.startsWith(`${to}/`));
            return (
              <li key={to} className="flex-1">
                <Link
                  href={to}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "flex h-16 flex-col items-center justify-center gap-1 text-xs",
                    isActive ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  <Icon className="size-5" />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
