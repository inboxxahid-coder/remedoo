import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminCrudTable, { ColumnDef } from "@/components/admin/AdminCrudTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Upload, Trash2, Image, GripVertical, ExternalLink, Pencil } from "lucide-react";
import { AspectRatio } from "@/components/ui/aspect-ratio";

const RECOMMENDED_WIDTH = 1280;
const RECOMMENDED_HEIGHT = 480;
const ASPECT_LABEL = "8:3 (1280×480)";

export default function AdminSlider() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<any | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    title: "",
    description: "",
    target_link: "",
    sort_order: 0,
    active: true,
  });

  const fetchData = async () => {
    setLoading(true);
    const { data } = await supabase.from("slider_media").select("*").order("sort_order");
    setData(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const resetForm = () => {
    setForm({ title: "", description: "", target_link: "", sort_order: 0, active: true });
    setPreviewUrl(null);
    setEditItem(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const openAdd = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEdit = (item: any) => {
    setEditItem(item);
    setForm({
      title: item.title || "",
      description: item.description || "",
      target_link: item.target_link || "",
      sort_order: item.sort_order || 0,
      active: item.active ?? true,
    });
    setPreviewUrl(item.url || null);
    setDialogOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    // Preview
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);

    // Check dimensions
    const img = new window.Image();
    img.onload = () => {
      if (img.width < 640 || img.height < 240) {
        toast.warning(`Image is ${img.width}×${img.height}. Recommended: ${RECOMMENDED_WIDTH}×${RECOMMENDED_HEIGHT} for best quality.`);
      }
      URL.revokeObjectURL(url);
    };
    img.src = url;
    // Re-set preview since revokeObjectURL runs async
    setPreviewUrl(URL.createObjectURL(file));
  };

  const uploadImage = async (file: File): Promise<string> => {
    const ext = file.name.split(".").pop();
    const path = `slider-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("slider-images").upload(path, file, {
      cacheControl: "3600",
      upsert: false,
    });
    if (error) throw error;
    const { data: urlData } = supabase.storage.from("slider-images").getPublicUrl(path);
    return urlData.publicUrl;
  };

  const handleSubmit = async () => {
    const file = fileRef.current?.files?.[0];

    if (!editItem && !file) {
      toast.error("Please select an image");
      return;
    }

    setUploading(true);
    try {
      let imageUrl = editItem?.url || "";

      if (file) {
        imageUrl = await uploadImage(file);
      }

      const payload = {
        title: form.title || null,
        description: form.description || null,
        target_link: form.target_link || null,
        sort_order: form.sort_order,
        active: form.active,
        url: imageUrl,
        type: "image",
      };

      if (editItem) {
        const { error } = await supabase.from("slider_media").update(payload).eq("id", editItem.id);
        if (error) throw error;
        toast.success("Slider updated");
      } else {
        const { error } = await supabase.from("slider_media").insert([payload] as any);
        if (error) throw error;
        toast.success("Slider added");
      }

      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Failed to save");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    const item = data.find((d) => d.id === id);
    if (item?.url) {
      // Try to delete from storage
      const urlParts = item.url.split("/slider-images/");
      if (urlParts[1]) {
        await supabase.storage.from("slider-images").remove([urlParts[1]]);
      }
    }
    const { error } = await supabase.from("slider_media").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Deleted");
    fetchData();
  };

  const toggleActive = async (id: string, active: boolean) => {
    const { error } = await supabase.from("slider_media").update({ active }).eq("id", id);
    if (error) toast.error(error.message);
    else fetchData();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Slider Media</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Recommended size: <strong>{RECOMMENDED_WIDTH}×{RECOMMENDED_HEIGHT}px</strong> ({ASPECT_LABEL})
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(v) => { setDialogOpen(v); if (!v) resetForm(); }}>
          <DialogTrigger asChild>
            <Button onClick={openAdd} className="gap-2">
              <Plus className="w-4 h-4" /> Add Slide
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editItem ? "Edit Slide" : "Add New Slide"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              {/* Image Upload */}
              <div className="space-y-2">
                <Label>Slide Image *</Label>
                <div className="border-2 border-dashed border-border rounded-xl p-4 bg-muted/30">
                  {previewUrl ? (
                    <div className="space-y-3">
                      <AspectRatio ratio={RECOMMENDED_WIDTH / RECOMMENDED_HEIGHT} className="rounded-lg overflow-hidden bg-muted">
                        <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                      </AspectRatio>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full gap-2"
                        onClick={() => fileRef.current?.click()}
                      >
                        <Upload className="w-4 h-4" /> Change Image
                      </Button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      className="w-full flex flex-col items-center gap-3 py-8 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                        <Image className="w-7 h-7 text-primary" />
                      </div>
                      <div className="text-center">
                        <p className="font-medium text-sm">Click to upload image</p>
                        <p className="text-xs mt-1">{RECOMMENDED_WIDTH}×{RECOMMENDED_HEIGHT}px recommended</p>
                      </div>
                    </button>
                  )}
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </div>
              </div>

              {/* Title */}
              <div className="space-y-1.5">
                <Label>Title</Label>
                <Input
                  placeholder="e.g. Summer Health Tips"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <Label>Description</Label>
                <Textarea
                  placeholder="Short description shown on the slide"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={2}
                />
              </div>

              {/* Target Link */}
              <div className="space-y-1.5">
                <Label>Target Link</Label>
                <Input
                  placeholder="/doctors or https://example.com"
                  value={form.target_link}
                  onChange={(e) => setForm({ ...form, target_link: e.target.value })}
                />
              </div>

              {/* Sort Order & Active */}
              <div className="flex items-center gap-4">
                <div className="flex-1 space-y-1.5">
                  <Label>Sort Order</Label>
                  <Input
                    type="number"
                    value={form.sort_order}
                    onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })}
                  />
                </div>
                <div className="flex items-center gap-2 pt-6">
                  <Switch
                    checked={form.active}
                    onCheckedChange={(v) => setForm({ ...form, active: v })}
                  />
                  <Label>Active</Label>
                </div>
              </div>

              <Button onClick={handleSubmit} disabled={uploading} className="w-full gap-2">
                {uploading ? "Uploading..." : editItem ? "Save Changes" : "Add Slide"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Slider Cards Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : data.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Image className="w-12 h-12 mb-3 opacity-40" />
            <p className="font-medium">No slider images yet</p>
            <p className="text-sm">Click "Add Slide" to upload your first image</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {data.map((item) => (
            <Card key={item.id} className={`overflow-hidden transition-opacity ${!item.active ? "opacity-50" : ""}`}>
              <AspectRatio ratio={RECOMMENDED_WIDTH / RECOMMENDED_HEIGHT} className="bg-muted">
                {item.url ? (
                  <img src={item.url} alt={item.title || "Slide"} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                    <Image className="w-10 h-10 opacity-30" />
                  </div>
                )}
              </AspectRatio>
              <CardContent className="p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sm truncate">{item.title || "Untitled"}</p>
                    {item.description && (
                      <p className="text-xs text-muted-foreground truncate">{item.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Switch
                      checked={item.active}
                      onCheckedChange={(v) => toggleActive(item.id, v)}
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1 gap-1.5" onClick={() => openEdit(item)}>
                    <Pencil className="w-3.5 h-3.5" /> Edit
                  </Button>
                  <Button variant="destructive" size="sm" className="gap-1.5" onClick={() => handleDelete(item.id)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
