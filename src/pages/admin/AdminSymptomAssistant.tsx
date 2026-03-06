import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Edit, AlertTriangle, Brain, MessageSquare, Zap, History } from "lucide-react";
import { toast } from "sonner";

export default function AdminSymptomAssistant() {
  const [symptoms, setSymptoms] = useState<any[]>([]);
  const [rules, setRules] = useState<any[]>([]);
  const [triggers, setTriggers] = useState<any[]>([]);
  const [conversations, setConversations] = useState<any[]>([]);
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [newSymptom, setNewSymptom] = useState({ symptom_name: "", category: "general", is_emergency: false });
  const [newRule, setNewRule] = useState({ rule_name: "", symptom_combination: "", recommended_specialization: "", priority: 0 });
  const [newTrigger, setNewTrigger] = useState("");
  const [newQuestion, setNewQuestion] = useState({ symptom_id: "", question_text: "", answer_options: "" });
  const [dialogOpen, setDialogOpen] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const [s, r, t, c, q] = await Promise.all([
      supabase.from("symptoms").select("*").order("symptom_name"),
      supabase.from("symptom_rules").select("*").order("priority", { ascending: false }),
      supabase.from("emergency_triggers").select("*").order("symptom_keyword"),
      supabase.from("symptom_conversations").select("*").order("created_at", { ascending: false }).limit(50),
      supabase.from("symptom_questions").select("*, symptoms(symptom_name)").order("sort_order"),
    ]);
    setSymptoms(s.data || []);
    setRules(r.data || []);
    setTriggers(t.data || []);
    setConversations(c.data || []);
    setQuestions(q.data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const addSymptom = async () => {
    if (!newSymptom.symptom_name.trim()) return;
    const { error } = await supabase.from("symptoms").insert(newSymptom);
    if (error) { toast.error(error.message); return; }
    toast.success("Symptom added");
    setNewSymptom({ symptom_name: "", category: "general", is_emergency: false });
    setDialogOpen(null);
    load();
  };

  const deleteSymptom = async (id: string) => {
    await supabase.from("symptoms").delete().eq("id", id);
    toast.success("Deleted");
    load();
  };

  const addRule = async () => {
    if (!newRule.rule_name.trim() || !newRule.symptom_combination.trim()) return;
    const combo = newRule.symptom_combination.split(",").map(s => s.trim().toLowerCase());
    const { error } = await supabase.from("symptom_rules").insert({
      rule_name: newRule.rule_name,
      symptom_combination: combo,
      recommended_specialization: newRule.recommended_specialization,
      priority: newRule.priority,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Rule added");
    setNewRule({ rule_name: "", symptom_combination: "", recommended_specialization: "", priority: 0 });
    setDialogOpen(null);
    load();
  };

  const deleteRule = async (id: string) => {
    await supabase.from("symptom_rules").delete().eq("id", id);
    toast.success("Deleted");
    load();
  };

  const addTrigger = async () => {
    if (!newTrigger.trim()) return;
    const { error } = await supabase.from("emergency_triggers").insert({ symptom_keyword: newTrigger.toLowerCase() });
    if (error) { toast.error(error.message); return; }
    toast.success("Trigger added");
    setNewTrigger("");
    setDialogOpen(null);
    load();
  };

  const deleteTrigger = async (id: string) => {
    await supabase.from("emergency_triggers").delete().eq("id", id);
    toast.success("Deleted");
    load();
  };

  const addQuestion = async () => {
    if (!newQuestion.symptom_id || !newQuestion.question_text.trim()) return;
    const options = newQuestion.answer_options ? newQuestion.answer_options.split(",").map(s => s.trim()) : ["Yes", "No"];
    const { error } = await supabase.from("symptom_questions").insert({
      symptom_id: newQuestion.symptom_id,
      question_text: newQuestion.question_text,
      answer_options: options,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Question added");
    setNewQuestion({ symptom_id: "", question_text: "", answer_options: "" });
    setDialogOpen(null);
    load();
  };

  const deleteQuestion = async (id: string) => {
    await supabase.from("symptom_questions").delete().eq("id", id);
    toast.success("Deleted");
    load();
  };

  if (loading) return <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Symptom Assistant Management</h1>
        <p className="text-sm text-muted-foreground">Manage symptoms, rules, questions, and emergency triggers</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Symptoms", value: symptoms.length, icon: Brain, color: "text-primary" },
          { label: "Rules", value: rules.length, icon: Zap, color: "text-success" },
          { label: "Emergency Triggers", value: triggers.length, icon: AlertTriangle, color: "text-destructive" },
          { label: "Conversations", value: conversations.length, icon: History, color: "text-muted-foreground" },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="p-4 flex items-center gap-3">
              <s.icon className={`w-5 h-5 ${s.color}`} />
              <div>
                <p className="text-2xl font-bold text-foreground">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="symptoms">
        <TabsList className="w-full flex">
          <TabsTrigger value="symptoms" className="flex-1">Symptoms</TabsTrigger>
          <TabsTrigger value="questions" className="flex-1">Questions</TabsTrigger>
          <TabsTrigger value="rules" className="flex-1">Rules</TabsTrigger>
          <TabsTrigger value="triggers" className="flex-1">Triggers</TabsTrigger>
          <TabsTrigger value="history" className="flex-1">History</TabsTrigger>
        </TabsList>

        {/* SYMPTOMS TAB */}
        <TabsContent value="symptoms">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Symptom Keywords</CardTitle>
              <Dialog open={dialogOpen === "symptom"} onOpenChange={v => setDialogOpen(v ? "symptom" : null)}>
                <DialogTrigger asChild><Button size="sm"><Plus className="w-4 h-4 mr-1" /> Add</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Add Symptom</DialogTitle></DialogHeader>
                  <div className="space-y-3">
                    <Input placeholder="Symptom name" value={newSymptom.symptom_name} onChange={e => setNewSymptom(p => ({ ...p, symptom_name: e.target.value }))} />
                    <Select value={newSymptom.category} onValueChange={v => setNewSymptom(p => ({ ...p, category: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["general", "neurological", "cardiac", "gastro", "respiratory", "dermatology", "dental", "ophthalmology", "orthopedic", "gynecology", "emergency"].map(c => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={newSymptom.is_emergency} onChange={e => setNewSymptom(p => ({ ...p, is_emergency: e.target.checked }))} />
                      Emergency symptom
                    </label>
                    <Button onClick={addSymptom} className="w-full">Add Symptom</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {symptoms.map(s => (
                  <div key={s.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm text-foreground">{s.symptom_name}</span>
                      <Badge variant="secondary" className="text-[10px]">{s.category}</Badge>
                      {s.is_emergency && <Badge variant="destructive" className="text-[10px]">Emergency</Badge>}
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => deleteSymptom(s.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* QUESTIONS TAB */}
        <TabsContent value="questions">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Follow-up Questions</CardTitle>
              <Dialog open={dialogOpen === "question"} onOpenChange={v => setDialogOpen(v ? "question" : null)}>
                <DialogTrigger asChild><Button size="sm"><Plus className="w-4 h-4 mr-1" /> Add</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Add Question</DialogTitle></DialogHeader>
                  <div className="space-y-3">
                    <Select value={newQuestion.symptom_id} onValueChange={v => setNewQuestion(p => ({ ...p, symptom_id: v }))}>
                      <SelectTrigger><SelectValue placeholder="Select symptom" /></SelectTrigger>
                      <SelectContent>
                        {symptoms.map(s => <SelectItem key={s.id} value={s.id}>{s.symptom_name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Input placeholder="Question text" value={newQuestion.question_text} onChange={e => setNewQuestion(p => ({ ...p, question_text: e.target.value }))} />
                    <Input placeholder="Answer options (comma separated)" value={newQuestion.answer_options} onChange={e => setNewQuestion(p => ({ ...p, answer_options: e.target.value }))} />
                    <Button onClick={addQuestion} className="w-full">Add Question</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {questions.map(q => (
                  <div key={q.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-foreground">{q.question_text}</p>
                      <p className="text-xs text-muted-foreground">Symptom: {(q as any).symptoms?.symptom_name || "—"}</p>
                      <div className="flex gap-1 mt-1">
                        {(Array.isArray(q.answer_options) ? q.answer_options : []).map((o: string, i: number) => (
                          <Badge key={i} variant="outline" className="text-[10px]">{o}</Badge>
                        ))}
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => deleteQuestion(q.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                  </div>
                ))}
                {questions.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No questions configured. Default questions will be used.</p>}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* RULES TAB */}
        <TabsContent value="rules">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Symptom Rules</CardTitle>
              <Dialog open={dialogOpen === "rule"} onOpenChange={v => setDialogOpen(v ? "rule" : null)}>
                <DialogTrigger asChild><Button size="sm"><Plus className="w-4 h-4 mr-1" /> Add</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Add Rule</DialogTitle></DialogHeader>
                  <div className="space-y-3">
                    <Input placeholder="Rule name" value={newRule.rule_name} onChange={e => setNewRule(p => ({ ...p, rule_name: e.target.value }))} />
                    <Input placeholder="Symptoms (comma separated)" value={newRule.symptom_combination} onChange={e => setNewRule(p => ({ ...p, symptom_combination: e.target.value }))} />
                    <Input placeholder="Recommended specialization" value={newRule.recommended_specialization} onChange={e => setNewRule(p => ({ ...p, recommended_specialization: e.target.value }))} />
                    <Input type="number" placeholder="Priority (higher = matched first)" value={newRule.priority} onChange={e => setNewRule(p => ({ ...p, priority: parseInt(e.target.value) || 0 }))} />
                    <Button onClick={addRule} className="w-full">Add Rule</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {rules.map(r => (
                  <div key={r.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-foreground">{r.rule_name}</p>
                      <div className="flex gap-1 mt-1 flex-wrap">
                        {(r.symptom_combination || []).map((s: string, i: number) => (
                          <Badge key={i} variant="secondary" className="text-[10px]">{s}</Badge>
                        ))}
                        <span className="text-xs text-primary font-medium ml-1">→ {r.recommended_specialization}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px]">P{r.priority}</Badge>
                      <Button variant="ghost" size="icon" onClick={() => deleteRule(r.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TRIGGERS TAB */}
        <TabsContent value="triggers">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Emergency Triggers</CardTitle>
              <Dialog open={dialogOpen === "trigger"} onOpenChange={v => setDialogOpen(v ? "trigger" : null)}>
                <DialogTrigger asChild><Button size="sm"><Plus className="w-4 h-4 mr-1" /> Add</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Add Emergency Trigger</DialogTitle></DialogHeader>
                  <div className="space-y-3">
                    <Input placeholder="Symptom keyword (e.g., chest pain)" value={newTrigger} onChange={e => setNewTrigger(e.target.value)} />
                    <Button onClick={addTrigger} className="w-full">Add Trigger</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {triggers.map(t => (
                  <div key={t.id} className="flex items-center gap-1 bg-destructive/10 border border-destructive/20 rounded-full px-3 py-1.5">
                    <AlertTriangle className="w-3 h-3 text-destructive" />
                    <span className="text-sm text-destructive font-medium">{t.symptom_keyword}</span>
                    <button onClick={() => deleteTrigger(t.id)} className="ml-1 hover:text-destructive/80"><Trash2 className="w-3 h-3" /></button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* HISTORY TAB */}
        <TabsContent value="history">
          <Card>
            <CardHeader><CardTitle className="text-lg">Recent Conversations</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                {conversations.map(c => (
                  <div key={c.id} className="p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs text-muted-foreground">{new Date(c.created_at).toLocaleString()}</p>
                      {c.result_specialization && <Badge variant="secondary" className="text-[10px]">{c.result_specialization}</Badge>}
                    </div>
                    <div className="flex gap-1 flex-wrap">
                      {(c.symptoms_identified || []).map((s: string, i: number) => (
                        <Badge key={i} variant="outline" className="text-[10px]">{s}</Badge>
                      ))}
                    </div>
                  </div>
                ))}
                {conversations.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No conversations yet</p>}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
