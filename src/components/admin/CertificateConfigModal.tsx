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
import { Award, Sparkles, Eye, Save, Palette, ShieldCheck, QrCode } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { downloadCertificate, type CertificateConfig } from "@/lib/certificate";

type CertificateConfigModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const DEFAULT_CONFIG: CertificateConfig = {
  theme: "classic",
  headerTitle: "YUGA SPARK · HACKATHON CLUB · RGMCET",
  signatory1Name: "Jaya Krushna & Hemanth",
  signatory1Title: "Club Leads",
  signatory2Name: "Faculty Coordinator",
  signatory2Title: "RGMCET Hackathon Club",
  showRegNo: true,
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

      toast.success("Certificate formatting & template settings saved!");
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  function handleTestPreview() {
    downloadCertificate(
      {
        name: "Dalavai Hemanth",
        regNo: "23091A3245",
        hackathon: "Yuga Spark AI Hackathon 2026",
        date: new Date().toLocaleDateString(undefined, { day: "2-digit", month: "long", year: "numeric" }),
        placement: 1,
      },
      config,
    );
    toast.success("Sample 1st Place Certificate generated!");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-bold text-lg">
            <Palette className="h-5 w-5 text-primary" />
            Customize Certificate Formatting & Template
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Modify colors, theme styles, organization header title, signatories, and QR stamp settings for all issued certificates.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 my-2">
          {/* Theme Selector */}
          <div className="space-y-1.5 rounded-xl border border-border p-4 bg-card">
            <Label className="text-xs font-semibold flex items-center justify-between">
              <span>Certificate Color Theme</span>
              <Badge variant="outline" className="text-[10px] capitalize font-bold">
                {config.theme} Theme
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
                <SelectItem value="classic">🎨 Classic Ivory & Amber (Default Yuga Spark)</SelectItem>
                <SelectItem value="gold">👑 Royal Dark & Gold (Metallic Gold Accent)</SelectItem>
                <SelectItem value="emerald">🌿 Clean Emerald Tech (Green & White)</SelectItem>
                <SelectItem value="dark">⚡ Cyber Dark & Indigo (Modern Dark Theme)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Header Title */}
          <div className="space-y-1.5 rounded-xl border border-border p-4 bg-card">
            <Label className="text-xs font-semibold">Organization Header Title</Label>
            <Input
              value={config.headerTitle}
              onChange={(e) => setConfig({ ...config, headerTitle: e.target.value })}
              placeholder="YUGA SPARK · HACKATHON CLUB · RGMCET"
              className="text-xs bg-background"
            />
          </div>

          {/* Signatories Section */}
          <div className="space-y-3 rounded-xl border border-border p-4 bg-card">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Signatories & Authorities
            </Label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Signatory 1 */}
              <div className="space-y-2 rounded-lg bg-secondary/30 p-3 border border-border">
                <p className="text-[11px] font-semibold text-primary">Left Signatory</p>
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
              </div>

              {/* Signatory 2 */}
              <div className="space-y-2 rounded-lg bg-secondary/30 p-3 border border-border">
                <p className="text-[11px] font-semibold text-primary">Right Signatory / Seal</p>
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
              </div>
            </div>
          </div>

          {/* Toggles: Reg No & QR Stamp */}
          <div className="space-y-3 rounded-xl border border-border p-4 bg-card">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Optional Elements
            </Label>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="show-reg" className="text-xs font-semibold cursor-pointer">
                  Display Student Registration Number
                </Label>
                <p className="text-[11px] text-muted-foreground">Renders Reg No line under student name</p>
              </div>
              <Switch
                id="show-reg"
                checked={config.showRegNo}
                onCheckedChange={(c) => setConfig({ ...config, showRegNo: c })}
              />
            </div>

            <div className="flex items-center justify-between border-t border-border pt-3">
              <div className="space-y-0.5">
                <Label htmlFor="show-qr" className="text-xs font-semibold cursor-pointer flex items-center gap-1.5">
                  <QrCode className="h-3.5 w-3.5 text-primary" /> Render Verification QR Stamp
                </Label>
                <p className="text-[11px] text-muted-foreground">Renders live QR verification stamp on certificate</p>
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
          <Button variant="outline" size="sm" onClick={handleTestPreview} className="gap-1.5 text-xs">
            <Eye className="h-3.5 w-3.5" /> Test Sample Certificate
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving} className="gap-1.5 text-xs">
            <Save className="h-3.5 w-3.5" /> Save Format Settings
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
