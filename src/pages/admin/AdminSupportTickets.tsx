import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { MessageSquare, Filter, Clock, Users, Stethoscope, Building2, FlaskConical, Pill, Search } from "lucide-react";
import SupportChat from "@/components/support/SupportChat";

const BRANCHES = [
  { value: "all", label: "All", icon: MessageSquare },
  { value: "patient", label: "Patients", icon: Users },
  { value: "doctor", label: "Doctors", icon: Stethoscope },
  { value: "hospital", label: "Hospitals", icon: Building2 },
  { value: "lab", label: "Labs", icon: FlaskConical },
  { value: "pharmacy", label: "Pharmacies", icon: Pill },
];

export default function AdminSupportTickets() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [branch, setBranch] = useState("all");
  const [chatTicket, setChatTicket] = useState<any>(null);
  const [userId, setUserId] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const load = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) setUserId(session.user.id);
    const { data } = await supabase.from("support_tickets").select("*").order("created_at", { ascending: false });
    setTickets(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = tickets
    .filter(t => statusFilter === "all" || t.status === statusFilter)
    .filter(t => branch === "all" || (t.sender_type || "patient") === branch)
    .filter(t => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.trim().toLowerCase();
      const ticketNum = String(t.ticket_number || "");
      return ticketNum.includes(q) || (t.subject || "").toLowerCase().includes(q) || (t.description || "").toLowerCase().includes(q);
    });

  const getCountForBranch = (b: string) => {
    if (b === "all") return tickets.filter(t => t.status === "open" || t.status === "in_progress").length;
    return tickets.filter(t => (t.sender_type || "patient") === b && (t.status === "open" || t.status === "in_progress")).length;
  };

  const handleCloseTicket = async () => {
    if (!chatTicket) return;
    const { error } = await supabase.from("support_tickets").update({
      status: "resolved",
      resolved_by: userId,
      resolved_at: new Date().toISOString(),
    }).eq("id", chatTicket.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Query resolved & closed");
    setChatTicket(null);
    load();
  };

  const priorityColor = (p: string) => {
    switch (p) { case "urgent": case "high": return "destructive"; case "medium": return "outline"; default: return "secondary"; }
  };

  const statusBadge = (s: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (s) { case "resolved": case "closed": return "default"; case "in_progress": return "secondary"; default: return "outline"; }
  };

  const senderIcon = (type: string) => {
    switch (type) {
      case "doctor": return <Stethoscope className="w-3.5 h-3.5" />;
      case "hospital": return <Building2 className="w-3.5 h-3.5" />;
      case "lab": return <FlaskConical className="w-3.5 h-3.5" />;
      case "pharmacy": return <Pill className="w-3.5 h-3.5" />;
      default: return <Users className="w-3.5 h-3.5" />;
    }
  };

  if (loading) return (
    <div className="space-y-4">
      <Skeleton className="w-48 h-8 rounded" />
      {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 rounded-2xl" />)}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <MessageSquare className="w-6 h-6 text-primary" /> Support Center
        </h1>
        <Badge variant="outline">{tickets.filter(t => t.status === "open" || t.status === "in_progress").length} active</Badge>
      </div>

      {/* Search */}
      <div className="relative w-full sm:w-80">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search by ticket #, subject..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Branch Tabs */}
      <Tabs value={branch} onValueChange={setBranch}>
        <TabsList className="w-full flex-wrap h-auto gap-1 p-1">
          {BRANCHES.map(b => {
            const count = getCountForBranch(b.value);
            return (
              <TabsTrigger key={b.value} value={b.value} className="flex items-center gap-1.5 text-xs">
                <b.icon className="w-3.5 h-3.5" />
                {b.label}
                {count > 0 && <Badge variant="secondary" className="text-[10px] h-4 px-1 ml-1">{count}</Badge>}
              </TabsTrigger>
            );
          })}
        </TabsList>
      </Tabs>

      {/* Status filter */}
      <Select value={statusFilter} onValueChange={setStatusFilter}>
        <SelectTrigger className="w-48"><Filter className="w-4 h-4 mr-1" /><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Status</SelectItem>
          <SelectItem value="open">Open</SelectItem>
          <SelectItem value="in_progress">In Progress</SelectItem>
          <SelectItem value="resolved">Resolved</SelectItem>
          <SelectItem value="closed">Closed</SelectItem>
        </SelectContent>
      </Select>

      {filtered.length === 0 ? (
        <Card className="p-12 text-center"><p className="text-muted-foreground">No tickets found</p></Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(t => (
            <Card key={t.id} className="p-4 hover:shadow-md transition-shadow cursor-pointer" onClick={() => setChatTicket(t)}>
              <div className="flex items-start justify-between flex-wrap gap-3">
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded text-primary font-bold">#{t.ticket_number}</span>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full capitalize">
                      {senderIcon(t.sender_type || "patient")}
                      {t.sender_type || "patient"}
                    </span>
                    <p className="font-semibold text-foreground">{t.subject}</p>
                    <Badge variant={statusBadge(t.status)}>{t.status.replace("_", " ")}</Badge>
                    <Badge variant={priorityColor(t.priority) as any} className="text-xs">{t.priority}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-1">{t.description}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {new Date(t.created_at).toLocaleString()}
                  </p>
                </div>
                <Button size="sm" onClick={(e) => { e.stopPropagation(); setChatTicket(t); }}>
                  Open Chat
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!chatTicket} onOpenChange={(o) => { if (!o) setChatTicket(null); }}>
        <DialogContent className="p-0 max-w-lg h-[70vh] flex flex-col overflow-hidden">
          {chatTicket && (
            <SupportChat
              ticketId={chatTicket.id}
              ticketSubject={chatTicket.subject}
              ticketDescription={chatTicket.description}
              ticketNumber={chatTicket.ticket_number}
              ticketStatus={chatTicket.status}
              currentUserId={userId}
              isAdmin
              onClose={() => setChatTicket(null)}
              onCloseTicket={chatTicket.status !== "resolved" && chatTicket.status !== "closed" ? handleCloseTicket : undefined}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
