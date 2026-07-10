import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { useClerk } from "@clerk/react";
import { useLogout, getGetMeQueryKey, type AuthResponse } from "@workspace/api-client-react";
import {
  LayoutDashboard, Beef, ClipboardList, Map, Users, Settings, LogOut, Clock,
  Sprout, Warehouse, Tractor, FlaskConical, Menu, X, MessageSquare,
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
  items: [
    { path: "/chat", label: "Farm Chat", icon: MessageSquare },
    { path: "/settings", label: "Settings", icon: Settings },
  ],
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

function FarmerProLogo({ size = 36 }: { size?: number }) {
  return (
    <img
      src={`${import.meta.env.BASE_URL}logo.png`}
      alt="FarmerPro"
      width={size}
      height={size}
      className="rounded-lg"
    />
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
          <FarmerProLogo />
          <div>
            <div className="font-bold text-sm leading-tight text-foreground">FarmerPro</div>
            <div className="text-[10px] text-muted-foreground leading-tight">Manage. Grow. Succeed.</div>
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
          <FarmerProLogo size={26} />
          <span className="font-bold text-sm text-foreground">FarmerPro</span>
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
