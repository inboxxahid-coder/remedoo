import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, X, Timer, AlertTriangle, ShieldAlert, List } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";

const PATIENT_QUICK_REPLIES = [
  "Thank you for your help!",
  "I need more information",
  "This issue is resolved",
  "Can you please check again?",
  "How long will this take?",
];

const ADMIN_QUICK_REPLIES = [
  "We're looking into this",
  "Could you share more details?",
  "This has been resolved",
  "Please try again now",
  "I'm escalating this to the team",
  "Is there anything else I can help with?",
];

interface SupportChatProps {
  ticketId: string;
  ticketSubject: string;
  ticketDescription?: string;
  ticketNumber?: number;
  ticketStatus: string;
  currentUserId: string;
  isAdmin?: boolean;
  onClose?: () => void;
  onCloseTicket?: () => void;
  onViewAllQueries?: () => void;
  onStatusChange?: (newStatus: string) => void;
}

export default function SupportChat({
  ticketId,
  ticketSubject,
  ticketDescription,
  ticketNumber,
  ticketStatus,
  currentUserId,
  isAdmin = false,
  onClose,
  onCloseTicket,
  onViewAllQueries,
  onStatusChange,
}: SupportChatProps) {
  const [messages, setMessages] = useState<any[]>([]);
  const [newMsg, setNewMsg] = useState("");
  const [sending, setSending] = useState(false);
  const [closing, setClosing] = useState(false);
  const [closeCountdown, setCloseCountdown] = useState(0);
  const [adminCloseWarning, setAdminCloseWarning] = useState(false);
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const [liveStatus, setLiveStatus] = useState(ticketStatus);
  const bottomRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isClosed = liveStatus === "resolved" || liveStatus === "closed";

  // Sync liveStatus when prop changes
  useEffect(() => { setLiveStatus(ticketStatus); }, [ticketStatus]);

  const quickReplies = isAdmin ? ADMIN_QUICK_REPLIES : PATIENT_QUICK_REPLIES;

  const loadMessages = async () => {
    const { data } = await supabase
      .from("support_ticket_messages")
      .select("*")
      .eq("ticket_id", ticketId)
      .order("created_at", { ascending: true });
    setMessages(data || []);

    if (data && data.length > 0) {
      const unreadIds = data
        .filter(m => m.sender_id !== currentUserId && !(m as any).is_read)
        .map(m => m.id);
      if (unreadIds.length > 0) {
        await supabase
          .from("support_ticket_messages")
          .update({ is_read: true } as any)
          .in("id", unreadIds);
      }
    }
  };

  useEffect(() => {
    loadMessages();
    const channel = supabase
      .channel(`ticket-${ticketId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "support_ticket_messages", filter: `ticket_id=eq.${ticketId}` }, (payload) => {
        setMessages((prev) => {
          // Avoid duplicates
          if (prev.some(m => m.id === payload.new.id)) return prev;
          return [...prev, payload.new];
        });
        if (payload.new.sender_id !== currentUserId) {
          supabase.from("support_ticket_messages").update({ is_read: true } as any).eq("id", payload.new.id).then();
        }
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "support_ticket_messages", filter: `ticket_id=eq.${ticketId}` }, () => {
        loadMessages();
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "support_tickets", filter: `id=eq.${ticketId}` }, (payload: any) => {
        const newStatus = payload.new?.status;
        if (newStatus) {
          setLiveStatus(newStatus);
          onStatusChange?.(newStatus);
          if (newStatus === "resolved" || newStatus === "closed") {
            setClosing(false);
            setCloseCountdown(0);
            if (timerRef.current) clearInterval(timerRef.current);
          }
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [ticketId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const handleSend = async (text?: string) => {
    const msgText = text || newMsg.trim();
    if (!msgText || isClosed) return;
    setSending(true);

    let senderName: string | null = null;
    if (isAdmin) {
      const { data: adminData } = await supabase
        .from("admin_team")
        .select("name")
        .eq("user_id", currentUserId)
        .single();
      senderName = adminData?.name || null;
    }

    if (isAdmin && senderName) {
      const existingAdminMsgs = messages.filter(m => m.sender_id === currentUserId && m.sender_role === "admin");
      if (existingAdminMsgs.length === 0) {
        await supabase.from("support_ticket_messages").insert({
          ticket_id: ticketId,
          sender_id: currentUserId,
          sender_role: "system",
          message: `${senderName} joined the chat`,
        });
      }
    }

    const { error } = await supabase.from("support_ticket_messages").insert({
      ticket_id: ticketId,
      sender_id: currentUserId,
      sender_role: isAdmin ? "admin" : "user",
      message: msgText,
    });
    setSending(false);
    if (error) { toast.error(error.message); return; }
    setNewMsg("");
    setShowQuickReplies(false);

    if (isAdmin && ticketStatus === "open") {
      await supabase.from("support_tickets").update({ status: "in_progress" }).eq("id", ticketId);
    }
  };

  const handleCloseClick = () => {
    if (isAdmin) {
      setAdminCloseWarning(true);
      return;
    }
    setClosing(true);
    setCloseCountdown(25);
    timerRef.current = setInterval(() => {
      setCloseCountdown((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const confirmClose = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setClosing(false);
    setCloseCountdown(0);
    onCloseTicket?.();
  };

  const cancelClose = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setClosing(false);
    setCloseCountdown(0);
  };

  const handleAdminConfirmClose = () => {
    setAdminCloseWarning(false);
    onCloseTicket?.();
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="shrink-0 bg-primary text-primary-foreground px-4 py-3 flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {ticketNumber && (
              <span className="text-[10px] font-mono bg-primary-foreground/20 px-1.5 py-0.5 rounded">#{ticketNumber}</span>
            )}
            <h3 className="text-sm font-bold truncate">{ticketSubject}</h3>
          </div>
          <p className="text-[10px] opacity-75 capitalize">{ticketStatus.replace("_", " ")}</p>
        </div>
        <div className="flex items-center gap-1">
          {onViewAllQueries && (
            <button
              onClick={onViewAllQueries}
              className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-primary-foreground/10 transition-colors"
              title="View All Queries"
            >
              <List className="w-4 h-4" />
            </button>
          )}
          {onClose && (
            <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-primary-foreground/10 transition-colors">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-muted/30 min-h-0">
        {messages.length === 0 && !isAdmin && (
          <p className="text-xs text-muted-foreground text-center py-8">No messages yet. Start the conversation.</p>
        )}
        {messages.map((m) => {
          if (m.sender_role === "system") {
            return (
              <div key={m.id} className="flex justify-center py-1">
                <span className="text-[10px] text-muted-foreground bg-muted px-3 py-1 rounded-full">
                  {m.message}
                </span>
              </div>
            );
          }
          const isMe = m.sender_id === currentUserId;
          return (
            <div key={m.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm ${isMe ? "bg-primary text-primary-foreground rounded-br-md" : "bg-background border border-border rounded-bl-md"}`}>
                <p className="whitespace-pre-wrap break-words">{m.message}</p>
                <p className={`text-[9px] mt-1 ${isMe ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                  {m.sender_role === "admin" ? "Support" : "You"} · {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Footer */}
      {isClosed ? (
        <div className="shrink-0 p-3 text-center border-t border-border">
          <p className="text-xs text-muted-foreground">This query has been closed.</p>
        </div>
      ) : closing ? (
        <div className="shrink-0 p-3 border-t border-border space-y-2">
          <div className="flex items-center gap-2 bg-destructive/10 text-destructive rounded-lg p-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <p className="text-xs font-medium">Are you sure you want to close this query? This action cannot be undone.</p>
          </div>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Timer className="w-3.5 h-3.5" />
              {closeCountdown > 0 ? `Wait ${closeCountdown}s` : "Ready to close"}
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={cancelClose} className="text-xs h-8">Cancel</Button>
              <Button size="sm" variant="destructive" onClick={confirmClose} disabled={closeCountdown > 0} className="text-xs h-8">
                {closeCountdown > 0 ? `Close (${closeCountdown}s)` : "Confirm Close"}
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="shrink-0 p-3 border-t border-border space-y-2">
          {showQuickReplies && (
            <div className="flex flex-wrap gap-1.5 pb-1">
              {quickReplies.map((qr) => (
                <button
                  key={qr}
                  onClick={() => handleSend(qr)}
                  className="text-[11px] px-2.5 py-1 rounded-full border border-border bg-muted hover:bg-accent text-foreground transition-colors"
                >
                  {qr}
                </button>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <button
              onClick={() => setShowQuickReplies(!showQuickReplies)}
              className="shrink-0 w-9 h-9 rounded-md border border-border flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors text-xs font-bold"
              title="Quick replies"
            >
              ⚡
            </button>
            <Input
              value={newMsg}
              onChange={(e) => setNewMsg(e.target.value)}
              placeholder="Type a message..."
              className="text-sm h-9"
              maxLength={1000}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
            />
            <Button size="sm" onClick={() => handleSend()} disabled={sending || !newMsg.trim()} className="h-9 px-3">
              <Send className="w-4 h-4" />
            </Button>
          </div>
          {onCloseTicket && (
            <Button size="sm" variant="outline" onClick={handleCloseClick} className="w-full text-xs">
              {isAdmin ? "Resolve & Close Query" : "Close My Query"}
            </Button>
          )}
        </div>
      )}

      {/* Admin Close Warning Dialog */}
      <AlertDialog open={adminCloseWarning} onOpenChange={setAdminCloseWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-destructive" />
              Close Without Resolving?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>If you close this query without properly resolving it, <strong className="text-destructive">it will affect your performance metrics</strong>.</p>
              <p>Make sure the user's issue has been addressed before closing.</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Go Back</AlertDialogCancel>
            <AlertDialogAction onClick={handleAdminConfirmClose} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Close Anyway
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
