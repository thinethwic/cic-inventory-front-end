import * as React from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Laptop,
  Users,
  Wrench,
  FileBarChart2,
  ShieldCheck,
  Settings,
  type LucideIcon,
} from "lucide-react";
import { UserButton, useUser } from "@clerk/clerk-react";

import logo from "@/assets/Logo.png";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";

type NavItem = {
  to: string;
  label: string;
  icon: LucideIcon;
};

const navItems: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/assets", label: "Assets", icon: Laptop },
  { to: "/employees", label: "Employees", icon: Users },
  { to: "/maintenance", label: "Maintenance", icon: Wrench },
  { to: "/reports", label: "Reports", icon: FileBarChart2 },
  { to: "/audit", label: "Audit Logs", icon: ShieldCheck },
  { to: "/settings", label: "Settings", icon: Settings },
];

export default function AppSidebar() {
  const { user } = useUser();
  const location = useLocation();

  return (
    <Sidebar collapsible="offcanvas" className="hidden md:flex">
      {/* Header (Logo + Title) */}
      <SidebarHeader>
        <div className="flex items-center gap-3 px-2 py-2">
          <img src={logo} alt="CIC Logo" className="h-10 w-10 object-contain" />
          <div className="leading-tight">
            <div className="font-semibold">Asset Management</div>
            <div className="text-xs text-muted-foreground">
              CIC Feeds PVT LTD{" "}
            </div>
          </div>
        </div>
      </SidebarHeader>

      {/* Content (Menu) */}
      <SidebarContent>
        <SidebarMenu>
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = location.pathname === item.to;

            return (
              <SidebarMenuItem key={item.to}>
                <SidebarMenuButton
                  asChild
                  isActive={active}
                  tooltip={item.label}
                >
                  <NavLink to={item.to} className="flex items-center gap-2">
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarContent>

      {/* Footer (User) */}
      <SidebarFooter>
        <div className="flex items-center gap-3 px-2 py-2">
          <UserButton
            appearance={{
              elements: { avatarBox: "h-9 w-9" },
            }}
            afterSignOutUrl="/login"
          />
          <div className="min-w-0">
            <div className="truncate text-sm font-medium">
              {user?.fullName ?? "User"}
            </div>
            <div className="text-xs text-muted-foreground truncate">
              Version 1.0.0
            </div>
          </div>
        </div>
      </SidebarFooter>

      {/* Small rail on the edge */}
      <SidebarRail />
    </Sidebar>
  );
}
