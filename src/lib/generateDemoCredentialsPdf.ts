import jsPDF from "jspdf";

export function downloadDemoCredentialsPdf() {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // Title
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("Remedoo – Demo Credentials", pageWidth / 2, 22, { align: "center" });

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(120);
  doc.text(`Generated on ${new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}`, pageWidth / 2, 29, { align: "center" });
  doc.setTextColor(0);

  // Table header
  const startY = 38;
  const rowH = 10;
  const cols = [14, 55, 100, 152];
  const colLabels = ["Panel", "Email", "Password", "Route"];

  doc.setFillColor(34, 34, 34);
  doc.rect(12, startY, pageWidth - 24, rowH, "F");
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255);
  colLabels.forEach((l, i) => doc.text(l, cols[i], startY + 7));
  doc.setTextColor(0);

  // Rows
  const rows = [
    ["🔐 Super Admin", "super@remedoo.com", "Super1234", "/admin/login"],
    ["👨‍⚕️ Doctor", "doctor@remedoo.com", "Remedoo@2026demo", "/login"],
    ["🏥 Hospital", "hospital@remedoo.com", "Remedoo@2026demo", "/login"],
    ["🔬 Lab", "lab@remedoo.com", "Remedoo@2026demo", "/login"],
    ["💊 Pharmacy", "pharmacy@remedoo.com", "Remedoo@2026demo", "/login"],
    ["🚗 Driver", "driver@remedoo.com", "Remedoo@2026demo", "/login"],
    ["👤 Patient", "user@remedoo.com", "Remedoo@2026demo", "/login"],
  ];

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);

  rows.forEach((row, idx) => {
    const y = startY + rowH + idx * rowH;
    if (idx % 2 === 0) {
      doc.setFillColor(245, 245, 245);
      doc.rect(12, y, pageWidth - 24, rowH, "F");
    }
    row.forEach((cell, ci) => doc.text(cell, cols[ci], y + 7));
  });

  // Footer line
  const footerY = startY + rowH + rows.length * rowH + 8;
  doc.setDrawColor(200);
  doc.line(12, footerY, pageWidth - 12, footerY);
  doc.setFontSize(8);
  doc.setTextColor(150);
  doc.text("Confidential – For internal testing only", pageWidth / 2, footerY + 6, { align: "center" });

  doc.save("Remedoo-Demo-Credentials.pdf");
}
