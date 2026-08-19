import React, { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import {
  QrCode,
  UserCheck,
  X,
  Search,
  CameraOff,
  RefreshCw,
  Upload,
  Image as ImageIcon,
  CheckCircle2,
  AlertTriangle,
  Zap,
  ZapOff,
  SwitchCamera,
  Users,
  Sparkles,
} from "lucide-react";
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

// Last-marked flash shown after auto-mark
type FlashStudent = FoundStudent & { pts: number; time: string };

type AlreadyScannedStudent = {
  full_name: string | null;
  email: string;
  registration_number: string | null;
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
  const [student, setStudent] = useState<FoundStudent | null>(null); // manual confirm mode
  const [flash, setFlash] = useState<FlashStudent | null>(null); // auto-mark success flash
  const [alreadyScannedFlash, setAlreadyScannedFlash] = useState<AlreadyScannedStudent | null>(null);
  const [sessionScannedCount, setSessionScannedCount] = useState(0);
  const [recentScans, setRecentScans] = useState<FlashStudent[]>([]);
  const [manualInput, setManualInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [marking, setMarking] = useState(false);
  const [cameraError, setCameraError] = useState(false);
  const [scanningImage, setScanningImage] = useState(false);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [torchOn, setTorchOn] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);

  const scannerInstanceRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scannedUserIdsRef = useRef<Set<string>>(new Set());
  const lastScannedRef = useRef<string>("");
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch already-marked student IDs for this session on modal mount
  useEffect(() => {
    let isMounted = true;
    async function loadExistingAttendance() {
      try {
        const { data: sessData } = await supabase
          .from("session_attendance" as any)
          .select("user_id")
          .eq("session_id", hackathonId)
          .eq("status", "present");

        const idSet = new Set<string>();
        if (sessData && sessData.length > 0) {
          sessData.forEach((row: any) => {
            if (row.user_id) idSet.add(row.user_id);
          });
        }

        const { data: hData } = await supabase
          .from("hackathon_results")
          .select("user_id")
          .eq("hackathon_id", hackathonId)
          .eq("attended", true);

        if (hData && hData.length > 0) {
          hData.forEach((row: any) => {
            if (row.user_id) idSet.add(row.user_id);
          });
        }

        if (isMounted) {
          scannedUserIdsRef.current = idSet;
          setSessionScannedCount(idSet.size);
        }
      } catch {
        /* ignore */
      }
    }
    void loadExistingAttendance();
    return () => {
      isMounted = false;
    };
  }, [hackathonId]);

  function triggerScanFeedback(success = true) {
    if (typeof window !== "undefined" && "navigator" in window && "vibrate" in navigator) {
      try {
        navigator.vibrate(success ? [80, 40, 80] : [200, 100, 200]);
      } catch {
        /* ignore */
      }
    }
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = success ? "sine" : "triangle";
      osc.frequency.setValueAtTime(success ? 880 : 350, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(success ? 1200 : 250, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.15);
    } catch {
      /* ignore */
    }
  }

  /** Core attendance writer — shared by both auto-scan and manual confirm paths. */
  async function markAttendance(target: FoundStudent): Promise<boolean> {
    try {
      const { error: sessionErr } = await supabase.from("session_attendance" as any).upsert(
        {
          session_id: hackathonId,
          user_id: target.id,
          status: "present",
          scanned_at: new Date().toISOString(),
        },
        { onConflict: "session_id,user_id" }
      );

      if (sessionErr) {
        const { error } = await supabase.from("hackathon_results").upsert(
          { hackathon_id: hackathonId, user_id: target.id, attended: true, points: 10 },
          { onConflict: "hackathon_id,user_id" }
        );
        if (error) throw new Error(error.message);
      }
      return true;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to mark attendance");
      return false;
    }
  }

  /** Called when a QR code is decoded by the camera. Auto-marks without confirmation. */
  async function handleQrScan(decodedText: string) {
    // Debounce — same raw QR string within 2.5s is ignored
    if (decodedText === lastScannedRef.current) return;
    lastScannedRef.current = decodedText;

    setTimeout(() => {
      if (lastScannedRef.current === decodedText) lastScannedRef.current = "";
    }, 2500);

    let searchKey = decodedText.trim();
    if (!searchKey) return;

    if (searchKey.startsWith("{")) {
      try {
        const parsed = JSON.parse(searchKey);
        if (parsed.id) searchKey = parsed.id;
        else if (parsed.reg) searchKey = parsed.reg;
      } catch {
        /* ignore */
      }
    }

    setBusy(true);
    try {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(searchKey);
      let query = supabase
        .from("profiles")
        .select("id, full_name, email, registration_number, year, photo_url");
      query = isUuid
        ? query.or(`id.eq.${searchKey},registration_number.ilike.${searchKey},email.ilike.${searchKey}`)
        : query.or(`registration_number.ilike.${searchKey},email.ilike.${searchKey}`);

      const { data, error } = await query.limit(1).maybeSingle();
      if (error) throw new Error(error.message);
      if (!data) {
        triggerScanFeedback(false);
        toast.error(`No student found for scanned QR`);
        return;
      }

      // CHECK IF ALREADY SCANNED / MARKED PRESENT
      if (scannedUserIdsRef.current.has(data.id)) {
        triggerScanFeedback(false);
        setAlreadyScannedFlash({
          full_name: data.full_name || "Student",
          email: data.email,
          registration_number: data.registration_number,
        });
        toast.warning(`${data.full_name || data.registration_number || "Student"} is ALREADY marked present!`, {
          description: "This QR code was previously checked in for this session.",
        });
        if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
        flashTimerRef.current = setTimeout(() => setAlreadyScannedFlash(null), 3000);
        return;
      }

      // Auto-mark NEW student immediately
      setMarking(true);
      const ok = await markAttendance(data);
      setMarking(false);

      if (ok) {
        scannedUserIdsRef.current.add(data.id);
        triggerScanFeedback(true);
        const timeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
        const flashItem: FlashStudent = { ...data, pts: 10, time: timeStr };

        setAlreadyScannedFlash(null);
        setFlash(flashItem);
        setSessionScannedCount((prev) => prev + 1);
        setRecentScans((prev) => [flashItem, ...prev.slice(0, 4)]);

        if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
        flashTimerRef.current = setTimeout(() => setFlash(null), 2500);
        if (onSuccess) onSuccess();
      }
    } catch (err) {
      triggerScanFeedback(false);
      toast.error(err instanceof Error ? err.message : "Scan failed");
    } finally {
      setBusy(false);
    }
  }

  /** Called from manual search — shows confirmation card before marking. */
  async function lookupUser(term: string) {
    let searchKey = term.trim();
    if (!searchKey) return;

    if (searchKey.startsWith("{")) {
      try {
        const parsed = JSON.parse(searchKey);
        if (parsed.id) searchKey = parsed.id;
        else if (parsed.reg) searchKey = parsed.reg;
      } catch {
        /* ignore */
      }
    }

    setBusy(true);
    try {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(searchKey);
      let query = supabase
        .from("profiles")
        .select("id, full_name, email, registration_number, year, photo_url");
      query = isUuid
        ? query.or(`id.eq.${searchKey},registration_number.ilike.${searchKey},email.ilike.${searchKey}`)
        : query.or(`registration_number.ilike.${searchKey},email.ilike.${searchKey}`);

      const { data, error } = await query.limit(1).maybeSingle();
      if (error) throw new Error(error.message);
      if (!data) {
        toast.error(`No student found matching "${term}"`);
        setStudent(null);
        return;
      }

      // Check if already scanned
      if (scannedUserIdsRef.current.has(data.id)) {
        triggerScanFeedback(false);
        setAlreadyScannedFlash({
          full_name: data.full_name || "Student",
          email: data.email,
          registration_number: data.registration_number,
        });
        toast.warning(`${data.full_name || data.registration_number} is ALREADY marked present!`);
        setStudent(null);
        return;
      }

      setStudent(data);
      triggerScanFeedback(true);
      toast.success(`Student found: ${data.full_name || data.email}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Lookup failed");
    } finally {
      setBusy(false);
    }
  }

  /** Manual confirmation path (used only for manual search results). */
  async function confirmMarkAttendance() {
    if (!student) return;
    setMarking(true);
    const ok = await markAttendance(student);
    setMarking(false);
    if (ok) {
      scannedUserIdsRef.current.add(student.id);
      triggerScanFeedback(true);
      const timeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
      const flashItem: FlashStudent = { ...student, pts: 10, time: timeStr };

      setSessionScannedCount((prev) => prev + 1);
      setRecentScans((prev) => [flashItem, ...prev.slice(0, 4)]);
      toast.success(`Attendance marked for ${student.full_name || student.email} (+10 pts)`);
      setStudent(null);
      setManualInput("");
      if (onSuccess) onSuccess();
    }
  }

  async function startCamera(mode = facingMode) {
    setCameraError(false);
    try {
      const el = document.getElementById("qr-reader");
      if (!el) return;

      const { Html5Qrcode } = await import("html5-qrcode");

      if (scannerInstanceRef.current) {
        try {
          if (scannerInstanceRef.current.isScanning) {
            await scannerInstanceRef.current.stop();
          }
          await scannerInstanceRef.current.clear();
        } catch {
          /* ignore */
        }
      }

      const html5QrCode = new Html5Qrcode("qr-reader");
      scannerInstanceRef.current = html5QrCode;

      const qrboxFunction = (viewfinderWidth: number, viewfinderHeight: number) => {
        const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
        const boxSize = Math.floor(minEdge * 0.72);
        return { width: Math.max(boxSize, 180), height: Math.max(boxSize, 180) };
      };

      await html5QrCode.start(
        { facingMode: mode },
        { fps: 15, qrbox: qrboxFunction, aspectRatio: 1.0 },
        (decodedText: string) => {
          void handleQrScan(decodedText);
        },
        () => {}
      );

      // Check flashlight/torch capability
      try {
        const capabilities = html5QrCode.getRunningTrackCapabilities();
        if (capabilities && (capabilities as any).torch) {
          setHasTorch(true);
        }
      } catch {
        setHasTorch(false);
      }
    } catch (err) {
      console.warn("Camera start notice:", err);
      setCameraError(true);
    }
  }

  async function flipCamera() {
    const nextMode = facingMode === "environment" ? "user" : "environment";
    setFacingMode(nextMode);
    setTorchOn(false);
    await startCamera(nextMode);
  }

  async function toggleTorch() {
    if (!scannerInstanceRef.current) return;
    try {
      const nextState = !torchOn;
      await scannerInstanceRef.current.applyVideoConstraints({
        advanced: [{ torch: nextState }],
      });
      setTorchOn(nextState);
      toast.success(nextState ? "Flashlight ON" : "Flashlight OFF");
    } catch {
      toast.error("Flashlight control not supported on this device camera");
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
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
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
          /* ignore */
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
      if (result) await handleQrScan(result);
      html5QrCode.clear().catch(() => undefined);
    } catch {
      toast.error("Could not detect a valid QR code in the uploaded image");
    } finally {
      setScanningImage(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 sm:bg-background/80 sm:backdrop-blur-md p-0 sm:p-4 overflow-y-auto">
      <div className="relative w-full h-full sm:h-auto sm:max-w-lg bg-slate-950 sm:bg-card text-white sm:text-card-foreground sm:rounded-2xl overflow-hidden shadow-2xl flex flex-col justify-between p-4 sm:p-6 space-y-3 sm:border sm:border-border">
        
        {/* TOP MOBILE BAR / HEADER */}
        <div className="flex items-start justify-between gap-3 border-b border-white/10 sm:border-border pb-3">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="p-1.5 rounded-lg bg-primary/20 text-primary">
                <QrCode className="h-5 w-5" />
              </div>
              <h3 className="font-display font-bold text-base tracking-tight text-white sm:text-foreground">
                QR Attendance Scanner
              </h3>
              {sessionScannedCount > 0 ? (
                <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[10px] font-mono gap-1">
                  <Users className="h-3 w-3" /> Scanned: {sessionScannedCount}
                </Badge>
              ) : null}
            </div>
            <p className="text-xs text-slate-400 sm:text-muted-foreground truncate">
              Session: <strong className="text-white sm:text-foreground">{hackathonTitle}</strong>
            </p>
          </div>

          <button
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 hover:text-white sm:text-muted-foreground sm:hover:text-foreground bg-white/5 sm:bg-secondary hover:bg-white/15 transition-all"
            aria-label="Close Scanner"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Hidden temp div for image scan */}
        <div id="qr-file-temp" className="hidden" />

        {/* MAIN CAMERA VIEWPORT */}
        <div className="relative flex-1 sm:flex-initial flex flex-col justify-center items-center rounded-2xl overflow-hidden border border-white/10 sm:border-border bg-black min-h-[260px] sm:min-h-[240px]">
          <div id="qr-reader" className="w-full h-full text-center" />

          {/* VIEWPORT CONTROLS OVERLAY (FLIP CAMERA / TORCH) */}
          {!cameraError ? (
            <div className="absolute top-3 right-3 z-20 flex items-center gap-2">
              {/* Torch Button */}
              <button
                type="button"
                onClick={() => void toggleTorch()}
                className={`p-2.5 rounded-full backdrop-blur-md transition-all shadow-lg border ${
                  torchOn
                    ? "bg-amber-400 text-slate-950 border-amber-300 ring-2 ring-amber-400/50"
                    : "bg-black/60 text-white border-white/20 hover:bg-black/80"
                }`}
                title={torchOn ? "Turn Flashlight OFF" : "Turn Flashlight ON"}
              >
                {torchOn ? <Zap className="h-4 w-4 fill-current" /> : <ZapOff className="h-4 w-4" />}
              </button>

              {/* Flip Camera Button */}
              <button
                type="button"
                onClick={() => void flipCamera()}
                className="p-2.5 rounded-full bg-black/60 text-white border border-white/20 hover:bg-black/80 backdrop-blur-md transition-all shadow-lg active:scale-95"
                title="Switch Camera (Front / Rear)"
              >
                <SwitchCamera className="h-4 w-4" />
              </button>
            </div>
          ) : null}

          {/* CAMERA SCAN TARGETING CORNERS (RETICLE) */}
          {!cameraError && !(busy || marking) ? (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-8">
              <div className="relative w-48 h-48 sm:w-44 sm:h-44 rounded-2xl border-2 border-primary/60 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
                {/* Laser animation bar */}
                <div className="absolute inset-x-2 top-2 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent shadow-[0_0_10px_var(--primary)] animate-pulse" />
                <div className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-primary rounded-tl" />
                <div className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-primary rounded-tr" />
                <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-primary rounded-bl" />
                <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-primary rounded-br" />
              </div>
            </div>
          ) : null}

          {/* MARKING OVERLAY (BUSY / MARKING) */}
          {(busy || marking) && (
            <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/70 backdrop-blur-sm">
              <div className="flex flex-col items-center gap-2 text-white text-sm font-semibold">
                <div className="h-8 w-8 animate-spin rounded-full border-3 border-primary border-t-transparent shadow-lg" />
                <span className="flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-primary animate-bounce" /> Marking Attendance…
                </span>
              </div>
            </div>
          )}

          {/* CAMERA ERROR / PERMISSION FALLBACK */}
          {cameraError ? (
            <div className="p-6 text-center text-xs text-slate-300 sm:text-muted-foreground space-y-3">
              <CameraOff className="mx-auto h-10 w-10 text-slate-500 opacity-80" />
              <div>
                <p className="font-semibold text-white sm:text-foreground text-sm">Camera Stream Unavailable</p>
                <p className="text-[11px] mt-1 text-slate-400">
                  Allow camera permission or tap below to upload a badge photo or enter Roll Number.
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-2 pt-1">
                <Button size="sm" variant="outline" onClick={() => void startCamera()} className="h-8 text-xs gap-1.5 bg-white/10 text-white hover:bg-white/20 border-white/20">
                  <RefreshCw className="h-3.5 w-3.5" /> Retry Camera
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => fileInputRef.current?.click()}
                  className="h-8 text-xs gap-1.5"
                  disabled={scanningImage}
                >
                  <Upload className="h-3.5 w-3.5" /> {scanningImage ? "Scanning..." : "Upload QR Image"}
                </Button>
              </div>
            </div>
          ) : null}
        </div>

        {/* UPLOAD FILE BAR (SECONDARY MOBILE OPTION) */}
        {!cameraError ? (
          <div className="flex items-center justify-between rounded-xl border border-white/10 sm:border-border bg-white/5 sm:bg-secondary/30 px-3 py-2 text-xs">
            <span className="flex items-center gap-2 text-slate-300 sm:text-muted-foreground text-[11px]">
              <ImageIcon className="h-4 w-4 text-primary shrink-0" />
              Upload QR Badge Photo
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="h-7 text-xs gap-1.5 border-white/20 sm:border-border text-white sm:text-foreground hover:bg-white/10"
              disabled={scanningImage}
            >
              <Upload className="h-3.5 w-3.5" /> Select File
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

        {/* AUTO-MARK SUCCESS FLASH BANNER */}
        {flash ? (
          <div className="rounded-xl border border-emerald-500/50 bg-emerald-500/15 p-3.5 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
            <CheckCircle2 className="h-7 w-7 text-emerald-400 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-display font-bold text-sm text-white sm:text-foreground truncate">
                {flash.full_name || "Student"}
              </p>
              <p className="text-xs font-mono text-emerald-300 sm:text-muted-foreground truncate">{flash.email}</p>
              <p className="text-xs text-emerald-400 font-semibold mt-0.5">✓ Marked Present (+10 pts)</p>
            </div>
            <Badge variant="outline" className="font-mono text-[10px] shrink-0 border-emerald-500/40 text-emerald-300">
              {flash.registration_number || "–"}
            </Badge>
          </div>
        ) : null}

        {/* ALREADY SCANNED / MARKED PRESENT WARNING BANNER */}
        {alreadyScannedFlash ? (
          <div className="rounded-xl border border-amber-500/50 bg-amber-500/15 p-3.5 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
            <AlertTriangle className="h-7 w-7 text-amber-400 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-display font-bold text-sm text-white sm:text-foreground truncate">
                {alreadyScannedFlash.full_name || "Student"}
              </p>
              <p className="text-xs font-mono text-amber-300 sm:text-muted-foreground truncate">{alreadyScannedFlash.email}</p>
              <p className="text-xs text-amber-400 font-semibold mt-0.5">⚠️ Already Marked Present for this Session</p>
            </div>
            <Badge variant="outline" className="font-mono text-[10px] shrink-0 border-amber-500/40 text-amber-300">
              {alreadyScannedFlash.registration_number || "–"}
            </Badge>
          </div>
        ) : null}

        {/* RECENTLY SCANNED REEL FOR CONTINUOUS SCANNING */}
        {recentScans.length > 0 && !flash && !alreadyScannedFlash ? (
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between text-[11px] text-slate-400 sm:text-muted-foreground font-semibold px-1">
              <span>Recent Check-ins</span>
              <span>{recentScans.length} recent</span>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {recentScans.map((s, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 p-2 rounded-lg bg-white/5 sm:bg-secondary/40 border border-white/10 sm:border-border shrink-0 text-xs min-w-[160px]"
                >
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                  <div className="min-w-0">
                    <p className="font-semibold text-white sm:text-foreground text-[11px] truncate">{s.full_name || s.registration_number}</p>
                    <p className="text-[10px] text-slate-400 font-mono">{s.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {/* MANUAL SEARCH INPUT (MOBILE ERGONOMICS) */}
        <div className="space-y-1.5 pt-1 border-t border-white/10 sm:border-border">
          <Label className="text-xs text-slate-400 sm:text-muted-foreground font-normal">
            Manual Search (Roll Number / Email):
          </Label>
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (manualInput.trim()) void lookupUser(manualInput);
            }}
          >
            <Input
              placeholder="e.g. 23091A3245 or student@..."
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
              className="text-xs bg-white/5 sm:bg-background border-white/10 sm:border-input text-white sm:text-foreground"
            />
            <Button type="submit" size="sm" disabled={busy || !manualInput.trim()} className="h-9 px-3">
              <Search className="mr-1 h-3.5 w-3.5" /> Find
            </Button>
          </form>
        </div>

        {/* MANUAL CONFIRMATION CARD */}
        {student ? (
          <div className="rounded-xl border border-primary/40 bg-primary/10 p-4 space-y-3 text-white sm:text-foreground">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-display font-bold text-sm">
                  {student.full_name || "Unnamed Student"}
                </h4>
                <p className="text-xs font-mono text-slate-300 sm:text-muted-foreground">{student.email}</p>
                <div className="mt-1 flex items-center gap-2 text-xs">
                  <Badge variant="outline" className="font-mono text-[10px] border-white/20">
                    Reg: {student.registration_number || "N/A"}
                  </Badge>
                  {student.year ? (
                    <Badge variant="secondary" className="text-[10px]">{student.year}</Badge>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <Button
                size="sm"
                className="w-full gap-1.5"
                disabled={marking}
                onClick={() => void confirmMarkAttendance()}
              >
                <UserCheck className="h-4 w-4" />
                {marking ? "Marking…" : "Confirm & Mark Present"}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => { setStudent(null); setManualInput(""); }} className="text-slate-300 hover:text-white">
                Cancel
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
