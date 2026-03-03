import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

const icons = ["💊", "🩺", "🏥", "❤️", "💉", "🧬", "🧪"];
const letters = "Remedoo".split("");

const Splash = () => {
  const navigate = useNavigate();
  const [morphed, setMorphed] = useState(false);
  const [showTagline, setShowTagline] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setMorphed(true), 1000);
    const t2 = setTimeout(() => setShowTagline(true), 2200);
    const t3 = setTimeout(() => {
      const hasOnboarded = localStorage.getItem("remedoo_onboarded");
      navigate(hasOnboarded ? "/login" : "/onboarding", { replace: true });
    }, 3400);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [navigate]);

  return (
    <div className="fixed inset-0 gradient-primary flex items-center justify-center overflow-hidden">
      {/* Pulse rings on morph */}
      {morphed && (
        <>
          <motion.div
            initial={{ scale: 0, opacity: 0.3 }}
            animate={{ scale: 5, opacity: 0 }}
            transition={{ duration: 2.5, ease: "easeOut" }}
            className="absolute w-20 h-20 rounded-full border-2 border-primary-foreground/20"
          />
          <motion.div
            initial={{ scale: 0, opacity: 0.2 }}
            animate={{ scale: 4, opacity: 0 }}
            transition={{ duration: 2.5, delay: 0.2, ease: "easeOut" }}
            className="absolute w-20 h-20 rounded-full border border-primary-foreground/10"
          />
        </>
      )}

      <div className="flex flex-col items-center gap-6 z-10">
        {/* Each slot: icon morphs into its corresponding letter */}
        <div className="flex items-center justify-center gap-0">
          {letters.map((letter, i) => (
            <div key={i} className="relative w-[2.2rem] h-14 flex items-center justify-center">
              {/* Icon — fades/scales out */}
              <motion.span
                className="absolute text-2xl"
                initial={{ opacity: 0, scale: 0 }}
                animate={{
                  opacity: morphed ? 0 : 1,
                  scale: morphed ? 0.3 : 1,
                  rotateY: morphed ? 90 : 0,
                }}
                transition={{
                  opacity: { duration: 0.3, delay: morphed ? i * 0.08 : i * 0.1 },
                  scale: { duration: 0.4, delay: morphed ? i * 0.08 : i * 0.1 },
                  rotateY: { duration: 0.3, delay: morphed ? i * 0.08 : 0 },
                }}
              >
                {icons[i]}
              </motion.span>

              {/* Letter — fades/scales in */}
              <motion.span
                className="absolute text-5xl font-extrabold text-primary-foreground"
                initial={{ opacity: 0, scale: 0.3, rotateY: -90 }}
                animate={{
                  opacity: morphed ? 1 : 0,
                  scale: morphed ? 1 : 0.3,
                  rotateY: morphed ? 0 : -90,
                }}
                transition={{
                  type: "spring",
                  stiffness: 250,
                  damping: 18,
                  delay: i * 0.1 + 0.15,
                }}
              >
                {letter}
              </motion.span>
            </div>
          ))}
        </div>

        {/* Tagline */}
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: showTagline ? 1 : 0, y: showTagline ? 0 : 10 }}
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
