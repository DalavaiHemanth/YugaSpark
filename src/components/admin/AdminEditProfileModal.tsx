import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserCheck, Save, Loader2, Image as ImageIcon, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { signedUrl, uploadUserFile } from "@/lib/storage";

type Member = {
  id: string;
  email: string;
  full_name: string | null;
  registration_number: string | null;
  year: string | null;
  batch: string | null;
  personal_email: string | null;
  photo_url?: string | null;
  resume_url?: string | null;
};

type AdminEditProfileModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: Member | null;
  onSuccess: () => void;
};

const YEARS = ["1st Year", "2nd Year", "3rd Year", "4th Year"];

export function AdminEditProfileModal({
  open,
  onOpenChange,
  member,
  onSuccess,
}: AdminEditProfileModalProps) {
  const { refresh } = useAuth();
  const [fullName, setFullName] = useState("");
  const [regNo, setRegNo] = useState("");
  const [year, setYear] = useState("");
  const [personalEmail, setPersonalEmail] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [resume, setResume] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (member) {
      setFullName(member.full_name ?? "");
      setRegNo(member.registration_number ?? "");
      setYear(member.year ?? "");
      setPersonalEmail(member.personal_email ?? "");
      setPhoto(null);
      setResume(null);

      if (member.photo_url) {
        void signedUrl("photos", member.photo_url).then(setPhotoPreview);
      } else {
        setPhotoPreview(null);
      }
    }
  }, [member]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!member) return;
    setBusy(true);

    try {
      let photoPath = member.photo_url ?? null;
      if (photo) {
        photoPath = await uploadUserFile("photos", member.id, photo);
      }

      let resumePath = member.resume_url ?? null;
      if (resume) {
        resumePath = await uploadUserFile("resumes", member.id, resume);
      }

      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: fullName.trim() || null,
          registration_number: regNo.trim() || null,
          year: year || null,
          personal_email: personalEmail.trim().toLowerCase() || null,
          photo_url: photoPath,
          resume_url: resumePath,
          profile_completed: Boolean(fullName.trim() && regNo.trim()),
        })
        .eq("id", member.id);

      if (error) throw new Error(error.message);

      toast.success("Profile details & photo updated successfully");
      await refresh();
      onOpenChange(false);
      onSuccess();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update profile");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-bold text-lg">
            <UserCheck className="h-5 w-5 text-primary" />
            Fill / Edit Profile & Photo
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Update name, registration number, year, photo, and personal email for <strong className="text-foreground">{member?.email}</strong>.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSave} className="space-y-4 my-2">
          {/* Photo Preview & Upload */}
          <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
            <div className="h-12 w-12 rounded-full overflow-hidden border border-border bg-secondary flex items-center justify-center shrink-0">
              {photoPreview ? (
                <img src={photoPreview} alt="Profile preview" className="h-full w-full object-cover" />
              ) : (
                <ImageIcon className="h-5 w-5 text-muted-foreground" />
              )}
            </div>
            <div className="space-y-1 flex-1">
              <Label htmlFor="admin-photo" className="text-xs font-semibold cursor-pointer text-primary hover:underline">
                {photoPreview ? "Change Profile Photo" : "Upload Profile Photo"}
              </Label>
              <Input
                id="admin-photo"
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const f = e.target.files?.[0] ?? null;
                  setPhoto(f);
                  if (f) setPhotoPreview(URL.createObjectURL(f));
                }}
                className="h-8 text-xs bg-background"
              />
            </div>
          </div>

          <div>
            <Label className="text-xs font-semibold">Full Name *</Label>
            <Input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Dalavai Hemanth"
              required
              className="text-xs bg-background mt-1"
            />
          </div>

          <div>
            <Label className="text-xs font-semibold">Registration / Roll Number *</Label>
            <Input
              value={regNo}
              onChange={(e) => setRegNo(e.target.value)}
              placeholder="e.g. 23091A3245"
              required
              className="text-xs bg-background mt-1"
            />
          </div>

          <div>
            <Label className="text-xs font-semibold">Academic Year</Label>
            <Select value={year} onValueChange={setYear}>
              <SelectTrigger className="h-8 text-xs bg-background mt-1">
                <SelectValue placeholder="Select year" />
              </SelectTrigger>
              <SelectContent>
                {YEARS.map((y) => (
                  <SelectItem key={y} value={y}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs font-semibold">Personal Email (Optional)</Label>
            <Input
              type="email"
              value={personalEmail}
              onChange={(e) => setPersonalEmail(e.target.value)}
              placeholder="e.g. name@gmail.com"
              className="text-xs bg-background mt-1"
            />
          </div>

          <div>
            <Label htmlFor="admin-resume" className="text-xs font-semibold">Resume PDF (Optional)</Label>
            <Input
              id="admin-resume"
              type="file"
              accept=".pdf,.doc,.docx"
              onChange={(e) => setResume(e.target.files?.[0] ?? null)}
              className="h-8 text-xs bg-background mt-1"
            />
          </div>

          <DialogFooter className="mt-4 gap-2 sm:gap-0">
            <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={busy}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={busy} className="gap-1.5 text-xs">
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              Save Profile & Photo
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
