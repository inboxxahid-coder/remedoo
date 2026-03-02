import jsPDF from "jspdf";
import { loadAllImages, addHeader, addSectionTitle, addInfoRow, addTableHeader, addFooter, BRAND } from "./pdfBranding";

interface ReceiptData {
  orderId: string;
  pharmacyName: string;
  placedAt: string;
  deliveredAt: string | null;
  deliveryAddress: string | null;
  paymentMethod: string;
  paymentStatus: string;
  subtotal: number;
  deliveryFee: number;
  total: number;
  items: { medicine_name: string; quantity: number; unit_price: number; total_price: number }[];
}

export const generateOrderReceipt = async (data: ReceiptData) => {
  const { logo, stamp, signature } = await loadAllImages();
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pw = doc.internal.pageSize.getWidth();

  // Header with branding + pharmacy info
  let y = addHeader(doc, logo, "Pharmacy", data.pharmacyName);

  // Document title
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...BRAND.primary);
  doc.text("ORDER RECEIPT", pw / 2, y, { align: "center" });
  y += 4;
  doc.setFontSize(8);
  doc.setTextColor(...BRAND.gray);
  doc.setFont("helvetica", "normal");
  doc.text(`Receipt #${data.orderId.slice(0, 8).toUpperCase()}`, pw / 2, y + 3, { align: "center" });
  y += 10;

  // Order details section
  y = addSectionTitle(doc, "Order Details", y);
  y = addInfoRow(doc, "Order ID", `#${data.orderId.slice(0, 8).toUpperCase()}`, y, pw);
  y = addInfoRow(doc, "Placed On", new Date(data.placedAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" }), y, pw);
  if (data.deliveredAt) {
    y = addInfoRow(doc, "Delivered On", new Date(data.deliveredAt).toLocaleString("en-IN"), y, pw);
  }
  if (data.deliveryAddress) {
    y = addInfoRow(doc, "Delivery To", data.deliveryAddress, y, pw);
  }
  y = addInfoRow(doc, "Payment", `${data.paymentMethod === "cod" ? "Cash on Delivery" : "Online"} (${data.paymentStatus})`, y, pw);
  y += 4;

  // Items table
  y = addSectionTitle(doc, "Items Ordered", y);
  y = addTableHeader(doc, [
    { label: "#", x: 22 },
    { label: "Medicine", x: 30 },
    { label: "Qty", x: 120, align: "center" },
    { label: "Price", x: 145, align: "center" },
    { label: "Total", x: pw - 20, align: "right" },
  ], y, pw);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  data.items.forEach((item, i) => {
    const isEven = i % 2 === 0;
    if (isEven) {
      doc.setFillColor(248, 250, 255);
      doc.rect(18, y - 4, pw - 36, 7, "F");
    }
    doc.setTextColor(...BRAND.dark);
    doc.text(String(i + 1), 22, y);
    const nameLines = doc.splitTextToSize(item.medicine_name, 80);
    doc.text(nameLines, 30, y);
    doc.text(String(item.quantity), 120, y, { align: "center" });
    doc.text(`₹${item.unit_price}`, 145, y, { align: "center" });
    doc.setFont("helvetica", "bold");
    doc.text(`₹${item.total_price}`, pw - 20, y, { align: "right" });
    doc.setFont("helvetica", "normal");
    y += nameLines.length * 5 + 3;
  });

  y += 4;
  doc.setDrawColor(...BRAND.lightGray);
  doc.line(100, y, pw - 18, y);
  y += 6;

  // Totals
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...BRAND.gray);
  doc.text("Subtotal", 110, y);
  doc.setTextColor(...BRAND.dark);
  doc.text(`₹${data.subtotal}`, pw - 20, y, { align: "right" });
  y += 6;
  doc.setTextColor(...BRAND.gray);
  doc.text("Delivery Fee", 110, y);
  doc.setTextColor(...BRAND.dark);
  doc.text(data.deliveryFee === 0 ? "FREE" : `₹${data.deliveryFee}`, pw - 20, y, { align: "right" });
  y += 8;

  // Grand total highlight
  doc.setFillColor(...BRAND.primary);
  doc.roundedRect(100, y - 5, pw - 118, 10, 2, 2, "F");
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text("TOTAL", 106, y + 1);
  doc.text(`₹${data.total}`, pw - 22, y + 1, { align: "right" });

  // Footer with stamp & signature
  addFooter(doc, stamp, signature);

  doc.save(`receipt-${data.orderId.slice(0, 8).toUpperCase()}.pdf`);
};
