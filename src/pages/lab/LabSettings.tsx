import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { CreditCard } from "lucide-react";
import ProviderPaymentSettings from "@/components/provider/ProviderPaymentSettings";

export default function LabSettings() {
  const [userId, setUserId] = useState<string | null>(null);
  const [labId, setLabId] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      setUserId(session.user.id);
      const { data } = await supabase.from("labs").select("id").eq("user_id", session.user.id).maybeSingle();
      setLabId(data?.id ?? null);
    };
    load();
  }, []);

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Settings</h1>

      <Tabs defaultValue="general">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="payment"><CreditCard className="w-4 h-4 mr-1" /> Payment</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="mt-4">
          <Card className="p-6">
            <p className="text-muted-foreground">Lab settings — manage services, working hours, and notifications.</p>
          </Card>
        </TabsContent>

        <TabsContent value="payment" className="mt-4">
          <ProviderPaymentSettings providerType="lab" providerId={labId} userId={userId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
