import { useState, useEffect } from "react";
import { Heart, Droplets, Moon, Apple, Dumbbell, Brain, Sun, Wind, type LucideIcon } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";

const iconMap: Record<string, LucideIcon> = {
  Heart, Droplets, Moon, Apple, Dumbbell, Brain, Sun, Wind,
};

const getIcon = (name: string): LucideIcon => iconMap[name] || Heart;

interface HealthTip {
  id: string;
  title: string;
  description: string;
  icon_name: string;
  color: string;
  bg_color: string;
  sort_order: number;
}

const HealthTipsCards = () => {
  const [tips, setTips] = useState<HealthTip[]>([]);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from("dashboard_health_tips")
        .select("*")
        .eq("active", true)
        .order("sort_order")
        .limit(4);
      if (data) setTips(data);
    };
    fetch();
  }, []);

  if (tips.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.55, duration: 0.6 }}
    >
      <h2 className="text-lg font-bold text-foreground mb-3 flex items-center gap-2">
        💡 Health Tips
      </h2>
      <div className="grid grid-cols-2 gap-2.5">
        {tips.map((tip, idx) => {
          const Icon = getIcon(tip.icon_name);
          return (
            <motion.div
              key={tip.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 + idx * 0.08 }}
              className="bg-card rounded-xl border border-border p-3 hover:shadow-md transition-shadow"
            >
              <div className={`w-8 h-8 rounded-lg ${tip.bg_color} flex items-center justify-center mb-2`}>
                <Icon className={`w-4 h-4 ${tip.color}`} />
              </div>
              <h4 className="text-xs font-bold text-foreground">{tip.title}</h4>
              <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed line-clamp-2">{tip.description}</p>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
};

export default HealthTipsCards;