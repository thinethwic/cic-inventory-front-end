import { Laptop, ShieldCheck } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { ModeToggle } from "@/components/shared/mode-toggle";
import { Badge } from "@/components/ui/badge";

export default function Topbar() {
  return (
    <header className="sticky top-0 z-40 flex h-16 items-center justify-between gap-3 border-b border-border/70 bg-background/95 px-4 sm:px-6 lg:px-8">
      <div className="flex items-center gap-3">
        <SidebarTrigger className="md:hidden" />

        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-primary/15 bg-primary/10 shadow-sm">
            <Laptop className="h-4 w-4 text-primary" />
          </div>

          <div className="leading-tight">
            <h1 className="text-sm font-semibold tracking-normal sm:text-base">
              IT Asset Management System
            </h1>
            <p className="hidden text-xs text-muted-foreground sm:block">
              Manage assets, transfers, maintenance, and reports
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Badge
          variant="secondary"
          className="hidden items-center gap-1 border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 sm:flex"
        >
          <ShieldCheck className="h-3.5 w-3.5" />
          System Active
        </Badge>

        <ModeToggle />
      </div>
    </header>
  );
}
