import { useState, useEffect } from "react";
import { Heart, Droplets, Moon, Apple, Dumbbell, Brain, Sun, Wind } from "lucide-react";
import { motion } from "framer-motion";

const allTips = [
  { icon: Droplets, title: "Stay Hydrated", desc: "Drink 8+ glasses of water daily for optimal organ function.", color: "text-blue-500", bg: "bg-blue-500/10" },
  { icon: Moon, title: "Quality Sleep", desc: "7-9 hours of sleep improves immunity and cognitive function.", color: "text-violet-500", bg: "bg-violet-500/10" },
  { icon: Apple, title: "Balanced Diet", desc: "Include fruits, vegetables, and whole grains in every meal.", color: "text-success", bg: "bg-success/10" },
  { icon: Dumbbell, title: "Stay Active", desc: "30 minutes of daily exercise reduces heart disease risk by 35%.", color: "text-warning", bg: "bg-warning/10" },
  { icon: Brain, title: "Mental Health", desc: "Practice mindfulness or meditation for 10 minutes daily.", color: "text-primary", bg: "bg-primary/10" },
  { icon: Sun, title: "Vitamin D", desc: "15 minutes of morning sunlight boosts bone health and mood.", color: "text-amber-500", bg: "bg-amber-500/10" },
  { icon: Heart, title: "Heart Health", desc: "Regular checkups help detect cardiovascular issues early.", color: "text-emergency", bg: "bg-emergency/10" },
  { icon: Wind, title: "Deep Breathing", desc: "Practice 4-7-8 breathing technique to reduce stress and anxiety.", color: "text-teal-500", bg: "bg-teal-500/10" },
];

const HealthTipsCards = () => {
  const [tips, setTips] = useState(allTips.slice(0, 4));

  useEffect(() => {
    // Rotate tips daily based on day of year
    const day = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
    const start = (day * 2) % allTips.length;
    const selected = [];
    for (let i = 0; i < 4; i++) {
      selected.push(allTips[(start + i) % allTips.length]);
    }
    setTips(selected);
  }, []);

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
          const Icon = tip.icon;
          return (
            <motion.div
              key={tip.title}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 + idx * 0.08 }}
              className="bg-card rounded-xl border border-border p-3 hover:shadow-md transition-shadow"
            >
              <div className={`w-8 h-8 rounded-lg ${tip.bg} flex items-center justify-center mb-2`}>
                <Icon className={`w-4 h-4 ${tip.color}`} />
              </div>
              <h4 className="text-xs font-bold text-foreground">{tip.title}</h4>
              <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed line-clamp-2">{tip.desc}</p>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
};

export default HealthTipsCards;
