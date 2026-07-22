import {
  Home,
  Radio,
  Calendar,
  Trophy,
  Users,
  BarChart3,
  Settings,
  FileSpreadsheet,
  LayoutDashboard,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  match?: (path: string) => boolean;
  roles?: ("administrator" | "scorer" | "captain" | "viewer")[];
}

export const PRIMARY_NAV: NavItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard, match: (p) => p === "/" },
  {
    href: "/live",
    label: "Live Matches",
    icon: Radio,
    match: (p) => p === "/live" || p.startsWith("/live/"),
  },
  { href: "/fixtures", label: "Fixtures", icon: Calendar, match: (p) => p.startsWith("/fixtures") },
  { href: "/teams", label: "Teams", icon: Users, match: (p) => p.startsWith("/teams") },
  { href: "/standings", label: "Standings", icon: BarChart3, match: (p) => p.startsWith("/standings") },
  { href: "/leaderboards", label: "Leaderboards", icon: Trophy, match: (p) => p.startsWith("/leaderboards") },
  { href: "/reports", label: "Reports", icon: FileSpreadsheet, match: (p) => p.startsWith("/reports") },
];

export const MOBILE_BOTTOM_NAV: NavItem[] = [
  { href: "/", label: "Home", icon: Home, match: (p) => p === "/" },
  {
    href: "/live",
    label: "Live",
    icon: Radio,
    match: (p) => p === "/live" || p.startsWith("/live/"),
  },
  { href: "/fixtures", label: "Fixtures", icon: Calendar, match: (p) => p.startsWith("/fixtures") },
  { href: "/standings", label: "Standings", icon: Trophy, match: (p) => p.startsWith("/standings") },
  { href: "/ccpl", label: "More", icon: Users, match: (p) => p.startsWith("/ccpl") || p.startsWith("/admin") },
];

export const ADMIN_NAV: NavItem = {
  href: "/admin",
  label: "Admin",
  icon: Settings,
  match: (p) => p.startsWith("/admin"),
  roles: ["administrator", "scorer"],
};

export function isNavActive(item: NavItem, pathname: string): boolean {
  if (item.match) return item.match(pathname);
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}
