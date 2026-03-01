import jsPDF from "jspdf";

interface PrescriptionItem {
  medicine_name: string;
  generic_name?: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions?: string;
}

interface PrescriptionData {
  doctorName: string;
  specialization?: string;
  hospitalName?: string;
  patientName?: string;
  patientId: string;
  diagnosis?: string;
  notes?: string;
  items: PrescriptionItem[];
  signatureData?: string;
  date: string;
}

export const generatePrescriptionPdf = (data: PrescriptionData) => {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pw = doc.internal.pageSize.getWidth();
  let y = 18;

  // Header - Rx Symbol
  doc.setFontSize(28);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(37, 99, 235);
  doc.text("℞", 20, y + 2);

  // Doctor info
  doc.setFontSize(16);
  doc.setTextColor(30);
  doc.text(`Dr. ${data.doctorName}`, 35, y);
  y += 6;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100);
  if (data.specialization) {
    doc.text(data.specialization, 35, y);
    y += 5;
  }
  if (data.hospitalName) {
    doc.text(data.hospitalName, 35, y);
    y += 5;
  }

  // Date on right
  doc.setTextColor(80);
  doc.text(`Date: ${data.date}`, pw - 20, 18, { align: "right" });

  y += 4;
  doc.setDrawColor(37, 99, 235);
  doc.setLineWidth(0.5);
  doc.line(20, y, pw - 20, y);
  y += 8;

  // Patient info
  doc.setTextColor(40);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Patient:", 20, y);
  doc.setFont("helvetica", "normal");
  doc.text(data.patientName || `ID: ${data.patientId.slice(0, 8)}`, 45, y);
  y += 8;

  // Diagnosis
  if (data.diagnosis) {
    doc.setFont("helvetica", "bold");
    doc.text("Diagnosis:", 20, y);
    doc.setFont("helvetica", "normal");
    const diagLines = doc.splitTextToSize(data.diagnosis, pw - 65);
    doc.text(diagLines, 50, y);
    y += diagLines.length * 5 + 4;
  }

  y += 4;
  doc.setDrawColor(200);
  doc.setLineWidth(0.2);
  doc.line(20, y, pw - 20, y);
  y += 8;

  // Medicines header
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(40);
  doc.text("#", 20, y);
  doc.text("Medicine", 28, y);
  doc.text("Dosage", 90, y);
  doc.text("Frequency", 118, y);
  doc.text("Duration", 150, y);
  y += 2;
  doc.line(20, y + 2, pw - 20, y + 2);
  y += 7;

  // Medicine rows
  doc.setFont("helvetica", "normal");
  data.items.forEach((item, idx) => {
    if (y > 260) {
      doc.addPage();
      y = 20;
    }

    doc.setFont("helvetica", "bold");
    doc.setTextColor(40);
    doc.text(`${idx + 1}.`, 20, y);

    doc.setFont("helvetica", "normal");
    doc.text(item.medicine_name, 28, y);
    if (item.generic_name) {
      doc.setFontSize(8);
      doc.setTextColor(120);
      doc.text(`(${item.generic_name})`, 28, y + 4);
      doc.setFontSize(10);
      doc.setTextColor(40);
    }

    doc.text(item.dosage, 90, y);
    doc.text(item.frequency, 118, y);
    doc.text(item.duration, 150, y);

    if (item.instructions) {
      y += item.generic_name ? 8 : 5;
      doc.setFontSize(8);
      doc.setTextColor(100);
      doc.text(`↳ ${item.instructions}`, 28, y);
      doc.setFontSize(10);
      doc.setTextColor(40);
    }

    y += item.generic_name ? 8 : 6;
    y += 2;
  });

  y += 4;
  doc.line(20, y, pw - 20, y);
  y += 8;

  // Notes
  if (data.notes) {
    doc.setFont("helvetica", "bold");
    doc.text("Notes:", 20, y);
    doc.setFont("helvetica", "normal");
    const noteLines = doc.splitTextToSize(data.notes, pw - 45);
    doc.text(noteLines, 42, y);
    y += noteLines.length * 5 + 6;
  }

  // E-Signature
  if (data.signatureData) {
    y += 4;
    try {
      doc.addImage(data.signatureData, "PNG", pw - 70, y, 50, 20);
      y += 22;
    } catch {
      // skip if invalid
    }
    doc.setFontSize(9);
    doc.setTextColor(80);
    doc.line(pw - 70, y, pw - 20, y);
    y += 4;
    doc.text(`Dr. ${data.doctorName}`, pw - 45, y, { align: "center" });
    y += 4;
    doc.text("(Digital Signature)", pw - 45, y, { align: "center" });
  }

  // Footer
  const footerY = doc.internal.pageSize.getHeight() - 12;
  doc.setFontSize(7);
  doc.setTextColor(150);
  doc.text("This is a digitally generated prescription.", pw / 2, footerY, { align: "center" });

  doc.save(`prescription-${data.date}.pdf`);
};
