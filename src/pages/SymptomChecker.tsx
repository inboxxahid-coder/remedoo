import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Send, AlertTriangle, Ambulance, Building2, Stethoscope, MapPin, Star, IndianRupee, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useGeolocation } from "@/hooks/useGeolocation";

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
  distance?: number;
}

const QUICK_SYMPTOMS = ["Fever", "Headache", "Chest pain", "Stomach pain", "Cough", "Skin rash", "Tooth pain", "Eye problem"];

export default function SymptomChecker() {
  const navigate = useNavigate();
  const { location } = useGeolocation();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [identifiedSymptoms, setIdentifiedSymptoms] = useState<string[]>([]);
  const [pendingQuestions, setPendingQuestions] = useState<{ question: string; options: string[] }[]>([]);
  const [conversationDone, setConversationDone] = useState(false);
  const [allSymptoms, setAllSymptoms] = useState<{ symptom_name: string; is_emergency: boolean }[]>([]);
  const [emergencyTriggers, setEmergencyTriggers] = useState<string[]>([]);
  const [rules, setRules] = useState<{ symptom_combination: string[]; recommended_specialization: string; priority: number }[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load data on mount
  useEffect(() => {
    const load = async () => {
      const [sympRes, trigRes, ruleRes] = await Promise.all([
        supabase.from("symptoms").select("symptom_name, is_emergency"),
        supabase.from("emergency_triggers").select("symptom_keyword"),
        supabase.from("symptom_rules").select("symptom_combination, recommended_specialization, priority").eq("is_active", true).order("priority", { ascending: false }),
      ]);
      setAllSymptoms((sympRes.data as any[]) || []);
      setEmergencyTriggers((trigRes.data as any[])?.map(t => t.symptom_keyword.toLowerCase()) || []);
      setRules((ruleRes.data as any[]) || []);
    };
    load();
    // Initial message
    setMessages([{
      id: "init",
      role: "assistant",
      text: "Hello! I am the Remedoo Symptom Assistant.\n\nPlease describe how you are feeling today.",
      quickReplies: QUICK_SYMPTOMS,
    }]);
  }, []);

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
    return allSymptoms
      .filter(s => lower.includes(s.symptom_name.toLowerCase()))
      .map(s => s.symptom_name.toLowerCase());
  }, [allSymptoms]);

  const findSpecialization = useCallback((symptoms: string[]): string | null => {
    const lowerSymptoms = symptoms.map(s => s.toLowerCase());
    for (const rule of rules) {
      const combo = rule.symptom_combination.map(s => s.toLowerCase());
      if (combo.every(c => lowerSymptoms.includes(c))) {
        return rule.recommended_specialization;
      }
    }
    return null;
  }, [rules]);

  const fetchDoctors = useCallback(async (specialization: string): Promise<DoctorCard[]> => {
    const { data } = await supabase
      .from("doctors")
      .select("id, name, specialization, rating, consultation_fee, image_url, hospital_id")
      .eq("approval_status", "approved")
      .eq("account_status", "active")
      .ilike("specialization", `%${specialization}%`)
      .limit(5);

    if (!data?.length) {
      // Fallback: get any doctors
      const { data: fallback } = await supabase
        .from("doctors")
        .select("id, name, specialization, rating, consultation_fee, image_url")
        .eq("approval_status", "approved")
        .eq("account_status", "active")
        .order("rating", { ascending: false })
        .limit(5);
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
      text: recText + (doctors.length ? "\n\nHere are recommended doctors near you:" : "\n\nPlease visit a nearby clinic for a checkup."),
      doctorCards: doctors,
      disclaimer: true,
    });

    await saveConversation(symptoms, specialization || "General Physician");
    setConversationDone(true);
    setLoading(false);
  }, [findSpecialization, fetchDoctors, addMsg, saveConversation]);

  const processFollowUp = useCallback(async (answer: string, currentSymptoms: string[]) => {
    // Check for new symptoms in the answer
    const newMatches = matchSymptoms(answer);
    const allIdentified = [...new Set([...currentSymptoms, ...newMatches])];
    setIdentifiedSymptoms(allIdentified);

    if (checkEmergency(answer)) {
      showEmergencyAlert();
      return;
    }

    // If we have pending questions, ask next one
    setPendingQuestions(prev => {
      const remaining = prev.slice(1);
      if (remaining.length > 0) {
        setTimeout(() => {
          addMsg({
            role: "assistant",
            text: remaining[0].question,
            quickReplies: remaining[0].options,
          });
        }, 400);
        return remaining;
      } else {
        // No more questions, show recommendation
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

    // Handle emergency quick actions
    if (msg === "Request Ambulance") { navigate("/emergency"); return; }
    if (msg === "Find Nearest Hospital") { navigate("/hospitals"); return; }

    // Check emergency
    if (checkEmergency(msg)) {
      setTimeout(() => showEmergencyAlert(), 400);
      return;
    }

    // Match symptoms
    const matched = matchSymptoms(msg);
    const allIdentified = [...new Set([...identifiedSymptoms, ...matched])];
    setIdentifiedSymptoms(allIdentified);

    if (allIdentified.length === 0) {
      // No symptoms recognized, ask again
      setTimeout(() => {
        addMsg({
          role: "assistant",
          text: "I couldn't identify specific symptoms from that. Could you describe your symptoms more clearly?\n\nFor example: fever, headache, stomach pain, etc.",
          quickReplies: QUICK_SYMPTOMS,
        });
      }, 400);
      return;
    }

    // If we already have pending follow-up questions
    if (pendingQuestions.length > 0) {
      processFollowUp(msg, allIdentified);
      return;
    }

    // Generate follow-up questions
    setLoading(true);
    const { data: questions } = await supabase
      .from("symptom_questions")
      .select("question_text, answer_options")
      .in("symptom_id", (await supabase.from("symptoms").select("id").in("symptom_name", allIdentified.map(s => s.charAt(0).toUpperCase() + s.slice(1)))).data?.map((s: any) => s.id) || [])
      .order("sort_order");

    const qList = (questions as any[])?.map(q => ({
      question: q.question_text,
      options: Array.isArray(q.answer_options) ? q.answer_options : ["Yes", "No"],
    })) || [];

    // Add default questions if none configured
    const defaultQs = [
      { question: "How many days have you had these symptoms?", options: ["Less than 2 days", "2 to 5 days", "More than 5 days"] },
      { question: "Is the discomfort severe or mild?", options: ["Mild", "Moderate", "Severe"] },
    ];
    const finalQs = qList.length > 0 ? qList : defaultQs;

    setPendingQuestions(finalQs);
    setLoading(false);

    setTimeout(() => {
      addMsg({
        role: "assistant",
        text: `I understand you're experiencing: ${allIdentified.join(", ")}. Let me ask a few follow-up questions.\n\n${finalQs[0].question}`,
        quickReplies: finalQs[0].options,
      });
    }, 400);
  }, [input, loading, conversationDone, addMsg, checkEmergency, matchSymptoms, identifiedSymptoms, pendingQuestions, processFollowUp, navigate, showEmergencyAlert]);

  return (
    <div className="flex flex-col h-[100dvh] bg-background">
      {/* Header */}
      <header className="shrink-0 bg-primary text-primary-foreground px-4 py-3 flex items-center gap-3 safe-top">
        <button aria-label="Go back" onClick={() => navigate(-1)} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-primary-foreground/10">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-bold">Remedoo Health Assistant</h1>
          <p className="text-[11px] opacity-80">Describe your symptoms and we'll guide you to the right care</p>
        </div>
        <button
          type="button"
          onClick={() => navigate("/care-match")}
          className="shrink-0 min-h-[36px] px-3 rounded-full bg-primary-foreground/15 text-xs font-semibold"
        >
          ✨ Smart match
        </button>
      </header>

      {/* Chat area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}
            >
              <div className={cn("max-w-[85%] space-y-2")}>
                {/* Bubble */}
                <div className={cn(
                  "rounded-2xl px-4 py-3 text-sm leading-relaxed",
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground rounded-br-md"
                    : msg.isEmergency
                      ? "bg-destructive/10 border border-destructive/30 text-foreground rounded-bl-md"
                      : "bg-card border border-border text-foreground rounded-bl-md"
                )}>
                  {msg.isEmergency && (
                    <div className="flex items-center gap-2 mb-2 text-destructive font-semibold">
                      <AlertTriangle className="w-4 h-4" />
                      Emergency Alert
                    </div>
                  )}
                  <p className="whitespace-pre-line">{msg.text.split("**").map((part, i) =>
                    i % 2 === 1 ? <strong key={i}>{part}</strong> : part
                  )}</p>
                </div>

                {/* Doctor cards */}
                {msg.doctorCards && msg.doctorCards.length > 0 && (
                  <div className="space-y-2">
                    {msg.doctorCards.map(doc => (
                      <div key={doc.id} className="bg-card border border-border rounded-xl p-3 flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center shrink-0">
                          {doc.image_url ? (
                            <img loading="lazy" decoding="async" src={doc.image_url} alt={doc.name} className="w-full h-full rounded-full object-cover" />
                          ) : (
                            <Stethoscope className="w-5 h-5 text-muted-foreground" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate">{doc.name}</p>
                          <p className="text-xs text-muted-foreground">{doc.specialization}</p>
                          <div className="flex items-center gap-3 mt-1">
                            {doc.rating && (
                              <span className="flex items-center gap-0.5 text-xs text-warning">
                                <Star className="w-3 h-3 fill-current" /> {doc.rating}
                              </span>
                            )}
                            {doc.consultation_fee && (
                              <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                                <IndianRupee className="w-3 h-3" /> {doc.consultation_fee}
                              </span>
                            )}
                          </div>
                        </div>
                        <Button size="sm" className="shrink-0 text-xs" onClick={() => navigate(`/doctor/${doc.id}`)}>
                          <Calendar className="w-3 h-3 mr-1" /> Book
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Disclaimer */}
                {msg.disclaimer && (
                  <div className="bg-muted/60 border border-border rounded-lg p-2.5 text-[11px] text-muted-foreground leading-relaxed">
                    ⚕️ Remedoo Symptom Assistant provides informational guidance only and is not a medical diagnosis. Always consult a qualified doctor for professional medical advice.
                  </div>
                )}

                {/* Quick replies */}
                {msg.quickReplies && !conversationDone && (
                  <div className="flex flex-wrap gap-1.5">
                    {msg.quickReplies.map(qr => (
                      <button
                        key={qr}
                        onClick={() => handleSend(qr)}
                        className={cn(
                          "text-xs px-3 py-1.5 rounded-full border font-medium transition-colors",
                          qr === "Request Ambulance"
                            ? "bg-destructive text-destructive-foreground border-destructive hover:bg-destructive/90"
                            : qr === "Find Nearest Hospital"
                              ? "bg-primary text-primary-foreground border-primary hover:bg-primary/90"
                              : "bg-card border-border text-foreground hover:bg-accent"
                        )}
                      >
                        {qr === "Request Ambulance" && <Ambulance className="w-3 h-3 inline mr-1" />}
                        {qr === "Find Nearest Hospital" && <Building2 className="w-3 h-3 inline mr-1" />}
                        {qr}
                      </button>
                    ))}
                  </div>
                )}

                {/* Emergency quick replies even after done */}
                {msg.isEmergency && msg.quickReplies && (
                  <div className="flex flex-wrap gap-1.5">
                    {msg.quickReplies.map(qr => (
                      <button
                        key={qr}
                        onClick={() => {
                          if (qr === "Request Ambulance") navigate("/emergency");
                          if (qr === "Find Nearest Hospital") navigate("/hospitals");
                        }}
                        className={cn(
                          "text-xs px-3 py-1.5 rounded-full border font-medium transition-colors",
                          qr === "Request Ambulance"
                            ? "bg-destructive text-destructive-foreground border-destructive"
                            : "bg-primary text-primary-foreground border-primary"
                        )}
                      >
                        {qr === "Request Ambulance" && <Ambulance className="w-3 h-3 inline mr-1" />}
                        {qr === "Find Nearest Hospital" && <Building2 className="w-3 h-3 inline mr-1" />}
                        {qr}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {loading && (
          <div className="flex justify-start">
            <div className="bg-card border border-border rounded-2xl rounded-bl-md px-4 py-3">
              <div className="flex gap-1.5">
                <div className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "0ms" }} />
                <div className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "150ms" }} />
                <div className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="shrink-0 border-t border-border bg-card px-3 py-2.5 safe-bottom">
        {conversationDone ? (
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => {
              setMessages([{
                id: "init",
                role: "assistant",
                text: "Hello! I am the Remedoo Symptom Assistant.\n\nPlease describe how you are feeling today.",
                quickReplies: QUICK_SYMPTOMS,
              }]);
              setIdentifiedSymptoms([]);
              setPendingQuestions([]);
              setConversationDone(false);
            }}>
              Start New Check
            </Button>
            <Button className="flex-1" onClick={() => navigate("/dashboard")}>
              Go to Dashboard
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
              className="flex-1 bg-muted rounded-full px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none"
              disabled={loading}
            />
            <button aria-label="Send message"
              onClick={() => handleSend()}
              disabled={!input.trim() || loading}
              className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-40 transition-opacity"
            ><Send className="w-4 h-4" /></button>
          </div>
        )}
      </div>
    </div>
  );
}
