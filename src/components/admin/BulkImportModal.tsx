import { useState } from "react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Upload, FileSpreadsheet, CheckCircle2, AlertTriangle, ArrowRight, Loader2 } from "lucide-react";
import { adminImportStudentsWithProfiles, type StudentImportItem } from "@/lib/club.functions";

type BulkImportModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  batchOptions: string[];
  activeBatchName: string;
  onSuccess: () => void;
};

export function BulkImportModal({
  open,
  onOpenChange,
  batchOptions,
  activeBatchName,
  onSuccess,
}: BulkImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<Record<string, unknown>[]>([]);
  const [busy, setBusy] = useState(false);

  // Mandatory Column Mappings
  const [emailCol, setEmailCol] = useState<string>("");
  const [nameCol, setNameCol] = useState<string>("");
  const [regCol, setRegCol] = useState<string>("");
  const [yearCol, setYearCol] = useState<string>("");
  const [batchCol, setBatchCol] = useState<string>("");

  function resetState() {
    setFile(null);
    setHeaders([]);
    setRawRows([]);
    setEmailCol("");
    setNameCol("");
    setRegCol("");
    setYearCol("");
    setBatchCol("");
  }

  async function handleFileSelect(selectedFile: File) {
    try {
      const XLSX = await import("xlsx");
      const buf = await selectedFile.arrayBuffer();
      const wb = XLSX.read(buf);
      const firstSheetName = wb.SheetNames[0];
      if (!firstSheetName) {
        toast.error("Spreadsheet has no sheets");
        return;
      }

      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[firstSheetName]!, {
        defval: "",
      });

      if (!rows.length) {
        toast.error("Spreadsheet is empty");
        return;
      }

      const detectedHeaders = Object.keys(rows[0] ?? {});
      setHeaders(detectedHeaders);
      setRawRows(rows);
      setFile(selectedFile);

      // Smart Auto-Matching logic for all 5 mandatory fields
      let matchedEmail = "";
      let matchedName = "";
      let matchedReg = "";
      let matchedYear = "";
      let matchedBatch = "";

      for (const h of detectedHeaders) {
        const lower = h.toLowerCase().trim();
        if (!matchedEmail && lower.includes("email") && !lower.includes("personal")) {
          matchedEmail = h;
        } else if (!matchedEmail && (lower.includes("email") || lower.includes("mail"))) {
          matchedEmail = h;
        } else if (!matchedName && (lower.includes("full name") || lower.includes("name") || lower.includes("student"))) {
          matchedName = h;
        } else if (!matchedReg && (lower.includes("registration") || lower.includes("reg") || lower.includes("roll"))) {
          matchedReg = h;
        } else if (!matchedYear && (lower.includes("year") || lower.includes("sem") || lower.includes("class"))) {
          matchedYear = h;
        } else if (!matchedBatch && (lower.includes("batch") || lower.includes("sec") || lower.includes("group"))) {
          matchedBatch = h;
        }
      }

      // Fallbacks if not auto-matched
      if (!matchedEmail) matchedEmail = detectedHeaders.find(h => h.toLowerCase().includes("email")) || detectedHeaders[0] || "";
      if (!matchedName) matchedName = detectedHeaders.find(h => h.toLowerCase().includes("name")) || "";
      if (!matchedReg) matchedReg = detectedHeaders.find(h => h.toLowerCase().includes("reg") || h.toLowerCase().includes("number")) || "";
      if (!matchedYear) matchedYear = detectedHeaders.find(h => h.toLowerCase().includes("year")) || "";
      if (!matchedBatch) matchedBatch = detectedHeaders.find(h => h.toLowerCase().includes("batch")) || "";

      setEmailCol(matchedEmail);
      setNameCol(matchedName);
      setRegCol(matchedReg);
      setYearCol(matchedYear);
      setBatchCol(matchedBatch);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to parse spreadsheet");
    }
  }

  // Check if all mandatory mappings are selected
  const allMappingsComplete = Boolean(emailCol && nameCol && regCol && yearCol && batchCol);

  // Process and filter valid rows based on selected mandatory columns
  const validStudents: StudentImportItem[] = [];
  let skippedCount = 0;

  if (allMappingsComplete) {
    for (const row of rawRows) {
      const email = String(row[emailCol] ?? "").trim();
      const name = String(row[nameCol] ?? "").trim();
      const regNo = String(row[regCol] ?? "").trim();
      const year = String(row[yearCol] ?? "").trim();
      const batch = String(row[batchCol] ?? "").trim();

      // Row is valid only if email contains valid characters (or bare roll number) and required fields are present
      if (email && email.length >= 3 && (email.includes("@") || /^[a-z0-9._-]+$/i.test(email)) && name && regNo) {
        validStudents.push({
          email: email.includes("@") ? email : `${email}@rgmcet.edu.in`,
          full_name: name,
          registration_number: regNo,
          year: year || "1st Year",
          batch: batch || activeBatchName || "2023-2027",
        });
      } else {
        skippedCount++;
      }
    }
  }

  async function handleImport() {
    if (!allMappingsComplete) {
      toast.error("Please select all 5 mandatory column mappings");
      return;
    }

    if (!validStudents.length) {
      toast.error("No valid member rows found with all mandatory fields populated in the sheet");
      return;
    }

    setBusy(true);
    try {
      const res = await adminImportStudentsWithProfiles({
        data: { students: validStudents },
      });

      toast.success(
        `Import complete! ${res.created} created · ${res.updated} updated${res.failed.length ? ` · ${res.failed.length} failed` : ""}`,
      );

      resetState();
      onOpenChange(false);
      onSuccess();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Import failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!busy) {
          if (!v) resetState();
          onOpenChange(v);
        }
      }}
    >
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-bold">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            Bulk Import Members & Map Mandatory Columns
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Upload an Excel or CSV file. Map all 5 mandatory columns (Email, Full Name, Registration Number, Year, Batch) to import members.
          </DialogDescription>
        </DialogHeader>

        {!file ? (
          <div className="my-4 flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-secondary/20 p-8 text-center transition-colors hover:bg-secondary/40">
            <FileSpreadsheet className="h-12 w-12 text-primary opacity-80" />
            <p className="mt-3 text-sm font-semibold">Choose your spreadsheet file</p>
            <p className="text-xs text-muted-foreground">Supports .xlsx, .xls, and .csv formats</p>
            <label className="mt-4 cursor-pointer">
              <span className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow transition-colors hover:bg-primary/90">
                <Upload className="h-4 w-4" /> Browse File
              </span>
              <input
                type="file"
                className="hidden"
                accept=".xlsx,.xls,.csv"
                onChange={(e) => {
                  const selected = e.target.files?.[0];
                  if (selected) void handleFileSelect(selected);
                }}
              />
            </label>
          </div>
        ) : (
          <div className="space-y-5">
            {/* File Info Bar */}
            <div className="flex items-center justify-between rounded-lg border border-border bg-card p-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <FileSpreadsheet className="h-5 w-5 shrink-0 text-primary" />
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold">{file.name}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {rawRows.length} rows found in sheet · {headers.length} columns available
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground hover:text-foreground"
                onClick={resetState}
                disabled={busy}
              >
                Change File
              </Button>
            </div>

            {/* Mandatory Column Mapping Selectors */}
            <div className="rounded-xl border border-border bg-card p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <ArrowRight className="h-3.5 w-3.5 text-primary" />
                  Step 1: Map All 5 Mandatory Columns
                </h3>
                <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-600 border-amber-500/30">
                  All 5 Fields Required
                </Badge>
              </div>

              <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                {/* 1. Email Column */}
                <div className="space-y-1">
                  <Label className="text-xs font-semibold flex items-center justify-between">
                    <span>Email Column <span className="text-destructive">*</span></span>
                    {emailCol ? (
                      <span className="text-[10px] text-green-600 font-medium">Mapped</span>
                    ) : (
                      <span className="text-[10px] text-destructive">Required</span>
                    )}
                  </Label>
                  <Select value={emailCol} onValueChange={setEmailCol} disabled={busy}>
                    <SelectTrigger className={`h-8 text-xs bg-background ${!emailCol ? "border-destructive/60" : ""}`}>
                      <SelectValue placeholder="Select Email Column *" />
                    </SelectTrigger>
                    <SelectContent>
                      {headers.map((h) => (
                        <SelectItem key={h} value={h}>{h}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* 2. Full Name Column */}
                <div className="space-y-1">
                  <Label className="text-xs font-semibold flex items-center justify-between">
                    <span>Student Name Column <span className="text-destructive">*</span></span>
                    {nameCol ? (
                      <span className="text-[10px] text-green-600 font-medium">Mapped</span>
                    ) : (
                      <span className="text-[10px] text-destructive">Required</span>
                    )}
                  </Label>
                  <Select value={nameCol} onValueChange={setNameCol} disabled={busy}>
                    <SelectTrigger className={`h-8 text-xs bg-background ${!nameCol ? "border-destructive/60" : ""}`}>
                      <SelectValue placeholder="Select Student Name Column *" />
                    </SelectTrigger>
                    <SelectContent>
                      {headers.map((h) => (
                        <SelectItem key={h} value={h}>{h}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* 3. Registration Number Column */}
                <div className="space-y-1">
                  <Label className="text-xs font-semibold flex items-center justify-between">
                    <span>Registration No. Column <span className="text-destructive">*</span></span>
                    {regCol ? (
                      <span className="text-[10px] text-green-600 font-medium">Mapped</span>
                    ) : (
                      <span className="text-[10px] text-destructive">Required</span>
                    )}
                  </Label>
                  <Select value={regCol} onValueChange={setRegCol} disabled={busy}>
                    <SelectTrigger className={`h-8 text-xs bg-background ${!regCol ? "border-destructive/60" : ""}`}>
                      <SelectValue placeholder="Select Reg No Column *" />
                    </SelectTrigger>
                    <SelectContent>
                      {headers.map((h) => (
                        <SelectItem key={h} value={h}>{h}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* 4. Year Column */}
                <div className="space-y-1">
                  <Label className="text-xs font-semibold flex items-center justify-between">
                    <span>Academic Year Column <span className="text-destructive">*</span></span>
                    {yearCol ? (
                      <span className="text-[10px] text-green-600 font-medium">Mapped</span>
                    ) : (
                      <span className="text-[10px] text-destructive">Required</span>
                    )}
                  </Label>
                  <Select value={yearCol} onValueChange={setYearCol} disabled={busy}>
                    <SelectTrigger className={`h-8 text-xs bg-background ${!yearCol ? "border-destructive/60" : ""}`}>
                      <SelectValue placeholder="Select Academic Year Column *" />
                    </SelectTrigger>
                    <SelectContent>
                      {headers.map((h) => (
                        <SelectItem key={h} value={h}>{h}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* 5. Batch Column */}
                <div className="space-y-1 sm:col-span-2">
                  <Label className="text-xs font-semibold flex items-center justify-between">
                    <span>Batch Column <span className="text-destructive">*</span></span>
                    {batchCol ? (
                      <span className="text-[10px] text-green-600 font-medium">Mapped</span>
                    ) : (
                      <span className="text-[10px] text-destructive">Required</span>
                    )}
                  </Label>
                  <Select value={batchCol} onValueChange={setBatchCol} disabled={busy}>
                    <SelectTrigger className={`h-8 text-xs bg-background ${!batchCol ? "border-destructive/60" : ""}`}>
                      <SelectValue placeholder="Select Batch Column *" />
                    </SelectTrigger>
                    <SelectContent>
                      {headers.map((h) => (
                        <SelectItem key={h} value={h}>{h}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Step 2: Live Verification Preview Table */}
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                  Step 2: Verified Data Preview
                </h3>

                {allMappingsComplete ? (
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px] bg-green-500/10 text-green-600 border-green-500/30">
                      {validStudents.length} Valid Members Ready
                    </Badge>
                    {skippedCount > 0 ? (
                      <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-600 border-amber-500/30">
                        {skippedCount} Empty/Incomplete Skipped
                      </Badge>
                    ) : null}
                  </div>
                ) : (
                  <Badge variant="outline" className="text-[10px] bg-destructive/10 text-destructive border-destructive/30">
                    Map All 5 Columns Above
                  </Badge>
                )}
              </div>

              {allMappingsComplete ? (
                validStudents.length > 0 ? (
                  <div className="overflow-x-auto rounded-lg border border-border bg-background max-h-56">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-secondary/40 font-mono text-[11px] text-muted-foreground border-b border-border sticky top-0 bg-background">
                        <tr>
                          <th className="p-2">#</th>
                          <th className="p-2 font-semibold text-foreground">Email ({emailCol})</th>
                          <th className="p-2 font-semibold text-foreground">Name ({nameCol})</th>
                          <th className="p-2 font-semibold text-foreground">Reg No ({regCol})</th>
                          <th className="p-2 font-semibold text-foreground">Year ({yearCol})</th>
                          <th className="p-2 font-semibold text-foreground">Batch ({batchCol})</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {validStudents.slice(0, 10).map((p, idx) => (
                          <tr key={idx} className="hover:bg-secondary/20 transition-colors">
                            <td className="p-2 font-mono text-[10px] text-muted-foreground">{idx + 1}</td>
                            <td className="p-2 font-mono text-[11px] text-primary">{p.email}</td>
                            <td className="p-2 font-medium">{p.full_name}</td>
                            <td className="p-2 text-muted-foreground font-mono">{p.registration_number}</td>
                            <td className="p-2 text-muted-foreground">{p.year}</td>
                            <td className="p-2">
                              <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/20">
                                {p.batch}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-4 rounded-lg border border-amber-500/30 bg-amber-500/5 text-center text-xs text-amber-600">
                    <AlertTriangle className="h-5 w-5 mx-auto mb-1 opacity-80" />
                    No valid member rows found with all 5 mandatory fields in the selected columns.
                  </div>
                )
              ) : (
                <div className="p-4 rounded-lg border border-border bg-secondary/20 text-center text-xs text-muted-foreground">
                  Select mapped columns for Email, Student Name, Registration Number, Academic Year, and Batch above to preview valid import rows.
                </div>
              )}
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0 mt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              resetState();
              onOpenChange(false);
            }}
            disabled={busy}
          >
            Cancel
          </Button>
          {file ? (
            <Button
              size="sm"
              className="gap-1.5"
              onClick={() => void handleImport()}
              disabled={busy || !allMappingsComplete || validStudents.length === 0}
            >
              {busy ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Importing Members…
                </>
              ) : (
                <>
                  <Upload className="h-3.5 w-3.5" /> Verify & Import ({validStudents.length} Members)
                </>
              )}
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
