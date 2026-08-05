import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Trophy,
  Users,
  BookOpen,
  Award,
  Megaphone,
  MessageSquare,
  QrCode,
  UserCog,
  LogOut,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { ADMIN_NAV } from "@/lib/admin-nav";
import { SparkMark } from "@/components/SparkMark";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

const CLUB = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/leaderboard", label: "Leaderboard", icon: Trophy },
  { to: "/squads", label: "Squads", icon: Users },
] as const;

const RESOURCES = [
  { to: "/playbook", label: "Playbook", icon: BookOpen },
  { to: "/certificates", label: "Certificates", icon: Award },
  { to: "/notices", label: "Notices", icon: Megaphone },
  { to: "/chat", label: "Ask admin", icon: MessageSquare },
  { to: "/badge", label: "Badge", icon: QrCode },
] as const;

type Item = { to: string; label: string; icon: typeof Trophy };

export function AppSidebar() {
  const { profile, isAdmin, isOwner, signOut } = useAuth();
  const { state, isMobile, setOpenMobile } = useSidebar();
  const navigate = useNavigate();
  const location = useRouterState({ select: (r) => r.location });
  const isAdminRoute = location.pathname.startsWith("/admin");
  const activeSection =
    (location.search as { section?: string }).section ?? (isAdminRoute ? "members" : undefined);
  const collapsed = state === "collapsed" && !isMobile;

  const close = () => isMobile && setOpenMobile(false);

  const initials = (profile?.full_name ?? profile?.email ?? "?")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const renderItem = (item: Item) => (
    <SidebarMenuItem key={item.to}>
      <SidebarMenuButton asChild tooltip={item.label}>
        <Link
          to={item.to}
          onClick={close}
          className="flex items-center gap-2.5"
          activeProps={{ className: "bg-sidebar-accent text-sidebar-accent-foreground font-medium" }}
        >
          <item.icon className="h-4 w-4 shrink-0" />
          <span className="truncate">{item.label}</span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="px-3 py-4">
        <Link to={isAdmin ? "/admin" : "/dashboard"} onClick={close}>
          <SparkMark compact={collapsed} />
        </Link>
      </SidebarHeader>

      <SidebarContent>
        {isAdmin ? (
          ADMIN_NAV.map((group) => {
            const items = group.items.filter((i) => isOwner || !i.ownerOnly);
            if (items.length === 0) return null;
            return (
              <SidebarGroup key={group.group}>
                <SidebarGroupLabel>{group.group}</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {items.map((item) => (
                      <SidebarMenuItem key={item.key}>
                        <SidebarMenuButton
                          asChild
                          tooltip={item.label}
                          isActive={isAdminRoute && activeSection === item.key}
                        >
                          <Link
                            to="/admin"
                            search={{ section: item.key }}
                            onClick={close}
                            className="flex items-center gap-2.5"
                          >
                            <item.icon className="h-4 w-4 shrink-0" />
                            <span className="truncate">{item.label}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            );
          })
        ) : (
          <>
            <SidebarGroup>
              <SidebarGroupLabel>Club</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>{CLUB.map(renderItem)}</SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarGroup>
              <SidebarGroupLabel>Resources</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>{RESOURCES.map(renderItem)}</SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Profile" size="lg">
              <Link to="/profile" onClick={close} className="flex items-center gap-2.5">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary/10 font-mono text-[11px] font-semibold text-primary">
                  {initials}
                </span>
                <span className="min-w-0 leading-tight">
                  <span className="block truncate text-xs font-medium">
                    {profile?.full_name ?? profile?.email}
                  </span>
                  <span className="block text-[10px] text-muted-foreground">
                    {isAdmin ? "Admin" : "Member"}
                  </span>
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="Sign out"
              onClick={async () => {
                await signOut();
                navigate({ to: "/auth", replace: true });
              }}
            >
              <LogOut className="h-4 w-4" />
              <span>Sign out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
