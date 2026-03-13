import { Laptop, ShieldCheck } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { ModeToggle } from "@/components/shared/mode-toggle";
import { Badge } from "@/components/ui/badge";

export default function Topbar() {
  return (
    <header className="sticky top-0 z-40 flex h-14 items-center justify-between gap-3 border-b bg-background px-4">
      <div className="flex items-center gap-3">
        <SidebarTrigger className="md:hidden" />

        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
            <Laptop className="h-4 w-4 text-primary" />
          </div>

          <div className="leading-tight">
            <h1 className="text-sm font-semibold sm:text-base">
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
          className="hidden sm:flex items-center gap-1"
        >
          <ShieldCheck className="h-3.5 w-3.5" />
          System Active
        </Badge>

        <ModeToggle />
      </div>
    </header>
  );
}
