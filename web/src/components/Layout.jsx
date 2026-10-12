import { NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  Upload,
  Settings2,
  BarChart3,
  Download,
  ChevronRight,
} from "lucide-react";

const steps = [
  { path: "/upload",  label: "Upload",    icon: Upload     },
  { path: "/config",  label: "Configure", icon: Settings2  },
  { path: "/results", label: "Results",   icon: BarChart3  },
  { path: "/export",  label: "Export",    icon: Download   },
];

export default function Layout({ children }) {
  const location = useLocation();
  const currentIdx = steps.findIndex((s) => location.pathname.startsWith(s.path));

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b bg-card px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight">
              Incursion 2k26 — Team Shortlisting Tool
            </h1>
            <p className="text-sm text-muted-foreground">
              Fair, explainable, configurable hackathon team selection
            </p>
          </div>

          {/* Step nav */}
          <nav className="flex items-center gap-1">
            {steps.map((step, i) => {
              const Icon = step.icon;
              const isActive = location.pathname.startsWith(step.path);
              const isDone = i < currentIdx;

              return (
                <div key={step.path} className="flex items-center">
                  <NavLink
                    to={step.path}
                    className={cn(
                      "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : isDone
                        ? "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                        : "text-muted-foreground opacity-60 pointer-events-none"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {step.label}
                  </NavLink>
                  {i < steps.length - 1 && (
                    <ChevronRight className="h-4 w-4 text-muted-foreground mx-1" />
                  )}
                </div>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Page content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-8">
        {children}
      </main>
    </div>
  );
}
