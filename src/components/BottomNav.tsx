import { useNavigate, useLocation } from "react-router-dom";
import { Home, Building2, FlaskConical, Store, Wallet } from "lucide-react";
import { motion } from "framer-motion";

const tabs = [
  { icon: Home, label: "Home", path: "/dashboard" },
  { icon: Building2, label: "Hospitals", path: "/hospitals" },
  { icon: FlaskConical, label: "Labs", path: "/labs" },
  { icon: Store, label: "Pharmacy", path: "/pharmacies" },
  { icon: Wallet, label: "Wallet", path: "/wallet" },
];

const BottomNav = () => {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-xl border-t border-border safe-area-bottom">
      <div className="flex items-center justify-around h-14 sm:h-16 max-w-lg mx-auto px-1 sm:px-2">
        {tabs.map((tab) => {
          const active = pathname === tab.path;
          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className="relative flex flex-col items-center justify-center gap-0.5 flex-1 h-full"
            >
              {active && (
                <motion.div
                  layoutId="bottomNavIndicator"
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-primary"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <tab.icon className={`w-[18px] h-[18px] sm:w-5 sm:h-5 transition-colors ${active ? "text-primary" : "text-muted-foreground"}`} />
              <span className={`text-[10px] font-medium transition-colors ${active ? "text-primary" : "text-muted-foreground"}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
