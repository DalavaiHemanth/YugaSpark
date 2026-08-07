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
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Eye, Save, Building2, Image as ImageIcon, ShieldCheck, QrCode } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { downloadCertificate, type CertificateConfig } from "@/lib/certificate";

type CertificateConfigModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const DEFAULT_CONFIG: CertificateConfig = {
  theme: "rgmcet_gold",
  collegeName: "RAJEEV GANDHI MEMORIAL COLLEGE OF ENGG & TECH",
  subHeader: "(AUTONOMOUS) · NAAC A+ Grade · Approved by AICTE, Affiliated to JNTUA · Nandyal",
  clubName: "YUGA SPARK HACKATHON CLUB",
  signatory1Name: "Dr. T. Jayachandra Prasad",
  signatory1Title: "Principal, RGMCET",
  signatory2Name: "Dr. K. Subba Reddy",
  signatory2Title: "Faculty Convener & HOD, CSE",
  collegeLogoUrl: "/rgmcet_logo.ico",
  clubLogoUrl: "/yugaspark_logo.png",
  showRegNo: true,
  showDigitalSeal: true,
  showQrStamp: true,
};

export function CertificateConfigModal({ open, onOpenChange }: CertificateConfigModalProps) {
  const [config, setConfig] = useState<CertificateConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      void fetchConfig();
    }
  }, [open]);

  async function fetchConfig() {
    setLoading(true);
    try {
      const { data } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "certificate_config")
        .maybeSingle();

      if (data?.value) {
        const parsed = JSON.parse(data.value);
        setConfig({ ...DEFAULT_CONFIG, ...parsed });
      }
    } catch {
      // fallback to default
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const { error } = await supabase.from("app_settings").upsert(
        {
          key: "certificate_config",
          value: JSON.stringify(config),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "key" },
      );

      if (error) throw new Error(error.message);

      toast.success("Official College Certificate formatting saved!");
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  async function handleTestPreview() {
    await downloadCertificate(
      {
        name: "Dalavai Hemanth",
        regNo: "23091A3245",
        hackathon: "National Level AI & Cloud Hackathon 2026",
        date: new Date().toLocaleDateString(undefined, { day: "2-digit", month: "long", year: "numeric" }),
        placement: 1,
      },
      config,
    );
    toast.success("Sample Official RGMCET Certificate generated!");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-bold text-lg">
            <Building2 className="h-5 w-5 text-primary" />
            Official RGMCET College Certificate Format Customizer
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Configure official college headers, dual logos (RGMCET Crest & Yuga Spark Emblem), digital signatures, and seals.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 my-2">
          {/* Theme Selector */}
          <div className="space-y-1.5 rounded-xl border border-border p-4 bg-card">
            <Label className="text-xs font-semibold flex items-center justify-between">
              <span>Academic Certificate Theme</span>
              <Badge variant="default" className="text-[10px] uppercase font-bold">
                {config.theme.replace("_", " ")}
              </Badge>
            </Label>
            <Select
              value={config.theme}
              onValueChange={(v) => setConfig({ ...config, theme: v as CertificateConfig["theme"] })}
            >
              <SelectTrigger className="h-9 text-xs bg-background">
                <SelectValue placeholder="Select Theme" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="rgmcet_gold">🎓 Official RGMCET Gold & Royal Maroon (Classic Diploma)</SelectItem>
                <SelectItem value="navy_platinum">🏛️ Academic Navy & Platinum (Sleek Professional)</SelectItem>
                <SelectItem value="emerald_prestige">🌿 Prestige Emerald & Gold (Modern Academic)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Logos Section */}
          <div className="space-y-3 rounded-xl border border-border p-4 bg-card">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <ImageIcon className="h-3.5 w-3.5 text-primary" /> Dual Logo Assets
            </Label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5 rounded-lg bg-secondary/30 p-3 border border-border">
                <div className="flex items-center justify-between">
                  <Label className="text-[11px] font-bold">RGMCET College Logo</Label>
                  {config.collegeLogoUrl ? (
                    <img src={config.collegeLogoUrl} alt="RGMCET Logo" className="h-6 w-6 rounded-full object-cover border" />
                  ) : null}
                </div>
                <Input
                  value={config.collegeLogoUrl}
                  onChange={(e) => setConfig({ ...config, collegeLogoUrl: e.target.value })}
                  placeholder="/rgmcet_logo.png"
                  className="h-7 text-xs bg-background"
                />
              </div>

              <div className="space-y-1.5 rounded-lg bg-secondary/30 p-3 border border-border">
                <div className="flex items-center justify-between">
                  <Label className="text-[11px] font-bold">Yuga Spark Club Logo</Label>
                  {config.clubLogoUrl ? (
                    <img src={config.clubLogoUrl} alt="Spark Logo" className="h-6 w-6 rounded-full object-cover border" />
                  ) : null}
                </div>
                <Input
                  value={config.clubLogoUrl}
                  onChange={(e) => setConfig({ ...config, clubLogoUrl: e.target.value })}
                  placeholder="/yugaspark_logo.png"
                  className="h-7 text-xs bg-background"
                />
              </div>
            </div>
          </div>

          {/* College Name & SubHeader */}
          <div className="space-y-3 rounded-xl border border-border p-4 bg-card">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              College & Club Header
            </Label>

            <div>
              <Label className="text-[11px] font-semibold">College Title</Label>
              <Input
                value={config.collegeName}
                onChange={(e) => setConfig({ ...config, collegeName: e.target.value })}
                className="text-xs bg-background"
              />
            </div>

            <div>
              <Label className="text-[11px] font-semibold">Sub-Header (Accreditation & Location)</Label>
              <Input
                value={config.subHeader}
                onChange={(e) => setConfig({ ...config, subHeader: e.target.value })}
                className="text-xs bg-background"
              />
            </div>

            <div>
              <Label className="text-[11px] font-semibold">Organizing Club Name</Label>
              <Input
                value={config.clubName}
                onChange={(e) => setConfig({ ...config, clubName: e.target.value })}
                className="text-xs bg-background"
              />
            </div>
          </div>

          {/* Official Digital Signatories Section (NO CLUB LEADS) */}
          <div className="space-y-3 rounded-xl border border-border p-4 bg-card">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
              <span>Official Digital Signatories</span>
              <span className="text-[10px] text-emerald-600 font-bold">✍️ Digital Signatures Enabled</span>
            </Label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Signatory 1 (Principal / Head Official) */}
              <div className="space-y-2 rounded-lg bg-secondary/30 p-3 border border-border">
                <p className="text-[11px] font-bold text-primary">Left Signatory (Principal / Authority)</p>
                <div>
                  <Label className="text-[10px]">Name</Label>
                  <Input
                    value={config.signatory1Name}
                    onChange={(e) => setConfig({ ...config, signatory1Name: e.target.value })}
                    className="h-7 text-xs bg-background"
                  />
                </div>
                <div>
                  <Label className="text-[10px]">Title</Label>
                  <Input
                    value={config.signatory1Title}
                    onChange={(e) => setConfig({ ...config, signatory1Title: e.target.value })}
                    className="h-7 text-xs bg-background"
                  />
                </div>
                <div>
                  <Label className="text-[10px]">Digital Signature PNG URL (Optional)</Label>
                  <Input
                    value={config.signatory1ImgUrl || ""}
                    onChange={(e) => setConfig({ ...config, signatory1ImgUrl: e.target.value })}
                    placeholder="https://.../signature1.png"
                    className="h-7 text-xs bg-background"
                  />
                </div>
              </div>

              {/* Signatory 2 (Faculty Convener / HOD) */}
              <div className="space-y-2 rounded-lg bg-secondary/30 p-3 border border-border">
                <p className="text-[11px] font-bold text-primary">Right Signatory (Faculty Convener / HOD)</p>
                <div>
                  <Label className="text-[10px]">Name</Label>
                  <Input
                    value={config.signatory2Name}
                    onChange={(e) => setConfig({ ...config, signatory2Name: e.target.value })}
                    className="h-7 text-xs bg-background"
                  />
                </div>
                <div>
                  <Label className="text-[10px]">Title</Label>
                  <Input
                    value={config.signatory2Title}
                    onChange={(e) => setConfig({ ...config, signatory2Title: e.target.value })}
                    className="h-7 text-xs bg-background"
                  />
                </div>
                <div>
                  <Label className="text-[10px]">Digital Signature PNG URL (Optional)</Label>
                  <Input
                    value={config.signatory2ImgUrl || ""}
                    onChange={(e) => setConfig({ ...config, signatory2ImgUrl: e.target.value })}
                    placeholder="https://.../signature2.png"
                    className="h-7 text-xs bg-background"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Toggles */}
          <div className="space-y-3 rounded-xl border border-border p-4 bg-card">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Seal & Verification Settings
            </Label>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="show-reg" className="text-xs font-semibold cursor-pointer">
                  Display Student Registration Number
                </Label>
                <p className="text-[11px] text-muted-foreground">Renders Reg No line under recipient name</p>
              </div>
              <Switch
                id="show-reg"
                checked={config.showRegNo}
                onCheckedChange={(c) => setConfig({ ...config, showRegNo: c })}
              />
            </div>

            <div className="flex items-center justify-between border-t border-border pt-3">
              <div className="space-y-0.5">
                <Label htmlFor="show-seal" className="text-xs font-semibold cursor-pointer flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-primary" /> Render Official College Seal
                </Label>
                <p className="text-[11px] text-muted-foreground">Renders official starburst verification seal in center bottom</p>
              </div>
              <Switch
                id="show-seal"
                checked={config.showDigitalSeal}
                onCheckedChange={(c) => setConfig({ ...config, showDigitalSeal: c })}
              />
            </div>

            <div className="flex items-center justify-between border-t border-border pt-3">
              <div className="space-y-0.5">
                <Label htmlFor="show-qr" className="text-xs font-semibold cursor-pointer flex items-center gap-1.5">
                  <QrCode className="h-3.5 w-3.5 text-primary" /> Render Digital Verification Footer
                </Label>
                <p className="text-[11px] text-muted-foreground">Renders RGMCET database verification line at bottom</p>
              </div>
              <Switch
                id="show-qr"
                checked={config.showQrStamp}
                onCheckedChange={(c) => setConfig({ ...config, showQrStamp: c })}
              />
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" size="sm" onClick={() => void handleTestPreview()} className="gap-1.5 text-xs">
            <Eye className="h-3.5 w-3.5" /> Test Sample College Certificate
          </Button>
          <Button size="sm" onClick={() => void handleSave()} disabled={saving} className="gap-1.5 text-xs">
            <Save className="h-3.5 w-3.5" /> Save Official Certificate Format
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
