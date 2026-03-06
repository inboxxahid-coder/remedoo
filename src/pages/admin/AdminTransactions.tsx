import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { Receipt, IndianRupee, ArrowUpRight, ArrowDownRight } from "lucide-react";

export default function AdminTransactions() {
  const [providerEarnings, setProviderEarnings] = useState<any[]>([]);
  const [hospitalEarnings, setHospitalEarnings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [peRes, heRes] = await Promise.all([
        supabase.from("provider_earnings").select("*").order("created_at", { ascending: false }).limit(200),
        supabase.from("hospital_earnings").select("*, hospitals(name)").order("created_at", { ascending: false }).limit(200),
      ]);
      setProviderEarnings(peRes.data || []);
      setHospitalEarnings(heRes.data || []);
      setLoading(false);
    };
    load();
  }, []);

  const totalRevenue = providerEarnings.reduce((s, e) => s + (e.commission_amount || 0), 0) + hospitalEarnings.reduce((s, e) => s + (e.platform_commission || 0), 0);
  const totalPayout = providerEarnings.reduce((s, e) => s + (e.net_amount || 0), 0) + hospitalEarnings.reduce((s, e) => s + (e.net_earning || 0), 0);

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground flex items-center gap-2"><Receipt className="w-6 h-6 text-primary" /> Transaction History</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4 text-center">
          <IndianRupee className="w-5 h-5 mx-auto text-primary mb-1" />
          <p className="text-2xl font-bold">₹{totalRevenue.toFixed(0)}</p>
          <p className="text-xs text-muted-foreground">Platform Revenue</p>
        </Card>
        <Card className="p-4 text-center">
          <ArrowDownRight className="w-5 h-5 mx-auto text-emerald-500 mb-1" />
          <p className="text-2xl font-bold">₹{totalPayout.toFixed(0)}</p>
          <p className="text-xs text-muted-foreground">Provider Payouts</p>
        </Card>
        <Card className="p-4 text-center">
          <ArrowUpRight className="w-5 h-5 mx-auto text-amber-500 mb-1" />
          <p className="text-2xl font-bold">{providerEarnings.length}</p>
          <p className="text-xs text-muted-foreground">Provider Txns</p>
        </Card>
        <Card className="p-4 text-center">
          <Receipt className="w-5 h-5 mx-auto text-muted-foreground mb-1" />
          <p className="text-2xl font-bold">{hospitalEarnings.length}</p>
          <p className="text-xs text-muted-foreground">Hospital Txns</p>
        </Card>
      </div>

      <Tabs defaultValue="provider">
        <TabsList>
          <TabsTrigger value="provider">Provider Earnings ({providerEarnings.length})</TabsTrigger>
          <TabsTrigger value="hospital">Hospital Earnings ({hospitalEarnings.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="provider" className="space-y-3 mt-4">
          {providerEarnings.length === 0 ? (
            <Card className="p-12 text-center"><p className="text-muted-foreground">No transactions</p></Card>
          ) : providerEarnings.map(e => (
            <Card key={e.id} className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="capitalize">{e.provider_type}</Badge>
                    <Badge variant="secondary" className="capitalize">{e.reference_type}</Badge>
                    <span className="text-xs text-muted-foreground">{e.description}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{new Date(e.created_at).toLocaleString()}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-sm">₹{e.gross_amount}</p>
                  <p className="text-xs text-muted-foreground">Commission: ₹{e.commission_amount} ({e.commission_percent}%)</p>
                  <p className="text-xs text-emerald-600">Net: ₹{e.net_amount}</p>
                </div>
              </div>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="hospital" className="space-y-3 mt-4">
          {hospitalEarnings.length === 0 ? (
            <Card className="p-12 text-center"><p className="text-muted-foreground">No transactions</p></Card>
          ) : hospitalEarnings.map(e => (
            <Card key={e.id} className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">{(e.hospitals as any)?.name || "—"}</span>
                    <Badge variant="outline" className="capitalize">{e.type}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{e.description} • {new Date(e.created_at).toLocaleString()}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-sm">₹{e.amount}</p>
                  <p className="text-xs text-muted-foreground">Commission: ₹{e.platform_commission}</p>
                  <p className="text-xs text-emerald-600">Net: ₹{e.net_earning}</p>
                </div>
              </div>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
