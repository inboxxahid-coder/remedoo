import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Calendar, Clock, CreditCard, Banknote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const timeSlots = ["09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "14:00", "14:30", "15:00", "15:30", "16:00", "16:30"];

const BookAppointment = () => {
  const navigate = useNavigate();
  const { type, id } = useParams<{ type: string; id: string }>();
  const [providerName, setProviderName] = useState("");
  const [consultationFee, setConsultationFee] = useState<number | null>(null);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [notes, setNotes] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"at_clinic" | "online">("at_clinic");
  const [loading, setLoading] = useState(false);
  const [bookedSlots, setBookedSlots] = useState<string[]>([]);

  useEffect(() => {
    const loadProvider = async () => {
      if (!type || !id) return;
      const table = type === "doctor" ? "doctors" : type === "hospital" ? "hospitals" : type === "lab" ? "labs" : "pharmacies";
      const { data } = await supabase.from(table).select("name").eq("id", id).single();
      if (data) {
        setProviderName(data.name);
      }
      // Fetch consultation fee for doctors
      if (type === "doctor") {
        const { data: docData } = await supabase.from("doctors").select("consultation_fee").eq("id", id).single();
        if (docData?.consultation_fee) setConsultationFee(docData.consultation_fee);
      }
    };
    loadProvider();
  }, [type, id]);

  // Fetch booked slots when date or provider changes
  useEffect(() => {
    const fetchBookedSlots = async () => {
      if (!date || !id || !type) { setBookedSlots([]); return; }
      const col = type === "doctor" ? "doctor_id" : type === "hospital" ? "hospital_id" : type === "lab" ? "lab_id" : "pharmacy_id";
      const { data } = await supabase
        .from("appointments")
        .select("appointment_time")
        .eq(col, id)
        .eq("appointment_date", date)
        .in("status", ["pending", "confirmed"]);
      setBookedSlots((data || []).map((r: any) => r.appointment_time?.slice(0, 5)));
    };
    fetchBookedSlots();
  }, [date, id, type]);

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || !time) { toast.error("Please select date and time"); return; }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { navigate("/login"); return; }

    setLoading(true);

    // If online payment selected, initiate Razorpay first
    if (paymentMethod === "online" && consultationFee && consultationFee > 0) {
      try {
        // Create a temporary appointment first to get an ID
        const record: any = {
          patient_id: session.user.id,
          service_type: type,
          appointment_date: date,
          appointment_time: time,
          notes: notes || null,
          payment_method: "online",
          payment_status: "pending",
        };
        if (type === "doctor") record.doctor_id = id;
        else if (type === "hospital") record.hospital_id = id;
        else if (type === "lab") record.lab_id = id;
        else if (type === "pharmacy") record.pharmacy_id = id;

        const { data: aptData, error: aptError } = await supabase.from("appointments").insert(record).select("id").single();
        if (aptError) { toast.error("Failed to create appointment"); setLoading(false); return; }

        const aptId = aptData.id;

        // Create Razorpay order
        const { data: rzData, error: rzError } = await supabase.functions.invoke("create-razorpay-order", {
          body: { order_id: aptId, amount: consultationFee },
        });

        if (rzError || !rzData?.razorpay_order_id) {
          toast.error("Payment gateway error. Appointment saved as pending.");
          setLoading(false);
          navigate("/appointments");
          return;
        }

        // Open Razorpay checkout
        const options = {
          key: rzData.key_id,
          amount: rzData.amount,
          currency: rzData.currency,
          name: providerName,
          description: `Appointment - ${type}`,
          order_id: rzData.razorpay_order_id,
          handler: async (response: any) => {
            // Verify payment
            const { data: verifyData, error: verifyError } = await supabase.functions.invoke("verify-razorpay-payment", {
              body: {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                order_id: aptId,
              },
            });

            if (verifyError || !verifyData?.success) {
              toast.error("Payment verification failed");
            } else {
              // Update appointment payment status - this will trigger auto-confirm
              await supabase.from("appointments").update({ payment_status: "paid" } as any).eq("id", aptId);
              toast.success("Payment successful! Appointment auto-confirmed.");
            }
            navigate("/appointments");
          },
          modal: {
            ondismiss: () => {
              toast.info("Payment cancelled. Appointment saved as pending.");
              navigate("/appointments");
            },
          },
          prefill: {
            email: session.user.email,
          },
        };

        const rzp = new (window as any).Razorpay(options);
        rzp.open();
        setLoading(false);
        return;
      } catch (err) {
        console.error("Payment error:", err);
        toast.error("Payment failed");
        setLoading(false);
        return;
      }
    }

    // Regular booking (at_clinic)
    const record: any = {
      patient_id: session.user.id,
      service_type: type,
      appointment_date: date,
      appointment_time: time,
      notes: notes || null,
      payment_method: paymentMethod,
      payment_status: "pending",
    };
    if (type === "doctor") record.doctor_id = id;
    else if (type === "hospital") record.hospital_id = id;
    else if (type === "lab") record.lab_id = id;
    else if (type === "pharmacy") record.pharmacy_id = id;

    const { error } = await supabase.from("appointments").insert(record);
    setLoading(false);

    if (error) {
      toast.error("Failed to book appointment");
    } else {
      toast.success("Appointment booked successfully!");
      navigate("/appointments");
    }
  };

  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="min-h-screen bg-background">
      <div className="gradient-primary px-5 pt-10 pb-6 rounded-b-[1.5rem]">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-primary-foreground"><ArrowLeft className="w-6 h-6" /></button>
          <h1 className="text-xl font-bold text-primary-foreground">Book Appointment</h1>
        </div>
      </div>

      <div className="px-5 mt-4">
        {providerName && (
          <div className="bg-card rounded-2xl border border-border p-4 mb-4 shadow-sm">
            <p className="text-sm text-muted-foreground">Booking with</p>
            <h2 className="font-semibold text-lg text-foreground">{providerName}</h2>
            <div className="flex items-center gap-2">
              <p className="text-xs text-primary capitalize">{type}</p>
              {consultationFee != null && consultationFee > 0 && (
                <p className="text-xs font-semibold text-foreground">· ₹{consultationFee}</p>
              )}
            </div>
          </div>
        )}

        <form onSubmit={handleBook} className="bg-card rounded-2xl border border-border p-5 shadow-sm space-y-5">
          <div className="space-y-2">
            <Label className="flex items-center gap-2"><Calendar className="w-4 h-4 text-primary" />Select Date</Label>
            <Input type="date" min={today} value={date} onChange={(e) => setDate(e.target.value)} required />
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2"><Clock className="w-4 h-4 text-primary" />Select Time</Label>
            <div className="grid grid-cols-3 gap-2">
              {timeSlots.map((slot) => {
                const isBooked = bookedSlots.includes(slot);
                return (
                  <button
                    key={slot}
                    type="button"
                    disabled={isBooked}
                    onClick={() => setTime(slot)}
                    className={`py-2 rounded-lg text-sm font-medium border transition-colors ${
                      isBooked
                        ? "bg-muted text-muted-foreground border-border opacity-50 cursor-not-allowed line-through"
                        : time === slot
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background border-border text-foreground hover:border-primary"
                    }`}
                  >
                    {slot}
                    {isBooked && <span className="block text-[10px] no-underline leading-tight">Booked</span>}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Notes (optional)</Label>
            <Input placeholder="Any specific concerns..." value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>

          {/* Payment Method Selection */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-primary" /> Payment Method
            </Label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPaymentMethod("at_clinic")}
                className={`flex items-center gap-2 p-3 rounded-xl border-2 transition-colors ${
                  paymentMethod === "at_clinic"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <Banknote className={`w-5 h-5 ${paymentMethod === "at_clinic" ? "text-primary" : "text-muted-foreground"}`} />
                <div className="text-left">
                  <p className={`text-sm font-medium ${paymentMethod === "at_clinic" ? "text-primary" : "text-foreground"}`}>At Clinic</p>
                  <p className="text-[10px] text-muted-foreground">Pay when you visit</p>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod("online")}
                className={`flex items-center gap-2 p-3 rounded-xl border-2 transition-colors ${
                  paymentMethod === "online"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <CreditCard className={`w-5 h-5 ${paymentMethod === "online" ? "text-primary" : "text-muted-foreground"}`} />
                <div className="text-left">
                  <p className={`text-sm font-medium ${paymentMethod === "online" ? "text-primary" : "text-foreground"}`}>Pay Online</p>
                  <p className="text-[10px] text-muted-foreground">Auto-confirm</p>
                </div>
              </button>
            </div>
          </div>

          <Button type="submit" disabled={loading} className="w-full h-12 rounded-xl gradient-primary text-primary-foreground font-semibold">
            {loading ? "Processing..." : paymentMethod === "online" ? "Pay & Book" : "Confirm Booking"}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default BookAppointment;
