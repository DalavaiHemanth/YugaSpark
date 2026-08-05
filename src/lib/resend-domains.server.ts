/** Server-only Resend domain administration through the connector gateway. */
const GATEWAY_URL = "https://connector-gateway.lovable.dev/resend";

import type { DnsRecord, ResendDomain } from "./resend-domains.types";

export type { DnsRecord, ResendDomain };

function keys() {
  const lovableKey = process.env["LOVABLE_API_KEY"];
  const resendKey = process.env["RESEND_API_KEY"];
  if (!lovableKey || !resendKey) throw new Error("Email service is not configured");
  return { lovableKey, resendKey };
}

async function call(path: string, init?: { method?: string; body?: unknown }) {
  const { lovableKey, resendKey } = keys();
  const response = await fetch(`${GATEWAY_URL}${path}`, {
    method: init?.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": resendKey,
    },
    ...(init?.body ? { body: JSON.stringify(init.body) } : {}),
  });
  const raw = await response.text();
  if (!response.ok) {
    console.error(`Resend domains request failed [${response.status}]: ${raw}`);
    let message = raw.slice(0, 300);
    try {
      const parsed = JSON.parse(raw) as { message?: string };
      if (parsed.message) message = parsed.message;
    } catch {
      /* keep raw */
    }
    throw new Error(`[${response.status}] ${message}`);
  }
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return {} as unknown;
  }
}

type RawDomain = {
  id?: string;
  name?: string;
  status?: string;
  region?: string;
  created_at?: string;
  records?: DnsRecord[];
};

function normalize(d: RawDomain): ResendDomain {
  return {
    id: d.id ?? "",
    name: d.name ?? "",
    status: d.status ?? "unknown",
    region: d.region ?? null,
    createdAt: d.created_at ?? null,
    ...(d.records ? { records: d.records } : {}),
  };
}

export async function listDomains(): Promise<ResendDomain[]> {
  const res = (await call("/domains")) as { data?: RawDomain[] };
  return (res.data ?? []).map(normalize);
}

export async function getDomain(id: string): Promise<ResendDomain> {
  return normalize((await call(`/domains/${id}`)) as RawDomain);
}

export async function createDomain(name: string): Promise<ResendDomain> {
  return normalize((await call("/domains", { method: "POST", body: { name } })) as RawDomain);
}

export async function verifyDomain(id: string): Promise<void> {
  await call(`/domains/${id}/verify`, { method: "POST" });
}

export async function deleteDomain(id: string): Promise<void> {
  await call(`/domains/${id}`, { method: "DELETE" });
}
