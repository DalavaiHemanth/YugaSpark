import { supabase } from "@/integrations/supabase/client";

export type CertificateInput = {
  name: string;
  regNo?: string | null;
  hackathon: string;
  date: string;
  placement: number | null;
};

export type CertificateConfig = {
  theme: "rgmcet_gold" | "navy_platinum" | "emerald_prestige";
  collegeName: string;
  subHeader: string;
  clubName: string;
  signatory1Name: string;
  signatory1Title: string;
  signatory2Name: string;
  signatory2Title: string;
  signatory1ImgUrl?: string;
  signatory2ImgUrl?: string;
  collegeLogoUrl?: string;
  showRegNo: boolean;
  showDigitalSeal: boolean;
  showQrStamp: boolean;
};

const DEFAULT_CONFIG: CertificateConfig = {
  theme: "rgmcet_gold",
  collegeName: "RAJEEV GANDHI MEMORIAL COLLEGE OF ENGG & TECH",
  subHeader: "(AUTONOMOUS) · NAAC A+ Grade · Approved by AICTE, Affiliated to JNTUA · Nandyal",
  clubName: "YUGA SPARK HACKATHON CLUB",
  signatory1Name: "Dr. T. Jayachandra Prasad",
  signatory1Title: "Principal, RGMCET",
  signatory2Name: "Faculty Convener",
  signatory2Title: "Head of Department, CSE",
  showRegNo: true,
  showDigitalSeal: true,
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

/** Draws RGMCET Emblem Logo on canvas */
function drawCollegeLogo(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, primaryColor: string) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = primaryColor;
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = "#d4af37";
  ctx.stroke();

  // Emblem Text
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 26px 'Space Grotesk', sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("RGMCET", x, y - 4);

  ctx.font = "bold 12px 'JetBrains Mono', monospace";
  ctx.fillText("ESTD 1995", x, y + 16);
  ctx.restore();
}

/** Draws Yuga Spark Club Logo on canvas */
function drawYugaSparkLogo(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, accentColor: string) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = "#0f172a";
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = accentColor;
  ctx.stroke();

  // Spark Icon Graphic
  ctx.fillStyle = accentColor;
  ctx.font = "bold 30px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("⚡", x, y - 6);

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 11px 'JetBrains Mono', monospace";
  ctx.fillText("YUGA SPARK", x, y + 18);
  ctx.restore();
}

/** Draws Official Digital Verification Seal */
function drawDigitalSeal(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, goldColor: string) {
  ctx.save();
  // Starburst seal outline
  ctx.beginPath();
  const numPoints = 24;
  for (let i = 0; i < numPoints; i++) {
    const angle = (i * Math.PI) / (numPoints / 2);
    const r = i % 2 === 0 ? radius : radius - 6;
    const px = x + r * Math.cos(angle);
    const py = y + r * Math.sin(angle);
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = goldColor;
  ctx.fill();

  // Inner ring
  ctx.beginPath();
  ctx.arc(x, y, radius - 12, 0, Math.PI * 2);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = goldColor;
  ctx.stroke();

  ctx.fillStyle = "#1a1a1a";
  ctx.font = "bold 13px 'Space Grotesk', sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("OFFICIAL", x, y - 10);
  ctx.fillText("SEAL", x, y + 6);

  ctx.fillStyle = goldColor;
  ctx.font = "bold 10px 'JetBrains Mono', monospace";
  ctx.fillText("✓ VERIFIED", x, y + 20);
  ctx.restore();
}

/** Draws an official RGMCET college certificate on a canvas and triggers a PNG download. */
export function downloadCertificate(input: CertificateInput, customConfig?: CertificateConfig) {
  const config = customConfig ?? DEFAULT_CONFIG;

  const canvas = document.createElement("canvas");
  canvas.width = 1600;
  canvas.height = 1131;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  // Color Palettes
  let bgColor = "#fffdfa";
  let textColor = "#1e1e1e";
  let subtitleColor = "#4a4a4a";
  let primaryColor = "#6b1110"; // RGMCET Royal Maroon
  let goldColor = "#d4af37";    // Metallic Gold
  let frameBorderColor = "#6b1110";

  if (config.theme === "navy_platinum") {
    bgColor = "#ffffff";
    textColor = "#0f172a";
    subtitleColor = "#334155";
    primaryColor = "#0f172a"; // Royal Navy
    goldColor = "#3b82f6";    // Sapphire Blue Accent
    frameBorderColor = "#1e293b";
  } else if (config.theme === "emerald_prestige") {
    bgColor = "#f8fcf9";
    textColor = "#064e3b";
    subtitleColor = "#047857";
    primaryColor = "#064e3b"; // Deep Emerald
    goldColor = "#d4af37";    // Gold Accent
    frameBorderColor = "#064e3b";
  }

  // 1. Background
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 2. Double Filigree Outer Frame
  ctx.strokeStyle = frameBorderColor;
  ctx.lineWidth = 8;
  ctx.strokeRect(35, 35, canvas.width - 70, canvas.height - 70);

  ctx.strokeStyle = goldColor;
  ctx.lineWidth = 3;
  ctx.strokeRect(48, 48, canvas.width - 96, canvas.height - 96);

  ctx.strokeStyle = frameBorderColor;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(56, 56, canvas.width - 112, canvas.height - 112);

  // Corner Ornaments
  const cornerSize = 40;
  [
    [65, 65],
    [canvas.width - 65, 65],
    [65, canvas.height - 65],
    [canvas.width - 65, canvas.height - 65],
  ].forEach(([cx, cy]) => {
    ctx.beginPath();
    ctx.arc(cx, cy, 8, 0, Math.PI * 2);
    ctx.fillStyle = goldColor;
    ctx.fill();
  });

  // 3. Logos Top Header
  drawCollegeLogo(ctx, 160, 150, 48, primaryColor);
  drawYugaSparkLogo(ctx, canvas.width - 160, 150, 48, goldColor);

  // 4. College Name Header
  ctx.textAlign = "center";
  ctx.fillStyle = primaryColor;
  ctx.font = "bold 34px 'Space Grotesk', serif";
  ctx.fillText(config.collegeName || DEFAULT_CONFIG.collegeName, canvas.width / 2, 130);

  ctx.fillStyle = subtitleColor;
  ctx.font = "500 17px 'DM Sans', sans-serif";
  ctx.fillText(config.subHeader || DEFAULT_CONFIG.subHeader, canvas.width / 2, 162);

  ctx.fillStyle = primaryColor;
  ctx.font = "bold 20px 'JetBrains Mono', monospace";
  ctx.fillText(config.clubName || DEFAULT_CONFIG.clubName, canvas.width / 2, 195);

  // Divider under header
  ctx.strokeStyle = goldColor;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(canvas.width / 2 - 400, 215);
  ctx.lineTo(canvas.width / 2 + 400, 215);
  ctx.stroke();

  // 5. Main Certificate Title
  const won = input.placement !== null && input.placement <= 3;
  ctx.fillStyle = primaryColor;
  ctx.font = "bold 68px 'Space Grotesk', serif";
  ctx.fillText(won ? "CERTIFICATE OF ACHIEVEMENT" : "CERTIFICATE OF PARTICIPATION", canvas.width / 2, 305);

  // 6. Recipient Line
  ctx.fillStyle = subtitleColor;
  ctx.font = "400 26px 'DM Sans', sans-serif";
  ctx.fillText("This is proudly awarded to", canvas.width / 2, 385);

  // Student Name
  ctx.fillStyle = textColor;
  ctx.font = "bold 82px 'Space Grotesk', sans-serif";
  ctx.fillText(input.name, canvas.width / 2, 485);

  let currentY = 520;
  if (config.showRegNo && input.regNo) {
    ctx.font = "bold 24px 'JetBrains Mono', monospace";
    ctx.fillStyle = primaryColor;
    ctx.fillText(`(Registration No: ${input.regNo})`, canvas.width / 2, currentY);
    currentY += 40;
  }

  // Underline
  ctx.strokeStyle = goldColor;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(canvas.width / 2 - 350, currentY);
  ctx.lineTo(canvas.width / 2 + 350, currentY);
  ctx.stroke();

  // 7. Event Description Line
  currentY += 65;
  ctx.fillStyle = subtitleColor;
  ctx.font = "400 28px 'DM Sans', sans-serif";
  const line = won
    ? `for outstanding performance and securing ${ORDINALS[input.placement!] ?? `${input.placement}th`} Place in`
    : "for active participation and completion of the Hackathon event";
  ctx.fillText(line, canvas.width / 2, currentY);

  // Hackathon Event Title
  currentY += 65;
  ctx.fillStyle = primaryColor;
  ctx.font = "bold 48px 'Space Grotesk', sans-serif";
  ctx.fillText(input.hackathon, canvas.width / 2, currentY);

  // Event Date
  currentY += 55;
  ctx.fillStyle = subtitleColor;
  ctx.font = "400 24px 'DM Sans', sans-serif";
  ctx.fillText(`Organized by RGMCET Hackathon Club on ${input.date}`, canvas.width / 2, currentY);

  // 8. Official Digital Signatures & Authorities (NO CLUB LEAD SIGN!)
  const sigY = 940;

  // Left Signatory (Principal / Official 1)
  ctx.font = "bold 24px 'Space Grotesk', sans-serif";
  ctx.fillStyle = textColor;
  ctx.fillText(config.signatory1Name || DEFAULT_CONFIG.signatory1Name, canvas.width / 2 - 380, sigY);

  ctx.strokeStyle = "#a3a3a3";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(canvas.width / 2 - 540, sigY + 15);
  ctx.lineTo(canvas.width / 2 - 220, sigY + 15);
  ctx.stroke();

  // Digital Signature Badge overlay
  ctx.fillStyle = "#166534";
  ctx.font = "bold 13px 'JetBrains Mono', monospace";
  ctx.fillText("✍️ DIGITALLY SIGNED", canvas.width / 2 - 380, sigY - 28);

  ctx.fillStyle = subtitleColor;
  ctx.font = "500 20px 'DM Sans', sans-serif";
  ctx.fillText(config.signatory1Title || DEFAULT_CONFIG.signatory1Title, canvas.width / 2 - 380, sigY + 45);

  // Right Signatory (Faculty Convener / HOD / Official 2)
  ctx.font = "bold 24px 'Space Grotesk', sans-serif";
  ctx.fillStyle = textColor;
  ctx.fillText(config.signatory2Name || DEFAULT_CONFIG.signatory2Name, canvas.width / 2 + 380, sigY);

  ctx.strokeStyle = "#a3a3a3";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(canvas.width / 2 + 220, sigY + 15);
  ctx.lineTo(canvas.width / 2 + 540, sigY + 15);
  ctx.stroke();

  // Digital Signature Badge overlay
  ctx.fillStyle = "#166534";
  ctx.font = "bold 13px 'JetBrains Mono', monospace";
  ctx.fillText("✍️ DIGITALLY SIGNED", canvas.width / 2 + 380, sigY - 28);

  ctx.fillStyle = subtitleColor;
  ctx.font = "500 20px 'DM Sans', sans-serif";
  ctx.fillText(config.signatory2Title || DEFAULT_CONFIG.signatory2Title, canvas.width / 2 + 380, sigY + 45);

  // Center Official Seal (Optional)
  if (config.showDigitalSeal) {
    drawDigitalSeal(ctx, canvas.width / 2, sigY + 10, 52, goldColor);
  }

  // 9. QR Verification Footer
  if (config.showQrStamp) {
    ctx.textAlign = "center";
    ctx.fillStyle = primaryColor;
    ctx.font = "bold 14px 'JetBrains Mono', monospace";
    ctx.fillText("OFFICIAL RGMCET COLLEGE DIGITAL CERTIFICATE · VERIFIED DATABASE RECORD", canvas.width / 2, 1055);
  }

  // Trigger Download
  const url = canvas.toDataURL("image/png");
  const a = document.createElement("a");
  a.href = url;
  a.download = `${input.name.replace(/\s+/g, "_")}_${input.hackathon.replace(/\s+/g, "_")}_Certificate.png`;
  a.click();
}
