export interface NavItem {
  label: string;
  route: string;
}

export const NAV_ITEMS: readonly NavItem[] = [
  { label: "Accueil", route: "/" },
  { label: "Quêtes", route: "/quests" },
  { label: "Progression", route: "/progression" },
];

export function isRouteActive(pathname: string, route: string): boolean {
  return pathname === route;
}

export function shouldNavigate(currentPath: string, targetRoute: string): boolean {
  return !isRouteActive(currentPath, targetRoute);
}
