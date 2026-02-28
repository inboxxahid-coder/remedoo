import jsPDF from "jspdf";

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

export const generateOrderReceipt = (data: ReceiptData) => {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pw = doc.internal.pageSize.getWidth();
  let y = 20;

  // Header
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("Order Receipt", pw / 2, y, { align: "center" });
  y += 10;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(120);
  doc.text(`Order #${data.orderId.slice(0, 8).toUpperCase()}`, pw / 2, y, { align: "center" });
  y += 6;
  doc.text(`Date: ${new Date(data.placedAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}`, pw / 2, y, { align: "center" });
  y += 10;

  // Divider
  doc.setDrawColor(200);
  doc.line(20, y, pw - 20, y);
  y += 8;

  // Pharmacy & delivery info
  doc.setTextColor(40);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Pharmacy", 20, y);
  doc.setFont("helvetica", "normal");
  doc.text(data.pharmacyName, 65, y);
  y += 6;

  if (data.deliveryAddress) {
    doc.setFont("helvetica", "bold");
    doc.text("Delivery To", 20, y);
    doc.setFont("helvetica", "normal");
    const lines = doc.splitTextToSize(data.deliveryAddress, pw - 85);
    doc.text(lines, 65, y);
    y += lines.length * 5 + 4;
  }

  doc.setFont("helvetica", "bold");
  doc.text("Payment", 20, y);
  doc.setFont("helvetica", "normal");
  doc.text(`${data.paymentMethod === "cod" ? "Cash on Delivery" : "Online"} (${data.paymentStatus})`, 65, y);
  y += 6;

  if (data.deliveredAt) {
    doc.setFont("helvetica", "bold");
    doc.text("Delivered", 20, y);
    doc.setFont("helvetica", "normal");
    doc.text(new Date(data.deliveredAt).toLocaleString("en-IN"), 65, y);
    y += 6;
  }

  y += 4;
  doc.line(20, y, pw - 20, y);
  y += 8;

  // Items table header
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Item", 20, y);
  doc.text("Qty", 120, y, { align: "center" });
  doc.text("Price", 145, y, { align: "center" });
  doc.text("Total", pw - 20, y, { align: "right" });
  y += 2;
  doc.line(20, y + 2, pw - 20, y + 2);
  y += 7;

  // Items
  doc.setFont("helvetica", "normal");
  data.items.forEach((item) => {
    const nameLines = doc.splitTextToSize(item.medicine_name, 90);
    doc.text(nameLines, 20, y);
    doc.text(String(item.quantity), 120, y, { align: "center" });
    doc.text(`₹${item.unit_price}`, 145, y, { align: "center" });
    doc.text(`₹${item.total_price}`, pw - 20, y, { align: "right" });
    y += nameLines.length * 5 + 3;
  });

  y += 2;
  doc.line(20, y, pw - 20, y);
  y += 7;

  // Totals
  doc.setFontSize(10);
  doc.text("Subtotal", 120, y);
  doc.text(`₹${data.subtotal}`, pw - 20, y, { align: "right" });
  y += 6;
  doc.text("Delivery Fee", 120, y);
  doc.text(data.deliveryFee === 0 ? "FREE" : `₹${data.deliveryFee}`, pw - 20, y, { align: "right" });
  y += 6;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Total", 120, y);
  doc.text(`₹${data.total}`, pw - 20, y, { align: "right" });

  // Footer
  y += 16;
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(150);
  doc.text("This is a computer-generated receipt and does not require a signature.", pw / 2, y, { align: "center" });

  doc.save(`receipt-${data.orderId.slice(0, 8).toUpperCase()}.pdf`);
};
