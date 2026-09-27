import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, FlaskConical, Download, Clock, CheckCircle, AlertCircle, FileText, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import BottomNav from "@/components/BottomNav";
import { readPageCache, writePageCache } from "@/lib/pageCache";

type LabReport = {
  id: string;
  test_name: string;
  sample_type: string;
  status: string;
  scheduled_date: string;
  scheduled_time: string | null;
  collection_type: string;
  collector_name: string | null;
  collected_at: string | null;
  report_url: string | null;
  report_version: number;
  notes: string | null;
  created_at: string;
  lab_name: string;
};

const statusConfig: Record<string, { icon: typeof CheckCircle; color: string; bg: string }> = {
  scheduled: { icon: Clock, color: "text-warning", bg: "bg-warning/10" },
  collected: { icon: FlaskConical, color: "text-primary", bg: "bg-primary/10" },
  processing: { icon: FlaskConical, color: "text-primary", bg: "bg-primary/10" },
  completed: { icon: CheckCircle, color: "text-success", bg: "bg-success/10" },
  cancelled: { icon: AlertCircle, color: "text-destructive", bg: "bg-destructive/10" },
};

export default function LabReports() {
  const navigate = useNavigate();
  const cached = readPageCache<LabReport[]>("lab_reports");
  const [reports, setReports] = useState<LabReport[]>(cached || []);
  const [loading, setLoading] = useState(!cached);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "pending" | "completed">("all");

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/login", { replace: true }); return; }

      const { data } = await supabase
        .from("lab_sample_collections")
        .select("*, labs(name)")
        .eq("patient_id", session.user.id)
        .order("scheduled_date", { ascending: false });

      const mapped: LabReport[] = (data || []).map((r: any) => ({
        id: r.id,
        test_name: r.test_name,
        sample_type: r.sample_type,
        status: r.status,
        scheduled_date: r.scheduled_date,
        scheduled_time: r.scheduled_time,
        collection_type: r.collection_type,
        collector_name: r.collector_name,
        collected_at: r.collected_at,
        report_url: r.report_url,
        report_version: r.report_version,
        notes: r.notes,
        created_at: r.created_at,
        lab_name: r.labs?.name || "Unknown Lab",
      }));
      setReports(mapped);
      writePageCache("lab_reports", mapped);
      setLoading(false);
    };
    load();
  }, [navigate]);

  const filtered = reports.filter((r) => {
    if (filter === "pending" && r.status === "completed") return false;
    if (filter === "completed" && r.status !== "completed") return false;
    if (search) {
      const q = search.toLowerCase();
      return r.test_name.toLowerCase().includes(q) || r.lab_name.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-background pb-24 max-w-4xl mx-auto">
      {/* Header */}
      <div className="gradient-primary page-header px-5 pb-6 rounded-b-[1.5rem]">
        <div className="flex items-center gap-3 mb-4">
          <button aria-label="Go back" onClick={() => navigate(-1)} className="text-primary-foreground">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-xl font-bold text-primary-foreground">My Lab Reports</h1>
        </div>
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-foreground/60" />
          <Input
            placeholder="Search tests or labs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-primary-foreground/20 border-0 text-primary-foreground placeholder:text-primary-foreground/60 h-10"
          />
        </div>
        <div className="flex gap-2">
          {([["all", "All"], ["pending", "In Progress"], ["completed", "Completed"]] as const).map(([key, label]) => (
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

      {/* Reports List */}
      <div className="px-5 mt-4 space-y-3">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <FlaskConical className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No lab reports found</p>
          </div>
        ) : (
          filtered.map((report) => {
            const cfg = statusConfig[report.status] || statusConfig.scheduled;
            const StatusIcon = cfg.icon;
            return (
              <div key={report.id} onClick={() => navigate(`/lab-report/${report.id}`)} className="bg-card rounded-2xl border border-border shadow-sm p-4 cursor-pointer hover:shadow-md transition-shadow">
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-xl ${cfg.bg} flex items-center justify-center shrink-0`}>
                    <StatusIcon className={`w-5 h-5 ${cfg.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-semibold text-foreground text-sm">{report.test_name}</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">{report.lab_name}</p>
                      </div>
                      <Badge
                        variant={report.status === "completed" ? "default" : report.status === "cancelled" ? "destructive" : "secondary"}
                        className="text-[10px] shrink-0"
                      >
                        {report.status}
                      </Badge>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {format(new Date(report.scheduled_date), "MMM d, yyyy")}
                        {report.scheduled_time && ` · ${report.scheduled_time.slice(0, 5)}`}
                      </span>
                      <span className="capitalize">{report.collection_type.replace("_", " ")}</span>
                      <span>{report.sample_type}</span>
                    </div>

                    {report.notes && (
                      <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">{report.notes}</p>
                    )}

                    {/* Report download */}
                    {report.status === "completed" && report.report_url ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-3 gap-1.5 h-8 text-xs"
                        onClick={async (e) => {
                          e.stopPropagation();
                          const { data } = await supabase.storage.from("lab-reports").createSignedUrl(report.report_url!, 300);
                          if (data?.signedUrl) window.open(data.signedUrl, "_blank");
                        }}
                      >
                        <Download className="w-3.5 h-3.5" />
                        Download Report (v{report.report_version})
                      </Button>
                    ) : report.status === "completed" && !report.report_url ? (
                      <p className="text-xs text-warning mt-2 flex items-center gap-1">
                        <FileText className="w-3 h-3" />
                        Report pending upload
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
      <BottomNav />
    </div>
  );
}
