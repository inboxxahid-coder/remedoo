import jsPDF from "jspdf";

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

export const generateAppointmentInvoice = (data: InvoiceData) => {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pw = doc.internal.pageSize.getWidth();
  let y = 20;

  // Header
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(37, 99, 235);
  doc.text("INVOICE", pw / 2, y, { align: "center" });
  y += 8;
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(120);
  doc.text("Remedoo Health Services", pw / 2, y, { align: "center" });
  y += 12;

  // Invoice details
  doc.setDrawColor(200);
  doc.line(20, y, pw - 20, y);
  y += 8;

  doc.setTextColor(40);
  doc.setFontSize(10);

  const addRow = (label: string, value: string) => {
    doc.setFont("helvetica", "bold");
    doc.text(label, 20, y);
    doc.setFont("helvetica", "normal");
    doc.text(value, 70, y);
    y += 6;
  };

  addRow("Invoice #", data.appointmentId.slice(0, 8).toUpperCase());
  addRow("Date", new Date(data.appointmentDate).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }));
  addRow("Time", data.appointmentTime);
  y += 4;
  addRow("Patient", data.patientName);
  addRow("Provider", data.providerName);
  addRow("Service Type", data.providerType.charAt(0).toUpperCase() + data.providerType.slice(1));
  if (data.tokenNumber) addRow("Token #", String(data.tokenNumber));

  y += 4;
  doc.line(20, y, pw - 20, y);
  y += 8;

  // Charges
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Charges", 20, y);
  y += 8;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Consultation Fee", 20, y);
  doc.text(`₹${data.consultationFee}`, pw - 20, y, { align: "right" });
  y += 8;

  doc.line(20, y, pw - 20, y);
  y += 6;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Total", 20, y);
  doc.text(`₹${data.consultationFee}`, pw - 20, y, { align: "right" });
  y += 10;

  // Payment info
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(80);
  addRow("Payment Method", data.paymentMethod === "online" ? "Online (Razorpay)" : "At Clinic");
  addRow("Payment Status", data.paymentStatus.charAt(0).toUpperCase() + data.paymentStatus.slice(1));

  // Footer
  const footerY = doc.internal.pageSize.getHeight() - 15;
  doc.setFontSize(7);
  doc.setTextColor(150);
  doc.text("This is a computer-generated invoice and does not require a signature.", pw / 2, footerY, { align: "center" });
  doc.text("Remedoo Health Services — www.remedoo.com", pw / 2, footerY + 4, { align: "center" });

  doc.save(`invoice-${data.appointmentId.slice(0, 8).toUpperCase()}.pdf`);
};
