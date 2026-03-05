import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, AlertTriangle, MapPin, Shield, ChevronRight, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const slides = [
  {
    icon: Calendar,
    emoji: "📅",
    title: "Book Appointments",
    description: "Easily schedule visits with doctors, hospitals, labs, and pharmacies — all in one place.",
    gradient: "from-primary to-primary/70",
    bgEmoji: "🩺",
  },
  {
    icon: AlertTriangle,
    emoji: "🚨",
    title: "Emergency SOS",
    description: "One tap to send your location and dispatch the nearest ambulance instantly.",
    gradient: "from-emergency to-emergency/70",
    bgEmoji: "🚑",
  },
  {
    icon: MapPin,
    emoji: "📍",
    title: "Live Tracking",
    description: "Real-time GPS tracking of your ambulance with live ETA updates.",
    gradient: "from-success to-success/70",
    bgEmoji: "🗺️",
  },
  {
    icon: Shield,
    emoji: "🔒",
    title: "Secure & Private",
    description: "Your medical data is encrypted and protected. HIPAA-compliant security for peace of mind.",
    gradient: "from-warning to-warning/70",
    bgEmoji: "🛡️",
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
  const slide = slides[current];

  return (
    <div className="fixed inset-0 bg-background flex flex-col overflow-hidden">
      {/* Skip button */}
      <div className="flex justify-end p-4 pt-6 z-20">
        <Button variant="ghost" size="sm" onClick={finish} className="text-muted-foreground font-medium">
          Skip
        </Button>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={current}
            initial={{ opacity: 0, x: 80 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -80 }}
            transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.3}
            onDragEnd={(_e, info) => {
              if (info.offset.x < -50 && current < slides.length - 1) setCurrent(current + 1);
              else if (info.offset.x > 50 && current > 0) setCurrent(current - 1);
            }}
            className="flex flex-col items-center text-center max-w-sm cursor-grab active:cursor-grabbing"
          >
            {/* Illustration area */}
            <div className="relative mb-10">
              {/* Background glow */}
              <motion.div
                className={`absolute inset-0 rounded-full bg-gradient-to-br ${slide.gradient} blur-3xl opacity-20`}
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 3, repeat: Infinity }}
              />
              {/* Floating background emoji */}
              <motion.span
                className="absolute -top-4 -right-4 text-4xl opacity-20"
                animate={{ rotate: [0, 15, -15, 0], y: [0, -8, 0] }}
                transition={{ duration: 4, repeat: Infinity }}
              >
                {slide.bgEmoji}
              </motion.span>
              <motion.span
                className="absolute -bottom-2 -left-6 text-3xl opacity-15"
                animate={{ rotate: [0, -10, 10, 0], y: [0, 6, 0] }}
                transition={{ duration: 5, repeat: Infinity, delay: 0.5 }}
              >
                {slide.bgEmoji}
              </motion.span>
              {/* Main icon card */}
              <div className={`w-32 h-32 rounded-[2rem] bg-gradient-to-br ${slide.gradient} flex items-center justify-center shadow-2xl relative z-10`}>
                <span className="text-6xl">{slide.emoji}</span>
              </div>
            </div>

            <h2 className="text-2xl font-bold text-foreground mb-3">{slide.title}</h2>
            <p className="text-muted-foreground leading-relaxed text-[15px]">{slide.description}</p>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom controls */}
      <div className="px-8 pb-10 safe-bottom flex flex-col items-center gap-8">
        {/* Dots */}
        <div className="flex gap-2">
          {slides.map((_, i) => (
            <motion.button
              key={i}
              onClick={() => setCurrent(i)}
              className={`h-2 rounded-full transition-colors ${i === current ? "bg-primary" : "bg-border"}`}
              animate={{ width: i === current ? 28 : 8 }}
              transition={{ duration: 0.3 }}
            />
          ))}
        </div>

        {/* CTA Button */}
        <motion.div className="w-full max-w-xs" whileTap={{ scale: 0.97 }}>
          <Button
            onClick={() => (isLast ? finish() : setCurrent(current + 1))}
            className={`w-full h-14 rounded-2xl font-bold text-base gap-2 text-primary-foreground shadow-lg ${
              isLast
                ? "bg-gradient-to-r from-success to-success/80"
                : "gradient-primary"
            }`}
          >
            {isLast ? "Get Started" : "Continue"}
            {isLast ? <ArrowRight className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
          </Button>
        </motion.div>
      </div>
    </div>
  );
};

export default Onboarding;
