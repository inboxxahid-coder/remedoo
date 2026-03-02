import jsPDF from "jspdf";
import { loadAllImages, addHeader, addSectionTitle, addInfoRow, addFooter, BRAND } from "./pdfBranding";

interface PrescriptionItem {
  medicine_name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions?: string | null;
}

interface InvoiceData {
  appointmentId: string;
  providerName: string;
  providerType: string;
  providerPhone?: string | null;
  providerLocation?: string | null;
  patientName: string;
  patientPhone?: string | null;
  patientEmail?: string | null;
  appointmentDate: string;
  appointmentTime: string;
  consultationFee: number;
  paymentMethod: string;
  paymentStatus: string;
  tokenNumber?: number | null;
  serviceSummary?: string;
  department?: string | null;
  consultationNotes?: string | null;
  diagnosis?: string | null;
  prescriptionItems?: PrescriptionItem[];
  followUpDate?: string | null;
}

export const generateAppointmentInvoice = async (data: InvoiceData) => {
  const { logo, stamp, signature } = await loadAllImages();
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pw = doc.internal.pageSize.getWidth();

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

  // ── Provider Details ──
  y = addSectionTitle(doc, "Provider Details", y);
  y = addInfoRow(doc, "Name", data.providerName, y, pw);
  y = addInfoRow(doc, "Type", providerLabel + " Consultation", y, pw);
  if (data.department) y = addInfoRow(doc, "Department", data.department, y, pw);
  if (data.providerPhone) y = addInfoRow(doc, "Phone", data.providerPhone, y, pw);
  if (data.providerLocation) y = addInfoRow(doc, "Location", data.providerLocation, y, pw);
  y += 3;

  // ── Patient Details ──
  y = addSectionTitle(doc, "Patient Information", y);
  y = addInfoRow(doc, "Patient", data.patientName, y, pw);
  if (data.patientPhone) y = addInfoRow(doc, "Phone", data.patientPhone, y, pw);
  if (data.patientEmail) y = addInfoRow(doc, "Email", data.patientEmail, y, pw);
  y += 3;

  // ── Appointment Details ──
  y = addSectionTitle(doc, "Appointment Details", y);
  y = addInfoRow(doc, "Invoice #", data.appointmentId.slice(0, 8).toUpperCase(), y, pw);
  y = addInfoRow(doc, "Date", new Date(data.appointmentDate).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }), y, pw);
  y = addInfoRow(doc, "Time", data.appointmentTime, y, pw);
  if (data.tokenNumber) y = addInfoRow(doc, "Token #", String(data.tokenNumber), y, pw);
  if (data.department) y = addInfoRow(doc, "Department", data.department, y, pw);
  y += 3;

  // ── Diagnosis & Consultation Notes ──
  if (data.diagnosis || data.consultationNotes) {
    y = addSectionTitle(doc, "Clinical Summary", y);
    if (data.diagnosis) y = addInfoRow(doc, "Diagnosis", data.diagnosis, y, pw);
    if (data.consultationNotes) y = addInfoRow(doc, "Notes", data.consultationNotes, y, pw);
    y += 3;
  }

  // ── Prescription ──
  if (data.prescriptionItems && data.prescriptionItems.length > 0) {
    y = checkPageBreak(doc, y, 40);
    y = addSectionTitle(doc, "Prescription", y);

    // Table header
    doc.setFillColor(240, 245, 255);
    doc.rect(18, y - 3, pw - 36, 8, "F");
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...BRAND.primary);
    doc.text("#", 22, y + 2);
    doc.text("Medicine", 28, y + 2);
    doc.text("Dosage", 85, y + 2);
    doc.text("Frequency", 115, y + 2);
    doc.text("Duration", 150, y + 2);
    doc.text("Instructions", 175, y + 2);
    y += 8;

    data.prescriptionItems.forEach((item, idx) => {
      y = checkPageBreak(doc, y, 10);
      if (idx % 2 === 0) {
        doc.setFillColor(248, 250, 255);
        doc.rect(18, y - 3, pw - 36, 7, "F");
      }
      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...BRAND.dark);
      doc.text(String(idx + 1), 22, y + 1);
      doc.setFont("helvetica", "bold");
      doc.text(item.medicine_name.substring(0, 25), 28, y + 1);
      doc.setFont("helvetica", "normal");
      doc.text(item.dosage || "-", 85, y + 1);
      doc.text(item.frequency || "-", 115, y + 1);
      doc.text(item.duration || "-", 150, y + 1);
      doc.text((item.instructions || "-").substring(0, 15), 175, y + 1);
      y += 7;
    });
    y += 3;
  }

  // ── Follow-up ──
  if (data.followUpDate) {
    y = checkPageBreak(doc, y, 15);
    y = addSectionTitle(doc, "Follow-Up", y);
    y = addInfoRow(doc, "Next Visit", new Date(data.followUpDate).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }), y, pw);
    y += 3;
  }

  // ── Charges ──
  y = checkPageBreak(doc, y, 35);
  y = addSectionTitle(doc, "Charges Breakdown", y);

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

  // Grand total
  doc.setFillColor(...BRAND.primary);
  doc.roundedRect(100, y - 5, pw - 118, 10, 2, 2, "F");
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text("TOTAL", 106, y + 1);
  doc.text(`₹${data.consultationFee}`, pw - 22, y + 1, { align: "right" });
  y += 14;

  // ── Payment Info ──
  y = addSectionTitle(doc, "Payment Information", y);
  y = addInfoRow(doc, "Method", data.paymentMethod === "online" ? "Online (Razorpay)" : "At Clinic", y, pw);
  y = addInfoRow(doc, "Status", data.paymentStatus.charAt(0).toUpperCase() + data.paymentStatus.slice(1), y, pw);

  // Footer with stamp & signature
  addFooter(doc, stamp, signature);

  doc.save(`invoice-${data.appointmentId.slice(0, 8).toUpperCase()}.pdf`);
};

function checkPageBreak(doc: jsPDF, y: number, needed: number): number {
  const ph = doc.internal.pageSize.getHeight();
  if (y + needed > ph - 60) {
    doc.addPage();
    return 20;
  }
  return y;
}
