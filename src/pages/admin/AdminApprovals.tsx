import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  CheckCircle2, XCircle, Clock, Stethoscope, Building2, FlaskConical, Store,
  FileText, ExternalLink, ArrowLeft, Phone, MapPin, Mail, Calendar, Star,
  Briefcase, IndianRupee, User, ClipboardList
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from "@/components/ui/dialog";

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

  // Detail view state
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
  const [selectedType, setSelectedType] = useState<ProviderType | null>(null);
  const [certUrl, setCertUrl] = useState<string | null>(null);
  const [certLoading, setCertLoading] = useState(false);

  // Reject dialog state
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectNote, setRejectNote] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

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

  const openDetail = async (type: ProviderType, provider: Provider) => {
    setSelectedProvider(provider);
    setSelectedType(type);
    setCertUrl(null);

    if (type === "doctors" && provider.certificate_url) {
      setCertLoading(true);
      const { data, error } = await supabase.storage.from("certificates").createSignedUrl(provider.certificate_url, 3600);
      setCertUrl(data?.signedUrl || null);
      setCertLoading(false);
    }
  };

  const closeDetail = () => {
    setSelectedProvider(null);
    setSelectedType(null);
    setCertUrl(null);
  };

  const handleApprove = async () => {
    if (!selectedProvider || !selectedType) return;
    setActionLoading(true);
    const { error } = await supabase.from(selectedType).update({ approval_status: "approved" }).eq("id", selectedProvider.id);
    setActionLoading(false);
    if (error) { toast.error("Failed to approve"); return; }
    toast.success(`${selectedProvider.name} has been approved`);
    closeDetail();
    fetchAll();
  };

  const handleReject = async () => {
    if (!selectedProvider || !selectedType) return;
    setActionLoading(true);
    // Store rejection note in bio/location field as admin note (or just update status)
    const { error } = await supabase.from(selectedType).update({ approval_status: "rejected" }).eq("id", selectedProvider.id);
    setActionLoading(false);
    if (error) { toast.error("Failed to reject"); return; }
    toast.success(`${selectedProvider.name} has been rejected`);
    setRejectDialogOpen(false);
    setRejectNote("");
    closeDetail();
    fetchAll();
  };

  const updateApproval = async (type: ProviderType, id: string, status: string) => {
    const { error } = await supabase.from(type).update({ approval_status: status }).eq("id", id);
    if (error) { toast.error("Update failed"); return; }
    toast.success(`Provider ${status}`);
    fetchAll();
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case "approved": return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-200">Approved</Badge>;
      case "rejected": return <Badge className="bg-red-500/10 text-red-600 border-red-200">Rejected</Badge>;
      case "pending": return <Badge className="bg-amber-500/10 text-amber-600 border-amber-200">Pending</Badge>;
      default: return <Badge variant="secondary">{status}</Badge>;
    }
  };

  // Detail info row helper
  const InfoRow = ({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: any }) => {
    if (!value && value !== 0) return null;
    return (
      <div className="flex items-start gap-3 py-2.5 border-b border-border last:border-0">
        <Icon className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-sm font-medium text-foreground break-words">{String(value)}</p>
        </div>
      </div>
    );
  };

  // Render the detail view for a selected provider
  const renderDetailView = () => {
    if (!selectedProvider || !selectedType) return null;
    const p = selectedProvider;
    const isDoctors = selectedType === "doctors";

    return (
      <div className="space-y-5">
        {/* Back button */}
        <button onClick={closeDetail} className="inline-flex items-center gap-1.5 text-sm text-primary font-medium hover:underline">
          <ArrowLeft className="w-4 h-4" /> Back to list
        </button>

        {/* Header card */}
        <div className="bg-card rounded-2xl border border-border p-5">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <h2 className="text-lg font-bold text-foreground">{p.name}</h2>
              <p className="text-sm text-muted-foreground">
                {isDoctors ? p.specialization : p.location || "—"}
              </p>
            </div>
            {statusBadge(p.approval_status)}
          </div>

          <div className="text-xs text-muted-foreground">
            Registered on {new Date(p.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
          </div>
        </div>

        {/* Details card */}
        <div className="bg-card rounded-2xl border border-border p-5">
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-primary" /> Registration Details
          </h3>

          <InfoRow icon={User} label="Name" value={p.name} />
          <InfoRow icon={Phone} label="Phone" value={p.phone} />

          {isDoctors && (
            <>
              <InfoRow icon={Stethoscope} label="Specialization" value={p.specialization} />
              <InfoRow icon={Briefcase} label="Experience" value={p.experience_years ? `${p.experience_years} years` : null} />
              <InfoRow icon={IndianRupee} label="Consultation Fee" value={p.consultation_fee ? `₹${p.consultation_fee}` : null} />
              <InfoRow icon={Star} label="Rating" value={p.rating} />
              <InfoRow icon={FileText} label="Bio" value={p.bio} />
            </>
          )}

          {!isDoctors && (
            <>
              <InfoRow icon={MapPin} label="Location" value={p.location} />
              <InfoRow icon={Star} label="Rating" value={p.rating} />
            </>
          )}

          <InfoRow icon={Calendar} label="Created At" value={new Date(p.created_at).toLocaleString()} />
        </div>

        {/* Documents card (doctors only) */}
        {isDoctors && (
          <div className="bg-card rounded-2xl border border-border p-5">
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" /> Uploaded Documents
            </h3>

            {certLoading && <p className="text-sm text-muted-foreground">Loading document...</p>}

            {!certLoading && certUrl && (
              <div className="space-y-3">
                {/* Preview if image */}
                {p.certificate_url?.match(/\.(jpg|jpeg|png|webp)$/i) && (
                  <div className="rounded-xl border border-border overflow-hidden bg-muted/30">
                    <img src={certUrl} alt="Certificate" className="w-full max-h-96 object-contain" />
                  </div>
                )}
                <a
                  href={certUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                >
                  <ExternalLink className="w-4 h-4" /> Open Document in New Tab
                </a>
              </div>
            )}

            {!certLoading && !p.certificate_url && (
              <p className="text-sm text-muted-foreground">No documents were uploaded during registration.</p>
            )}
          </div>
        )}

        {/* Action buttons */}
        {p.approval_status === "pending" && (
          <div className="flex flex-col sm:flex-row gap-3">
            <Button onClick={handleApprove} disabled={actionLoading} className="flex-1 gap-1.5 bg-emerald-600 hover:bg-emerald-700 h-11">
              <CheckCircle2 className="w-4 h-4" /> {actionLoading ? "Processing..." : "Approve"}
            </Button>
            <Button variant="outline" onClick={closeDetail} className="flex-1 gap-1.5 h-11">
              <ArrowLeft className="w-4 h-4" /> Go Back
            </Button>
            <Button variant="destructive" onClick={() => { setRejectNote(""); setRejectDialogOpen(true); }} disabled={actionLoading} className="flex-1 gap-1.5 h-11">
              <XCircle className="w-4 h-4" /> Reject
            </Button>
          </div>
        )}
      </div>
    );
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
                <button
                  key={p.id}
                  onClick={() => openDetail(type, p)}
                  className="w-full text-left bg-amber-500/5 border border-amber-200/50 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-3 hover:bg-amber-500/10 transition-colors cursor-pointer"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground">{p.name}</p>
                    <p className="text-sm text-muted-foreground">{p[subtitleKey] || "—"}</p>
                    <p className="text-xs text-muted-foreground">{new Date(p.created_at).toLocaleDateString()}</p>
                    {type === "doctors" && p.certificate_url && (
                      <span className="inline-flex items-center gap-1 mt-1.5 text-xs font-medium text-primary">
                        <FileText className="w-3.5 h-3.5" /> Documents attached
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-primary font-medium flex items-center gap-1">
                    Review Details →
                  </div>
                </button>
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
      ) : selectedProvider ? (
        renderDetailView()
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

      {/* Reject with Note Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <XCircle className="w-5 h-5" /> Reject {selectedProvider?.name}
            </DialogTitle>
            <DialogDescription>
              Provide a reason for rejection. This helps the provider understand why their registration was not approved.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="reject-note">Rejection Note</Label>
            <Textarea
              id="reject-note"
              placeholder="e.g. Certificate is unclear, please re-upload a valid medical license..."
              value={rejectNote}
              onChange={(e) => setRejectNote(e.target.value)}
              rows={4}
              autoFocus
            />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={actionLoading || !rejectNote.trim()}
              onClick={handleReject}
              className="gap-1.5"
            >
              <XCircle className="w-4 h-4" /> {actionLoading ? "Rejecting..." : "Confirm Rejection"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
