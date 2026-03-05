import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { BarChart3, CalendarCheck, TestTube, IndianRupee } from "lucide-react";

export default function LabAnalytics() {
  const [stats, setStats] = useState({ totalAppointments: 0, completedTests: 0, totalSamples: 0, totalEarnings: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data: lab } = await supabase.from("labs").select("id").eq("user_id", session.user.id).maybeSingle();
      if (!lab) { setLoading(false); return; }

      const [appts, samples, earnings] = await Promise.all([
        supabase.from("appointments").select("status").eq("lab_id", lab.id),
        supabase.from("lab_sample_collections").select("status").eq("lab_id", lab.id),
        supabase.from("provider_earnings").select("net_amount").eq("provider_id", lab.id).eq("provider_type", "lab"),
      ]);

      const allAppts = appts.data || [];
      const allSamples = samples.data || [];
      const allEarnings = earnings.data || [];

      setStats({
        totalAppointments: allAppts.length,
        completedTests: allAppts.filter(a => a.status === "completed").length,
        totalSamples: allSamples.length,
        totalEarnings: allEarnings.reduce((s, e) => s + (e.net_amount || 0), 0),
      });
      setLoading(false);
    };
    load();
  }, []);

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>;

  const cards = [
    { label: "Total Appointments", value: stats.totalAppointments, icon: CalendarCheck, color: "text-blue-600" },
    { label: "Completed Tests", value: stats.completedTests, icon: TestTube, color: "text-green-600" },
    { label: "Sample Collections", value: stats.totalSamples, icon: BarChart3, color: "text-purple-600" },
    { label: "Total Earnings", value: `₹${stats.totalEarnings.toLocaleString()}`, icon: IndianRupee, color: "text-amber-600" },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground flex items-center gap-2"><BarChart3 className="w-6 h-6 text-primary" /> Analytics</h1>
      <div className="grid grid-cols-2 gap-4">
        {cards.map(c => (
          <Card key={c.label} className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted"><c.icon className={`w-5 h-5 ${c.color}`} /></div>
              <div><p className="text-xs text-muted-foreground">{c.label}</p><p className="text-lg font-bold text-foreground">{c.value}</p></div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
