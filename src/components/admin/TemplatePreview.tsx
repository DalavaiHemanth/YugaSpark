import { useMemo, useState } from "react";
import {
  EMAIL_TEMPLATES,
  EMAIL_VARIABLES,
  personalize,
  renderHtml,
  type EmailTemplate,
} from "@/lib/email-template";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Props = {
  subject: string;
  body: string;
  bannerUrl?: string | null;
  sample: { email: string; name?: string | null } | null;
  onApplyTemplate: (t: EmailTemplate) => void;
  onReplaceContent: (next: { subject: string; body: string }) => void;
};

const RECIPIENT_TOKENS = new Set(["name", "first_name", "email"]);

/** Lets admins load announcement/results templates, fill variables and preview the real email. */
export function TemplatePreview({ subject, body, bannerUrl, sample, onApplyTemplate, onReplaceContent }: Props) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");

  const customTokens = useMemo(() => {
    const found = new Set<string>();
    for (const m of `${subject}\n${body}`.matchAll(/\{\{\s*([a-z0-9_]+)\s*\}\}/gi)) {
      const key = m[1]!.toLowerCase();
      if (!RECIPIENT_TOKENS.has(key)) found.add(key);
    }
    return [...found];
  }, [subject, body]);

  const fillCustom = (text: string) =>
    customTokens.reduce(
      (acc, token) =>
        acc.replace(
          new RegExp(`\\{\\{\\s*${token}\\s*\\}\\}`, "gi"),
          values[token]?.trim() || `{{${token}}}`,
        ),
      text,
    );

  const recipient = sample ?? { email: "member@rgmcet.edu.in", name: "Sample Member" };
  const previewSubject = personalize(fillCustom(subject || "(no subject yet)"), recipient);
  const previewBody = personalize(fillCustom(body || "Write your message to see it here."), recipient);
  const html = renderHtml(previewSubject, previewBody, { bannerUrl });

  function applyValues() {
    onReplaceContent({ subject: fillCustom(subject), body: fillCustom(body) });
  }

  return (
    <div className="space-y-4 surface p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="label-mono text-muted-foreground">Template preview</h2>
        <div className="flex gap-1">
          {(["desktop", "mobile"] as const).map((d) => (
            <Button
              key={d}
              size="sm"
              variant={device === d ? "default" : "outline"}
              className="capitalize"
              onClick={() => setDevice(d)}
            >
              {d}
            </Button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-xs text-muted-foreground">Start from a template</p>
        <div className="flex flex-wrap gap-2">
          {EMAIL_TEMPLATES.map((t) => (
            <Button key={t.id} size="sm" variant="outline" onClick={() => onApplyTemplate(t)}>
              {t.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-xs text-muted-foreground">
          Personal variables filled per recipient: {EMAIL_VARIABLES.map((v) => v.token).join(", ")}
        </p>
        {customTokens.length ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {customTokens.map((token) => (
              <div key={token} className="space-y-1.5">
                <Label htmlFor={`var-${token}`} className="text-xs font-mono">
                  {`{{${token}}}`}
                </Label>
                <Input
                  id={`var-${token}`}
                  value={values[token] ?? ""}
                  placeholder={`Value for ${token}`}
                  onChange={(e) => setValues((v) => ({ ...v, [token]: e.target.value }))}
                />
              </div>
            ))}
          </div>
        ) : null}
        {customTokens.length ? (
          <Button size="sm" variant="secondary" onClick={applyValues}>
            Apply values to message
          </Button>
        ) : null}
      </div>

      <div className="rounded-lg border border-border bg-muted/30 p-3">
        <p className="text-xs text-muted-foreground">Subject line preview</p>
        <p className="mt-1 truncate text-sm font-medium">{previewSubject}</p>
        <p className="mt-2 text-xs text-muted-foreground">
          Previewing as {recipient.name ?? "Member"} · {recipient.email}
        </p>
      </div>

      <div className="overflow-hidden rounded-lg border border-border">
        <iframe
          title="Email preview"
          srcDoc={html}
          sandbox=""
          className="mx-auto block h-[520px] bg-white"
          style={{ width: device === "mobile" ? 380 : "100%" }}
        />
      </div>
    </div>
  );
}