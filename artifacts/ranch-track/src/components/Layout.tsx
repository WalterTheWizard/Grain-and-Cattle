import { Link, useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { useClerk } from "@clerk/react";
import { useLogout, getGetMeQueryKey, type AuthResponse } from "@workspace/api-client-react";
import {
  LayoutDashboard, Beef, ClipboardList, Map, Users, Settings, LogOut, Clock,
  Sprout, Warehouse, Tractor, FlaskConical,
} from "lucide-react";

interface LayoutProps {
  user: AuthResponse;
  children: React.ReactNode;
}

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

const navGroups: {
  label: string | null;
  items: { path: string; label: string; icon: React.ElementType }[];
}[] = [
  {
    label: null,
    items: [{ path: "/dashboard", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    label: "Livestock",
    items: [
      { path: "/cattle", label: "Cattle Records", icon: Beef },
      { path: "/tasks", label: "Farm Tasks", icon: ClipboardList },
      { path: "/time-cards", label: "Time Cards", icon: Clock },
      { path: "/fields", label: "Field Management", icon: Map },
      { path: "/employees", label: "Employees", icon: Users },
    ],
  },
  {
    label: "Grain",
    items: [
      { path: "/crops", label: "Crops", icon: Sprout },
      { path: "/storage", label: "Grain Storage", icon: Warehouse },
      { path: "/equipment", label: "Equipment", icon: Tractor },
      { path: "/inputs", label: "Inputs", icon: FlaskConical },
    ],
  },
  {
    label: null,
    items: [{ path: "/settings", label: "Settings", icon: Settings }],
  },
];

function RanchTrackLogo() {
  return (
    <svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="18" cy="18" r="18" fill="hsl(142 71% 45%)" />
      <path
        d="M18 8 C12 8 8 12 8 18 C8 22 10 25 13 27 C14 27.5 15 26.5 14.5 25.5 C13 23.5 12 21 12 18 C12 14 14.8 11 18 11 C21.2 11 24 14 24 18 C24 20.5 23 22.8 21.5 24.3 C20.7 25.1 21.3 26.5 22.5 26.5 C24 26.5 26 24 27 22 C27.7 20.7 28 19.4 28 18 C28 12 23.5 8 18 8Z"
        fill="white"
      />
      <path
        d="M18 13 C15.2 13 13 15.2 13 18 C13 19.6 13.7 21 14.8 22 C15.5 22.7 16.5 22 16.2 21 C16 20.4 15.9 19.7 15.9 19 C15.9 16.8 16.8 15 18 15 C19.2 15 20.1 16.8 20.1 19 C20.1 20.4 19.6 21.6 18.8 22.3 C18 23 18.5 24.2 19.6 24 C21.5 23.5 23 21 23 18 C23 15.2 20.8 13 18 13Z"
        fill="white"
        opacity="0.8"
      />
      <circle cx="18" cy="18" r="2" fill="white" />
    </svg>
  );
}

export default function Layout({ user, children }: LayoutProps) {
  const [location] = useLocation();
  const queryClient = useQueryClient();
  const { signOut } = useClerk();

  const logout = useLogout({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
        queryClient.clear();
      },
    },
  });

  function handleLogout() {
    if (user.role === "owner") {
      // Farm owners are authenticated via Clerk.
      void signOut({ redirectUrl: basePath || "/" });
    } else {
      // Employees use the custom session.
      logout.mutate(undefined as never);
    }
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <aside className="w-40 flex-shrink-0 bg-card border-r border-border flex flex-col">
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-2 mb-0.5">
            <RanchTrackLogo />
            <div>
              <div className="font-bold text-sm leading-tight text-foreground">RanchTrack</div>
              <div className="text-[10px] text-muted-foreground leading-tight">Cattle Management</div>
            </div>
          </div>
        </div>

        <nav className="flex-1 py-3 px-2 flex flex-col gap-0.5 overflow-y-auto">
          {navGroups.map((group, gi) => (
            <div key={group.label ?? `group-${gi}`} className={group.label ? "mt-2" : ""}>
              {group.label && (
                <p className="px-2 pt-1 pb-1 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                  {group.label}
                </p>
              )}
              {group.items.map((item) => {
                const isActive = location === item.path || (item.path !== "/dashboard" && location.startsWith(item.path));
                const Icon = item.icon;
                return (
                  <Link key={item.path} href={item.path}>
                    <div
                      data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
                      className={`flex items-center gap-2 px-2 py-2 rounded-md text-xs font-medium cursor-pointer transition-colors ${
                        isActive
                          ? "bg-accent text-primary font-semibold"
                          : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                      }`}
                    >
                      <Icon size={15} className={isActive ? "text-primary" : ""} />
                      <span className="leading-tight">{item.label}</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="p-3 border-t border-border space-y-2">
          <div>
            <p className="text-xs font-semibold text-foreground truncate" data-testid="sidebar-farm-name">
              {user.farmName}
            </p>
            <p className="text-[10px] text-muted-foreground truncate">{user.email}</p>
            {user.employeeName && (
              <p className="text-[10px] text-primary truncate">{user.employeeName}</p>
            )}
          </div>
          <div className="flex flex-col gap-1">
            <button
              onClick={handleLogout}
              data-testid="button-sign-out"
              className="flex items-center gap-1.5 text-[10px] text-muted-foreground hover:text-destructive transition-colors"
            >
              <LogOut size={11} />
              Sign Out
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
