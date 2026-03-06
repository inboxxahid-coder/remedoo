import { useState, useEffect } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, Calendar, Clock, CreditCard, Banknote, TestTube, Check, Beaker, Home, Stethoscope } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";
import { useServiceToggle } from "@/hooks/useServiceToggle";
import ServiceDisabledBanner from "@/components/ServiceDisabledBanner";

const timeSlots = ["09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "14:00", "14:30", "15:00", "15:30", "16:00", "16:30"];

const BookAppointment = () => {
  const navigate = useNavigate();
  const { type, id } = useParams<{ type: string; id: string }>();
  const [searchParams] = useSearchParams();
  const preselectedTestId = searchParams.get("test");

  const [providerName, setProviderName] = useState("");
  const [consultationFee, setConsultationFee] = useState<number | null>(null);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [notes, setNotes] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"at_clinic" | "online">("at_clinic");
  const [loading, setLoading] = useState(false);
  const [bookedSlots, setBookedSlots] = useState<string[]>([]);

  // Lab test selection
  const [labTests, setLabTests] = useState<Tables<"lab_tests">[]>([]);
  const [selectedTests, setSelectedTests] = useState<Set<string>>(new Set());
  const [wantHomeCollection, setWantHomeCollection] = useState(false);

  // Hospital doctor selection
  const [hospitalDoctors, setHospitalDoctors] = useState<any[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>("");

  useEffect(() => {
    const loadProvider = async () => {
      if (!type || !id) return;
      const table = type === "doctor" ? "doctors" : type === "hospital" ? "hospitals" : type === "lab" ? "labs" : "pharmacies";
      const { data } = await supabase.from(table).select("name").eq("id", id).single();
      if (data) setProviderName(data.name);

      if (type === "doctor") {
        const { data: docData } = await supabase.from("doctors").select("consultation_fee").eq("id", id).single();
        if (docData?.consultation_fee) setConsultationFee(docData.consultation_fee);
      }

      if (type === "hospital") {
        const { data: docs } = await supabase
          .from("doctors")
          .select("id, name, specialization, consultation_fee")
          .eq("hospital_id", id)
          .eq("approval_status", "approved")
          .order("name");
        if (docs) setHospitalDoctors(docs);
      }

      if (type === "lab") {
        const { data: tests } = await supabase
          .from("lab_tests")
          .select("*")
          .eq("lab_id", id)
          .order("is_popular", { ascending: false });
        if (tests) {
          setLabTests(tests);
          if (preselectedTestId) {
            setSelectedTests(new Set([preselectedTestId]));
          }
        }
      }
    };
    loadProvider();
  }, [type, id, preselectedTestId]);

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

  const toggleTest = (testId: string) => {
    setSelectedTests((prev) => {
      const next = new Set(prev);
      if (next.has(testId)) next.delete(testId);
      else next.add(testId);
      return next;
    });
  };

  const homeCollectionFee = wantHomeCollection
    ? labTests
        .filter((t) => selectedTests.has(t.id) && t.home_collection)
        .reduce((sum, t) => sum + ((t as any).home_collection_fee ?? 0), 0)
    : 0;

  const selectedTestTotal = labTests
    .filter((t) => selectedTests.has(t.id))
    .reduce((sum, t) => {
      const discount = t.discount_percent ?? 0;
      return sum + t.price * (1 - discount / 100);
    }, 0) + homeCollectionFee;

  const anyHomeCollectionAvailable = labTests.some(
    (t) => selectedTests.has(t.id) && t.home_collection
  );

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || !time) { toast.error("Please select date and time"); return; }
    // Build notes with selected test names for lab bookings
    const testNames = type === "lab"
      ? labTests.filter((t) => selectedTests.has(t.id)).map((t) => t.name)
      : [];
    const homeNote = wantHomeCollection ? " | Home Collection" : "";
    const fullNotes = type === "lab"
      ? `Tests: ${testNames.join(", ")}${homeNote}${notes ? ` | ${notes}` : ""}`
      : notes || null;

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
           notes: fullNotes,
          payment_method: "online",
          payment_status: "pending",
        };
        if (type === "doctor") record.doctor_id = id;
        else if (type === "hospital") {
          record.hospital_id = id;
          if (selectedDoctorId) record.doctor_id = selectedDoctorId;
        }
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
      notes: fullNotes,
      payment_method: paymentMethod,
      payment_status: "pending",
    };
    if (type === "doctor") record.doctor_id = id;
    else if (type === "hospital") {
      record.hospital_id = id;
      if (selectedDoctorId) record.doctor_id = selectedDoctorId;
    }
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
      <div className="gradient-primary page-header px-5 pb-6 rounded-b-[1.5rem]">
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

        {/* Doctor Selection for Hospital Booking */}
        {type === "hospital" && hospitalDoctors.length > 0 && (
          <div className="bg-card rounded-2xl border border-border p-4 mb-4 shadow-sm space-y-2">
            <Label className="flex items-center gap-2 text-base">
              <Stethoscope className="w-4 h-4 text-primary" /> Select Doctor (optional)
            </Label>
            <Select value={selectedDoctorId} onValueChange={(v) => {
              setSelectedDoctorId(v);
              const doc = hospitalDoctors.find(d => d.id === v);
              if (doc?.consultation_fee) setConsultationFee(doc.consultation_fee);
              else setConsultationFee(null);
            }}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Choose a doctor..." />
              </SelectTrigger>
              <SelectContent>
                {hospitalDoctors.map(doc => (
                  <SelectItem key={doc.id} value={doc.id}>
                    {doc.name} — {doc.specialization || "General"} {doc.consultation_fee ? `(₹${doc.consultation_fee})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Lab Test Selection */}
        {type === "lab" && labTests.length > 0 && (
          <div className="bg-card rounded-2xl border border-border p-4 mb-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2 text-base">
                <TestTube className="w-4 h-4 text-primary" />Select Tests
              </Label>
              {selectedTests.size > 0 && (
                <div className="text-right">
                  <p className="text-sm font-bold text-primary">₹{Math.round(selectedTestTotal)}</p>
                  <p className="text-[10px] text-muted-foreground">{selectedTests.size} test{selectedTests.size > 1 ? "s" : ""}</p>
                </div>
              )}
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {labTests.map((test) => {
                const isSelected = selectedTests.has(test.id);
                const discountedPrice = test.discount_percent
                  ? Math.round(test.price * (1 - (test.discount_percent ?? 0) / 100))
                  : test.price;
                return (
                  <button
                    key={test.id}
                    type="button"
                    onClick={() => toggleTest(test.id)}
                    className={`w-full text-left p-3 rounded-xl border-2 transition-all ${
                      isSelected
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/40"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors ${
                        isSelected ? "bg-primary border-primary" : "border-muted-foreground/40"
                      }`}>
                        {isSelected && <Check className="w-3 h-3 text-primary-foreground" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-medium text-foreground">{test.name}</p>
                          <div className="text-right flex-shrink-0">
                            <p className="text-sm font-bold text-primary">₹{discountedPrice}</p>
                            {test.discount_percent != null && test.discount_percent > 0 && (
                              <p className="text-[10px] text-muted-foreground line-through">₹{test.price}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                            <Beaker className="w-3 h-3" />{test.sample_type || "Blood"}
                          </span>
                          {test.turnaround_time && (
                            <span className="text-[10px] text-muted-foreground">· {test.turnaround_time}</span>
                          )}
                          {test.is_popular && (
                            <Badge variant="secondary" className="text-[10px] h-4 px-1.5">Popular</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Home Collection Option */}
        {type === "lab" && anyHomeCollectionAvailable && (
          <div className="bg-card rounded-2xl border border-border p-4 mb-4 shadow-sm space-y-2">
            <button
              type="button"
              onClick={() => setWantHomeCollection(!wantHomeCollection)}
              className={`w-full flex items-center justify-between p-3 rounded-xl border-2 transition-all ${
                wantHomeCollection ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${wantHomeCollection ? "bg-primary/15" : "bg-muted"}`}>
                  <Home className={`w-4 h-4 ${wantHomeCollection ? "text-primary" : "text-muted-foreground"}`} />
                </div>
                <div className="text-left">
                  <p className={`text-sm font-medium ${wantHomeCollection ? "text-primary" : "text-foreground"}`}>Home Sample Collection</p>
                  <p className="text-[10px] text-muted-foreground">A phlebotomist will visit your home</p>
                </div>
              </div>
              <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center ${
                wantHomeCollection ? "bg-primary border-primary" : "border-muted-foreground/40"
              }`}>
                {wantHomeCollection && <Check className="w-3 h-3 text-primary-foreground" />}
              </div>
            </button>
            {wantHomeCollection && homeCollectionFee > 0 && (
              <p className="text-xs text-muted-foreground px-1">
                Extra charge: <span className="font-semibold text-primary">+₹{homeCollectionFee}</span> for home collection
              </p>
            )}
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
