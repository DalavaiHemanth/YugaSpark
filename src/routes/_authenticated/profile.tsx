import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { signedUrl, uploadUserFile } from "@/lib/storage";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const YEARS = ["1st Year", "2nd Year", "3rd Year", "4th Year"];
const TITLE = "Profile — Yuga Spark";
const DESCRIPTION = "Update your Yuga Spark member details, photo, resume and password.";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { user, profile, isAdmin, refresh } = useAuth();
  const [fullName, setFullName] = useState("");
  const [regNo, setRegNo] = useState("");
  const [year, setYear] = useState("");
  const [personalEmail, setPersonalEmail] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [resume, setResume] = useState<File | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [resumeLink, setResumeLink] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (!profile) return;
    setFullName(profile.full_name ?? "");
    setRegNo(profile.registration_number ?? "");
    setYear(profile.year ?? "");
    setPersonalEmail(profile.personal_email ?? "");
    void signedUrl("photos", profile.photo_url).then(setPhotoUrl);
    void signedUrl("resumes", profile.resume_url).then(setResumeLink);
  }, [profile]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setBusy(true);
    try {
      const photoPath = photo
        ? await uploadUserFile("photos", user.id, photo)
        : (profile?.photo_url ?? null);
      const resumePath = resume
        ? await uploadUserFile("resumes", user.id, resume)
        : (profile?.resume_url ?? null);
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: fullName.trim(),
          registration_number: regNo.trim(),
          year: year || null,
          personal_email: personalEmail.trim().toLowerCase() || null,
          photo_url: photoPath,
          resume_url: resumePath,
        })
        .eq("id", user.id);
      if (error) throw new Error(error.message);
      await refresh();
      toast.success("Profile updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update the profile");
    } finally {
      setBusy(false);
    }
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) toast.error(error.message);
    else {
      setPassword("");
      toast.success("Password changed");
    }
  }

  return (
    <AppShell>
      <p className="label-mono text-primary">{isAdmin ? "Admin account" : "Member account"}</p>
      <h1 className="mt-3 text-4xl font-bold font-display">Profile</h1>

      <div className="mt-8 grid gap-6 lg:grid-cols-[2fr_1fr]">
        <form onSubmit={save} className="space-y-5 surface p-6">
          <div className="space-y-2">
            <Label htmlFor="fullName">Full name</Label>
            <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="regNo">Registration number</Label>
              <Input id="regNo" value={regNo} onChange={(e) => setRegNo(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="year">Year</Label>
              <Select value={year} onValueChange={setYear}>
                <SelectTrigger id="year">
                  <SelectValue placeholder="Select year" />
                </SelectTrigger>
                <SelectContent>
                  {YEARS.map((y) => (
                    <SelectItem key={y} value={y}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="personalEmail">Personal email</Label>
            <Input
              id="personalEmail"
              type="email"
              value={personalEmail}
              onChange={(e) => setPersonalEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="photo">Replace photo</Label>
            <Input
              id="photo"
              type="file"
              accept="image/*"
              onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="resume">Replace resume</Label>
            <Input
              id="resume"
              type="file"
              accept=".pdf,.doc,.docx"
              onChange={(e) => setResume(e.target.files?.[0] ?? null)}
            />
            {resumeLink ? (
              <a
                href={resumeLink}
                target="_blank"
                rel="noreferrer"
                className="label-mono text-primary underline-offset-4 hover:underline"
              >
                View current resume
              </a>
            ) : null}
          </div>
          <Button type="submit" disabled={busy}>
            {busy ? "Saving…" : "Save changes"}
          </Button>
        </form>

        <div className="space-y-6">
          <div className="surface p-6">
            <h2 className="label-mono text-muted-foreground">Photo</h2>
            <div className="mt-3 h-40 w-32 overflow-hidden rounded-[3px] border border-border bg-secondary">
              {photoUrl ? (
                <img src={photoUrl} alt="Your profile" className="h-full w-full object-cover" />
              ) : null}
            </div>
            <p className="mt-3 font-mono text-xs text-muted-foreground">{profile?.email}</p>
          </div>

          <form
            onSubmit={changePassword}
            className="space-y-4 surface p-6"
          >
            <h2 className="label-mono text-muted-foreground">Change password</h2>
            <Input
              type="password"
              minLength={6}
              required
              value={password}
              placeholder="New password"
              onChange={(e) => setPassword(e.target.value)}
            />
            <Button type="submit" variant="secondary" disabled={busy}>
              Update password
            </Button>
          </form>
        </div>
      </div>
    </AppShell>
  );
}