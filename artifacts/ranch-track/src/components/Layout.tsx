import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { useClerk } from "@clerk/react";
import { useLogout, getGetMeQueryKey, type AuthResponse } from "@workspace/api-client-react";
import {
  LayoutDashboard, Beef, ClipboardList, Map, Users, Settings, LogOut, Clock,
  Sprout, Warehouse, Tractor, FlaskConical, Menu, X,
} from "lucide-react";

interface LayoutProps {
  user: AuthResponse;
  children: React.ReactNode;
}

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

type NavGroup = {
  label: string | null;
  items: { path: string; label: string; icon: React.ElementType }[];
};

const DASHBOARD_GROUP: NavGroup = {
  label: null,
  items: [{ path: "/dashboard", label: "Dashboard", icon: LayoutDashboard }],
};

const LIVESTOCK_GROUP: NavGroup = {
  label: "Livestock",
  items: [
    { path: "/cattle", label: "Cattle Records", icon: Beef },
    { path: "/tasks", label: "Farm Tasks", icon: ClipboardList },
    { path: "/fields", label: "Field Management", icon: Map },
    { path: "/time-cards", label: "Time Cards", icon: Clock },
    { path: "/employees", label: "Employees", icon: Users },
  ],
};

const GRAIN_ONLY_GROUP: NavGroup = {
  label: "Grain",
  items: [
    { path: "/crops", label: "Crops", icon: Sprout },
    { path: "/storage", label: "Grain Storage", icon: Warehouse },
    { path: "/equipment", label: "Equipment", icon: Tractor },
    { path: "/inputs", label: "Inputs", icon: FlaskConical },
  ],
};

const FARM_OPS_GROUP: NavGroup = {
  label: "Farm",
  items: [
    { path: "/tasks", label: "Farm Tasks", icon: ClipboardList },
    { path: "/fields", label: "Field Management", icon: Map },
    { path: "/employees", label: "Employees", icon: Users },
  ],
};

const SETTINGS_GROUP: NavGroup = {
  label: null,
  items: [{ path: "/settings", label: "Settings", icon: Settings }],
};

function getNavGroups(farmType: string | null | undefined): NavGroup[] {
  if (farmType === "cattle") {
    return [DASHBOARD_GROUP, LIVESTOCK_GROUP, SETTINGS_GROUP];
  }
  if (farmType === "grain") {
    return [DASHBOARD_GROUP, FARM_OPS_GROUP, GRAIN_ONLY_GROUP, SETTINGS_GROUP];
  }
  // "both" or unknown — show everything
  return [DASHBOARD_GROUP, LIVESTOCK_GROUP, GRAIN_ONLY_GROUP, SETTINGS_GROUP];
}

function RanchTrackLogo({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
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

function SidebarBody({
  user,
  location,
  onNavigate,
  onLogout,
  onClose,
}: {
  user: AuthResponse;
  location: string;
  onNavigate?: () => void;
  onLogout: () => void;
  onClose?: () => void;
}) {
  return (
    <>
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <RanchTrackLogo />
          <div>
            <div className="font-bold text-sm leading-tight text-foreground">RanchTrack</div>
            <div className="text-[10px] text-muted-foreground leading-tight">Cattle Management</div>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            aria-label="Close menu"
            className="text-muted-foreground hover:text-foreground p-1 -mr-1"
          >
            <X size={20} />
          </button>
        )}
      </div>

      <nav className="flex-1 py-3 px-2 flex flex-col gap-0.5 overflow-y-auto">
        {getNavGroups(user.farmType).map((group, gi) => (
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
                    onClick={onNavigate}
                    data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
                    className={`flex items-center gap-2.5 px-2.5 py-2.5 sm:py-2 rounded-md text-sm sm:text-xs font-medium cursor-pointer transition-colors ${
                      isActive
                        ? "bg-accent text-primary font-semibold"
                        : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                    }`}
                  >
                    <Icon size={16} className={isActive ? "text-primary" : ""} />
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
            onClick={onLogout}
            data-testid="button-sign-out"
            className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-destructive transition-colors py-1"
          >
            <LogOut size={12} />
            Sign Out
          </button>
        </div>
      </div>
    </>
  );
}

export default function Layout({ user, children }: LayoutProps) {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const drawerRef = useRef<HTMLElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
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

  // Close the mobile drawer whenever the route changes.
  useEffect(() => {
    setMobileOpen(false);
  }, [location]);

  // Allow Escape to close the mobile drawer, and manage focus while open.
  useEffect(() => {
    if (!mobileOpen) return;
    previousFocusRef.current = document.activeElement as HTMLElement | null;
    // Move focus into the drawer so keyboard users don't reach the page behind it.
    const firstFocusable = drawerRef.current?.querySelector<HTMLElement>(
      'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    firstFocusable?.focus();

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMobileOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      // Restore focus to whatever was focused before opening (the hamburger).
      previousFocusRef.current?.focus();
    };
  }, [mobileOpen]);

  // Trap Tab focus within the open drawer.
  function handleDrawerKeyDown(e: React.KeyboardEvent) {
    if (e.key !== "Tab") return;
    const focusables = drawerRef.current?.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    if (!focusables || focusables.length === 0) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    const active = document.activeElement;
    if (e.shiftKey && active === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && active === last) {
      e.preventDefault();
      first.focus();
    }
  }

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
    <div className="flex flex-col md:flex-row h-screen bg-background overflow-hidden">
      {/* Mobile top bar */}
      <header className="md:hidden flex items-center gap-3 px-4 h-14 flex-shrink-0 bg-card border-b border-border">
        <button
          onClick={() => setMobileOpen(true)}
          aria-label="Open menu"
          aria-expanded={mobileOpen}
          aria-controls="mobile-nav-drawer"
          data-testid="button-open-menu"
          className="text-foreground p-1 -ml-1"
        >
          <Menu size={22} />
        </button>
        <div className="flex items-center gap-2">
          <RanchTrackLogo size={26} />
          <span className="font-bold text-sm text-foreground">RanchTrack</span>
        </div>
      </header>

      {/* Desktop static sidebar */}
      <aside className="hidden md:flex w-40 flex-shrink-0 bg-card border-r border-border flex-col">
        <SidebarBody user={user} location={location} onLogout={handleLogout} />
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-[1100]">
          <div
            className="absolute inset-0 bg-black/50 animate-in fade-in-0"
            onClick={() => setMobileOpen(false)}
            data-testid="overlay-mobile-menu"
          />
          <aside
            id="mobile-nav-drawer"
            ref={drawerRef}
            role="dialog"
            aria-modal="true"
            aria-label="Navigation menu"
            onKeyDown={handleDrawerKeyDown}
            className="absolute left-0 top-0 bottom-0 w-64 max-w-[80%] bg-card border-r border-border flex flex-col shadow-xl animate-in slide-in-from-left duration-200"
          >
            <SidebarBody
              user={user}
              location={location}
              onNavigate={() => setMobileOpen(false)}
              onClose={() => setMobileOpen(false)}
              onLogout={handleLogout}
            />
          </aside>
        </div>
      )}

      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
