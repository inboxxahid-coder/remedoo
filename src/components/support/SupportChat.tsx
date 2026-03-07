import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, X, Timer, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

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
}: SupportChatProps) {
  const [messages, setMessages] = useState<any[]>([]);
  const [newMsg, setNewMsg] = useState("");
  const [sending, setSending] = useState(false);
  const [closing, setClosing] = useState(false);
  const [closeCountdown, setCloseCountdown] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isClosed = ticketStatus === "resolved" || ticketStatus === "closed";

  const loadMessages = async () => {
    const { data } = await supabase
      .from("support_ticket_messages")
      .select("*")
      .eq("ticket_id", ticketId)
      .order("created_at", { ascending: true });
    setMessages(data || []);
  };

  useEffect(() => {
    loadMessages();
    const channel = supabase
      .channel(`ticket-${ticketId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "support_ticket_messages", filter: `ticket_id=eq.${ticketId}` }, (payload) => {
        setMessages((prev) => [...prev, payload.new]);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [ticketId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const handleSend = async () => {
    if (!newMsg.trim() || isClosed) return;
    setSending(true);
    const { error } = await supabase.from("support_ticket_messages").insert({
      ticket_id: ticketId,
      sender_id: currentUserId,
      sender_role: isAdmin ? "admin" : "user",
      message: newMsg.trim(),
    });
    setSending(false);
    if (error) { toast.error(error.message); return; }
    setNewMsg("");

    if (isAdmin && ticketStatus === "open") {
      await supabase.from("support_tickets").update({ status: "in_progress" }).eq("id", ticketId);
    }
  };

  const handleCloseClick = () => {
    if (isAdmin) {
      // Admin can close immediately
      onCloseTicket?.();
      return;
    }
    // Patient: start 25s countdown
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
        {onClose && (
          <button onClick={onClose} className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-primary-foreground/10">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-muted/30 min-h-0">
        {/* Show subject & description as first system message for admin */}
        {isAdmin && ticketDescription && (
          <div className="flex justify-center">
            <div className="max-w-[90%] px-3 py-2 rounded-xl bg-accent/50 border border-border text-xs text-center space-y-1">
              <p className="font-semibold text-foreground">{ticketSubject}</p>
              <p className="text-muted-foreground whitespace-pre-wrap">{ticketDescription}</p>
              {ticketNumber && <p className="text-[10px] text-muted-foreground font-mono">Ticket #{ticketNumber}</p>}
            </div>
          </div>
        )}
        {messages.length === 0 && !isAdmin && (
          <p className="text-xs text-muted-foreground text-center py-8">No messages yet. Start the conversation.</p>
        )}
        {messages.map((m) => {
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
          <div className="flex gap-2">
            <Input
              value={newMsg}
              onChange={(e) => setNewMsg(e.target.value)}
              placeholder="Type a message..."
              className="text-sm h-9"
              maxLength={1000}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
            />
            <Button size="sm" onClick={handleSend} disabled={sending || !newMsg.trim()} className="h-9 px-3">
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
    </div>
  );
}
