import { useState, useEffect } from "react";
import { MessageSquarePlus, Send, X, ChevronLeft, MessageSquare, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import SupportChat from "@/components/support/SupportChat";

export default function SupportQueryFab() {
  const [open, setOpen] = useState(false);
  const [tickets, setTickets] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [userId, setUserId] = useState("");
  const [chatTicket, setChatTicket] = useState<any>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [view, setView] = useState<"list" | "new">("list");
  const navigate = useNavigate();

  const loadTickets = async () => {
    setChecking(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setChecking(false); return; }
    setUserId(session.user.id);
    const { data } = await supabase
      .from("support_tickets")
      .select("*")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false });
    setTickets(data || []);
    setChecking(false);
    if (data) {
      await countUnread(session.user.id, data);
    }
  };

  const countUnread = async (uid: string, tkts: any[]) => {
    const activeTickets = tkts.filter(t => t.status === "open" || t.status === "in_progress");
    let count = 0;
    for (const t of activeTickets) {
      const { count: msgCount } = await supabase
        .from("support_ticket_messages")
        .select("*", { count: "exact", head: true })
        .eq("ticket_id", t.id)
        .eq("sender_role", "admin")
        .eq("is_read", false as any);
      count += (msgCount || 0);
    }
    setUnreadCount(count);
  };

  useEffect(() => { loadTickets(); }, []);

  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel("fab-unread")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "support_ticket_messages" }, () => {
        loadTickets();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  const hasOpenTicket = tickets.some(t => t.status === "open" || t.status === "in_progress");

  const handleSubmit = async () => {
    if (!subject.trim() || !description.trim()) {
      toast.error("Please fill in both subject and description");
      return;
    }
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { toast.error("Please log in first"); return; }

    if (hasOpenTicket) {
      toast.error("You already have an active query. Please close it first.");
      return;
    }

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
    setChatTicket(data);
    setChatOpen(true);
    loadTickets();
  };

  const handleCloseTicket = async () => {
    if (!chatTicket) return;
    const { error } = await supabase.from("support_tickets").update({ status: "closed" }).eq("id", chatTicket.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Query closed");
    setChatOpen(false);
    setChatTicket(null);
    loadTickets();
  };

  const statusColor = (s: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (s) { case "resolved": case "closed": return "default"; case "in_progress": return "secondary"; default: return "outline"; }
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
            onClick={() => { setView("list"); setOpen(true); }}
            className="fixed bottom-20 right-4 z-50 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:shadow-xl transition-shadow"
          >
            <MessageSquarePlus className="w-6 h-6" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-background">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </motion.button>
        )}
      </AnimatePresence>

      {/* Ticket List / New Query Panel */}
      <AnimatePresence>
        {open && !chatOpen && (
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="fixed bottom-20 right-3 left-3 sm:left-auto sm:w-[370px] z-50 flex flex-col bg-background border border-border rounded-2xl shadow-2xl overflow-hidden max-h-[70vh]"
          >
            <div className="shrink-0 bg-primary text-primary-foreground px-4 py-3 flex items-center gap-3">
              {view === "new" && (
                <button onClick={() => setView("list")} className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-primary-foreground/10">
                  <ChevronLeft className="w-4 h-4" />
                </button>
              )}
              <MessageSquarePlus className="w-5 h-5" />
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold">{view === "list" ? "My Queries" : "New Query"}</h3>
                <p className="text-[10px] opacity-75">{view === "list" ? `${tickets.length} total queries` : "Raise a query, our team will help"}</p>
              </div>
              <div className="flex items-center gap-1">
                {view === "list" && (
                  <button
                    onClick={() => { setOpen(false); navigate("/support-tickets"); }}
                    className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-primary-foreground/10"
                    title="View All Queries"
                  >
                    <List className="w-4 h-4" />
                  </button>
                )}
                <button onClick={() => setOpen(false)} className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-primary-foreground/10">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {view === "list" ? (
              <div className="flex-1 overflow-y-auto">
                {checking ? (
                  <p className="text-xs text-muted-foreground text-center py-8">Loading...</p>
                ) : tickets.length === 0 ? (
                  <div className="text-center py-8 px-4 space-y-3">
                    <MessageSquare className="w-10 h-10 mx-auto text-muted-foreground/50" />
                    <p className="text-xs text-muted-foreground">No queries yet</p>
                    <Button size="sm" onClick={() => setView("new")} className="text-xs">Create Query</Button>
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {tickets.slice(0, 5).map(t => (
                      <button
                        key={t.id}
                        className="w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors"
                        onClick={() => { setChatTicket(t); setChatOpen(true); setOpen(false); }}
                      >
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-[10px] bg-muted px-1.5 py-0.5 rounded text-primary font-bold">#{t.ticket_number}</span>
                          <Badge variant={statusColor(t.status)} className="text-[10px] h-4 px-1.5">{t.status.replace("_", " ")}</Badge>
                        </div>
                        <p className="text-sm font-medium text-foreground truncate mt-1">{t.subject}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{new Date(t.created_at).toLocaleDateString()}</p>
                      </button>
                    ))}
                  </div>
                )}
                <div className="p-3 border-t border-border space-y-2">
                  {tickets.length > 5 && (
                    <Button size="sm" variant="outline" onClick={() => { setOpen(false); navigate("/support-tickets"); }} className="w-full text-xs">
                      View All {tickets.length} Queries
                    </Button>
                  )}
                  {!hasOpenTicket && (
                    <Button size="sm" onClick={() => setView("new")} className="w-full text-xs">+ New Query</Button>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-4 space-y-3">
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
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat Dialog - Larger */}
      <Dialog open={chatOpen} onOpenChange={(o) => { if (!o) { setChatOpen(false); loadTickets(); } }}>
        <DialogContent className="p-0 max-w-2xl h-[85vh] flex flex-col overflow-hidden">
          {chatTicket && (
            <SupportChat
              ticketId={chatTicket.id}
              ticketSubject={chatTicket.subject}
              ticketDescription={chatTicket.description}
              ticketNumber={chatTicket.ticket_number}
              ticketStatus={chatTicket.status}
              currentUserId={userId}
              onClose={() => { setChatOpen(false); loadTickets(); }}
              onCloseTicket={chatTicket.status !== "resolved" && chatTicket.status !== "closed" ? handleCloseTicket : undefined}
              onViewAllQueries={() => { setChatOpen(false); setOpen(false); navigate("/support-tickets"); }}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
