import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MessageSquarePlus, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import SupportChat from "@/components/support/SupportChat";

export default function SupportQueryFab() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [openTicket, setOpenTicket] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [userId, setUserId] = useState("");
  const [chatOpen, setChatOpen] = useState(false);

  const checkOpenTicket = async () => {
    setChecking(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setChecking(false); return; }
    setUserId(session.user.id);
    const { data } = await supabase
      .from("support_tickets")
      .select("*")
      .eq("user_id", session.user.id)
      .in("status", ["open", "in_progress"])
      .limit(1);
    setOpenTicket(data?.[0] || null);
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
    const { data, error } = await supabase.from("support_tickets").insert({
      user_id: session.user.id,
      subject: subject.trim(),
      description: description.trim(),
      category: "general",
      priority: "medium",
      sender_type: "patient",
    }).select().single();
    setLoading(false);

    if (error) { toast.error(error.message); return; }
    toast.success("Support query submitted!");
    setSubject("");
    setDescription("");
    setOpen(false);
    setOpenTicket(data);
    setChatOpen(true);
  };

  const handleCloseTicket = async () => {
    if (!openTicket) return;
    const { error } = await supabase.from("support_tickets").update({ status: "closed" }).eq("id", openTicket.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Query closed");
    setChatOpen(false);
    setOpenTicket(null);
  };

  return (
    <>
      {/* FAB */}
      <AnimatePresence>
        {!open && !chatOpen && (
          <motion.button
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => {
              if (openTicket) setChatOpen(true);
              else setOpen(true);
            }}
            className="fixed bottom-20 right-4 z-50 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:shadow-xl transition-shadow"
          >
            <MessageSquarePlus className="w-6 h-6" />
            {openTicket && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-destructive rounded-full border-2 border-background" />
            )}
          </motion.button>
        )}
      </AnimatePresence>

      {/* New Query Panel */}
      <AnimatePresence>
        {open && !openTicket && (
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="fixed bottom-20 right-3 left-3 sm:left-auto sm:w-[370px] z-50 flex flex-col bg-background border border-border rounded-2xl shadow-2xl overflow-hidden"
          >
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
            <div className="p-4 space-y-3">
              {checking ? (
                <p className="text-xs text-muted-foreground text-center py-4">Checking...</p>
              ) : (
                <>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-foreground">Subject</label>
                    <Input placeholder="Brief summary of your issue" value={subject} onChange={e => setSubject(e.target.value)} className="text-xs h-9" maxLength={100} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-foreground">Description</label>
                    <Textarea placeholder="Describe your issue in detail..." value={description} onChange={e => setDescription(e.target.value)} className="text-xs min-h-[100px] resize-none" maxLength={500} />
                    <p className="text-[10px] text-muted-foreground text-right">{description.length}/500</p>
                  </div>
                  <Button onClick={handleSubmit} disabled={loading || !subject.trim() || !description.trim()} className="w-full gap-2 text-xs" size="sm">
                    <Send className="w-3.5 h-3.5" />
                    {loading ? "Submitting..." : "Submit Query"}
                  </Button>
                  <p className="text-[10px] text-muted-foreground text-center">1 query at a time. Our team will respond soon.</p>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat Dialog */}
      <Dialog open={chatOpen} onOpenChange={(o) => { if (!o) setChatOpen(false); }}>
        <DialogContent className="p-0 max-w-lg h-[70vh] flex flex-col overflow-hidden">
          {openTicket && (
            <SupportChat
              ticketId={openTicket.id}
              ticketSubject={openTicket.subject}
              ticketDescription={openTicket.description}
              ticketNumber={openTicket.ticket_number}
              ticketStatus={openTicket.status}
              currentUserId={userId}
              onClose={() => setChatOpen(false)}
              onCloseTicket={openTicket.status !== "resolved" && openTicket.status !== "closed" ? handleCloseTicket : undefined}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
