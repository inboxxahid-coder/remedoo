import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Calendar, Clock } from "lucide-react";
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
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadProvider = async () => {
      if (!type || !id) return;
      const table = type === "doctor" ? "doctors" : type === "hospital" ? "hospitals" : type === "lab" ? "labs" : "pharmacies";
      const { data } = await supabase.from(table).select("name").eq("id", id).single();
      if (data) setProviderName(data.name);
    };
    loadProvider();
  }, [type, id]);

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || !time) { toast.error("Please select date and time"); return; }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { navigate("/login"); return; }

    setLoading(true);
    const record: any = {
      patient_id: session.user.id,
      service_type: type,
      appointment_date: date,
      appointment_time: time,
      notes: notes || null,
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
            <p className="text-xs text-primary capitalize">{type}</p>
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
              {timeSlots.map((slot) => (
                <button
                  key={slot}
                  type="button"
                  onClick={() => setTime(slot)}
                  className={`py-2 rounded-lg text-sm font-medium border transition-colors ${
                    time === slot
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background border-border text-foreground hover:border-primary"
                  }`}
                >
                  {slot}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Notes (optional)</Label>
            <Input placeholder="Any specific concerns..." value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>

          <Button type="submit" disabled={loading} className="w-full h-12 rounded-xl gradient-primary text-primary-foreground font-semibold">
            {loading ? "Booking..." : "Confirm Booking"}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default BookAppointment;
