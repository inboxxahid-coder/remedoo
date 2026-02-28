import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Wallet as WalletIcon, TrendingUp, TrendingDown, IndianRupee } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const CATEGORY_COLORS = ["hsl(168,72%,40%)", "hsl(0,85%,55%)", "hsl(38,92%,55%)", "hsl(152,60%,42%)", "hsl(220,70%,55%)"];

const Wallet = () => {
  const navigate = useNavigate();
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/login"); return; }

      // Load orders as payment history
      const { data: orders } = await supabase
        .from("orders")
        .select("*")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false });

      setPayments(orders || []);
      setLoading(false);
    };
    load();
  }, [navigate]);

  const totalSpent = payments.reduce((sum, p) => sum + Number(p.total || 0), 0);
  const completedOrders = payments.filter(p => p.status === "delivered").length;

  // Spending by month
  const monthlyData = payments.reduce((acc: Record<string, number>, p) => {
    const month = new Date(p.created_at).toLocaleDateString("en", { month: "short" });
    acc[month] = (acc[month] || 0) + Number(p.total || 0);
    return acc;
  }, {});
  const chartData = Object.entries(monthlyData).map(([name, value]) => ({ name, value }));

  // Spending by payment method
  const methodData = payments.reduce((acc: Record<string, number>, p) => {
    const method = p.payment_method === "online" ? "Online" : "COD";
    acc[method] = (acc[method] || 0) + Number(p.total || 0);
    return acc;
  }, {});
  const pieData = Object.entries(methodData).map(([name, value]) => ({ name, value }));

  return (
    <div className="min-h-screen bg-background pb-8">
      <div className="gradient-primary px-5 pt-10 pb-6 rounded-b-[1.5rem]">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-primary-foreground"><ArrowLeft className="w-6 h-6" /></button>
          <h1 className="text-lg font-bold text-primary-foreground">Wallet & Payments</h1>
        </div>
      </div>

      <div className="px-5 mt-4 space-y-4">
        {/* Balance Card */}
        <div className="gradient-primary rounded-2xl p-5 text-primary-foreground">
          <p className="text-sm opacity-70">Total Spent</p>
          <h2 className="text-3xl font-bold flex items-center gap-1 mt-1"><IndianRupee className="w-6 h-6" />{totalSpent.toFixed(0)}</h2>
          <div className="flex gap-4 mt-3 text-sm">
            <span className="flex items-center gap-1"><TrendingUp className="w-4 h-4" /> {payments.length} orders</span>
            <span className="flex items-center gap-1"><TrendingDown className="w-4 h-4" /> {completedOrders} delivered</span>
          </div>
        </div>

        {/* Spending Chart */}
        {chartData.length > 0 && (
          <div className="bg-card rounded-2xl border border-border p-4">
            <h3 className="font-semibold text-sm mb-3">Monthly Spending</h3>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="value" fill="hsl(168,72%,40%)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Payment Method Pie */}
        {pieData.length > 0 && (
          <div className="bg-card rounded-2xl border border-border p-4">
            <h3 className="font-semibold text-sm mb-3">By Payment Method</h3>
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" outerRadius={60} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {pieData.map((_, i) => <Cell key={i} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Transaction History */}
        <div className="bg-card rounded-2xl border border-border p-4">
          <h3 className="font-semibold text-sm mb-3">Transaction History</h3>
          {loading ? (
            <p className="text-sm text-muted-foreground text-center py-4">Loading...</p>
          ) : payments.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No transactions yet</p>
          ) : (
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {payments.map((p) => (
                <button
                  key={p.id}
                  onClick={() => navigate(`/order/${p.id}`)}
                  className="w-full flex items-center gap-3 py-2 border-b border-border last:border-0 text-left"
                >
                  <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center text-lg">
                    {p.payment_method === "online" ? "💳" : "💵"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">Order #{p.id.slice(0, 8)}</p>
                    <p className="text-xs text-muted-foreground">{new Date(p.created_at).toLocaleDateString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-foreground">₹{Number(p.total).toFixed(0)}</p>
                    <p className={`text-xs font-medium ${p.payment_status === "paid" ? "text-success" : "text-warning"}`}>{p.payment_status}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Wallet;
