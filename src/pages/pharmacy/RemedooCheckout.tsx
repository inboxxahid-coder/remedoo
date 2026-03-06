import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, Upload, MapPin, LocateFixed, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const RemedooCheckout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { cart, hasRx } = (location.state || {}) as { cart: Record<string, { item: any; quantity: number }>; hasRx: boolean };

  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [prescriptionFile, setPrescriptionFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"cod" | "online">("cod");
  const [deliverySettings, setDeliverySettings] = useState({ base: 30, freeThreshold: 499 });

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/login"); return; }

      const [profileRes, settRes] = await Promise.all([
        supabase.from("profiles").select("address" as any).eq("user_id", session.user.id).single(),
        supabase.from("platform_settings").select("key, value").in("key", ["remedoo_base_delivery_fee", "remedoo_free_delivery_threshold"]),
      ]);

      if ((profileRes.data as any)?.address) setAddress((profileRes.data as any).address);

      const settings = settRes.data || [];
      const base = settings.find(s => s.key === "remedoo_base_delivery_fee");
      const threshold = settings.find(s => s.key === "remedoo_free_delivery_threshold");
      setDeliverySettings({
        base: base ? Number(base.value) : 30,
        freeThreshold: threshold ? Number(threshold.value) : 499,
      });
    };
    load();
  }, []);

  if (!cart || Object.keys(cart).length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">No items in cart</p>
      </div>
    );
  }

  const items = Object.values(cart);
  const subtotal = items.reduce((a, b) => a + b.item.price * b.quantity, 0);
  const deliveryFee = subtotal >= deliverySettings.freeThreshold ? 0 : deliverySettings.base;
  const total = subtotal + deliveryFee;

  const detectLocation = () => {
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => { setAddress(`Lat: ${pos.coords.latitude.toFixed(5)}, Lng: ${pos.coords.longitude.toFixed(5)}`); setLocating(false); },
      () => { toast.error("Location access denied"); setLocating(false); }
    );
  };

  const placeOrder = async () => {
    if (!address) { toast.error("Please add delivery address"); return; }
    if (hasRx && !prescriptionFile) { toast.error("Prescription upload required for Rx medicines"); return; }
    setLoading(true);

    // Stock validation — check all items are still available
    const itemIds = items.map(c => c.item.id);
    const { data: stockData } = await supabase
      .from("remedoo_pharmacy_inventory")
      .select("id, name, stock_quantity, is_active, expiry_date")
      .in("id", itemIds);

    const now = new Date();
    const outOfStock = items.filter(c => {
      const inv = (stockData || []).find((s: any) => s.id === c.item.id);
      if (!inv) return true;
      if (!inv.is_active) return true;
      if (inv.expiry_date && new Date(inv.expiry_date) <= now) return true;
      return inv.stock_quantity < c.quantity;
    });

    if (outOfStock.length > 0) {
      toast.error(`${outOfStock.map(c => c.item.name).join(", ")} — insufficient stock or unavailable`);
      setLoading(false);
      return;
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { navigate("/login"); return; }

    let prescriptionUrl: string | null = null;
    if (prescriptionFile) {
      const path = `remedoo/${session.user.id}/${Date.now()}_${prescriptionFile.name}`;
      const { error: upErr } = await supabase.storage.from("prescriptions").upload(path, prescriptionFile);
      if (upErr) { toast.error("Failed to upload prescription"); setLoading(false); return; }
      prescriptionUrl = path;
    }

    const orderItems = items.map(c => ({
      id: c.item.id,
      name: c.item.name,
      price: c.item.price,
      quantity: c.quantity,
      requires_prescription: c.item.requires_prescription,
    }));

    const orderStatus = hasRx ? "prescription_verification" : "placed";

    const { data: order, error } = await supabase.from("remedoo_orders").insert({
      user_id: session.user.id,
      items: orderItems,
      subtotal,
      delivery_fee: deliveryFee,
      total,
      payment_method: paymentMethod,
      payment_status: paymentMethod === "cod" ? "pending" : "pending",
      prescription_url: prescriptionUrl,
      delivery_address: address,
      notes,
      status: orderStatus,
      prescription_status: hasRx ? "pending" : "not_required",
    } as any).select("id").single();

    if (error) { toast.error(error.message); setLoading(false); return; }

    // Create delivery order placeholder
    await supabase.from("delivery_orders").insert({
      order_id: order!.id,
      delivery_address: address,
      status: "pending",
    } as any);

    toast.success(hasRx ? "Order placed — awaiting prescription verification" : "Order placed successfully!");
    navigate("/remedoo-order/" + order!.id);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-muted/30 pb-8">
      <div className="bg-card sticky top-0 z-30 shadow-sm px-4 safe-top pb-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-muted flex items-center justify-center">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="text-lg font-bold text-foreground">Checkout</h1>
        </div>
      </div>

      <div className="px-4 mt-4 space-y-4">
        {/* Items */}
        <div className="bg-card rounded-xl border border-border p-4">
          <h3 className="font-bold text-sm text-foreground mb-3">Order Summary</h3>
          {items.map(c => (
            <div key={c.item.id} className="flex justify-between text-sm py-1.5 border-b border-border last:border-0">
              <span className="text-foreground flex items-center gap-1">
                {c.item.name} x{c.quantity}
                {c.item.requires_prescription && <span className="text-[9px] text-amber-600 font-medium">(Rx)</span>}
              </span>
              <span className="font-semibold text-foreground">₹{(c.item.price * c.quantity).toFixed(0)}</span>
            </div>
          ))}
          <div className="mt-3 pt-2 border-t border-dashed border-border space-y-1 text-sm">
            <div className="flex justify-between text-muted-foreground"><span>Subtotal</span><span>₹{subtotal.toFixed(0)}</span></div>
            <div className="flex justify-between text-muted-foreground">
              <span>Delivery</span>
              <span>{deliveryFee === 0 ? <span className="text-emerald-600 font-medium">FREE</span> : `₹${deliveryFee}`}</span>
            </div>
            {deliveryFee > 0 && (
              <p className="text-[10px] text-muted-foreground">Add ₹{(deliverySettings.freeThreshold - subtotal).toFixed(0)} more for free delivery</p>
            )}
            <div className="flex justify-between font-bold text-foreground text-base"><span>Total</span><span>₹{total.toFixed(0)}</span></div>
          </div>
        </div>

        {/* Prescription Notice */}
        {hasRx && (
          <div className="bg-amber-50 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-800/50 p-4">
            <p className="text-sm font-medium text-amber-800 dark:text-amber-400 mb-1">📋 Prescription Verification Required</p>
            <p className="text-xs text-amber-700 dark:text-amber-500">
              Some items in your cart require a valid prescription. Your order will be held for pharmacist verification before processing.
            </p>
          </div>
        )}

        {/* Address */}
        <div className="bg-card rounded-xl border border-border p-4">
          <Label className="font-bold text-sm">Delivery Address</Label>
          <Textarea value={address} onChange={e => setAddress(e.target.value)} placeholder="Enter your full address" className="mt-2" />
          <Button size="sm" variant="outline" className="mt-2 gap-1" onClick={detectLocation} disabled={locating}>
            {locating ? <Loader2 className="w-3 h-3 animate-spin" /> : <LocateFixed className="w-3 h-3" />} Use GPS
          </Button>
        </div>

        {/* Prescription */}
        {hasRx && (
          <div className="bg-card rounded-xl border border-border p-4">
            <Label className="font-bold text-sm flex items-center gap-2"><Upload className="w-4 h-4" /> Upload Prescription *</Label>
            <p className="text-xs text-muted-foreground mt-1 mb-2">Upload a clear image of your prescription. Order will not proceed without approval.</p>
            <Input type="file" accept="image/*,.pdf" onChange={e => setPrescriptionFile(e.target.files?.[0] || null)} />
            {prescriptionFile && <p className="text-xs text-primary mt-1">✓ {prescriptionFile.name}</p>}
          </div>
        )}

        {/* Payment */}
        <div className="bg-card rounded-xl border border-border p-4">
          <Label className="font-bold text-sm">Payment Method</Label>
          <div className="flex gap-3 mt-2">
            {(["cod", "online"] as const).map(m => (
              <button
                key={m}
                onClick={() => setPaymentMethod(m)}
                className={`flex-1 p-3 rounded-xl border-2 text-center text-sm font-medium transition-all ${
                  paymentMethod === m ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground"
                }`}
              >
                {m === "cod" ? "Cash on Delivery" : "Pay Online"}
              </button>
            ))}
          </div>
        </div>

        {/* Notes */}
        <div className="bg-card rounded-xl border border-border p-4">
          <Label className="font-bold text-sm">Notes (optional)</Label>
          <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Any special instructions..." className="mt-2" />
        </div>

        <Button onClick={placeOrder} disabled={loading} className="w-full h-12 text-base font-bold">
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : `Place Order • ₹${total.toFixed(0)}`}
        </Button>
      </div>
    </div>
  );
};

export default RemedooCheckout;
