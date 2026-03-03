import { useNavigate, useLocation } from "react-router-dom";
import { Home, Building2, FlaskConical, Store, ShoppingCart } from "lucide-react";

const tabs = [
  { icon: Home, label: "Home", path: "/dashboard" },
  { icon: Building2, label: "Hospitals", path: "/hospitals" },
  { icon: FlaskConical, label: "Labs", path: "/labs" },
  { icon: Store, label: "Pharmacy", path: "/pharmacies" },
  { icon: ShoppingCart, label: "Cart", path: "/my-orders" },
];

const BottomNav = () => {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border safe-area-bottom shadow-[0_-4px_16px_rgba(0,0,0,0.06)]">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2">
        {tabs.map((tab) => {
          const active = pathname === tab.path;
          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className="relative flex flex-col items-center justify-center gap-0.5 flex-1 h-full"
            >
              <tab.icon
                className={`w-[22px] h-[22px] transition-colors ${active ? "text-primary" : "text-muted-foreground"}`}
                strokeWidth={active ? 2.2 : 1.8}
                fill={active ? "hsl(215,65%,30%)" : "none"}
              />
              <span className={`text-[10px] font-semibold transition-colors ${active ? "text-primary" : "text-muted-foreground"}`}>
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
