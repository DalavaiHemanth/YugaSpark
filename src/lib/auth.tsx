import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  registration_number: string | null;
  year: string | null;
  batch: string | null;
  personal_email: string | null;
  photo_url: string | null;
  resume_url: string | null;
  profile_completed: boolean;
};

type AuthState = {
  loading: boolean;
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  isAdmin: boolean;
  isOwner: boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

// In-memory auth cache with 5-minute TTL to prevent duplicate DB hits under 50-60 user load
let cachedUid: string | null = null;
let cachedProfile: Profile | null = null;
let cachedIsAdmin = false;
let cachedIsOwner = false;
let lastFetchedAt = 0;
const CACHE_TTL_MS = 5 * 60 * 1000;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async (uid: string | undefined, forceRefresh = false) => {
    if (!uid) {
      setProfile(null);
      setIsAdmin(false);
      setIsOwner(false);
      cachedUid = null;
      cachedProfile = null;
      cachedIsAdmin = false;
      cachedIsOwner = false;
      lastFetchedAt = 0;
      return;
    }

    const now = Date.now();
    if (!forceRefresh && cachedUid === uid && now - lastFetchedAt < CACHE_TTL_MS) {
      setProfile(cachedProfile);
      setIsAdmin(cachedIsAdmin);
      setIsOwner(cachedIsOwner);
      return;
    }

    const [{ data: p }, { data: roles }, { data: owner }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", uid).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", uid),
      supabase.rpc("is_owner", { _user_id: uid }),
    ]);

    const nextProfile = (p as Profile) ?? null;
    const nextAdmin = Boolean(roles?.some((r) => r.role === "admin"));
    const nextOwner = Boolean(owner);

    cachedUid = uid;
    cachedProfile = nextProfile;
    cachedIsAdmin = nextAdmin;
    cachedIsOwner = nextOwner;
    lastFetchedAt = Date.now();

    setProfile(nextProfile);
    setIsAdmin(nextAdmin);
    setIsOwner(nextOwner);
  };

  useEffect(() => {
    let active = true;
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      if (!active) return;
      setSession(s);
      void load(s?.user?.id).then(() => setLoading(false));
    });
    void supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return;
      setSession(data.session);
      await load(data.session?.user?.id);
      setLoading(false);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const value: AuthState = {
    loading,
    session,
    user: session?.user ?? null,
    profile,
    isAdmin,
    isOwner,
    refresh: async () => {
      await load(session?.user?.id, true);
    },
    signOut: async () => {
      await supabase.auth.signOut();
      load(undefined);
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}