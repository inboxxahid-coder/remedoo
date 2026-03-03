import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

const medicalIcons = ["💊", "🩺", "🏥", "❤️", "🧬", "💉", "🩻", "🧪"];

const Splash = () => {
  const navigate = useNavigate();
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 500);
    const t2 = setTimeout(() => setPhase(2), 1400);
    const t3 = setTimeout(() => setPhase(3), 2200);
    const t4 = setTimeout(() => {
      const hasOnboarded = localStorage.getItem("remedoo_onboarded");
      navigate(hasOnboarded ? "/login" : "/onboarding", { replace: true });
    }, 3200);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
  }, [navigate]);

  const letters = "Remedoo".split("");

  return (
    <div className="fixed inset-0 gradient-primary flex items-center justify-center overflow-hidden">
      {/* Background pulse rings */}
      <AnimatePresence>
        {phase >= 2 && (
          <>
            <motion.div
              initial={{ scale: 0, opacity: 0.3 }}
              animate={{ scale: 5, opacity: 0 }}
              transition={{ duration: 2.5, ease: "easeOut" }}
              className="absolute w-24 h-24 rounded-full border-2 border-primary-foreground/20"
            />
            <motion.div
              initial={{ scale: 0, opacity: 0.2 }}
              animate={{ scale: 4, opacity: 0 }}
              transition={{ duration: 2.5, delay: 0.2, ease: "easeOut" }}
              className="absolute w-24 h-24 rounded-full border border-primary-foreground/10"
            />
          </>
        )}
      </AnimatePresence>

      <div className="flex flex-col items-center gap-6 z-10">
        {/* Phase 0-1: Medical icons scattered, then converge to center */}
        <div className="relative h-16 flex items-center justify-center">
          <AnimatePresence mode="wait">
            {phase < 2 ? (
              /* Medical emojis floating & converging */
              <motion.div
                key="icons"
                className="flex items-center gap-3"
                exit={{ scale: 0.5, opacity: 0, transition: { duration: 0.3 } }}
              >
                {medicalIcons.map((icon, i) => {
                  const angle = (i / medicalIcons.length) * Math.PI * 2;
                  const radius = 80;
                  return (
                    <motion.span
                      key={i}
                      className="absolute text-2xl"
                      initial={{
                        x: Math.cos(angle) * radius,
                        y: Math.sin(angle) * radius,
                        opacity: 0,
                        scale: 0,
                      }}
                      animate={{
                        x: phase >= 1 ? 0 : Math.cos(angle) * radius,
                        y: phase >= 1 ? 0 : Math.sin(angle) * radius,
                        opacity: 1,
                        scale: phase >= 1 ? 0.6 : 1,
                        rotate: phase >= 1 ? 360 : 0,
                      }}
                      transition={{
                        duration: 0.7,
                        delay: phase < 1 ? i * 0.06 : 0,
                        ease: "easeInOut",
                      }}
                    >
                      {icon}
                    </motion.span>
                  );
                })}
              </motion.div>
            ) : (
              /* Letters morph in from the converged point */
              <motion.div
                key="text"
                className="flex items-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2 }}
              >
                {letters.map((letter, i) => (
                  <motion.span
                    key={i}
                    className="text-5xl font-extrabold text-primary-foreground"
                    initial={{ opacity: 0, scale: 0, y: 20, rotate: -90 }}
                    animate={{ opacity: 1, scale: 1, y: 0, rotate: 0 }}
                    transition={{
                      type: "spring",
                      stiffness: 300,
                      damping: 15,
                      delay: i * 0.08,
                    }}
                  >
                    {letter}
                  </motion.span>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Tagline */}
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: phase >= 3 ? 1 : 0, y: phase >= 3 ? 0 : 10 }}
          transition={{ duration: 0.5 }}
          className="text-primary-foreground/70 text-sm font-medium tracking-wider uppercase"
        >
          Your Health, Our Priority
        </motion.p>
      </div>
    </div>
  );
};

export default Splash;
