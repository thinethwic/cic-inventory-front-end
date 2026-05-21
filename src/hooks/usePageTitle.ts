import { useEffect } from "react";
import { useLocation } from "react-router";

const ROUTE_TITLES: Record<string, string> = {
    "/dashboard": "Dashboard",  // ← updated
    "/assets": "Assets",
    "/maintenance": "Maintenance",
    "/employees": "Management",
    "/reports": "Reports",
    "/assetTransfer": "Asset Transfer",
    "/settings": "Settings",
    "/login": "Login",
    "/signup": "SignUp"
};

const APP_NAME = "CIC Asset Inventory";  // ← fixed spelling (was "Wick")

export function usePageTitle() {
    const { pathname } = useLocation();

    useEffect(() => {
        const label = ROUTE_TITLES[pathname] ?? "Page";
        document.title = `${label} | ${APP_NAME}`;
    }, [pathname]);
}