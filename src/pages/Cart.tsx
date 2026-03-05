import { useState, useRef, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Minus, Trash2, Upload, FileText, MapPin, X, LocateFixed } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { CartItem } from "./PharmacyDetail";
import type { Tables } from "@/integrations/supabase/types";

declare global {
  interface Window {
    Razorpay: any;
  }
}

const Cart = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { cart: initialCart, pharmacy } = (location.state || {}) as {
    cart: Record<string, CartItem>;
    pharmacy: Tables<"pharmacies">;
  };

  const [cart, setCart] = useState<Record<string, CartItem>>(initialCart || {});
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [locatingGps, setLocatingGps] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"cod" | "online">("cod");
  const [prescriptionFile, setPrescriptionFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  // Auto-fetch saved address from profile
  useEffect(() => {
    const fetchProfileAddress = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data } = await supabase
        .from("profiles")
        .select("address" as any)
        .eq("user_id", session.user.id)
        .single();
      if (data && (data as any).address) {
        setAddress((data as any).address);
      }
    };
    fetchProfileAddress();
  }, []);
  const fileRef = useRef<HTMLInputElement>(null);

  // Load Razorpay script
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    document.body.appendChild(script);
    return () => { document.body.removeChild(script); };
  }, []);

  if (!pharmacy || !initialCart) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Your cart is empty</p>
        <Button onClick={() => navigate("/pharmacies")} className="rounded-xl">Browse Pharmacies</Button>
      </div>
    );
  }

  const updateQty = (id: string, delta: number) => {
    setCart((prev) => {
      const item = prev[id];
      if (!item) return prev;
      const newQty = item.quantity + delta;
      if (newQty <= 0) {
        const next = { ...prev };
        delete next[id];
        return next;
      }
      return { ...prev, [id]: { ...item, quantity: newQty } };
    });
  };

  const cartItems = Object.values(cart);
  const requiresPrescription = cartItems.some((i) => i.medicine.requires_prescription);

  const subtotal = cartItems.reduce((sum, item) => {
    const discounted = item.medicine.price * (1 - (item.medicine.discount_percent || 0) / 100);
    return sum + discounted * item.quantity;
  }, 0);
  const deliveryFee = subtotal > 500 ? 0 : 30;
  const total = subtotal + deliveryFee;

  const fetchGpsAddress = async () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }
    setLocatingGps(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&addressdetails=1`,
            { headers: { "Accept-Language": "en" } }
          );
          const data = await res.json();
          if (data.display_name) {
            setAddress(data.display_name);
            toast.success("Location detected!");
          } else {
            toast.error("Could not determine address");
          }
        } catch {
          toast.error("Failed to fetch address from coordinates");
        } finally {
          setLocatingGps(false);
        }
      },
      (err) => {
        setLocatingGps(false);
        toast.error(err.message || "Unable to get your location");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const createOrderInDb = async (session: any) => {
    let prescriptionUrl: string | null = null;
    if (prescriptionFile) {
      const path = `${session.user.id}/${Date.now()}-${prescriptionFile.name}`;
      const { error: upErr } = await supabase.storage.from("prescriptions").upload(path, prescriptionFile);
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from("prescriptions").getPublicUrl(path);
      prescriptionUrl = urlData.publicUrl;
    }

    const { data: order, error: orderErr } = await supabase.from("orders").insert({
      user_id: session.user.id,
      pharmacy_id: pharmacy.id,
      status: "placed",
      payment_method: paymentMethod,
      payment_status: paymentMethod === "cod" ? "pending" : "pending",
      subtotal,
      delivery_fee: deliveryFee,
      total,
      delivery_address: address,
      notes: notes || null,
      prescription_url: prescriptionUrl,
      estimated_delivery: "25-35 min",
    }).select().single();

    if (orderErr) throw orderErr;

    const items = cartItems.map((item) => ({
      order_id: order.id,
      medicine_id: item.medicine.id,
      medicine_name: item.medicine.name,
      quantity: item.quantity,
      unit_price: item.medicine.price * (1 - (item.medicine.discount_percent || 0) / 100),
      total_price: item.medicine.price * (1 - (item.medicine.discount_percent || 0) / 100) * item.quantity,
    }));

    const { error: itemsErr } = await supabase.from("order_items").insert(items);
    if (itemsErr) throw itemsErr;

    return order;
  };

  const handleRazorpayPayment = async (order: any, session: any) => {
    // Create Razorpay order via edge function
    const { data: rpData, error: rpError } = await supabase.functions.invoke("create-razorpay-order", {
      body: { order_id: order.id, amount: total },
    });

    if (rpError || rpData?.error) {
      throw new Error(rpData?.error || rpError?.message || "Failed to create payment order");
    }

    return new Promise<void>((resolve, reject) => {
      const options = {
        key: rpData.key_id,
        amount: rpData.amount,
        currency: rpData.currency,
        name: "Remedoo",
        description: `Order from ${pharmacy.name}`,
        order_id: rpData.razorpay_order_id,
        prefill: {
          email: session.user.email || "",
          name: session.user.user_metadata?.full_name || "",
        },
        theme: { color: "#2ABFBF" },
        handler: async (response: any) => {
          try {
            const { data: verifyData, error: verifyError } = await supabase.functions.invoke("verify-razorpay-payment", {
              body: {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                order_id: order.id,
              },
            });

            if (verifyError || verifyData?.error) {
              throw new Error(verifyData?.error || verifyError?.message || "Payment verification failed");
            }
            resolve();
          } catch (err) {
            reject(err);
          }
        },
        modal: {
          ondismiss: () => {
            reject(new Error("Payment cancelled"));
          },
        },
      };

      if (!window.Razorpay) {
        reject(new Error("Razorpay SDK not loaded. Please refresh and try again."));
        return;
      }

      const rzp = new window.Razorpay(options);
      rzp.open();
    });
  };

  const placeOrder = async () => {
    if (!address.trim()) { toast.error("Please enter a delivery address"); return; }
    if (requiresPrescription && !prescriptionFile) { toast.error("Please upload a prescription for Rx medicines"); return; }
    if (cartItems.length === 0) { toast.error("Cart is empty"); return; }

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/login"); return; }

      const order = await createOrderInDb(session);

      if (paymentMethod === "online") {
        try {
          await handleRazorpayPayment(order, session);
          toast.success("Payment successful! Order placed.");
        } catch (payErr: any) {
          if (payErr.message === "Payment cancelled") {
            // Update order status to reflect cancelled payment
            await supabase.from("orders").update({ payment_status: "failed" }).eq("id", order.id);
            toast.error("Payment cancelled. You can retry from My Orders.");
            navigate(`/order/${order.id}`, { replace: true });
            return;
          }
          throw payErr;
        }
      } else {
        toast.success("Order placed successfully!");
      }

      navigate(`/order/${order.id}`, { replace: true });
    } catch (err: any) {
      toast.error(err.message || "Failed to place order");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-32">
      {/* Header */}
      <div className="gradient-primary page-header px-5 pb-6 rounded-b-[1.5rem]">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-primary-foreground"><ArrowLeft className="w-6 h-6" /></button>
          <div>
            <h1 className="text-lg font-bold text-primary-foreground">Your Cart</h1>
            <p className="text-primary-foreground/70 text-xs">{pharmacy.name}</p>
          </div>
        </div>
      </div>

      <div className="px-5 mt-4 space-y-4">
        {/* Cart items */}
        <div className="bg-card rounded-2xl border border-border p-4 space-y-3">
          <h2 className="font-semibold text-foreground text-sm">Items ({cartItems.length})</h2>
          {cartItems.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Cart is empty</p>
          ) : (
            cartItems.map((item) => {
              const discounted = item.medicine.price * (1 - (item.medicine.discount_percent || 0) / 100);
              return (
                <div key={item.medicine.id} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
                  <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center text-lg">
                    {item.medicine.requires_prescription ? "📋" : "💊"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-foreground truncate">{item.medicine.name}</h3>
                    <p className="text-xs text-muted-foreground">₹{discounted.toFixed(0)} × {item.quantity}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => updateQty(item.medicine.id, -1)} className="p-1 rounded-lg bg-secondary text-secondary-foreground">
                      {item.quantity === 1 ? <Trash2 className="w-3.5 h-3.5 text-destructive" /> : <Minus className="w-3.5 h-3.5" />}
                    </button>
                    <span className="w-6 text-center text-sm font-semibold">{item.quantity}</span>
                    <button onClick={() => updateQty(item.medicine.id, 1)} className="p-1 rounded-lg bg-secondary text-secondary-foreground">
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <span className="text-sm font-bold text-foreground w-14 text-right">₹{(discounted * item.quantity).toFixed(0)}</span>
                </div>
              );
            })
          )}
        </div>

        {/* Prescription upload */}
        {requiresPrescription && (
          <div className="bg-card rounded-2xl border border-border p-4">
            <div className="flex items-center gap-2 mb-3">
              <FileText className="w-4 h-4 text-primary" />
              <h2 className="font-semibold text-foreground text-sm">Prescription Required</h2>
            </div>
            <p className="text-xs text-muted-foreground mb-3">Some items in your cart require a valid prescription</p>
            <input type="file" ref={fileRef} accept="image/*,.pdf" className="hidden" onChange={(e) => setPrescriptionFile(e.target.files?.[0] || null)} />
            {prescriptionFile ? (
              <div className="flex items-center gap-2 bg-accent rounded-xl p-3">
                <FileText className="w-4 h-4 text-primary" />
                <span className="text-sm text-foreground flex-1 truncate">{prescriptionFile.name}</span>
                <button onClick={() => setPrescriptionFile(null)}><X className="w-4 h-4 text-muted-foreground" /></button>
              </div>
            ) : (
              <Button variant="outline" onClick={() => fileRef.current?.click()} className="w-full rounded-xl border-dashed border-primary text-primary">
                <Upload className="w-4 h-4 mr-2" />Upload Prescription
              </Button>
            )}
          </div>
        )}

        {/* Delivery address */}
        <div className="bg-card rounded-2xl border border-border p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary" />
              <h2 className="font-semibold text-foreground text-sm">Delivery Address</h2>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchGpsAddress}
              disabled={locatingGps}
              className="rounded-xl text-xs gap-1.5 border-primary text-primary"
            >
              <LocateFixed className={`w-3.5 h-3.5 ${locatingGps ? "animate-spin" : ""}`} />
              {locatingGps ? "Locating..." : "Use GPS"}
            </Button>
          </div>
          <Textarea
            placeholder="Enter your full delivery address..."
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="rounded-xl resize-none"
            rows={2}
          />
          <Input
            placeholder="Any special instructions? (optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="rounded-xl"
          />
        </div>

        {/* Payment method */}
        <div className="bg-card rounded-2xl border border-border p-4 space-y-3">
          <h2 className="font-semibold text-foreground text-sm">Payment Method</h2>
          <div className="space-y-2">
            <button
              onClick={() => setPaymentMethod("cod")}
              className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-colors ${
                paymentMethod === "cod" ? "border-primary bg-primary/5" : "border-border"
              }`}
            >
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                paymentMethod === "cod" ? "border-primary" : "border-muted-foreground"
              }`}>
                {paymentMethod === "cod" && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
              </div>
              <span className="text-sm font-medium text-foreground">💵 Cash on Delivery</span>
            </button>
            <button
              onClick={() => setPaymentMethod("online")}
              className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-colors ${
                paymentMethod === "online" ? "border-primary bg-primary/5" : "border-border"
              }`}
            >
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                paymentMethod === "online" ? "border-primary" : "border-muted-foreground"
              }`}>
                {paymentMethod === "online" && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
              </div>
              <span className="text-sm font-medium text-foreground">💳 Pay Online (Razorpay)</span>
            </button>
          </div>
        </div>

        {/* Bill summary */}
        <div className="bg-card rounded-2xl border border-border p-4 space-y-2">
          <h2 className="font-semibold text-foreground text-sm mb-2">Bill Summary</h2>
          <div className="flex justify-between text-sm"><span className="text-muted-foreground">Subtotal</span><span className="text-foreground">₹{subtotal.toFixed(0)}</span></div>
          <div className="flex justify-between text-sm"><span className="text-muted-foreground">Delivery fee</span><span className={deliveryFee === 0 ? "text-success font-medium" : "text-foreground"}>{deliveryFee === 0 ? "FREE" : `₹${deliveryFee}`}</span></div>
          {deliveryFee === 0 && <p className="text-xs text-success">Free delivery on orders above ₹500</p>}
          <div className="border-t border-border pt-2 flex justify-between font-bold"><span className="text-foreground">Total</span><span className="text-foreground">₹{total.toFixed(0)}</span></div>
        </div>
      </div>

      {/* Place order button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/95 backdrop-blur-sm border-t border-border safe-bottom z-50">
        <Button
          onClick={placeOrder}
          disabled={loading || cartItems.length === 0}
          className="w-full h-12 rounded-xl gradient-primary text-primary-foreground font-semibold text-base"
        >
          {loading ? "Processing..." : paymentMethod === "online" ? `Pay ₹${total.toFixed(0)} with Razorpay` : `Place Order • ₹${total.toFixed(0)}`}
        </Button>
      </div>
    </div>
  );
};

export default Cart;
