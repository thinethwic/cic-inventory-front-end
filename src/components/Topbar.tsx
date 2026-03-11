import { Search } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { ModeToggle } from "@/components/shared/mode-toggle";

export default function Topbar() {
  return (
    <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b bg-background px-4">
      <SidebarTrigger className="md:hidden" />

      <div className="flex flex-1 items-center gap-2 rounded-md border bg-muted/30 px-3 py-2">
        <Search className="h-4 w-4 text-muted-foreground" />
        <input
          className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          placeholder="Search assets, serial, employee..."
        />
      </div>

      <ModeToggle />
    </header>
  );
}
