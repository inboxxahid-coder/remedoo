import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, Shield, Activity } from "lucide-react";

const Splash = () => {
  const navigate = useNavigate();
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 400);
    const t2 = setTimeout(() => setPhase(2), 1000);
    const t3 = setTimeout(() => {
      const hasOnboarded = localStorage.getItem("remedoo_onboarded");
      navigate(hasOnboarded ? "/login" : "/onboarding", { replace: true });
    }, 2400);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [navigate]);

  return (
    <div className="fixed inset-0 gradient-primary flex items-center justify-center overflow-hidden">
      {/* Background pulse rings */}
      <AnimatePresence>
        {phase >= 1 && (
          <>
            <motion.div
              initial={{ scale: 0, opacity: 0.3 }}
              animate={{ scale: 4, opacity: 0 }}
              transition={{ duration: 2, ease: "easeOut" }}
              className="absolute w-32 h-32 rounded-full border-2 border-primary-foreground/20"
            />
            <motion.div
              initial={{ scale: 0, opacity: 0.2 }}
              animate={{ scale: 3, opacity: 0 }}
              transition={{ duration: 2, delay: 0.3, ease: "easeOut" }}
              className="absolute w-32 h-32 rounded-full border border-primary-foreground/10"
            />
          </>
        )}
      </AnimatePresence>

      {/* Floating icons */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: phase >= 1 ? 0.15 : 0, y: phase >= 1 ? -30 : 20 }}
        transition={{ duration: 1.5, ease: "easeOut" }}
        className="absolute top-1/4 left-1/4 text-primary-foreground"
      >
        <Heart size={32} />
      </motion.div>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: phase >= 1 ? 0.15 : 0, y: phase >= 1 ? 30 : -20 }}
        transition={{ duration: 1.5, ease: "easeOut", delay: 0.2 }}
        className="absolute bottom-1/3 right-1/4 text-primary-foreground"
      >
        <Shield size={28} />
      </motion.div>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: phase >= 1 ? 0.12 : 0 }}
        transition={{ duration: 1.5, delay: 0.4 }}
        className="absolute top-1/3 right-1/3 text-primary-foreground"
      >
        <Activity size={24} />
      </motion.div>

      {/* Logo & text */}
      <div className="flex flex-col items-center gap-4 z-10">
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: phase >= 0 ? 1 : 0, rotate: 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 15, duration: 0.6 }}
          className="w-20 h-20 rounded-2xl bg-primary-foreground/20 backdrop-blur-sm flex items-center justify-center border border-primary-foreground/30"
        >
          <Heart className="w-10 h-10 text-primary-foreground" fill="currentColor" />
        </motion.div>
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: phase >= 1 ? 1 : 0, y: phase >= 1 ? 0 : 20 }}
          transition={{ duration: 0.5 }}
          className="text-4xl font-extrabold text-primary-foreground tracking-tight"
        >
          Remedoo
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: phase >= 2 ? 1 : 0 }}
          transition={{ duration: 0.4 }}
          className="text-primary-foreground/70 text-sm font-medium tracking-wider uppercase"
        >
          Your Health, Our Priority
        </motion.p>
      </div>
    </div>
  );
};

export default Splash;
