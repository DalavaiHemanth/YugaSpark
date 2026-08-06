import React, { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { QrCode, UserCheck, X, Search, CameraOff, RefreshCw, Upload, Image as ImageIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";

type QrScannerModalProps = {
  hackathonId: string;
  hackathonTitle: string;
  onClose: () => void;
  onSuccess?: () => void;
};

type FoundStudent = {
  id: string;
  full_name: string | null;
  email: string;
  registration_number: string | null;
  year: string | null;
  photo_url: string | null;
};

export function QrScannerModal(props: QrScannerModalProps) {
  return <QrScannerModalInner {...props} />;
}

function QrScannerModalInner({
  hackathonId,
  hackathonTitle,
  onClose,
  onSuccess,
}: QrScannerModalProps) {
  const [student, setStudent] = useState<FoundStudent | null>(null);
  const [manualInput, setManualInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [marking, setMarking] = useState(false);
  const [cameraError, setCameraError] = useState(false);
  const [scanningImage, setScanningImage] = useState(false);
  const scannerInstanceRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

function triggerScanFeedback() {
  // 1. Haptic Vibration (for mobile devices)
  if (typeof window !== "undefined" && "navigator" in window && "vibrate" in navigator) {
    try {
      navigator.vibrate([100, 50, 100]);
    } catch {
      // ignore
    }
  }

  // 2. High-tech Audio Beep via Web Audio API
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.12);

    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.12);
  } catch {
    // ignore
  }
}

  async function lookupUser(term: string) {
    let searchKey = term.trim();
    if (!searchKey) return;

    if (searchKey.startsWith("{")) {
      try {
        const parsed = JSON.parse(searchKey);
        if (parsed.id) searchKey = parsed.id;
        else if (parsed.reg) searchKey = parsed.reg;
      } catch {
        // ignore parse error
      }
    }

    setBusy(true);
    try {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(searchKey);

      let query = supabase
        .from("profiles")
        .select("id, full_name, email, registration_number, year, photo_url");

      if (isUuid) {
        query = query.or(`id.eq.${searchKey},registration_number.ilike.${searchKey},email.ilike.${searchKey}`);
      } else {
        query = query.or(`registration_number.ilike.${searchKey},email.ilike.${searchKey}`);
      }

      const { data, error } = await query.limit(1).maybeSingle();

      if (error) throw new Error(error.message);
      if (!data) {
        toast.error(`No student found matching "${term}"`);
        setStudent(null);
        return;
      }

      setStudent(data);
      triggerScanFeedback();
      toast.success(`Student found: ${data.full_name || data.email}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Lookup failed");
    } finally {
      setBusy(false);
    }
  }

  async function startCamera() {
    setCameraError(false);
    try {
      const el = document.getElementById("qr-reader");
      if (!el) return;

      const { Html5Qrcode } = await import("html5-qrcode");

      // Clean up previous scanner if any
      if (scannerInstanceRef.current) {
        try {
          await scannerInstanceRef.current.clear();
        } catch {
          // ignore
        }
      }

      const html5QrCode = new Html5Qrcode("qr-reader");
      scannerInstanceRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 220, height: 220 } },
        (decodedText: string) => {
          void lookupUser(decodedText);
        },
        () => {}
      );
    } catch (err) {
      console.warn("Camera start notice:", err);
      setCameraError(true);
    }
  }

  useEffect(() => {
    let isMounted = true;
    const timer = setTimeout(() => {
      if (isMounted) void startCamera();
    }, 250);

    return () => {
      isMounted = false;
      clearTimeout(timer);
      if (scannerInstanceRef.current) {
        try {
          const scanner = scannerInstanceRef.current;
          scannerInstanceRef.current = null;
          if (scanner.isScanning) {
            scanner.stop().then(() => scanner.clear()).catch(() => undefined);
          } else {
            scanner.clear().catch(() => undefined);
          }
        } catch {
          // ignore
        }
      }
    };
  }, []);

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setScanningImage(true);
    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      const html5QrCode = new Html5Qrcode("qr-file-temp");
      const result = await html5QrCode.scanFile(file, true);
      if (result) {
        await lookupUser(result);
      }
      html5QrCode.clear().catch(() => undefined);
    } catch (err) {
      toast.error("Could not detect a valid QR code in the uploaded image");
    } finally {
      setScanningImage(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function markAttendance() {
    if (!student) return;
    setMarking(true);
    try {
      const { error: sessionErr } = await supabase.from("session_attendance" as any).upsert(
        {
          session_id: hackathonId,
          user_id: student.id,
          status: "present",
          scanned_at: new Date().toISOString(),
        },
        { onConflict: "session_id,user_id" },
      );

      if (sessionErr) {
        const { error } = await supabase.from("hackathon_results").upsert(
          {
            hackathon_id: hackathonId,
            user_id: student.id,
            attended: true,
            points: 10,
          },
          { onConflict: "hackathon_id,user_id" },
        );
        if (error) throw new Error(error.message);
      }

      triggerScanFeedback();
      toast.success(`Attendance marked for ${student.full_name || student.email} (+10 pts)`);
      setStudent(null);
      if (onSuccess) onSuccess();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to mark attendance");
    } finally {
      setMarking(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <div className="surface relative w-full max-w-lg overflow-hidden p-6 shadow-2xl space-y-4">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-2 text-primary font-display font-bold">
          <QrCode className="h-5 w-5" />
          <span>QR Attendance Check-in</span>
        </div>
        <p className="text-xs text-muted-foreground">
          Event / Session: <strong className="text-foreground">{hackathonTitle}</strong>
        </p>

        {/* Hidden temp div for file scan */}
        <div id="qr-file-temp" className="hidden" />

        {/* Camera Feed / Fallback Options */}
        <div className="overflow-hidden rounded-xl border border-border bg-black/40 p-2 min-h-[220px] flex items-center justify-center relative">
          <div id="qr-reader" className="w-full text-center" />

          {cameraError ? (
            <div className="p-6 text-center text-xs text-muted-foreground space-y-3">
              <CameraOff className="mx-auto h-8 w-8 text-muted-foreground opacity-60" />
              <div>
                <p className="font-semibold text-foreground">Camera Stream Unavailable</p>
                <p className="text-[11px] mt-0.5">
                  Camera permission was not granted or no webcam detected. You can scan an uploaded badge image or use manual Roll Number search below.
                </p>
              </div>
              <div className="flex justify-center gap-2 pt-1">
                <Button size="sm" variant="outline" onClick={() => void startCamera()} className="h-7 text-xs gap-1.5">
                  <RefreshCw className="h-3 w-3" /> Retry Camera
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => fileInputRef.current?.click()}
                  className="h-7 text-xs gap-1.5"
                  disabled={scanningImage}
                >
                  <Upload className="h-3 w-3" /> {scanningImage ? "Scanning..." : "Upload QR Image"}
                </Button>
              </div>
            </div>
          ) : null}
        </div>

        {/* Upload Badge Image Option */}
        {!cameraError ? (
          <div className="flex items-center justify-between rounded-lg border border-border bg-secondary/30 px-3 py-2 text-xs">
            <span className="flex items-center gap-2 text-muted-foreground">
              <ImageIcon className="h-4 w-4 text-primary" />
              Have a saved Badge QR image file?
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="h-7 text-xs gap-1.5"
              disabled={scanningImage}
            >
              <Upload className="h-3 w-3" /> Upload & Scan
            </Button>
          </div>
        ) : null}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => void handleFileUpload(e)}
        />

        {/* Manual Roll Number / Email Search input */}
        <div className="space-y-2 pt-1">
          <Label className="text-xs text-muted-foreground font-normal">
            Or type student Roll Number / Email manually:
          </Label>
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (manualInput.trim()) void lookupUser(manualInput);
            }}
          >
            <Input
              placeholder="e.g. 23091A3245 or student@rgmcet.edu.in"
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
              className="text-xs"
            />
            <Button type="submit" size="sm" disabled={busy || !manualInput.trim()}>
              <Search className="mr-1 h-3.5 w-3.5" /> Find
            </Button>
          </form>
        </div>

        {/* Found Student Confirmation Card */}
        {student ? (
          <div className="rounded-xl border border-primary/40 bg-primary/5 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-display font-bold text-sm text-foreground">
                  {student.full_name || "Unnamed Student"}
                </h4>
                <p className="text-xs font-mono text-muted-foreground">{student.email}</p>
                <div className="mt-1 flex items-center gap-2 text-xs">
                  <Badge variant="outline" className="font-mono text-[10px]">
                    Reg: {student.registration_number || "N/A"}
                  </Badge>
                  {student.year ? (
                    <Badge variant="secondary" className="text-[10px]">
                      {student.year}
                    </Badge>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <Button
                size="sm"
                className="w-full gap-1.5"
                disabled={marking}
                onClick={() => void markAttendance()}
              >
                <UserCheck className="h-4 w-4" />
                {marking ? "Marking…" : "Confirm & Mark Attendance (+10 pts)"}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setStudent(null)}>
                Cancel
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
