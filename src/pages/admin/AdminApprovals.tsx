import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, XCircle, Clock, Stethoscope, Building2, FlaskConical, Store, FileText, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type ProviderType = "doctors" | "hospitals" | "labs" | "pharmacies";

interface Provider {
  id: string;
  name: string;
  approval_status: string;
  created_at: string;
  [key: string]: any;
}

const providerConfig: { type: ProviderType; label: string; icon: React.ElementType; subtitleKey: string }[] = [
  { type: "doctors", label: "Doctors", icon: Stethoscope, subtitleKey: "specialization" },
  { type: "hospitals", label: "Hospitals", icon: Building2, subtitleKey: "location" },
  { type: "labs", label: "Labs", icon: FlaskConical, subtitleKey: "location" },
  { type: "pharmacies", label: "Pharmacies", icon: Store, subtitleKey: "location" },
];

export default function AdminApprovals() {
  const [providers, setProviders] = useState<Record<ProviderType, Provider[]>>({
    doctors: [], hospitals: [], labs: [], pharmacies: [],
  });
  const [loading, setLoading] = useState(true);

  const fetchAll = async () => {
    setLoading(true);
    const results = await Promise.all(
      providerConfig.map(({ type }) =>
        supabase.from(type).select("*").order("created_at", { ascending: false })
      )
    );
    const newProviders: Record<ProviderType, Provider[]> = { doctors: [], hospitals: [], labs: [], pharmacies: [] };
    providerConfig.forEach(({ type }, i) => {
      newProviders[type] = (results[i].data || []) as Provider[];
    });
    setProviders(newProviders);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  const updateApproval = async (type: ProviderType, id: string, status: string) => {
    const { error } = await supabase.from(type).update({ approval_status: status }).eq("id", id);
    if (error) { toast.error("Update failed"); return; }
    toast.success(`Provider ${status}`);
    fetchAll();
  };

  const getCertificateUrl = (provider: Provider) => {
    if (!provider.certificate_url) return null;
    const { data } = supabase.storage.from("certificates").getPublicUrl(provider.certificate_url);
    // Since bucket is private, generate signed URL instead
    return provider.certificate_url;
  };

  const openCertificate = async (path: string) => {
    const { data, error } = await supabase.storage.from("certificates").createSignedUrl(path, 3600);
    if (error || !data?.signedUrl) {
      toast.error("Failed to load document");
      return;
    }
    window.open(data.signedUrl, "_blank");
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case "approved": return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-200">Approved</Badge>;
      case "rejected": return <Badge className="bg-red-500/10 text-red-600 border-red-200">Rejected</Badge>;
      case "pending": return <Badge className="bg-amber-500/10 text-amber-600 border-amber-200">Pending</Badge>;
      default: return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const renderList = (type: ProviderType, subtitleKey: string) => {
    const items = providers[type];
    const pending = items.filter(p => p.approval_status === "pending");
    const others = items.filter(p => p.approval_status !== "pending");

    return (
      <div className="space-y-4">
        {pending.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-500" /> Pending Approval ({pending.length})
            </h3>
            <div className="space-y-2">
              {pending.map((p) => (
                <div key={p.id} className="bg-amber-500/5 border border-amber-200/50 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground">{p.name}</p>
                    <p className="text-sm text-muted-foreground">{p[subtitleKey] || "—"}</p>
                    <p className="text-xs text-muted-foreground">{new Date(p.created_at).toLocaleDateString()}</p>
                    {type === "doctors" && p.certificate_url && (
                      <button
                        onClick={() => openCertificate(p.certificate_url)}
                        className="inline-flex items-center gap-1 mt-1.5 text-xs font-medium text-primary hover:underline"
                      >
                        <FileText className="w-3.5 h-3.5" /> View Documents <ExternalLink className="w-3 h-3" />
                      </button>
                    )}
                    {type === "doctors" && !p.certificate_url && (
                      <p className="text-xs text-muted-foreground/60 mt-1">No documents uploaded</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => updateApproval(type, p.id, "approved")} className="gap-1.5 bg-emerald-600 hover:bg-emerald-700">
                      <CheckCircle2 className="w-4 h-4" /> Approve
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => updateApproval(type, p.id, "rejected")} className="gap-1.5">
                      <XCircle className="w-4 h-4" /> Reject
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {others.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground mb-2">All Providers ({others.length})</h3>
            <div className="bg-card rounded-xl border border-border divide-y divide-border">
              {others.map((p) => (
                <div key={p.id} className="p-3 flex flex-col sm:flex-row sm:items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{p[subtitleKey] || "—"}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {statusBadge(p.approval_status)}
                    {p.approval_status === "rejected" && (
                      <Button size="sm" variant="outline" onClick={() => updateApproval(type, p.id, "approved")} className="text-xs gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                      </Button>
                    )}
                    {p.approval_status === "approved" && (
                      <Button size="sm" variant="outline" onClick={() => updateApproval(type, p.id, "rejected")} className="text-xs gap-1 text-destructive">
                        <XCircle className="w-3.5 h-3.5" /> Reject
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {items.length === 0 && !loading && (
          <p className="text-center text-muted-foreground py-8">No providers found</p>
        )}
      </div>
    );
  };

  return (
    <div>
      <h1 className="text-xl md:text-2xl font-bold text-foreground mb-5">Provider Approvals</h1>

      {loading ? (
        <div className="p-8 text-center text-muted-foreground">Loading...</div>
      ) : (
        <Tabs defaultValue="doctors" className="space-y-4">
          <TabsList className="grid grid-cols-4 w-full max-w-lg">
            {providerConfig.map(({ type, label, icon: Icon }) => {
              const pending = providers[type].filter(p => p.approval_status === "pending").length;
              return (
                <TabsTrigger key={type} value={type} className="gap-1.5 text-xs sm:text-sm relative">
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{label}</span>
                  {pending > 0 && (
                    <span className="absolute -top-1 -right-1 bg-amber-500 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center">
                      {pending}
                    </span>
                  )}
                </TabsTrigger>
              );
            })}
          </TabsList>

          {providerConfig.map(({ type, subtitleKey }) => (
            <TabsContent key={type} value={type}>
              {renderList(type, subtitleKey)}
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  );
}
