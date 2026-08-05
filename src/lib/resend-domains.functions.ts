import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertAdmin } from "./admin-guard.server";

const DOMAIN_RE = /^(?!-)[a-z0-9-]+(\.[a-z0-9-]+)+$/;

/** Admin-only: lists every sender domain registered with the club's email provider. */
export const listSenderDomains = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { listDomains } = await import("./resend-domains.server");
    return listDomains();
  });

/** Admin-only: fetches one domain with its DNS records. */
export const getSenderDomain = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string }) => {
    const id = String(data?.id ?? "").trim();
    if (!id) throw new Error("Domain id is required");
    return { id };
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { getDomain } = await import("./resend-domains.server");
    return getDomain(data.id);
  });

/** Admin-only: registers a new sender domain and returns the DNS records to add. */
export const addSenderDomain = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { name: string }) => {
    const name = String(data?.name ?? "").trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
    if (!DOMAIN_RE.test(name)) throw new Error("Enter a domain like yugaspark.in");
    if (/^(gmail|googlemail|yahoo|outlook|hotmail|icloud|proton|protonmail)\./.test(name)) {
      throw new Error("Free mailbox domains cannot be verified — use a domain you own");
    }
    return { name };
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { createDomain } = await import("./resend-domains.server");
    return createDomain(data.name);
  });

/** Admin-only: asks the provider to re-check DNS for a domain. */
export const verifySenderDomain = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string }) => {
    const id = String(data?.id ?? "").trim();
    if (!id) throw new Error("Domain id is required");
    return { id };
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { verifyDomain, getDomain } = await import("./resend-domains.server");
    await verifyDomain(data.id);
    return getDomain(data.id);
  });

/** Admin-only: removes a sender domain from the email provider. */
export const removeSenderDomain = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string }) => {
    const id = String(data?.id ?? "").trim();
    if (!id) throw new Error("Domain id is required");
    return { id };
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { deleteDomain } = await import("./resend-domains.server");
    await deleteDomain(data.id);
    return { ok: true };
  });
