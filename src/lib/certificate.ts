export type CertificateInput = {
  name: string;
  hackathon: string;
  date: string;
  placement: number | null;
};

const ORDINALS = ["", "First", "Second", "Third"];

/** Draws a club certificate on a canvas and triggers a PNG download. */
export function downloadCertificate(input: CertificateInput) {
  const canvas = document.createElement("canvas");
  canvas.width = 1600;
  canvas.height = 1131;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.fillStyle = "#fdfaf5";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const grad = ctx.createLinearGradient(0, 0, canvas.width, 0);
  grad.addColorStop(0, "#d1521f");
  grad.addColorStop(1, "#f0a13c");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, 22);
  ctx.fillRect(0, canvas.height - 22, canvas.width, 22);

  ctx.strokeStyle = "#e6ddd0";
  ctx.lineWidth = 3;
  ctx.strokeRect(60, 60, canvas.width - 120, canvas.height - 120);

  ctx.textAlign = "center";
  ctx.fillStyle = "#d1521f";
  ctx.font = "600 30px 'JetBrains Mono', monospace";
  ctx.fillText("YUGA SPARK · HACKATHON CLUB · RGMCET", canvas.width / 2, 200);

  const won = input.placement !== null && input.placement <= 3;
  ctx.fillStyle = "#2b2119";
  ctx.font = "700 78px 'Space Grotesk', sans-serif";
  ctx.fillText(won ? "Certificate of Achievement" : "Certificate of Participation", canvas.width / 2, 320);

  ctx.font = "400 30px 'DM Sans', sans-serif";
  ctx.fillStyle = "#6b5c4d";
  ctx.fillText("This is proudly presented to", canvas.width / 2, 420);

  ctx.fillStyle = "#2b2119";
  ctx.font = "700 92px 'Space Grotesk', sans-serif";
  ctx.fillText(input.name, canvas.width / 2, 540);

  ctx.strokeStyle = "#d1521f";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(canvas.width / 2 - 320, 575);
  ctx.lineTo(canvas.width / 2 + 320, 575);
  ctx.stroke();

  ctx.fillStyle = "#6b5c4d";
  ctx.font = "400 32px 'DM Sans', sans-serif";
  const line = won
    ? `for securing ${ORDINALS[input.placement!] ?? `${input.placement}th`} place at`
    : "for participating in";
  ctx.fillText(line, canvas.width / 2, 650);

  ctx.fillStyle = "#2b2119";
  ctx.font = "700 54px 'Space Grotesk', sans-serif";
  ctx.fillText(input.hackathon, canvas.width / 2, 730);

  ctx.fillStyle = "#6b5c4d";
  ctx.font = "400 28px 'DM Sans', sans-serif";
  ctx.fillText(input.date, canvas.width / 2, 790);

  ctx.font = "400 26px 'DM Sans', sans-serif";
  ctx.fillStyle = "#2b2119";
  ctx.fillText("Jaya Krushna & Hemanth", canvas.width / 2 - 380, 960);
  ctx.fillText("Yuga Spark", canvas.width / 2 + 380, 960);
  ctx.strokeStyle = "#c8bcab";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(canvas.width / 2 - 560, 985);
  ctx.lineTo(canvas.width / 2 - 200, 985);
  ctx.moveTo(canvas.width / 2 + 200, 985);
  ctx.lineTo(canvas.width / 2 + 560, 985);
  ctx.stroke();
  ctx.fillStyle = "#9c8c7b";
  ctx.font = "400 22px 'DM Sans', sans-serif";
  ctx.fillText("Club Leads", canvas.width / 2 - 380, 1025);
  ctx.fillText("Club Seal", canvas.width / 2 + 380, 1025);

  const url = canvas.toDataURL("image/png");
  const a = document.createElement("a");
  a.href = url;
  a.download = `${input.hackathon.replace(/\s+/g, "-").toLowerCase()}-certificate.png`;
  a.click();
}
