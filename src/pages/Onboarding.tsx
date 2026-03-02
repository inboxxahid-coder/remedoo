import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import onboardingAppointments from "@/assets/onboarding-appointments.png";
import onboardingEmergency from "@/assets/onboarding-emergency.png";
import onboardingTracking from "@/assets/onboarding-tracking.png";
import onboardingWallet from "@/assets/onboarding-wallet.png";

const slides = [
  {
    image: onboardingAppointments,
    title: "Book Appointments",
    description: "Easily schedule visits with doctors, hospitals, labs, and pharmacies — all in one place.",
  },
  {
    image: onboardingEmergency,
    title: "Emergency SOS",
    description: "One tap to send your location and dispatch the nearest ambulance instantly.",
  },
  {
    image: onboardingTracking,
    title: "Track Ambulances",
    description: "Real-time GPS tracking of your ambulance with live ETA updates.",
  },
  {
    image: onboardingWallet,
    title: "Wallet & Payments",
    description: "Manage payments, view transaction history, and download receipts effortlessly.",
  },
];

const Onboarding = () => {
  const [current, setCurrent] = useState(0);
  const navigate = useNavigate();

  const finish = () => {
    localStorage.setItem("remedoo_onboarded", "true");
    navigate("/login", { replace: true });
  };

  const isLast = current === slides.length - 1;

  return (
    <div className="fixed inset-0 bg-background flex flex-col">
      {/* Skip */}
      <div className="flex justify-end p-4 pt-6">
        <Button variant="ghost" size="sm" onClick={finish} className="text-muted-foreground">
          Skip
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={current}
            initial={{ opacity: 0, x: 60 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -60 }}
            transition={{ duration: 0.35 }}
            className="flex flex-col items-center text-center max-w-sm"
          >
            <img src={slides[current].image} alt={slides[current].title} className="w-56 h-56 object-contain mb-8 drop-shadow-lg" />
            <h2 className="text-2xl font-bold text-foreground mb-3">{slides[current].title}</h2>
            <p className="text-muted-foreground leading-relaxed">{slides[current].description}</p>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Dots & button */}
      <div className="px-8 pb-10 safe-bottom flex flex-col items-center gap-8">
        <div className="flex gap-2">
          {slides.map((_, i) => (
            <motion.div
              key={i}
              className={`h-2 rounded-full transition-colors ${i === current ? "bg-primary" : "bg-border"}`}
              animate={{ width: i === current ? 24 : 8 }}
              transition={{ duration: 0.3 }}
            />
          ))}
        </div>
        <Button
          onClick={() => (isLast ? finish() : setCurrent(current + 1))}
          className="w-full max-w-xs h-12 rounded-xl gradient-primary text-primary-foreground font-semibold text-base gap-2"
        >
          {isLast ? "Get Started" : "Next"}
          <ChevronRight className="w-5 h-5" />
        </Button>
      </div>
    </div>
  );
};

export default Onboarding;
