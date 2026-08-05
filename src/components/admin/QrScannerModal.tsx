import { useState, useEffect, useRef } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";
import { toast } from "sonner";
import { QrCode, CheckCircle2, UserCheck, X, Search, Sparkles } from "lucide-react";
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

export function QrScannerModal({
  hackathonId,
  hackathonTitle,
  onClose,
  onSuccess,
}: QrScannerModalProps) {
  const [student, setStudent] = useState<FoundStudent | null>(null);
  const [manualInput, setManualInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [marking, setMarking] = useState(false);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  async function lookupUser(term: string) {
    let userId = term.trim();

    // Try parsing JSON payload from badge QR
    if (userId.startsWith("{")) {
      try {
        const parsed = JSON.parse(userId);
        if (parsed.id) userId = parsed.id;
        else if (parsed.reg) userId = parsed.reg;
      } catch {
        // ignore parse error
      }
    }

    setBusy(true);
    try {
      // Query profiles by ID, email, or registration_number
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email, registration_number, year, photo_url")
        .or(`id.eq.${userId},registration_number.eq.${userId},email.eq.${userId}`)
        .maybeSingle();

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
    // Initialize HTML5 QR Code Scanner in container
    const scanner = new Html5QrcodeScanner(
      "qr-reader",
      { fps: 10, qrbox: { width: 250, height: 250 } },
      false,
    );

    scanner.render(
      (decodedText) => {
        void lookupUser(decodedText);
      },
      () => {
        // scan error / searching - ignored
      },
    );

    scannerRef.current = scanner;

    return () => {
      scanner.clear().catch(() => undefined);
    };
  }, []);

  async function markAttendance() {
    if (!student) return;
    setMarking(true);
    try {
      // Upsert attendance into hackathon_results
      const { error } = await supabase.from("hackathon_results").upsert(
        {
          hackathon_id: hackathonId,
          user_id: student.id,
          attended: true,
          points: 10, // default participation points
        },
        { onConflict: "hackathon_id,user_id" },
      );

      if (error) throw new Error(error.message);

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
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary">
            <QrCode className="h-5 w-5" />
          </span>
          <div>
            <h2 className="font-display text-lg font-bold">QR Attendance Check-in</h2>
            <p className="text-xs text-muted-foreground">Event: {hackathonTitle}</p>
          </div>
        </div>

        {/* Found Student Result Box */}
        {student ? (
          <div className="mt-5 rounded-xl border border-primary/40 bg-primary/5 p-4">
            <div className="flex items-center gap-3">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-primary/20 text-primary font-mono text-base font-bold">
                {(student.full_name || student.email).slice(0, 2).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="truncate font-bold text-foreground">
                    {student.full_name || "Unnamed Student"}
                  </h3>
                  <Badge variant="secondary" className="text-[10px]">
                    Ready for Check-in
                  </Badge>
                </div>
                <p className="truncate font-mono text-xs text-muted-foreground">{student.email}</p>
                <p className="text-xs text-muted-foreground">
                  Reg: {student.registration_number || "—"} · Year: {student.year || "—"}
                </p>
              </div>
            </div>

            <div className="mt-4 flex items-center gap-2">
              <Button
                onClick={markAttendance}
                disabled={marking}
                className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <UserCheck className="h-4 w-4" />
                {marking ? "Marking…" : "Confirm Check-in (+10 pts)"}
              </Button>
              <Button variant="outline" onClick={() => setStudent(null)}>
                Clear
              </Button>
            </div>
          </div>
        ) : null}

        {/* Camera Scanner View */}
        <div className="mt-4 overflow-hidden rounded-xl border border-border bg-black/5 dark:bg-black/30">
          <div id="qr-reader" className="w-full" />
        </div>

        {/* Manual Lookup Search */}
        <div className="mt-4 space-y-2">
          <p className="text-xs font-medium text-muted-foreground">
            Or type student Email / Reg Number manually:
          </p>
          <div className="flex gap-2">
            <Input
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
              placeholder="e.g. 21091A0501 or email..."
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void lookupUser(manualInput);
                }
              }}
            />
            <Button
              variant="secondary"
              disabled={busy || !manualInput.trim()}
              onClick={() => void lookupUser(manualInput)}
              className="gap-1.5"
            >
              <Search className="h-4 w-4" />
              Find
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
