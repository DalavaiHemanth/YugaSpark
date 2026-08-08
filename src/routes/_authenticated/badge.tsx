import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { toPng } from "html-to-image";
import { toast } from "sonner";
import { Camera, Lock } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { signedUrl } from "@/lib/storage";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";

const TITLE = "My club badge — Yuga Spark";
const DESCRIPTION = "Your personal Yuga Spark member badge with a scannable QR code.";

export const Route = createFileRoute("/_authenticated/badge")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
    ],
  }),
  component: BadgePage,
});

function BadgePage() {
  const { profile, user } = useAuth();
  const cardRef = useRef<HTMLDivElement>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !profile?.photo_url) return;
    const payload = JSON.stringify({
      club: "Yuga Spark",
      id: user.id,
      name: profile?.full_name ?? "",
      reg: profile?.registration_number ?? "",
    });
    void QRCode.toDataURL(payload, {
      margin: 1,
      width: 320,
      color: { dark: "#0d1117", light: "#ffffff" },
    }).then(setQr);
  }, [user, profile]);

  useEffect(() => {
    if (profile?.photo_url) {
      void signedUrl("photos", profile.photo_url).then(setPhoto);
    }
  }, [profile?.photo_url]);

  async function download() {
    if (!cardRef.current) return;
    try {
      const url = await toPng(cardRef.current, { pixelRatio: 3, cacheBust: true });
      const a = document.createElement("a");
      a.href = url;
      a.download = `yuga-spark-badge-${profile?.registration_number ?? "member"}.png`;
      a.click();
    } catch {
      toast.error("Could not export the badge image");
    }
  }

  if (!profile?.profile_completed || !profile?.photo_url) {
    return (
      <AppShell>
        <div className="mx-auto max-w-md rounded-2xl border border-amber-500/30 bg-amber-500/5 p-6 text-center space-y-4 my-8 shadow-sm">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-amber-500/10 text-amber-600">
            <Camera className="h-6 w-6" />
          </div>
          <div className="space-y-1.5">
            <h1 className="text-xl font-bold font-display">Profile Photo Required for Member Badge</h1>
            <p className="text-xs leading-relaxed text-muted-foreground">
              To prevent proxy attendance and ensure official club verification, your scannable QR badge requires a verified profile photo.
            </p>
          </div>
          <Button size="sm" asChild className="w-full gap-2 mt-2">
            <Link to="/profile">
              <Camera className="h-4 w-4" /> Upload Profile Photo
            </Link>
          </Button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <p className="label-mono text-primary">Member credential</p>
      <h1 className="mt-3 text-4xl font-bold">Your club badge</h1>

      <div className="mt-8 flex flex-wrap items-start gap-8">
        <div
          ref={cardRef}
          className="w-[340px] overflow-hidden rounded-[6px] border border-primary/40 bg-card"
        >
          <div className="bg-[image:var(--gradient-spark)] px-5 py-4">
            <p className="font-display text-xl font-bold text-primary-foreground">Yuga Spark</p>
            <p className="label-mono text-primary-foreground/80">Hackathon Club · RGMCET</p>
          </div>
          <div className="flex gap-4 p-5">
            <div className="h-24 w-20 shrink-0 overflow-hidden rounded-[3px] border border-border bg-secondary">
              {photo ? (
                <img src={photo} alt={profile.full_name ?? "Member photo"} className="h-full w-full object-cover" />
              ) : null}
            </div>
            <div className="min-w-0">
              <p className="label-mono text-muted-foreground">Member</p>
              <p className="truncate font-display text-lg font-bold">{profile.full_name}</p>
              <p className="mt-1 font-mono text-xs text-muted-foreground">
                {profile.registration_number}
              </p>
              <p className="font-mono text-xs text-muted-foreground">{profile.year}</p>
            </div>
          </div>
          <div className="flex items-center justify-between gap-4 border-t border-border px-5 py-4">
            {qr ? <img src={qr} alt="Member QR code" className="h-24 w-24 rounded-[2px]" /> : null}
            <p className="label-mono max-w-[9rem] text-right text-muted-foreground">
              Scan to verify membership
            </p>
          </div>
        </div>

        <div className="max-w-sm">
          <p className="text-sm text-muted-foreground">
            Save this badge as an image for your socials, or show the QR at check-in desks.
          </p>
          <Button className="mt-4" onClick={download}>
            Download badge
          </Button>
        </div>
      </div>
    </AppShell>
  );
}