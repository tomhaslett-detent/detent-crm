import { CircleHelp, PanelTop } from "lucide-react";
import { isDetentStaff } from "@/lib/crm-staff";
import { useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  Activity as ActivityIcon,
  Briefcase,
  Building2,
  LayoutGrid,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  Users,
  UsersRound,
} from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/lib/AuthContext";
import ModuleSwitcher from "@/components/layout/ModuleSwitcher";
import { useCrmCan } from "@/lib/crm-can";
import { initials } from "@/lib/crm";
import { cn } from "@/lib/utils";

const ROLE_LABEL = {
  admin: "CRM admin",
  revops: "RevOps",
  manager: "Manager",
  rep: "Sales rep",
  service: "Service",
  viewer: "Read-only",
};

const NAV = [
  { to: "/", label: "Pipeline", icon: LayoutGrid },
  { to: "/deals", label: "Deals", icon: Briefcase },
  { to: "/accounts", label: "Accounts", icon: Building2 },
  { to: "/contacts", label: "Contacts", icon: Users },
  { to: "/activity", label: "Activity", icon: ActivityIcon },
  { to: "/settings", label: "Settings", icon: Settings },
  { to: "/team", label: "Team access", icon: UsersRound },
  { to: "/roles", label: "Roles", icon: ShieldCheck },
];

const HELP = { to: "/ask-detent", label: "Ask Detent", icon: CircleHelp };
const COMMAND = { to: "/command-centre", label: "Command Centre", icon: PanelTop };

const TABS = [NAV[0], NAV[1], NAV[4], NAV[5]];

function isActive(pathname, to) {
  return to === "/" ? pathname === "/" : pathname.startsWith(to);
}

export default function AppShell({ children }) {
  const { user, logout } = useAuth();
  const navigation = [...NAV, HELP, ...(isDetentStaff(user) ? [COMMAND] : [])];
  const can = useCrmCan();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const [collapsed, setCollapsed] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 hidden flex-col bg-frame text-frame-foreground transition-[width] duration-200 lg:flex",
          collapsed ? "w-[72px]" : "w-60"
        )}
      >
        <div className={cn("flex items-center gap-2 px-3 pb-4 pt-5", collapsed ? "flex-col" : "justify-between")}>
          {!collapsed && <ModuleSwitcher />}
          <button
            onClick={() => setCollapsed((value) => !value)}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-md text-frame-muted transition-colors hover:bg-white/10 hover:text-white"
            aria-label={collapsed ? "Expand navigation" : "Collapse navigation"}
          >
            {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </button>
        </div>

        {can.canCreate && (
          <div className="px-2 pb-3">
            <Link
              to="/deals"
              search={{ create: "1" }}
              className={cn(
                "flex items-center justify-center gap-2 rounded-lg bg-primary py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90",
                collapsed ? "px-0" : "px-3"
              )}
            >
              <Plus className="h-4 w-4 shrink-0" />
              {!collapsed && <span>New deal</span>}
            </Link>
          </div>
        )}

        <nav className="flex-1 space-y-0.5 px-2">
          {navigation.map((item) => {
            const active = isActive(pathname, item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-3 rounded-lg py-2 text-sm font-medium transition-colors",
                  collapsed ? "justify-center px-0" : "px-3",
                  active ? "detent-active-nav bg-white/10 text-white" : "text-frame-muted hover:bg-white/5 hover:text-white"
                )}
              >
                <item.icon className="h-[18px] w-[18px] shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-white/10 p-3">
          <div className={cn("flex items-center gap-2.5", collapsed && "justify-center")}>
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-indigo-500/20 text-[11px] font-bold text-indigo-200">
              {initials(user?.full_name || user?.email || "GT")}
            </span>
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-white">{user?.full_name || "Operator"}</p>
                <p className="truncate text-[11px] text-frame-muted">{user?.email}</p>
                <p className="mt-0.5 truncate text-[10px] font-semibold uppercase tracking-wide text-indigo-300">
                  {can.role ? ROLE_LABEL[can.role] || can.role : "No CRM access"}
                </p>
              </div>
            )}
            {!collapsed && (
              <button
                onClick={() => logout()}
                aria-label="Sign out"
                className="grid h-8 w-8 shrink-0 place-items-center rounded-md text-frame-muted transition-colors hover:bg-white/10 hover:text-white"
              >
                <LogOut className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </aside>

      <div className={cn("min-h-screen transition-[padding] duration-200", collapsed ? "lg:pl-[72px]" : "lg:pl-60")}>
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-2 border-b border-border bg-card/95 px-3 backdrop-blur lg:hidden">
          <ModuleSwitcher compact />
          <div className="flex items-center gap-1">
            <Link
              to="/deals"
              aria-label="Search deals"
              className="grid h-10 w-10 place-items-center rounded-lg text-muted-foreground hover:bg-muted"
            >
              <Search className="h-[18px] w-[18px]" />
            </Link>
            <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
              <SheetTrigger asChild>
                <button
                  aria-label="Open navigation"
                  className="grid h-10 w-10 place-items-center rounded-lg text-muted-foreground hover:bg-muted"
                >
                  <Menu className="h-[18px] w-[18px]" />
                </button>
              </SheetTrigger>
              <SheetContent side="right" className="w-72 bg-frame p-0 text-frame-foreground">
                <SheetHeader className="border-b border-white/10 px-4 py-4 text-left">
                  <SheetTitle className="text-sm font-semibold text-white">Navigate</SheetTitle>
                </SheetHeader>
                <nav className="space-y-0.5 p-2">
                  {navigation.map((item) => {
                    const active = isActive(pathname, item.to);
                    return (
                      <Link
                        key={item.to}
                        to={item.to}
                        onClick={() => setMenuOpen(false)}
                        className={cn(
                          "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                          active ? "detent-active-nav bg-white/10 text-white" : "text-frame-muted hover:bg-white/5 hover:text-white"
                        )}
                      >
                        <item.icon className="h-[18px] w-[18px]" />
                        {item.label}
                      </Link>
                    );
                  })}
                </nav>
                <div className="border-t border-white/10 p-3">
                  <button
                    onClick={() => logout()}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-frame-muted hover:bg-white/5 hover:text-white"
                  >
                    <LogOut className="h-4 w-4" /> Sign out
                  </button>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1680px] px-4 pb-28 pt-4 lg:px-6 lg:pb-8 lg:pt-6">{children}</main>

        {can.canCreate && (
          <Link
            to="/deals"
            search={{ create: "1" }}
            aria-label="New deal"
            className="fixed bottom-20 right-4 z-30 grid h-14 w-14 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-indigo-500/30 transition-transform active:scale-95 lg:hidden"
          >
            <Plus className="h-6 w-6" />
          </Link>
        )}

        <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-border bg-card lg:hidden">
          {TABS.map((item) => {
            const active = isActive(pathname, item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium",
                  active ? "text-primary" : "text-muted-foreground"
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}