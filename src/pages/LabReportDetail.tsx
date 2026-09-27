import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, FlaskConical, Download, Clock, MapPin, User, FileText, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import BottomNav from "@/components/BottomNav";
import { toast } from "sonner";

export default function LabReportDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [sample, setSample] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/login", { replace: true }); return; }

      const { data } = await supabase
        .from("lab_sample_collections")
        .select("*, labs(name, location, phone)")
        .eq("id", id!)
        .eq("patient_id", session.user.id)
        .single();

      if (!data) { toast.error("Report not found"); navigate(-1); return; }
      setSample(data);
      setLoading(false);
    };
    load();
  }, [id, navigate]);

  const handleDownload = async () => {
    if (!sample?.report_url) return;
    const { data } = await supabase.storage.from("lab-reports").createSignedUrl(sample.report_url, 300);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
    else toast.error("Could not generate download link");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!sample) return null;

  const statusVariant = (s: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (s) {
      case "completed": return "default";
      case "cancelled": return "destructive";
      case "processing": case "collected": return "secondary";
      default: return "outline";
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="gradient-primary page-header px-5 pb-6 rounded-b-[1.5rem]">
        <div className="flex items-center gap-3">
          <button aria-label="Go back" onClick={() => navigate(-1)} className="text-primary-foreground">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-primary-foreground">Lab Report Details</h1>
            <p className="text-primary-foreground/70 text-xs">#{sample.id.slice(0, 8).toUpperCase()}</p>
          </div>
        </div>
      </div>

      <div className="px-5 mt-4 space-y-4">
        {/* Test Info */}
        <div className="bg-card rounded-2xl border border-border p-4">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <FlaskConical className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="font-bold text-foreground">{sample.test_name}</h2>
                  <p className="text-xs text-muted-foreground">{sample.sample_type}</p>
                </div>
                <Badge variant={statusVariant(sample.status)}>{sample.status}</Badge>
              </div>
            </div>
          </div>
        </div>

        {/* Lab Info */}
        <div className="bg-card rounded-2xl border border-border p-4">
          <h3 className="font-semibold text-foreground text-sm mb-3">Laboratory</h3>
          <p className="text-sm font-medium text-foreground">{sample.labs?.name || "Unknown Lab"}</p>
          {sample.labs?.location && (
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
              <MapPin className="w-3 h-3" /> {sample.labs.location}
            </p>
          )}
          {sample.labs?.phone && (
            <p className="text-xs text-muted-foreground mt-0.5">📞 {sample.labs.phone}</p>
          )}
        </div>

        {/* Schedule */}
        <div className="bg-card rounded-2xl border border-border p-4">
          <h3 className="font-semibold text-foreground text-sm mb-3">Schedule</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">Date</p>
                <p className="text-sm font-medium text-foreground">{format(new Date(sample.scheduled_date), "MMM d, yyyy")}</p>
              </div>
            </div>
            {sample.scheduled_time && (
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                <div>
                  <p className="text-xs text-muted-foreground">Time</p>
                  <p className="text-sm font-medium text-foreground">{sample.scheduled_time.slice(0, 5)}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Collection Details */}
        <div className="bg-card rounded-2xl border border-border p-4 space-y-2">
          <h3 className="font-semibold text-foreground text-sm">Collection Details</h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Type</p>
              <p className="font-medium text-foreground capitalize">{sample.collection_type.replace("_", " ")}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Version</p>
              <p className="font-medium text-foreground">v{sample.report_version}</p>
            </div>
          </div>
          {sample.collection_address && (
            <div>
              <p className="text-xs text-muted-foreground">Collection Address</p>
              <p className="text-sm text-foreground flex items-center gap-1">
                <MapPin className="w-3 h-3" /> {sample.collection_address}
              </p>
            </div>
          )}
          {sample.collector_name && (
            <div>
              <p className="text-xs text-muted-foreground">Collector</p>
              <p className="text-sm text-foreground flex items-center gap-1">
                <User className="w-3 h-3" /> {sample.collector_name}
                {sample.collector_phone && ` · ${sample.collector_phone}`}
              </p>
            </div>
          )}
          {sample.collected_at && (
            <div>
              <p className="text-xs text-muted-foreground">Collected At</p>
              <p className="text-sm text-foreground">{format(new Date(sample.collected_at), "MMM d, yyyy h:mm a")}</p>
            </div>
          )}
        </div>

        {/* Notes */}
        {sample.notes && (
          <div className="bg-card rounded-2xl border border-border p-4">
            <p className="text-xs font-medium text-foreground">Notes</p>
            <p className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-2 mt-1">{sample.notes}</p>
          </div>
        )}

        {/* Report Download */}
        {sample.report_url ? (
          <div className="bg-card rounded-2xl border border-border p-4">
            <h3 className="font-semibold text-foreground text-sm mb-2 flex items-center gap-2">
              <FileText className="w-4 h-4 text-success" /> Report Available
            </h3>
            <Button className="w-full gap-2" onClick={handleDownload}>
              <Download className="w-4 h-4" /> Download Report (v{sample.report_version})
            </Button>
          </div>
        ) : sample.status === "completed" ? (
          <div className="bg-warning/5 rounded-2xl border border-warning/20 p-4 text-center">
            <FileText className="w-8 h-8 text-warning mx-auto mb-2" />
            <p className="text-sm text-foreground font-medium">Report Pending Upload</p>
            <p className="text-xs text-muted-foreground">The lab hasn't uploaded your report yet.</p>
          </div>
        ) : null}
      </div>
      <BottomNav />
    </div>
  );
}
