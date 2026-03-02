import jsPDF from "jspdf";
import logoImg from "@/assets/remedoo-logo.png";
import stampImg from "@/assets/stamp.png";
import signatureImg from "@/assets/signature.png";

// Convert image imports to base64 for jsPDF
const imageCache: Record<string, string> = {};

async function loadImageAsBase64(url: string): Promise<string> {
  if (imageCache[url]) return imageCache[url];
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0);
      const base64 = canvas.toDataURL("image/png");
      imageCache[url] = base64;
      resolve(base64);
    };
    img.onerror = () => resolve("");
    img.src = url;
  });
}

export async function loadAllImages() {
  const [logo, stamp, signature] = await Promise.all([
    loadImageAsBase64(logoImg),
    loadImageAsBase64(stampImg),
    loadImageAsBase64(signatureImg),
  ]);
  return { logo, stamp, signature };
}

// Brand colors
const BRAND = {
  primary: [25, 80, 166] as [number, number, number],    // Deep blue
  accent: [0, 188, 180] as [number, number, number],     // Teal
  dark: [30, 30, 50] as [number, number, number],
  gray: [120, 120, 130] as [number, number, number],
  lightGray: [230, 232, 240] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
};

export function addHeader(doc: jsPDF, logo: string, providerType: string, providerName: string) {
  const pw = doc.internal.pageSize.getWidth();

  // Top accent bar
  doc.setFillColor(...BRAND.primary);
  doc.rect(0, 0, pw, 4, "F");
  doc.setFillColor(...BRAND.accent);
  doc.rect(0, 4, pw, 1.5, "F");

  let y = 14;

  // Logo + App name
  if (logo) {
    try { doc.addImage(logo, "PNG", 18, y - 4, 12, 12); } catch { /* skip */ }
  }
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...BRAND.primary);
  doc.text("Remedoo", 33, y + 3);
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...BRAND.gray);
  doc.text("HEALTH SERVICES", 33, y + 8);

  // Right side — date
  doc.setFontSize(8);
  doc.setTextColor(...BRAND.gray);
  doc.text(new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }), pw - 18, y + 2, { align: "right" });

  y += 16;

  // Provider badge
  doc.setFillColor(240, 245, 255);
  doc.roundedRect(18, y, pw - 36, 14, 3, 3, "F");
  doc.setFontSize(8);
  doc.setTextColor(...BRAND.accent);
  doc.setFont("helvetica", "bold");
  const typeLabel = providerType.charAt(0).toUpperCase() + providerType.slice(1);
  doc.text(typeLabel.toUpperCase(), 24, y + 6);
  doc.setFontSize(11);
  doc.setTextColor(...BRAND.dark);
  doc.text(providerName, 24, y + 11);

  y += 20;

  // Divider
  doc.setDrawColor(...BRAND.lightGray);
  doc.setLineWidth(0.5);
  doc.line(18, y, pw - 18, y);

  return y + 6;
}

export function addSectionTitle(doc: jsPDF, title: string, y: number) {
  const pw = doc.internal.pageSize.getWidth();
  doc.setFillColor(...BRAND.primary);
  doc.rect(18, y, 3, 5, "F");
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...BRAND.dark);
  doc.text(title, 24, y + 4);
  y += 10;
  return y;
}

export function addInfoRow(doc: jsPDF, label: string, value: string, y: number, pw: number) {
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...BRAND.gray);
  doc.text(label, 24, y);
  doc.setTextColor(...BRAND.dark);
  doc.setFont("helvetica", "bold");
  const lines = doc.splitTextToSize(value, pw - 90);
  doc.text(lines, 70, y);
  return y + lines.length * 5 + 2;
}

export function addTableHeader(doc: jsPDF, columns: { label: string; x: number; align?: "left" | "center" | "right" }[], y: number, pw: number) {
  doc.setFillColor(240, 245, 255);
  doc.rect(18, y - 4, pw - 36, 8, "F");
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...BRAND.primary);
  columns.forEach((col) => {
    doc.text(col.label, col.x, y, { align: col.align || "left" });
  });
  return y + 8;
}

export function addFooter(doc: jsPDF, stamp: string, signature: string) {
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  let y = ph - 55;

  // Divider
  doc.setDrawColor(...BRAND.lightGray);
  doc.setLineWidth(0.5);
  doc.line(18, y, pw - 18, y);
  y += 6;

  // Signature + Stamp side by side
  if (signature) {
    try { doc.addImage(signature, "PNG", 24, y, 35, 18); } catch { /* skip */ }
  }
  doc.setFontSize(7);
  doc.setTextColor(...BRAND.gray);
  doc.text("Authorized Signatory", 30, y + 22);

  if (stamp) {
    try { doc.addImage(stamp, "PNG", pw - 55, y - 2, 30, 30); } catch { /* skip */ }
  }

  // Bottom bar
  const barY = ph - 12;
  doc.setFillColor(...BRAND.primary);
  doc.rect(0, barY, pw, 12, "F");
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(255, 255, 255);
  doc.text("Remedoo Health Services  •  www.remedoo.com  •  Computer-generated document", pw / 2, barY + 5, { align: "center" });
  doc.text("This document does not require a physical signature.", pw / 2, barY + 9, { align: "center" });
}

export { BRAND };
