import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Search, UserCheck, UserX, Ban, MoreHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function AdminUsers() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchUsers = async () => {
    setLoading(true);
    const { data } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
    setData(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchUsers(); }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return data;
    const q = search.toLowerCase();
    return data.filter(u =>
      (u.full_name || "").toLowerCase().includes(q) ||
      (u.email || "").toLowerCase().includes(q) ||
      (u.phone || "").toLowerCase().includes(q)
    );
  }, [data, search]);

  const updateStatus = async (userId: string, status: string) => {
    const { error } = await supabase.from("profiles").update({ status }).eq("user_id", userId);
    if (error) { toast.error("Failed to update status"); return; }
    toast.success(`User ${status === "active" ? "activated" : status === "suspended" ? "suspended" : "deactivated"}`);
    fetchUsers();
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case "active": return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-200">Active</Badge>;
      case "suspended": return <Badge className="bg-amber-500/10 text-amber-600 border-amber-200">Suspended</Badge>;
      case "deactivated": return <Badge className="bg-red-500/10 text-red-600 border-red-200">Deactivated</Badge>;
      default: return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-5">
        <h1 className="text-xl md:text-2xl font-bold text-foreground">User Management</h1>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">No users found</div>
        ) : (
          <>
            {/* Desktop */}
            <div className="hidden md:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="w-20">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">{u.full_name || "—"}</TableCell>
                      <TableCell>{u.email || "—"}</TableCell>
                      <TableCell>{u.phone || "—"}</TableCell>
                      <TableCell>{statusBadge(u.status || "active")}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{new Date(u.created_at).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="w-4 h-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {(u.status || "active") !== "active" && (
                              <DropdownMenuItem onClick={() => updateStatus(u.user_id, "active")}>
                                <UserCheck className="w-4 h-4 mr-2" /> Activate
                              </DropdownMenuItem>
                            )}
                            {(u.status || "active") !== "suspended" && (
                              <DropdownMenuItem onClick={() => updateStatus(u.user_id, "suspended")}>
                                <Ban className="w-4 h-4 mr-2" /> Suspend
                              </DropdownMenuItem>
                            )}
                            {(u.status || "active") !== "deactivated" && (
                              <DropdownMenuItem onClick={() => updateStatus(u.user_id, "deactivated")} className="text-destructive">
                                <UserX className="w-4 h-4 mr-2" /> Deactivate
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Mobile */}
            <div className="md:hidden divide-y divide-border">
              {filtered.map((u) => (
                <div key={u.id} className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-foreground">{u.full_name || "—"}</p>
                      <p className="text-sm text-muted-foreground">{u.email || "—"}</p>
                    </div>
                    {statusBadge(u.status || "active")}
                  </div>
                  <div className="flex gap-2 pt-1">
                    {(u.status || "active") !== "active" && (
                      <Button variant="outline" size="sm" onClick={() => updateStatus(u.user_id, "active")} className="gap-1 text-xs">
                        <UserCheck className="w-3.5 h-3.5" /> Activate
                      </Button>
                    )}
                    {(u.status || "active") !== "suspended" && (
                      <Button variant="outline" size="sm" onClick={() => updateStatus(u.user_id, "suspended")} className="gap-1 text-xs">
                        <Ban className="w-3.5 h-3.5" /> Suspend
                      </Button>
                    )}
                    {(u.status || "active") !== "deactivated" && (
                      <Button variant="outline" size="sm" onClick={() => updateStatus(u.user_id, "deactivated")} className="gap-1 text-xs text-destructive">
                        <UserX className="w-3.5 h-3.5" /> Deactivate
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
      <p className="text-xs text-muted-foreground mt-3">{filtered.length} user{filtered.length !== 1 ? "s" : ""} found</p>
    </div>
  );
}
