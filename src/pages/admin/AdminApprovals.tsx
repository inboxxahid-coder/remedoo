import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  CheckCircle2, XCircle, Clock, Stethoscope, Building2, FlaskConical, Store,
  FileText, ExternalLink, ArrowLeft, Phone, MapPin, Mail, Calendar, Star,
  Briefcase, IndianRupee, User, ClipboardList, RotateCcw, Ban
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
  const [docUrls, setDocUrls] = useState<Record<string, string>>({});
  const [docsLoading, setDocsLoading] = useState(false);

  // Reject dialog state
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectNote, setRejectNote] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  // Send-back dialog state
  const [sendBackDialogOpen, setSendBackDialogOpen] = useState(false);
  const [sendBackNote, setSendBackNote] = useState("");

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
    setDocUrls({});
    setDocsLoading(true);

    // Collect all storage paths to sign
    const pathsToSign: { key: string; path: string }[] = [];

    if (provider.license_url) pathsToSign.push({ key: "license", path: provider.license_url });
    if (provider.gst_url) pathsToSign.push({ key: "gst", path: provider.gst_url });
    if (provider.certificate_url) pathsToSign.push({ key: "certificate", path: provider.certificate_url });
    if (provider.image_url) pathsToSign.push({ key: "photo", path: provider.image_url });
    if (provider.additional_docs_urls && Array.isArray(provider.additional_docs_urls)) {
      provider.additional_docs_urls.forEach((url: string, i: number) => {
        if (url) pathsToSign.push({ key: `additional_${i}`, path: url });
      });
    }

    // Sign all URLs in parallel
    const signedResults = await Promise.all(
      pathsToSign.map(async ({ key, path }) => {
        // If it's already a full URL (public bucket like avatars), use directly
        if (path.startsWith("http")) return { key, url: path };
        const { data } = await supabase.storage.from("certificates").createSignedUrl(path, 3600);
        return { key, url: data?.signedUrl || null };
      })
    );

    const urls: Record<string, string> = {};
    signedResults.forEach(({ key, url }) => {
      if (url) urls[key] = url;
    });
    setDocUrls(urls);
    setDocsLoading(false);
  };

  const closeDetail = () => {
    setSelectedProvider(null);
    setSelectedType(null);
    setDocUrls({});
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
    if (!selectedProvider || !selectedType || !rejectNote.trim()) return;
    setActionLoading(true);
    const { error } = await supabase.from(selectedType).update({
      approval_status: "rejected",
      admin_note: rejectNote.trim(),
    } as any).eq("id", selectedProvider.id);
    setActionLoading(false);
    if (error) { toast.error("Failed to reject"); return; }
    toast.success(`${selectedProvider.name} has been rejected`);
    setRejectDialogOpen(false);
    setRejectNote("");
    closeDetail();
    fetchAll();
  };

  const handleSendBack = async () => {
    if (!selectedProvider || !selectedType || !sendBackNote.trim()) return;
    setActionLoading(true);
    const { error } = await supabase.from(selectedType).update({
      approval_status: "returned",
      admin_note: sendBackNote.trim(),
    } as any).eq("id", selectedProvider.id);
    setActionLoading(false);
    if (error) { toast.error("Failed to send back"); return; }
    toast.success(`${selectedProvider.name} sent back for revision`);
    setSendBackDialogOpen(false);
    setSendBackNote("");
    closeDetail();
    fetchAll();
  };

  const handleSuspend = async () => {
    if (!selectedProvider || !selectedType) return;
    setActionLoading(true);
    const updatePayload: any = { account_status: "suspended" };
    const { error } = await supabase.from(selectedType).update(updatePayload).eq("id", selectedProvider.id);
    setActionLoading(false);
    if (error) { toast.error("Failed to suspend"); return; }
    toast.success(`${selectedProvider.name} has been suspended`);
    closeDetail();
    fetchAll();
  };

  const updateApproval = async (type: ProviderType, id: string, status: string) => {
    const { error } = await supabase.from(type).update({ approval_status: status }).eq("id", id);
    if (error) { toast.error("Update failed"); return; }
    toast.success(`Provider ${status}`);
    fetchAll();
  };

  const updateAccountStatus = async (type: ProviderType, id: string, status: string) => {
    const { error } = await supabase.from(type).update({ account_status: status } as any).eq("id", id);
    if (error) { toast.error("Update failed"); return; }
    toast.success(`Account ${status}`);
    fetchAll();
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case "approved": return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-200">Approved</Badge>;
      case "rejected": return <Badge className="bg-red-500/10 text-red-600 border-red-200">Rejected</Badge>;
      case "pending": return <Badge className="bg-amber-500/10 text-amber-600 border-amber-200">Pending</Badge>;
      case "returned": return <Badge className="bg-blue-500/10 text-blue-600 border-blue-200">Returned</Badge>;
      case "suspended": return <Badge className="bg-orange-500/10 text-orange-600 border-orange-200">Suspended</Badge>;
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
  // Document preview helper
  const DocumentPreview = ({ label, url }: { label: string; url: string }) => {
    const isImage = url.match(/\.(jpg|jpeg|png|webp)/i) || url.includes("image");
    return (
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        {isImage && (
          <div className="rounded-xl border border-border overflow-hidden bg-muted/30">
            <img src={url} alt={label} className="w-full max-h-60 object-contain" />
          </div>
        )}
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
        >
          <ExternalLink className="w-4 h-4" /> Open {label}
        </a>
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

        {/* Documents card (all providers) */}
        <div className="bg-card rounded-2xl border border-border p-5">
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" /> Uploaded Documents
          </h3>

          {docsLoading && <p className="text-sm text-muted-foreground">Loading documents...</p>}

          {!docsLoading && Object.keys(docUrls).length === 0 && (
            <p className="text-sm text-muted-foreground">No documents were uploaded during registration.</p>
          )}

          {!docsLoading && Object.keys(docUrls).length > 0 && (
            <div className="space-y-4">
              {docUrls.photo && (
                <DocumentPreview label="Facility / Profile Photo" url={docUrls.photo} />
              )}
              {docUrls.license && (
                <DocumentPreview label="License / Registration Certificate" url={docUrls.license} />
              )}
              {docUrls.gst && (
                <DocumentPreview label="GST Certificate" url={docUrls.gst} />
              )}
              {docUrls.certificate && (
                <DocumentPreview label="Medical Certificate / Degree" url={docUrls.certificate} />
              )}
              {Object.entries(docUrls)
                .filter(([key]) => key.startsWith("additional_"))
                .map(([key, url]) => (
                  <DocumentPreview
                    key={key}
                    label={`Additional Document ${parseInt(key.split("_")[1]) + 1}`}
                    url={url}
                  />
                ))}
            </div>
          )}
        </div>

        {/* Action buttons */}
        {(p.approval_status === "pending" || p.approval_status === "returned") && (
          <div className="flex flex-col sm:flex-row gap-3">
            <Button onClick={handleApprove} disabled={actionLoading} className="flex-1 gap-1.5 bg-emerald-600 hover:bg-emerald-700 h-11">
              <CheckCircle2 className="w-4 h-4" /> {actionLoading ? "Processing..." : "Approve"}
            </Button>
            <Button variant="outline" onClick={() => { setSendBackNote(""); setSendBackDialogOpen(true); }} disabled={actionLoading} className="flex-1 gap-1.5 h-11 text-blue-600 border-blue-200 hover:bg-blue-50">
              <RotateCcw className="w-4 h-4" /> Send Back
            </Button>
            <Button variant="destructive" onClick={() => { setRejectNote(""); setRejectDialogOpen(true); }} disabled={actionLoading} className="flex-1 gap-1.5 h-11">
              <XCircle className="w-4 h-4" /> Reject
            </Button>
          </div>
        )}

        {/* Suspend button for approved providers */}
        {p.approval_status === "approved" && p.account_status !== "suspended" && (
          <Button variant="outline" onClick={handleSuspend} disabled={actionLoading} className="w-full gap-1.5 h-11 text-orange-600 border-orange-200 hover:bg-orange-50">
            <Ban className="w-4 h-4" /> {actionLoading ? "Suspending..." : "Suspend Provider"}
          </Button>
        )}

        {p.account_status === "suspended" && (
          <div className="space-y-2">
            <Badge className="bg-orange-500/10 text-orange-600 border-orange-200">Account Suspended</Badge>
            <Button variant="outline" onClick={async () => {
              setActionLoading(true);
              await supabase.from(selectedType!).update({ account_status: "active" } as any).eq("id", p.id);
              setActionLoading(false);
              toast.success("Account reactivated");
              closeDetail(); fetchAll();
            }} disabled={actionLoading} className="w-full gap-1.5 h-11 text-emerald-600 border-emerald-200 hover:bg-emerald-50">
              <CheckCircle2 className="w-4 h-4" /> Reactivate Account
            </Button>
          </div>
        )}
      </div>
    );
  };

  const renderList = (type: ProviderType, subtitleKey: string) => {
    const items = providers[type];
    const pending = items.filter(p => p.approval_status === "pending" || p.approval_status === "returned");
    const others = items.filter(p => p.approval_status !== "pending" && p.approval_status !== "returned");

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
                    {(p.license_url || p.certificate_url || p.gst_url || p.additional_docs_urls?.length > 0) && (
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
                  <div className="flex items-center gap-2 flex-wrap">
                    {statusBadge(p.approval_status)}
                    {p.account_status === "suspended" && <Badge className="bg-orange-500/10 text-orange-600 border-orange-200 text-xs">Suspended</Badge>}
                    {p.approval_status === "rejected" && (
                      <Button size="sm" variant="outline" onClick={() => updateApproval(type, p.id, "approved")} className="text-xs gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                      </Button>
                    )}
                    {p.approval_status === "approved" && p.account_status !== "suspended" && (
                      <Button size="sm" variant="outline" onClick={() => updateAccountStatus(type, p.id, "suspended")} className="text-xs gap-1 text-orange-600">
                        <Ban className="w-3.5 h-3.5" /> Suspend
                      </Button>
                    )}
                    {p.account_status === "suspended" && (
                      <Button size="sm" variant="outline" onClick={() => updateAccountStatus(type, p.id, "active")} className="text-xs gap-1 text-emerald-600">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Reactivate
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
              const pending = providers[type].filter(p => p.approval_status === "pending" || p.approval_status === "returned").length;
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

      {/* Send Back Dialog */}
      <Dialog open={sendBackDialogOpen} onOpenChange={setSendBackDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-blue-600">
              <RotateCcw className="w-5 h-5" /> Send Back {selectedProvider?.name}
            </DialogTitle>
            <DialogDescription>
              Describe what documents or information the provider needs to re-upload or correct. They will see this note and can update their submission.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="sendback-note">Revision Note</Label>
            <Textarea
              id="sendback-note"
              placeholder="e.g. Please upload a clearer copy of your medical degree certificate. The current document is blurry and unreadable..."
              value={sendBackNote}
              onChange={(e) => setSendBackNote(e.target.value)}
              rows={4}
              autoFocus
            />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setSendBackDialogOpen(false)}>Cancel</Button>
            <Button
              disabled={actionLoading || !sendBackNote.trim()}
              onClick={handleSendBack}
              className="gap-1.5 bg-blue-600 hover:bg-blue-700"
            >
              <RotateCcw className="w-4 h-4" /> {actionLoading ? "Sending..." : "Send Back for Revision"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
