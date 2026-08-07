import { supabase } from "@/integrations/supabase/client";

export type CertificateInput = {
  name: string;
  regNo?: string | null;
  hackathon: string;
  date: string;
  placement: number | null;
};

export type CertificateConfig = {
  theme: "classic" | "gold" | "emerald" | "dark";
  headerTitle: string;
  signatory1Name: string;
  signatory1Title: string;
  signatory2Name: string;
  signatory2Title: string;
  showRegNo: boolean;
  showQrStamp: boolean;
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

const ORDINALS = ["", "First", "Second", "Third"];

export async function fetchCertificateConfig(): Promise<CertificateConfig> {
  try {
    const { data } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "certificate_config")
      .maybeSingle();

    if (data?.value) {
      return { ...DEFAULT_CONFIG, ...JSON.parse(data.value) };
    }
  } catch {
    // fallback
  }
  return DEFAULT_CONFIG;
}

/** Draws a customizable club certificate on a canvas and triggers a PNG download. */
export function downloadCertificate(input: CertificateInput, customConfig?: CertificateConfig) {
  const config = customConfig ?? DEFAULT_CONFIG;

  const canvas = document.createElement("canvas");
  canvas.width = 1600;
  canvas.height = 1131;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  // Theme Styles
  let bgColor = "#fdfaf5";
  let textColor = "#2b2119";
  let subtitleColor = "#6b5c4d";
  let primaryGradStart = "#d1521f";
  let primaryGradEnd = "#f0a13c";
  let innerBorderColor = "#e6ddd0";
  let dividerColor = "#d1521f";
  let signatureLineColor = "#c8bcab";
  let signatureSubColor = "#9c8c7b";

  if (config.theme === "gold") {
    bgColor = "#0f172a";
    textColor = "#f8fafc";
    subtitleColor = "#94a3b8";
    primaryGradStart = "#eab308";
    primaryGradEnd = "#ca8a04";
    innerBorderColor = "#334155";
    dividerColor = "#eab308";
    signatureLineColor = "#475569";
    signatureSubColor = "#64748b";
  } else if (config.theme === "emerald") {
    bgColor = "#f0fdf4";
    textColor = "#064e3b";
    subtitleColor = "#047857";
    primaryGradStart = "#059669";
    primaryGradEnd = "#10b981";
    innerBorderColor = "#a7f3d0";
    dividerColor = "#059669";
    signatureLineColor = "#6ee7b7";
    signatureSubColor = "#047857";
  } else if (config.theme === "dark") {
    bgColor = "#030712";
    textColor = "#f9fafb";
    subtitleColor = "#9ca3af";
    primaryGradStart = "#6366f1";
    primaryGradEnd = "#a855f7";
    innerBorderColor = "#1f2937";
    dividerColor = "#6366f1";
    signatureLineColor = "#374151";
    signatureSubColor = "#6b7280";
  }

  // Background
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Top & Bottom Gradient Headers
  const grad = ctx.createLinearGradient(0, 0, canvas.width, 0);
  grad.addColorStop(0, primaryGradStart);
  grad.addColorStop(1, primaryGradEnd);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, 22);
  ctx.fillRect(0, canvas.height - 22, canvas.width, 22);

  // Inner Border Frame
  ctx.strokeStyle = innerBorderColor;
  ctx.lineWidth = 3;
  ctx.strokeRect(60, 60, canvas.width - 120, canvas.height - 120);

  // Header Title Eyebrow
  ctx.textAlign = "center";
  ctx.fillStyle = primaryGradStart;
  ctx.font = "600 28px 'JetBrains Mono', monospace";
  ctx.fillText(config.headerTitle || DEFAULT_CONFIG.headerTitle, canvas.width / 2, 180);

  // Award Title
  const won = input.placement !== null && input.placement <= 3;
  ctx.fillStyle = textColor;
  ctx.font = "700 74px 'Space Grotesk', sans-serif";
  ctx.fillText(won ? "Certificate of Achievement" : "Certificate of Participation", canvas.width / 2, 290);

  // Subtitle
  ctx.font = "400 28px 'DM Sans', sans-serif";
  ctx.fillStyle = subtitleColor;
  ctx.fillText("This is proudly presented to", canvas.width / 2, 380);

  // Student Name
  ctx.fillStyle = textColor;
  ctx.font = "700 88px 'Space Grotesk', sans-serif";
  ctx.fillText(input.name, canvas.width / 2, 490);

  // Reg No Line (Optional)
  let currentY = 525;
  if (config.showRegNo && input.regNo) {
    ctx.font = "600 26px 'JetBrains Mono', monospace";
    ctx.fillStyle = subtitleColor;
    ctx.fillText(`Reg No: ${input.regNo}`, canvas.width / 2, currentY);
    currentY += 40;
  }

  // Divider Line
  ctx.strokeStyle = dividerColor;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(canvas.width / 2 - 320, currentY);
  ctx.lineTo(canvas.width / 2 + 320, currentY);
  ctx.stroke();

  // Placement / Participation Line
  currentY += 75;
  ctx.fillStyle = subtitleColor;
  ctx.font = "400 32px 'DM Sans', sans-serif";
  const line = won
    ? `for securing ${ORDINALS[input.placement!] ?? `${input.placement}th`} place at`
    : "for participating in";
  ctx.fillText(line, canvas.width / 2, currentY);

  // Hackathon Title
  currentY += 75;
  ctx.fillStyle = textColor;
  ctx.font = "700 52px 'Space Grotesk', sans-serif";
  ctx.fillText(input.hackathon, canvas.width / 2, currentY);

  // Event Date
  currentY += 60;
  ctx.fillStyle = subtitleColor;
  ctx.font = "400 26px 'DM Sans', sans-serif";
  ctx.fillText(input.date, canvas.width / 2, currentY);

  // Signatures Section
  ctx.font = "400 26px 'DM Sans', sans-serif";
  ctx.fillStyle = textColor;
  ctx.fillText(config.signatory1Name || DEFAULT_CONFIG.signatory1Name, canvas.width / 2 - 380, 960);
  ctx.fillText(config.signatory2Name || DEFAULT_CONFIG.signatory2Name, canvas.width / 2 + 380, 960);

  ctx.strokeStyle = signatureLineColor;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(canvas.width / 2 - 560, 985);
  ctx.lineTo(canvas.width / 2 - 200, 985);
  ctx.moveTo(canvas.width / 2 + 200, 985);
  ctx.lineTo(canvas.width / 2 + 560, 985);
  ctx.stroke();

  ctx.fillStyle = signatureSubColor;
  ctx.font = "400 22px 'DM Sans', sans-serif";
  ctx.fillText(config.signatory1Title || DEFAULT_CONFIG.signatory1Title, canvas.width / 2 - 380, 1025);
  ctx.fillText(config.signatory2Title || DEFAULT_CONFIG.signatory2Title, canvas.width / 2 + 380, 1025);

  // Verification QR Stamp Badge (Optional)
  if (config.showQrStamp) {
    ctx.textAlign = "center";
    ctx.fillStyle = primaryGradStart;
    ctx.font = "bold 16px 'JetBrains Mono', monospace";
    ctx.fillText("✓ VERIFIED CLUB CERTIFICATE", canvas.width / 2, 1060);
  }

  // Trigger Download
  const url = canvas.toDataURL("image/png");
  const a = document.createElement("a");
  a.href = url;
  a.download = `${input.hackathon.replace(/\s+/g, "-").toLowerCase()}-certificate.png`;
  a.click();
}
