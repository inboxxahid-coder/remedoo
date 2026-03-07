import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, X } from "lucide-react";
import { toast } from "sonner";

interface SupportChatProps {
  ticketId: string;
  ticketSubject: string;
  ticketStatus: string;
  currentUserId: string;
  isAdmin?: boolean;
  onClose?: () => void;
  onCloseTicket?: () => void;
}

export default function SupportChat({
  ticketId,
  ticketSubject,
  ticketStatus,
  currentUserId,
  isAdmin = false,
  onClose,
  onCloseTicket,
}: SupportChatProps) {
  const [messages, setMessages] = useState<any[]>([]);
  const [newMsg, setNewMsg] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
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

    // If admin sends first message, mark ticket as in_progress
    if (isAdmin && ticketStatus === "open") {
      await supabase.from("support_tickets").update({ status: "in_progress" }).eq("id", ticketId);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="shrink-0 bg-primary text-primary-foreground px-4 py-3 flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold truncate">{ticketSubject}</h3>
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
        {messages.length === 0 && (
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
            <Button size="sm" variant="outline" onClick={onCloseTicket} className="w-full text-xs">
              {isAdmin ? "Resolve & Close Query" : "Close My Query"}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
