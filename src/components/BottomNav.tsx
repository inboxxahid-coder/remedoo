import { useLocation } from "react-router-dom";
import { Home, Building2, FlaskConical, Store, ShoppingCart } from "lucide-react";
import { motion } from "framer-motion";
import { useGuardedNavigate } from "@/hooks/useGuardedNavigate";

const tabs = [
  { icon: Home, label: "Home", path: "/dashboard" },
  { icon: Building2, label: "Hospitals", path: "/hospitals" },
  { icon: FlaskConical, label: "Labs", path: "/labs" },
  { icon: Store, label: "Pharmacy", path: "/pharmacies" },
  { icon: ShoppingCart, label: "Orders", path: "/my-orders" },
];

const BottomNav = () => {
  const guardedNavigate = useGuardedNavigate();
  const { pathname } = useLocation();
  const activeIndex = tabs.findIndex((t) => pathname === t.path || pathname.startsWith(t.path + "/"));

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-xl border-t border-border safe-area-bottom md:bottom-4 md:left-1/2 md:right-auto md:-translate-x-1/2 md:w-[560px] md:rounded-2xl md:border md:shadow-lg">
      <div className="flex items-center justify-around h-[62px] max-w-lg mx-auto px-1 relative md:max-w-none">
        {tabs.map((tab, i) => {
          const active = i === activeIndex;
          return (
            <motion.button
              key={tab.path}
              onClick={() => guardedNavigate(tab.path)}
              whileTap={{ scale: 0.85 }}
              className="relative flex flex-col items-center justify-center gap-0.5 flex-1 h-full z-10"
            >
              {active && (
                <motion.div
                  layoutId="bottomNavIndicator"
                  className="absolute -top-[1px] w-10 h-[3px] rounded-full bg-primary"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <motion.div
                animate={{
                  y: active ? -2 : 0,
                  scale: active ? 1.1 : 1,
                }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
              >
                <tab.icon
                  className={`w-[21px] h-[21px] transition-colors duration-200 ${
                    active ? "text-primary" : "text-muted-foreground"
                  }`}
                  strokeWidth={active ? 2.4 : 1.7}
                  fill={active ? "hsl(var(--primary) / 0.15)" : "none"}
                />
              </motion.div>
              <motion.span
                animate={{ opacity: active ? 1 : 0.7 }}
                className={`text-[10px] font-semibold transition-colors duration-200 ${
                  active ? "text-primary" : "text-muted-foreground"
                }`}
              >
                {tab.label}
              </motion.span>
            </motion.button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
