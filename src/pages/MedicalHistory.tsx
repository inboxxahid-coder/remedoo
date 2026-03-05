import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Calendar, Pill, FlaskConical, FileText, Download, Clock, ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import BottomNav from "@/components/BottomNav";

type TimelineItem = {
  id: string;
  type: "appointment" | "prescription" | "lab_report";
  date: string;
  title: string;
  subtitle: string;
  status: string;
  details?: any;
};

const typeConfig = {
  appointment: { icon: Calendar, color: "text-primary", bg: "bg-primary/10", label: "Appointment" },
  prescription: { icon: Pill, color: "text-success", bg: "bg-success/10", label: "Prescription" },
  lab_report: { icon: FlaskConical, color: "text-warning", bg: "bg-warning/10", label: "Lab Report" },
};

const MedicalHistory = () => {
  const navigate = useNavigate();
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "appointment" | "prescription" | "lab_report">("all");

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/login", { replace: true }); return; }
      const userId = session.user.id;

      const [aptsRes, rxRes, labRes] = await Promise.all([
        supabase
          .from("appointments")
          .select("*, doctors(name), hospitals(name), labs(name), pharmacies(name)")
          .eq("patient_id", userId)
          .order("appointment_date", { ascending: false }),
        supabase
          .from("prescriptions")
          .select("*, prescription_items(*), doctors(name)")
          .eq("patient_id", userId)
          .order("created_at", { ascending: false }),
        supabase
          .from("lab_sample_collections")
          .select("*, labs(name)")
          .eq("patient_id", userId)
          .order("scheduled_date", { ascending: false }),
      ]);

      const items: TimelineItem[] = [];

      // Appointments
      (aptsRes.data || []).forEach((a: any) => {
        const providerName = a.doctors?.name || a.hospitals?.name || a.labs?.name || a.pharmacies?.name || "Unknown";
        items.push({
          id: `apt-${a.id}`,
          type: a.service_type === "lab" ? "lab_report" : "appointment",
          date: a.appointment_date,
          title: providerName,
          subtitle: `${a.service_type} · ${a.appointment_time?.slice(0, 5)}`,
          status: a.status,
          details: {
            notes: a.consultation_notes || a.notes,
            followUp: a.follow_up_date,
            tokenNumber: a.token_number,
          },
        });
      });

      // Prescriptions
      (rxRes.data || []).forEach((rx: any) => {
        items.push({
          id: `rx-${rx.id}`,
          type: "prescription",
          date: rx.created_at.split("T")[0],
          title: `Dr. ${rx.doctors?.name || "Unknown"}`,
          subtitle: `${(rx.prescription_items || []).length} medicines · ${rx.diagnosis || "Consultation"}`,
          status: "completed",
          details: {
            diagnosis: rx.diagnosis,
            notes: rx.notes,
            items: rx.prescription_items || [],
          },
        });
      });

      // Lab Sample Collections (actual reports)
      (labRes.data || []).forEach((s: any) => {
        items.push({
          id: `lab-${s.id}`,
          type: "lab_report",
          date: s.scheduled_date,
          title: s.test_name,
          subtitle: `${s.labs?.name || "Lab"} · ${s.sample_type}`,
          status: s.status,
          details: {
            notes: s.notes,
            reportUrl: s.report_url,
            reportVersion: s.report_version,
            collectionType: s.collection_type,
          },
        });
      });

      // Sort by date descending
      items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setTimeline(items);
      setLoading(false);
    };
    load();
  }, [navigate]);

  const filtered = filter === "all" ? timeline : timeline.filter((t) => t.type === filter);

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      completed: "bg-success/10 text-success",
      confirmed: "bg-primary/10 text-primary",
      pending: "bg-warning/10 text-warning",
      cancelled: "bg-destructive/10 text-destructive",
    };
    return colors[status] || "bg-muted text-muted-foreground";
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="gradient-primary page-header px-5 pb-6 rounded-b-[1.5rem]">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => navigate(-1)} className="text-primary-foreground"><ArrowLeft className="w-6 h-6" /></button>
          <h1 className="text-xl font-bold text-primary-foreground">Medical History</h1>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {([["all", "All"], ["appointment", "Appointments"], ["prescription", "Prescriptions"], ["lab_report", "Lab Reports"]] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                filter === key ? "bg-primary-foreground text-primary" : "bg-primary-foreground/20 text-primary-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-5 mt-4 space-y-3">
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Loading history...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No medical records found</p>
          </div>
        ) : (
          filtered.map((item) => {
            const cfg = typeConfig[item.type];
            const Icon = cfg.icon;
            const isExpanded = expandedId === item.id;
            return (
              <div key={item.id} className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
                <button
                  onClick={() => setExpandedId(isExpanded ? null : item.id)}
                  className="w-full p-4 text-left"
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-xl ${cfg.bg} flex items-center justify-center shrink-0`}>
                      <Icon className={`w-5 h-5 ${cfg.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-semibold text-foreground text-sm">{item.title}</h3>
                          <p className="text-xs text-muted-foreground mt-0.5">{item.subtitle}</p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${statusBadge(item.status)}`}>
                            {item.status}
                          </span>
                          {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 mt-1.5 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        {format(new Date(item.date), "MMM d, yyyy")}
                        <span className={`ml-2 text-[10px] px-1.5 py-0.5 rounded ${cfg.bg} ${cfg.color} font-medium`}>{cfg.label}</span>
                      </div>
                    </div>
                  </div>
                </button>

                {isExpanded && item.details && (
                  <div className="px-4 pb-4 border-t border-border pt-3 space-y-2">
                    {item.details.diagnosis && (
                      <div>
                        <p className="text-xs font-medium text-foreground">Diagnosis</p>
                        <p className="text-xs text-muted-foreground">{item.details.diagnosis}</p>
                      </div>
                    )}
                    {item.details.notes && (
                      <div>
                        <p className="text-xs font-medium text-foreground">Notes</p>
                        <p className="text-xs text-muted-foreground">{item.details.notes}</p>
                      </div>
                    )}
                    {item.details.followUp && (
                      <div>
                        <p className="text-xs font-medium text-foreground">Follow-up</p>
                        <p className="text-xs text-muted-foreground">{format(new Date(item.details.followUp), "MMM d, yyyy")}</p>
                      </div>
                    )}
                    {item.details.items && item.details.items.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-foreground mb-1">Medicines</p>
                        {item.details.items.map((med: any, i: number) => (
                          <div key={i} className="text-xs text-muted-foreground flex items-center gap-1">
                            <Pill className="w-3 h-3 text-success" />
                            {med.medicine_name} — {med.dosage}, {med.frequency}, {med.duration}
                          </div>
                        ))}
                      </div>
                    )}
                    {item.details.reportUrl && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5 h-8 text-xs mt-1"
                        onClick={(e) => { e.stopPropagation(); window.open(item.details.reportUrl, "_blank"); }}
                      >
                        <Download className="w-3.5 h-3.5" />
                        Download Report (v{item.details.reportVersion || 1})
                      </Button>
                    )}
                    {item.type === "lab_report" && !item.details.reportUrl && item.status === "completed" && (
                      <p className="text-xs text-warning flex items-center gap-1">
                        <FileText className="w-3 h-3" /> Report pending upload
                      </p>
                    )}
                    {/* View Details link */}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-xs text-primary mt-1 h-7 px-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (item.type === "lab_report" && item.id.startsWith("lab-")) {
                          navigate(`/lab-report/${item.id.replace("lab-", "")}`);
                        } else if (item.id.startsWith("apt-")) {
                          navigate(`/appointment/${item.id.replace("apt-", "")}`);
                        }
                      }}
                    >
                      View Full Details →
                    </Button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
      <BottomNav />
    </div>
  );
};

export default MedicalHistory;
