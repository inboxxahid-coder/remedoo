import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Send, AlertTriangle, Ambulance, Building2, Stethoscope, Star, IndianRupee, Calendar, X, MessageCircleHeart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface ChatMessage {
  id: string;
  role: "assistant" | "user";
  text: string;
  quickReplies?: string[];
  isEmergency?: boolean;
  doctorCards?: DoctorCard[];
  disclaimer?: boolean;
}

interface DoctorCard {
  id: string;
  name: string;
  specialization: string;
  rating: number | null;
  consultation_fee: number | null;
  image_url: string | null;
}

const QUICK_SYMPTOMS = ["Fever", "Headache", "Chest pain", "Stomach pain", "Cough", "Skin rash"];

export default function SymptomChatWidget() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [identifiedSymptoms, setIdentifiedSymptoms] = useState<string[]>([]);
  const [pendingQuestions, setPendingQuestions] = useState<{ question: string; options: string[] }[]>([]);
  const [conversationDone, setConversationDone] = useState(false);
  const [allSymptoms, setAllSymptoms] = useState<{ symptom_name: string; is_emergency: boolean }[]>([]);
  const [emergencyTriggers, setEmergencyTriggers] = useState<string[]>([]);
  const [rules, setRules] = useState<{ symptom_combination: string[]; recommended_specialization: string; priority: number }[]>([]);
  const [dataLoaded, setDataLoaded] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load data when widget opens
  useEffect(() => {
    if (!open || dataLoaded) return;
    const load = async () => {
      const [sympRes, trigRes, ruleRes] = await Promise.all([
        supabase.from("symptoms").select("symptom_name, is_emergency"),
        supabase.from("emergency_triggers").select("symptom_keyword"),
        supabase.from("symptom_rules").select("symptom_combination, recommended_specialization, priority").eq("is_active", true).order("priority", { ascending: false }),
      ]);
      setAllSymptoms((sympRes.data as any[]) || []);
      setEmergencyTriggers((trigRes.data as any[])?.map(t => t.symptom_keyword.toLowerCase()) || []);
      setRules((ruleRes.data as any[]) || []);
      setDataLoaded(true);
    };
    load();
  }, [open, dataLoaded]);

  // Init message
  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([{
        id: "init",
        role: "assistant",
        text: "Hello! I'm your Remedoo Health Assistant.\n\nDescribe your symptoms and I'll guide you to the right care.",
        quickReplies: QUICK_SYMPTOMS,
      }]);
    }
  }, [open, messages.length]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const addMsg = useCallback((msg: Omit<ChatMessage, "id">) => {
    setMessages(prev => [...prev, { ...msg, id: Date.now().toString() + Math.random() }]);
  }, []);

  const checkEmergency = useCallback((text: string): boolean => {
    const lower = text.toLowerCase();
    return emergencyTriggers.some(t => lower.includes(t)) || allSymptoms.some(s => s.is_emergency && lower.includes(s.symptom_name.toLowerCase()));
  }, [emergencyTriggers, allSymptoms]);

  const matchSymptoms = useCallback((text: string): string[] => {
    const lower = text.toLowerCase();
    return allSymptoms.filter(s => lower.includes(s.symptom_name.toLowerCase())).map(s => s.symptom_name.toLowerCase());
  }, [allSymptoms]);

  const findSpecialization = useCallback((symptoms: string[]): string | null => {
    const lowerSymptoms = symptoms.map(s => s.toLowerCase());
    for (const rule of rules) {
      const combo = rule.symptom_combination.map(s => s.toLowerCase());
      if (combo.every(c => lowerSymptoms.includes(c))) return rule.recommended_specialization;
    }
    return null;
  }, [rules]);

  const fetchDoctors = useCallback(async (specialization: string): Promise<DoctorCard[]> => {
    const { data } = await supabase
      .from("doctors")
      .select("id, name, specialization, rating, consultation_fee, image_url")
      .eq("approval_status", "approved")
      .eq("account_status", "active")
      .ilike("specialization", `%${specialization}%`)
      .limit(3);
    if (!data?.length) {
      const { data: fallback } = await supabase
        .from("doctors")
        .select("id, name, specialization, rating, consultation_fee, image_url")
        .eq("approval_status", "approved")
        .eq("account_status", "active")
        .order("rating", { ascending: false })
        .limit(3);
      return (fallback as DoctorCard[]) || [];
    }
    return (data as DoctorCard[]) || [];
  }, []);

  const saveConversation = useCallback(async (symptoms: string[], specialization: string | null) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("symptom_conversations").insert({
      user_id: user.id,
      conversation_data: messages as any,
      symptoms_identified: symptoms,
      result_specialization: specialization,
    });
  }, [messages]);

  const showEmergencyAlert = useCallback(() => {
    addMsg({
      role: "assistant",
      text: "⚠️ Your symptoms may require immediate medical attention.\n\nPlease seek emergency care right away.",
      isEmergency: true,
      quickReplies: ["Request Ambulance", "Find Nearest Hospital"],
    });
    setConversationDone(true);
  }, [addMsg]);

  const showRecommendation = useCallback(async (symptoms: string[]) => {
    setLoading(true);
    const specialization = findSpecialization(symptoms);
    const doctors = specialization ? await fetchDoctors(specialization) : [];
    const recText = specialization
      ? `Based on your symptoms, you may need to consult a **${specialization}**.`
      : "Based on your symptoms, we recommend consulting a **General Physician**.";
    addMsg({
      role: "assistant",
      text: recText + (doctors.length ? "\n\nRecommended doctors:" : "\n\nPlease visit a nearby clinic."),
      doctorCards: doctors,
      disclaimer: true,
    });
    await saveConversation(symptoms, specialization || "General Physician");
    setConversationDone(true);
    setLoading(false);
  }, [findSpecialization, fetchDoctors, addMsg, saveConversation]);

  const processFollowUp = useCallback(async (answer: string, currentSymptoms: string[]) => {
    const newMatches = matchSymptoms(answer);
    const allIdentified = [...new Set([...currentSymptoms, ...newMatches])];
    setIdentifiedSymptoms(allIdentified);
    if (checkEmergency(answer)) { showEmergencyAlert(); return; }
    setPendingQuestions(prev => {
      const remaining = prev.slice(1);
      if (remaining.length > 0) {
        setTimeout(() => addMsg({ role: "assistant", text: remaining[0].question, quickReplies: remaining[0].options }), 400);
        return remaining;
      } else {
        setTimeout(() => showRecommendation(allIdentified), 400);
        return [];
      }
    });
  }, [matchSymptoms, checkEmergency, showEmergencyAlert, addMsg, showRecommendation]);

  const handleSend = useCallback(async (text?: string) => {
    const msg = (text || input).trim();
    if (!msg || loading || conversationDone) return;
    setInput("");
    addMsg({ role: "user", text: msg });

    if (msg === "Request Ambulance") { navigate("/emergency"); setOpen(false); return; }
    if (msg === "Find Nearest Hospital") { navigate("/hospitals"); setOpen(false); return; }
    if (checkEmergency(msg)) { setTimeout(() => showEmergencyAlert(), 400); return; }

    const matched = matchSymptoms(msg);
    const allIdentified = [...new Set([...identifiedSymptoms, ...matched])];
    setIdentifiedSymptoms(allIdentified);

    if (allIdentified.length === 0) {
      setTimeout(() => addMsg({ role: "assistant", text: "I couldn't identify specific symptoms. Could you describe more clearly?\n\nFor example: fever, headache, stomach pain.", quickReplies: QUICK_SYMPTOMS }), 400);
      return;
    }

    if (pendingQuestions.length > 0) { processFollowUp(msg, allIdentified); return; }

    setLoading(true);
    const { data: questions } = await supabase
      .from("symptom_questions")
      .select("question_text, answer_options")
      .in("symptom_id", (await supabase.from("symptoms").select("id").in("symptom_name", allIdentified.map(s => s.charAt(0).toUpperCase() + s.slice(1)))).data?.map((s: any) => s.id) || [])
      .order("sort_order");

    const qList = (questions as any[])?.map(q => ({ question: q.question_text, options: Array.isArray(q.answer_options) ? q.answer_options : ["Yes", "No"] })) || [];
    const defaultQs = [
      { question: "How many days have you had these symptoms?", options: ["Less than 2 days", "2 to 5 days", "More than 5 days"] },
      { question: "Is the discomfort severe or mild?", options: ["Mild", "Moderate", "Severe"] },
    ];
    const finalQs = qList.length > 0 ? qList : defaultQs;
    setPendingQuestions(finalQs);
    setLoading(false);
    setTimeout(() => addMsg({ role: "assistant", text: `I understand you're experiencing: ${allIdentified.join(", ")}.\n\n${finalQs[0].question}`, quickReplies: finalQs[0].options }), 400);
  }, [input, loading, conversationDone, addMsg, checkEmergency, matchSymptoms, identifiedSymptoms, pendingQuestions, processFollowUp, navigate, showEmergencyAlert]);

  const resetChat = () => {
    setMessages([{
      id: "init",
      role: "assistant",
      text: "Hello! I'm your Remedoo Health Assistant.\n\nDescribe your symptoms and I'll guide you to the right care.",
      quickReplies: QUICK_SYMPTOMS,
    }]);
    setIdentifiedSymptoms([]);
    setPendingQuestions([]);
    setConversationDone(false);
  };

  return (
    <>
      {/* FAB */}
      <AnimatePresence>
        {!open && (
          <motion.button
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setOpen(true)}
            className="fixed bottom-20 right-4 z-50 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:shadow-xl transition-shadow"
          >
            <MessageCircleHeart className="w-6 h-6" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat Panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="fixed bottom-20 right-3 left-3 sm:left-auto sm:w-[380px] z-50 flex flex-col bg-background border border-border rounded-2xl shadow-2xl overflow-hidden"
            style={{ maxHeight: "min(70vh, 520px)" }}
          >
            {/* Header */}
            <div className="shrink-0 bg-primary text-primary-foreground px-4 py-3 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary-foreground/15 flex items-center justify-center">
                <Stethoscope className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold">Health Assistant</h3>
                <p className="text-[10px] opacity-75">Symptom checker</p>
              </div>
              <button onClick={() => setOpen(false)} className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-primary-foreground/10">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-2.5">
              {messages.map((msg) => (
                <div key={msg.id} className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}>
                  <div className="max-w-[85%] space-y-1.5">
                    <div className={cn(
                      "rounded-2xl px-3 py-2 text-xs leading-relaxed",
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground rounded-br-md"
                        : msg.isEmergency
                          ? "bg-destructive/10 border border-destructive/30 text-foreground rounded-bl-md"
                          : "bg-card border border-border text-foreground rounded-bl-md"
                    )}>
                      {msg.isEmergency && (
                        <div className="flex items-center gap-1.5 mb-1 text-destructive font-semibold text-xs">
                          <AlertTriangle className="w-3.5 h-3.5" /> Emergency Alert
                        </div>
                      )}
                      <p className="whitespace-pre-line">{msg.text.split("**").map((part, i) =>
                        i % 2 === 1 ? <strong key={i}>{part}</strong> : part
                      )}</p>
                    </div>

                    {/* Doctor cards */}
                    {msg.doctorCards && msg.doctorCards.length > 0 && (
                      <div className="space-y-1.5">
                        {msg.doctorCards.map(doc => (
                          <div key={doc.id} className="bg-card border border-border rounded-xl p-2 flex items-center gap-2">
                            <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center shrink-0">
                              {doc.image_url ? (
                                <img src={doc.image_url} alt={doc.name} className="w-full h-full rounded-full object-cover" />
                              ) : (
                                <Stethoscope className="w-4 h-4 text-muted-foreground" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-foreground truncate">{doc.name}</p>
                              <p className="text-[10px] text-muted-foreground">{doc.specialization}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                {doc.rating && <span className="flex items-center gap-0.5 text-[10px] text-warning"><Star className="w-2.5 h-2.5 fill-current" /> {doc.rating}</span>}
                                {doc.consultation_fee && <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground"><IndianRupee className="w-2.5 h-2.5" /> {doc.consultation_fee}</span>}
                              </div>
                            </div>
                            <Button size="sm" className="shrink-0 text-[10px] h-7 px-2" onClick={() => { navigate(`/doctor/${doc.id}`); setOpen(false); }}>
                              <Calendar className="w-3 h-3 mr-0.5" /> Book
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Disclaimer */}
                    {msg.disclaimer && (
                      <div className="bg-muted/60 border border-border rounded-lg p-2 text-[10px] text-muted-foreground leading-relaxed">
                        ⚕️ This provides informational guidance only and is not a medical diagnosis.
                      </div>
                    )}

                    {/* Quick replies */}
                    {msg.quickReplies && !conversationDone && (
                      <div className="flex flex-wrap gap-1">
                        {msg.quickReplies.map(qr => (
                          <button
                            key={qr}
                            onClick={() => handleSend(qr)}
                            className={cn(
                              "text-[10px] px-2.5 py-1 rounded-full border font-medium transition-colors",
                              qr === "Request Ambulance" ? "bg-destructive text-destructive-foreground border-destructive"
                                : qr === "Find Nearest Hospital" ? "bg-primary text-primary-foreground border-primary"
                                  : "bg-card border-border text-foreground hover:bg-accent"
                            )}
                          >
                            {qr === "Request Ambulance" && <Ambulance className="w-2.5 h-2.5 inline mr-0.5" />}
                            {qr === "Find Nearest Hospital" && <Building2 className="w-2.5 h-2.5 inline mr-0.5" />}
                            {qr}
                          </button>
                        ))}
                      </div>
                    )}

                    {msg.isEmergency && msg.quickReplies && (
                      <div className="flex flex-wrap gap-1">
                        {msg.quickReplies.map(qr => (
                          <button
                            key={qr}
                            onClick={() => {
                              if (qr === "Request Ambulance") navigate("/emergency");
                              if (qr === "Find Nearest Hospital") navigate("/hospitals");
                              setOpen(false);
                            }}
                            className={cn(
                              "text-[10px] px-2.5 py-1 rounded-full border font-medium",
                              qr === "Request Ambulance" ? "bg-destructive text-destructive-foreground border-destructive" : "bg-primary text-primary-foreground border-primary"
                            )}
                          >
                            {qr === "Request Ambulance" && <Ambulance className="w-2.5 h-2.5 inline mr-0.5" />}
                            {qr === "Find Nearest Hospital" && <Building2 className="w-2.5 h-2.5 inline mr-0.5" />}
                            {qr}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex justify-start">
                  <div className="bg-card border border-border rounded-2xl rounded-bl-md px-3 py-2">
                    <div className="flex gap-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "0ms" }} />
                      <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "150ms" }} />
                      <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <div className="shrink-0 border-t border-border bg-card px-3 py-2">
              {conversationDone ? (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1 text-xs h-8" onClick={resetChat}>
                    New Check
                  </Button>
                  <Button size="sm" className="flex-1 text-xs h-8" onClick={() => setOpen(false)}>
                    Close
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleSend()}
                    placeholder="Type your symptoms..."
                    className="flex-1 bg-muted rounded-full px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground outline-none"
                    disabled={loading}
                  />
                  <button
                    onClick={() => handleSend()}
                    disabled={!input.trim() || loading}
                    className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-40 transition-opacity"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
