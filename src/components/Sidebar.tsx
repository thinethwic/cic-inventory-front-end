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

import { hasRole } from "@/utils/permissions";
import { usePermissions } from "@/hooks/usePermissions";

/* ================= TYPES ================= */

type Role = "admin" | "admin_user" | "user";
type UserLocation = string;
type UserDepartment = string;
type NavItem = {
  to: string;
  label: string;
  icon: LucideIcon;
  roles?: Role[];
};

/* ================= NAV CONFIG ================= */

const navItems: NavItem[] = [
  {
    to: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    roles: ["admin", "admin_user", "user"],
  },
  {
    to: "/assets",
    label: "Assets",
    icon: Laptop,
    roles: ["admin", "admin_user", "user"],
  },
  {
    to: "/employees",
    label: "Employees",
    icon: Users,
    roles: ["admin", "admin_user"],
  },
  {
    to: "/maintenance",
    label: "Maintenance",
    icon: Wrench,
    roles: ["admin", "admin_user", "user"],
  },
  {
    to: "/reports",
    label: "Reports",
    icon: FileBarChart2,
    roles: ["admin", "admin_user"],
  },
  {
    to: "/assetTransfer",
    label: "Asset Transfer",
    icon: ShieldCheck,
    roles: ["admin", "admin_user"],
  },
  {
    to: "/settings",
    label: "Settings",
    icon: Settings,
    roles: ["admin", "admin_user", "user"],
  },
];

/* ================= COMPONENT ================= */

export default function AppSidebar() {
  const { role } = usePermissions();
  const isAdmin = hasRole(role, ["admin", "admin_user"]);
  const { user } = useUser();
  const location = useLocation();

  // 🔐 Get extra metadata from Clerk (role already comes from usePermissions)
  const metaRole = user?.publicMetadata?.role as Role | undefined;
  const Userlocation = user?.publicMetadata?.location as
    | UserLocation
    | undefined;
  const UserDepartment = user?.publicMetadata?.departmentName as
    | UserDepartment
    | undefined;

  const canAccess = (item: NavItem) => {
    return !item.roles || (role && item.roles.includes(role as Role));
  };

  const filteredNavItems = navItems.filter(canAccess);

  return (
    <Sidebar collapsible="offcanvas" className="hidden md:flex">
      {/* ================= HEADER ================= */}
      <SidebarHeader>
        <div className="flex items-center gap-3 px-2 py-2">
          <img src={logo} alt="CIC Logo" className="h-10 w-10 object-contain" />
          <div className="leading-tight">
            <div className="font-semibold">Asset Management</div>
            <div className="text-xs text-muted-foreground">
              CIC Feeds PVT LTD
            </div>
          </div>
        </div>
      </SidebarHeader>

      {/* ================= MENU ================= */}
      <SidebarContent>
        <SidebarMenu>
          {filteredNavItems.map((item) => {
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

      {/* ================= FOOTER ================= */}
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

            {/* 🔥 Show role + department */}
            <div className="truncate text-xs text-muted-foreground">
              {metaRole ?? "role"}
            </div>

            <div className="truncate text-xs text-muted-foreground">
              {Userlocation ?? "location"}
            </div>
            {!isAdmin && (
              <div className="truncate text-xs text-muted-foreground">
                {UserDepartment ?? "No department"}
              </div>
            )}

            <div className="text-xs text-muted-foreground truncate">
              Version 1.1.5
            </div>
          </div>
        </div>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
