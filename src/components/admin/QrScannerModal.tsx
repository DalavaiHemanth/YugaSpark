import React, { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { QrCode, UserCheck, X, Search, CameraOff, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

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

// React Error Boundary to catch any camera scanner DOM errors without crashing the app
class QrErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: any, errorInfo: any) {
    console.warn("QR Scanner Error Boundary caught error:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

export function QrScannerModal(props: QrScannerModalProps) {
  const fallbackUI = (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <div className="surface relative w-full max-w-lg overflow-hidden p-6 shadow-2xl space-y-4">
        <button
          onClick={props.onClose}
          className="absolute right-4 top-4 rounded-lg p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
        >
          <X className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2 text-primary font-display font-bold">
          <QrCode className="h-5 w-5" />
          <span>QR Check-in (Manual Mode)</span>
        </div>
        <div className="rounded-xl border border-border bg-card p-6 text-center text-xs text-muted-foreground space-y-2">
          <CameraOff className="mx-auto h-8 w-8 text-muted-foreground opacity-60" />
          <p className="font-semibold text-foreground">Camera Feed Unavailable</p>
          <p>Please enter the student Roll Number / Email manually below.</p>
        </div>
      </div>
    </div>
  );

  return (
    <QrErrorBoundary fallback={fallbackUI}>
      <QrScannerModalInner {...props} />
    </QrErrorBoundary>
  );
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
  const [cameraActive, setCameraActive] = useState(false);
  const scannerInstanceRef = useRef<any>(null);

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
      toast.success(`Student found: ${data.full_name || data.email}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Lookup failed");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    let isMounted = true;
    let html5QrCode: any = null;

    async function startCamera() {
      if (typeof window === "undefined") return;
      try {
        const el = document.getElementById("qr-reader");
        if (!el) return;

        const { Html5Qrcode } = await import("html5-qrcode");
        if (!isMounted) return;

        html5QrCode = new Html5Qrcode("qr-reader");
        scannerInstanceRef.current = html5QrCode;

        await html5QrCode.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 220, height: 220 } },
          (decodedText: string) => {
            if (isMounted) void lookupUser(decodedText);
          },
          () => {
            // frame scanning notice
          }
        );

        if (isMounted) {
          setCameraActive(true);
          setCameraError(false);
        }
      } catch (err) {
        console.warn("Could not start camera feed:", err);
        if (isMounted) {
          setCameraError(true);
          setCameraActive(false);
        }
      }
    }

    const timer = setTimeout(() => {
      void startCamera();
    }, 200);

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
          // ignore cleanup error
        }
      }
    };
  }, []);

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
      <div className="surface relative w-full max-w-lg overflow-hidden p-6 shadow-2xl">
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
        <p className="mt-1 text-xs text-muted-foreground">
          Event / Session: <strong className="text-foreground">{hackathonTitle}</strong>
        </p>

        {/* Camera Scanner Container */}
        <div className="mt-4 overflow-hidden rounded-xl border border-border bg-black/40 p-2 min-h-[240px] flex items-center justify-center relative">
          <div id="qr-reader" className="w-full text-center" />

          {cameraError ? (
            <div className="p-6 text-center text-xs text-muted-foreground space-y-2">
              <CameraOff className="mx-auto h-8 w-8 text-muted-foreground opacity-60" />
              <p className="font-semibold text-foreground">Camera Stream Unavailable</p>
              <p>Camera permission denied or camera not found on this device. Use manual lookup below.</p>
            </div>
          ) : null}
        </div>

        {/* Manual Roll Number / Email Search input */}
        <div className="mt-4 space-y-2">
          <Label className="text-xs text-muted-foreground font-normal">
            Or type student Email / Reg Number manually:
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
          <div className="mt-4 rounded-xl border border-primary/40 bg-primary/5 p-4 space-y-3">
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
