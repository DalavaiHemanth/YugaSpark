import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { uploadUserFile } from "@/lib/storage";
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

const TITLE = "Complete your profile — Yuga Spark";
const DESCRIPTION = "Fill in your club profile to unlock the Yuga Spark dashboard and badge.";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
    ],
  }),
  component: Onboarding,
});

export const YEARS = ["1st Year", "2nd Year", "3rd Year", "4th Year"];

function Onboarding() {
  const { user, profile, refresh, loading } = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [regNo, setRegNo] = useState("");
  const [year, setYear] = useState("");
  const [personalEmail, setPersonalEmail] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [resume, setResume] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && profile?.profile_completed) navigate({ to: "/dashboard", replace: true });
  }, [loading, profile, navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    if (!photo && !profile?.photo_url) {
      toast.error("A professional photo is required");
      return;
    }
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
          year,
          personal_email: personalEmail.trim().toLowerCase(),
          photo_url: photoPath,
          resume_url: resumePath,
          profile_completed: true,
        })
        .eq("id", user.id);
      if (error) throw new Error(error.message);
      await refresh();
      toast.success("Profile saved — your badge is ready");
      navigate({ to: "/badge", replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save the profile");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-2xl">
        <p className="label-mono text-primary">Step 1 of 1</p>
        <h1 className="mt-3 text-4xl font-bold">Complete your club profile</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Everything except the resume is required. You can edit all of it later from Profile.
        </p>

        <form
          onSubmit={submit}
          className="mt-8 space-y-5 surface p-6"
        >
          <div className="space-y-2">
            <Label htmlFor="fullName">Full name</Label>
            <Input
              id="fullName"
              required
              maxLength={120}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="regNo">Registration number</Label>
              <Input
                id="regNo"
                required
                maxLength={40}
                value={regNo}
                onChange={(e) => setRegNo(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="year">Year</Label>
              <Select value={year} onValueChange={setYear} required>
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
              required
              value={personalEmail}
              onChange={(e) => setPersonalEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="photo">Professional photo</Label>
            <Input
              id="photo"
              type="file"
              accept="image/*"
              required={!profile?.photo_url}
              onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="resume">Resume (optional)</Label>
            <Input
              id="resume"
              type="file"
              accept=".pdf,.doc,.docx"
              onChange={(e) => setResume(e.target.files?.[0] ?? null)}
            />
          </div>
          <Button type="submit" className="w-full" disabled={busy || !year}>
            {busy ? "Saving…" : "Save and continue"}
          </Button>
        </form>
      </div>
    </AppShell>
  );
}