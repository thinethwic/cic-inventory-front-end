import { Outlet } from "react-router-dom";

import { SidebarProvider } from "@/components/ui/sidebar";
import AppSidebar from "./Sidebar";
import Topbar from "./Topbar";
import { ThemeProvider } from "./shared/theme-provider";

export default function DashboardLayout() {
  return (
    <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
      <SidebarProvider>
        <div className="flex min-h-screen w-full">
          <AppSidebar />

          <div className="flex min-w-0 flex-1 flex-col">
            <Topbar />
            <main className="flex-1 p-5">
              <Outlet />
            </main>
          </div>
        </div>
      </SidebarProvider>
    </ThemeProvider>
  );
}
