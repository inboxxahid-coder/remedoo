import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MessageSquarePlus, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function SupportQueryFab() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [hasOpenTicket, setHasOpenTicket] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");

  const checkOpenTicket = async () => {
    setChecking(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setChecking(false); return; }
    const { data } = await supabase
      .from("support_tickets")
      .select("id")
      .eq("user_id", session.user.id)
      .in("status", ["open", "in_progress"])
      .limit(1);
    setHasOpenTicket((data?.length ?? 0) > 0);
    setChecking(false);
  };

  useEffect(() => { checkOpenTicket(); }, []);

  const handleSubmit = async () => {
    if (!subject.trim() || !description.trim()) {
      toast.error("Please fill in both subject and description");
      return;
    }
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { toast.error("Please log in first"); return; }

    setLoading(true);
    const { error } = await supabase.from("support_tickets").insert({
      user_id: session.user.id,
      subject: subject.trim(),
      description: description.trim(),
      category: "general",
      priority: "medium",
    });
    setLoading(false);

    if (error) { toast.error(error.message); return; }
    toast.success("Support query submitted! Our team will respond soon.");
    setSubject("");
    setDescription("");
    setOpen(false);
    setHasOpenTicket(true);
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
            <MessageSquarePlus className="w-6 h-6" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="fixed bottom-20 right-3 left-3 sm:left-auto sm:w-[370px] z-50 flex flex-col bg-background border border-border rounded-2xl shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="shrink-0 bg-primary text-primary-foreground px-4 py-3 flex items-center gap-3">
              <MessageSquarePlus className="w-5 h-5" />
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold">Support Query</h3>
                <p className="text-[10px] opacity-75">Raise a query, our team will help you</p>
              </div>
              <button onClick={() => setOpen(false)} className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-primary-foreground/10">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-4 space-y-3">
              {checking ? (
                <p className="text-xs text-muted-foreground text-center py-4">Checking...</p>
              ) : hasOpenTicket ? (
                <div className="text-center py-4 space-y-3">
                  <div className="w-12 h-12 rounded-full bg-accent mx-auto flex items-center justify-center">
                    <MessageSquarePlus className="w-5 h-5 text-accent-foreground" />
                  </div>
                  <p className="text-sm text-foreground font-medium">You already have an open query</p>
                  <p className="text-xs text-muted-foreground">
                    Please wait for our team to respond before submitting a new one.
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => { setOpen(false); navigate("/support-tickets"); }}
                    className="text-xs"
                  >
                    View My Tickets
                  </Button>
                </div>
              ) : (
                <>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-foreground">Subject</label>
                    <Input
                      placeholder="Brief summary of your issue"
                      value={subject}
                      onChange={e => setSubject(e.target.value)}
                      className="text-xs h-9"
                      maxLength={100}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-foreground">Description</label>
                    <Textarea
                      placeholder="Describe your issue in detail..."
                      value={description}
                      onChange={e => setDescription(e.target.value)}
                      className="text-xs min-h-[100px] resize-none"
                      maxLength={500}
                    />
                    <p className="text-[10px] text-muted-foreground text-right">{description.length}/500</p>
                  </div>
                  <Button
                    onClick={handleSubmit}
                    disabled={loading || !subject.trim() || !description.trim()}
                    className="w-full gap-2 text-xs"
                    size="sm"
                  >
                    <Send className="w-3.5 h-3.5" />
                    {loading ? "Submitting..." : "Submit Query"}
                  </Button>
                  <p className="text-[10px] text-muted-foreground text-center">
                    You can submit 1 query at a time. Our team will respond soon.
                  </p>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
