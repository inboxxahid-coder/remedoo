import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { HelpCircle, Plus, Trash2, Edit, FileText } from "lucide-react";
import { toast } from "sonner";

export default function AdminFAQ() {
  const [faqs, setFaqs] = useState<any[]>([]);
  const [legalPages, setLegalPages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [faqDialogOpen, setFaqDialogOpen] = useState(false);
  const [legalDialogOpen, setLegalDialogOpen] = useState(false);
  const [editingFaq, setEditingFaq] = useState<any>(null);
  const [editingLegal, setEditingLegal] = useState<any>(null);
  const [faqForm, setFaqForm] = useState({ question: "", answer: "", category: "general", sort_order: 0, is_active: true });
  const [legalForm, setLegalForm] = useState({ slug: "", title: "", content: "" });

  const load = async () => {
    setLoading(true);
    const [faqRes, legalRes] = await Promise.all([
      supabase.from("faqs").select("*").order("sort_order"),
      supabase.from("legal_pages").select("*").order("slug"),
    ]);
    setFaqs(faqRes.data || []);
    setLegalPages(legalRes.data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const saveFaq = async () => {
    if (!faqForm.question.trim()) { toast.error("Question required"); return; }
    const payload = { ...faqForm, sort_order: Number(faqForm.sort_order) };
    if (editingFaq) {
      await supabase.from("faqs").update(payload).eq("id", editingFaq.id);
      toast.success("Updated");
    } else {
      await supabase.from("faqs").insert(payload);
      toast.success("Created");
    }
    setFaqDialogOpen(false); setEditingFaq(null); setFaqForm({ question: "", answer: "", category: "general", sort_order: 0, is_active: true }); load();
  };

  const deleteFaq = async (id: string) => {
    if (!confirm("Delete?")) return;
    await supabase.from("faqs").delete().eq("id", id);
    toast.success("Deleted"); load();
  };

  const saveLegal = async () => {
    if (!legalForm.slug.trim() || !legalForm.title.trim()) { toast.error("Slug and title required"); return; }
    const { data: { session } } = await supabase.auth.getSession();
    if (editingLegal) {
      await supabase.from("legal_pages").update({ ...legalForm, updated_at: new Date().toISOString(), updated_by: session?.user.id }).eq("id", editingLegal.id);
      toast.success("Updated");
    } else {
      await supabase.from("legal_pages").insert({ ...legalForm, updated_by: session?.user.id });
      toast.success("Created");
    }
    setLegalDialogOpen(false); setEditingLegal(null); setLegalForm({ slug: "", title: "", content: "" }); load();
  };

  const deleteLegal = async (id: string) => {
    if (!confirm("Delete?")) return;
    await supabase.from("legal_pages").delete().eq("id", id);
    toast.success("Deleted"); load();
  };

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground flex items-center gap-2"><HelpCircle className="w-6 h-6 text-primary" /> FAQ & Legal Pages</h1>

      <Tabs defaultValue="faq">
        <TabsList><TabsTrigger value="faq">FAQs ({faqs.length})</TabsTrigger><TabsTrigger value="legal">Legal Pages ({legalPages.length})</TabsTrigger></TabsList>

        <TabsContent value="faq" className="space-y-4 mt-4">
          <div className="flex justify-end">
            <Dialog open={faqDialogOpen} onOpenChange={o => { setFaqDialogOpen(o); if (!o) { setEditingFaq(null); setFaqForm({ question: "", answer: "", category: "general", sort_order: 0, is_active: true }); } }}>
              <DialogTrigger asChild><Button><Plus className="w-4 h-4 mr-1" /> Add FAQ</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>{editingFaq ? "Edit" : "Add"} FAQ</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div><Label>Question</Label><Input value={faqForm.question} onChange={e => setFaqForm(f => ({ ...f, question: e.target.value }))} /></div>
                  <div><Label>Answer</Label><Textarea value={faqForm.answer} onChange={e => setFaqForm(f => ({ ...f, answer: e.target.value }))} rows={4} /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Category</Label><Input value={faqForm.category} onChange={e => setFaqForm(f => ({ ...f, category: e.target.value }))} /></div>
                    <div><Label>Sort Order</Label><Input type="number" value={faqForm.sort_order} onChange={e => setFaqForm(f => ({ ...f, sort_order: +e.target.value }))} /></div>
                  </div>
                  <div className="flex items-center gap-2"><Switch checked={faqForm.is_active} onCheckedChange={v => setFaqForm(f => ({ ...f, is_active: v }))} /><Label>Active</Label></div>
                  <Button className="w-full" onClick={saveFaq}>{editingFaq ? "Update" : "Create"}</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          {faqs.length === 0 ? (
            <Card className="p-12 text-center"><p className="text-muted-foreground">No FAQs yet</p></Card>
          ) : (
            <div className="space-y-3">
              {faqs.map(f => (
                <Card key={f.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">{f.question}</span>
                        <Badge variant="outline" className="text-xs">{f.category}</Badge>
                        <Badge variant={f.is_active ? "default" : "secondary"} className="text-xs">{f.is_active ? "Active" : "Hidden"}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{f.answer}</p>
                    </div>
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" onClick={() => { setEditingFaq(f); setFaqForm({ question: f.question, answer: f.answer, category: f.category || "general", sort_order: f.sort_order || 0, is_active: f.is_active }); setFaqDialogOpen(true); }}><Edit className="w-3.5 h-3.5" /></Button>
                      <Button size="sm" variant="destructive" onClick={() => deleteFaq(f.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="legal" className="space-y-4 mt-4">
          <div className="flex justify-end">
            <Dialog open={legalDialogOpen} onOpenChange={o => { setLegalDialogOpen(o); if (!o) { setEditingLegal(null); setLegalForm({ slug: "", title: "", content: "" }); } }}>
              <DialogTrigger asChild><Button><Plus className="w-4 h-4 mr-1" /> Add Page</Button></DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader><DialogTitle>{editingLegal ? "Edit" : "Add"} Legal Page</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Slug</Label><Input value={legalForm.slug} onChange={e => setLegalForm(f => ({ ...f, slug: e.target.value }))} placeholder="terms-of-service" /></div>
                    <div><Label>Title</Label><Input value={legalForm.title} onChange={e => setLegalForm(f => ({ ...f, title: e.target.value }))} placeholder="Terms of Service" /></div>
                  </div>
                  <div><Label>Content</Label><Textarea value={legalForm.content} onChange={e => setLegalForm(f => ({ ...f, content: e.target.value }))} rows={12} placeholder="Page content..." /></div>
                  <Button className="w-full" onClick={saveLegal}>{editingLegal ? "Update" : "Create"}</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          {legalPages.length === 0 ? (
            <Card className="p-12 text-center"><p className="text-muted-foreground">No legal pages yet</p></Card>
          ) : (
            <div className="space-y-3">
              {legalPages.map(p => (
                <Card key={p.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-primary" />
                        <span className="font-semibold">{p.title}</span>
                        <Badge variant="outline" className="text-xs font-mono">/{p.slug}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">Updated: {new Date(p.updated_at).toLocaleString()}</p>
                    </div>
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" onClick={() => { setEditingLegal(p); setLegalForm({ slug: p.slug, title: p.title, content: p.content }); setLegalDialogOpen(true); }}><Edit className="w-3.5 h-3.5" /></Button>
                      <Button size="sm" variant="destructive" onClick={() => deleteLegal(p.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
