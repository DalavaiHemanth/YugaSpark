import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { resolveAccess } from "@/lib/route-access";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });

    const [{ data: profile }, { data: roles }] = await Promise.all([
      supabase
        .from("profiles")
        .select("profile_completed")
        .eq("id", data.user.id)
        .maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", data.user.id),
    ]);
    const isAdmin = Boolean(roles?.some((r) => r.role === "admin"));

    const access = resolveAccess({
      pathname: location.pathname,
      isAdmin,
      profileCompleted: profile ? profile.profile_completed : null,
    });
    if (access.kind === "redirect") {
      throw redirect({ to: access.to, search: access.search, replace: true } as never);
    }

    return { user: data.user };
  },
  component: () => <Outlet />,
});
