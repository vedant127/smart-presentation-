import { FileText, Settings, FolderOpen, Zap } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/", icon: FileText, label: "Generate", description: "Create presentations" },
  { to: "/builder", icon: Settings, label: "Builder", description: "Manage types" },
  { to: "/library", icon: FolderOpen, label: "Library", description: "File manager" },
];

const AppSidebar = () => {
  const location = useLocation();

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-64 flex-col bg-sidebar">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sidebar-primary">
          <Zap className="h-5 w-5 text-sidebar-primary-foreground" />
        </div>
        <div>
          <h1 className="font-display text-lg font-bold text-sidebar-foreground tracking-tight">FELIX</h1>
          <p className="text-xs text-sidebar-muted">Report Generator</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const isActive = item.to === "/" ? location.pathname === "/" : location.pathname.startsWith(item.to);
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all duration-200",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              )}
            >
              <item.icon className={cn("h-4.5 w-4.5", isActive && "text-sidebar-primary")} />
              <div>
                <div className="font-medium">{item.label}</div>
                <div className={cn("text-xs", isActive ? "text-sidebar-accent-foreground/60" : "text-sidebar-muted")}>
                  {item.description}
                </div>
              </div>
            </NavLink>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-sidebar-border px-6 py-4">
        <p className="text-xs text-sidebar-muted">FELIX v1.0</p>
        <p className="text-xs text-sidebar-muted/60">Report Generation Suite</p>
      </div>
    </aside>
  );
};

export default AppSidebar;
