/**
 * Pure role-based routing rules shared by the `_authenticated` guard and tests.
 */

/** Student-only surfaces. Admins never see these. */
export const STUDENT_PATHS = [
  "/dashboard",
  "/profile",
  "/leaderboard",
  "/squads",
  "/playbook",
  "/certificates",
  "/chat",
  "/notices",
  "/badge",
  "/onboarding",
] as const;

/** Admin-only surfaces. Students never see these. */
export const ADMIN_PATHS = ["/admin"] as const;

/** Student paths reachable before the profile is completed. */
export const OPEN_PATHS = ["/onboarding", "/profile"] as const;

export type AccessInput = {
  pathname: string;
  isAdmin: boolean;
  profileCompleted: boolean | null;
};

export type AccessResult =
  | { kind: "allow" }
  | { kind: "redirect"; to: string; search?: Record<string, string> };

const ADMIN_HOME = { to: "/admin", search: { section: "members" } };

function matches(pathname: string, paths: readonly string[]) {
  return paths.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export function resolveAccess({ pathname, isAdmin, profileCompleted }: AccessInput): AccessResult {
  if (isAdmin) {
    if (matches(pathname, STUDENT_PATHS)) {
      return { kind: "redirect", ...ADMIN_HOME };
    }
    return { kind: "allow" };
  }

  if (matches(pathname, ADMIN_PATHS)) {
    return { kind: "redirect", to: "/dashboard" };
  }

  if (profileCompleted === false && !matches(pathname, OPEN_PATHS)) {
    return { kind: "redirect", to: "/onboarding" };
  }

  return { kind: "allow" };
}