import jsPDF from "jspdf";
import { loadAllImages, addHeader, addSectionTitle, addInfoRow, addFooter, BRAND } from "./pdfBranding";

interface InvoiceData {
  appointmentId: string;
  providerName: string;
  providerType: string;
  patientName: string;
  appointmentDate: string;
  appointmentTime: string;
  consultationFee: number;
  paymentMethod: string;
  paymentStatus: string;
  tokenNumber?: number | null;
  serviceSummary?: string;
}

export const generateAppointmentInvoice = async (data: InvoiceData) => {
  const { logo, stamp, signature } = await loadAllImages();
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pw = doc.internal.pageSize.getWidth();

  // Header with branding + provider info
  const providerLabel = data.providerType.charAt(0).toUpperCase() + data.providerType.slice(1);
  let y = addHeader(doc, logo, providerLabel, data.providerName);

  // Document title
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...BRAND.primary);
  doc.text("CONSULTATION INVOICE", pw / 2, y, { align: "center" });
  y += 4;
  doc.setFontSize(8);
  doc.setTextColor(...BRAND.gray);
  doc.setFont("helvetica", "normal");
  doc.text(`Invoice #${data.appointmentId.slice(0, 8).toUpperCase()}`, pw / 2, y + 3, { align: "center" });
  y += 12;

  // Appointment details
  y = addSectionTitle(doc, "Appointment Details", y);
  y = addInfoRow(doc, "Invoice #", data.appointmentId.slice(0, 8).toUpperCase(), y, pw);
  y = addInfoRow(doc, "Date", new Date(data.appointmentDate).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }), y, pw);
  y = addInfoRow(doc, "Time", data.appointmentTime, y, pw);
  if (data.tokenNumber) {
    y = addInfoRow(doc, "Token #", String(data.tokenNumber), y, pw);
  }
  y += 4;

  // Patient details
  y = addSectionTitle(doc, "Patient Information", y);
  y = addInfoRow(doc, "Patient", data.patientName, y, pw);
  y = addInfoRow(doc, "Service Type", providerLabel + " Consultation", y, pw);
  if (data.serviceSummary) {
    y = addInfoRow(doc, "Summary", data.serviceSummary, y, pw);
  }
  y += 4;

  // Charges section
  y = addSectionTitle(doc, "Charges Breakdown", y);

  // Charges table
  doc.setFillColor(240, 245, 255);
  doc.rect(18, y - 2, pw - 36, 8, "F");
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...BRAND.primary);
  doc.text("Description", 24, y + 3);
  doc.text("Amount", pw - 22, y + 3, { align: "right" });
  y += 10;

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...BRAND.dark);
  doc.text("Consultation Fee", 24, y);
  doc.text(`₹${data.consultationFee}`, pw - 22, y, { align: "right" });
  y += 8;

  doc.setDrawColor(...BRAND.lightGray);
  doc.line(100, y, pw - 18, y);
  y += 8;

  // Grand total highlight
  doc.setFillColor(...BRAND.primary);
  doc.roundedRect(100, y - 5, pw - 118, 10, 2, 2, "F");
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text("TOTAL", 106, y + 1);
  doc.text(`₹${data.consultationFee}`, pw - 22, y + 1, { align: "right" });
  y += 14;

  // Payment info
  y = addSectionTitle(doc, "Payment Information", y);
  y = addInfoRow(doc, "Method", data.paymentMethod === "online" ? "Online (Razorpay)" : "At Clinic", y, pw);
  y = addInfoRow(doc, "Status", data.paymentStatus.charAt(0).toUpperCase() + data.paymentStatus.slice(1), y, pw);

  // Footer with stamp & signature
  addFooter(doc, stamp, signature);

  doc.save(`invoice-${data.appointmentId.slice(0, 8).toUpperCase()}.pdf`);
};
