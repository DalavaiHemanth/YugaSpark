import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { QrCode, UserCheck, X, Search } from "lucide-react";
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
  const scannerRef = useRef<any>(null);

  async function lookupUser(term: string) {
    let searchKey = term.trim();
    if (!searchKey) return;

    // Try parsing JSON payload from badge QR
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

    async function initScanner() {
      if (typeof window === "undefined") return;
      try {
        const { Html5QrcodeScanner } = await import("html5-qrcode");
        if (!isMounted) return;

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
      } catch (err) {
        console.error("Failed to load QR scanner:", err);
      }
    }

    void initScanner();

    return () => {
      isMounted = false;
      if (scannerRef.current) {
        try {
          scannerRef.current.clear().catch(() => undefined);
        } catch {
          // ignore clear error
        }
      }
    };
  }, []);

  async function markAttendance() {
    if (!student) return;
    setMarking(true);
    try {
      // First try session_attendance table
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
        // Fallback to hackathon_results table if for a hackathon
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

        <div className="mt-4 overflow-hidden rounded-xl border border-border bg-black/40 p-2">
          <div id="qr-reader" className="w-full text-center" />
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
