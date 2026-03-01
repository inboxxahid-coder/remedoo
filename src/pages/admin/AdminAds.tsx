import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Check, X, Eye, EyeOff, Image, ExternalLink, LayoutDashboard, Globe } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";

interface Ad {
  id: string;
  title: string | null;
  type: string;
  content_url: string;
  target_link: string | null;
  placement: string | null;
  active: boolean | null;
  created_at: string;
}

const PLACEMENT_OPTIONS = [
  { value: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { value: "general", label: "General", icon: Globe },
];

export default function AdminAds() {
  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "",
    type: "banner",
    content_url: "",
    target_link: "",
    placement: "dashboard",
    active: true,
  });

  const fetchAds = async () => {
    setLoading(true);
    const { data } = await supabase.from("ads").select("*").order("created_at", { ascending: false });
    setAds((data as Ad[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchAds(); }, []);

  const openAdd = () => {
    setEditId(null);
    setForm({ title: "", type: "banner", content_url: "", target_link: "", placement: "dashboard", active: true });
    setShowForm(true);
  };

  const openEdit = (ad: Ad) => {
    setEditId(ad.id);
    setForm({
      title: ad.title || "",
      type: ad.type || "banner",
      content_url: ad.content_url,
      target_link: ad.target_link || "",
      placement: ad.placement || "dashboard",
      active: ad.active ?? true,
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.content_url.trim()) { toast.error("Content URL is required"); return; }
    try {
      const payload = {
        title: form.title || null,
        type: form.type,
        content_url: form.content_url,
        target_link: form.target_link || null,
        placement: form.placement,
        active: form.active,
      };
      if (editId) {
        const { error } = await supabase.from("ads").update(payload).eq("id", editId);
        if (error) throw error;
        toast.success("Ad updated");
      } else {
        const { error } = await supabase.from("ads").insert([payload]);
        if (error) throw error;
        toast.success("Ad created");
      }
      setShowForm(false);
      fetchAds();
    } catch (err: any) {
      toast.error(err.message || "Failed to save");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this ad?")) return;
    const { error } = await supabase.from("ads").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Ad deleted");
    fetchAds();
  };

  const toggleActive = async (ad: Ad) => {
    const { error } = await supabase.from("ads").update({ active: !ad.active }).eq("id", ad.id);
    if (error) { toast.error(error.message); return; }
    toast.success(ad.active ? "Ad deactivated" : "Ad activated");
    fetchAds();
  };

  const dashboardAds = ads.filter(a => a.placement === "dashboard");
  const generalAds = ads.filter(a => a.placement !== "dashboard");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard Ads</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage promotional banners shown on the patient dashboard and across the app</p>
        </div>
        <Button onClick={openAdd} className="gap-2">
          <Plus className="w-4 h-4" /> Add Ad
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-foreground">{ads.length}</p>
          <p className="text-xs text-muted-foreground">Total Ads</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-success">{ads.filter(a => a.active).length}</p>
          <p className="text-xs text-muted-foreground">Active</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-primary">{dashboardAds.length}</p>
          <p className="text-xs text-muted-foreground">Dashboard</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-muted-foreground">{ads.filter(a => !a.active).length}</p>
          <p className="text-xs text-muted-foreground">Inactive</p>
        </Card>
      </div>

      {loading ? (
        <div className="p-12 text-center text-muted-foreground">Loading ads...</div>
      ) : ads.length === 0 ? (
        <Card className="p-12 text-center">
          <Image className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No ads yet. Create your first ad to promote on the dashboard.</p>
          <Button onClick={openAdd} variant="outline" className="mt-4 gap-2"><Plus className="w-4 h-4" /> Create Ad</Button>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Dashboard Ads Section */}
          {dashboardAds.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                <LayoutDashboard className="w-4 h-4" /> Dashboard Ads ({dashboardAds.length})
              </h2>
              <div className="grid gap-3">
                {dashboardAds.map(ad => <AdCard key={ad.id} ad={ad} onEdit={openEdit} onDelete={handleDelete} onToggle={toggleActive} />)}
              </div>
            </div>
          )}

          {/* General Ads Section */}
          {generalAds.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                <Globe className="w-4 h-4" /> General Ads ({generalAds.length})
              </h2>
              <div className="grid gap-3">
                {generalAds.map(ad => <AdCard key={ad.id} ad={ad} onEdit={openEdit} onDelete={handleDelete} onToggle={toggleActive} />)}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto mx-4">
          <DialogHeader>
            <DialogTitle>{editId ? "Edit Ad" : "Create New Ad"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label>Title</Label>
              <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. 20% Off Lab Tests" />
            </div>
            <div>
              <Label>Image / Content URL *</Label>
              <Input value={form.content_url} onChange={e => setForm({ ...form, content_url: e.target.value })} placeholder="https://example.com/banner.jpg" />
              {form.content_url && (
                <div className="mt-2 rounded-xl overflow-hidden border border-border">
                  <img src={form.content_url} alt="Preview" className="w-full h-32 object-cover" onError={e => (e.currentTarget.style.display = "none")} />
                </div>
              )}
            </div>
            <div>
              <Label>Target Link (where ad points to)</Label>
              <Input value={form.target_link} onChange={e => setForm({ ...form, target_link: e.target.value })} placeholder="/pharmacies or https://..." />
            </div>
            <div>
              <Label>Type</Label>
              <select
                value={form.type}
                onChange={e => setForm({ ...form, type: e.target.value })}
                className="w-full h-10 rounded-md border border-input px-3 text-sm bg-background"
              >
                <option value="banner">Banner</option>
                <option value="popup">Popup</option>
                <option value="interstitial">Interstitial</option>
              </select>
            </div>
            <div>
              <Label>Placement</Label>
              <select
                value={form.placement}
                onChange={e => setForm({ ...form, placement: e.target.value })}
                className="w-full h-10 rounded-md border border-input px-3 text-sm bg-background"
              >
                {PLACEMENT_OPTIONS.map(p => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center justify-between">
              <Label>Active</Label>
              <Switch checked={form.active} onCheckedChange={v => setForm({ ...form, active: v })} />
            </div>
            <Button onClick={handleSave} className="w-full">{editId ? "Update Ad" : "Create Ad"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AdCard({ ad, onEdit, onDelete, onToggle }: { ad: Ad; onEdit: (ad: Ad) => void; onDelete: (id: string) => void; onToggle: (ad: Ad) => void }) {
  return (
    <Card className={`overflow-hidden transition-all ${!ad.active ? "opacity-60" : ""}`}>
      <div className="flex flex-col sm:flex-row">
        {/* Image preview */}
        <div className="sm:w-48 h-28 sm:h-auto bg-muted flex-shrink-0 relative">
          <img
            src={ad.content_url}
            alt={ad.title || "Ad"}
            className="w-full h-full object-cover"
            onError={e => { e.currentTarget.style.display = "none"; }}
          />
          {!ad.active && (
            <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
              <EyeOff className="w-5 h-5 text-muted-foreground" />
            </div>
          )}
        </div>

        {/* Details */}
        <div className="flex-1 p-4 flex flex-col justify-between gap-2">
          <div>
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-semibold text-foreground">{ad.title || "Untitled Ad"}</h3>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  <Badge variant={ad.active ? "default" : "secondary"} className="text-[10px]">
                    {ad.active ? "Active" : "Inactive"}
                  </Badge>
                  <Badge variant="outline" className="text-[10px] capitalize">{ad.placement || "general"}</Badge>
                  <Badge variant="outline" className="text-[10px] capitalize">{ad.type}</Badge>
                </div>
              </div>
            </div>
            {ad.target_link && (
              <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1 truncate">
                <ExternalLink className="w-3 h-3 flex-shrink-0" /> {ad.target_link}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 mt-2">
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => onToggle(ad)}>
              {ad.active ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              {ad.active ? "Deactivate" : "Activate"}
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => onEdit(ad)}>
              <Pencil className="w-3.5 h-3.5" /> Edit
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5 text-destructive border-destructive/30" onClick={() => onDelete(ad.id)}>
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
