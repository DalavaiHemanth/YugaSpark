/** Client-safe types for sender domain administration. */
export type DnsRecord = {
  record: string;
  name: string;
  type: string;
  value: string;
  ttl?: string | null;
  priority?: number | null;
  status?: string | null;
};

export type ResendDomain = {
  id: string;
  name: string;
  status: string;
  region?: string | null;
  createdAt?: string | null;
  records?: DnsRecord[];
};
