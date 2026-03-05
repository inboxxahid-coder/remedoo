import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

const icons = ["💊", "🩺", "🏥", "❤️", "💉", "🧬", "🧪"];
const letters = "Remedoo".split("");

// Floating particles
const Particle = ({ delay, x, y, size }: { delay: number; x: number; y: number; size: number }) => (
  <motion.div
    className="absolute rounded-full bg-primary-foreground/10"
    style={{ width: size, height: size, left: `${x}%`, top: `${y}%` }}
    initial={{ opacity: 0, scale: 0 }}
    animate={{
      opacity: [0, 0.6, 0],
      scale: [0, 1.2, 0.5],
      y: [0, -40, -80],
    }}
    transition={{ duration: 3, delay, repeat: Infinity, ease: "easeOut" }}
  />
);

const Splash = () => {
  const navigate = useNavigate();
  const [morphed, setMorphed] = useState(false);
  const [showTagline, setShowTagline] = useState(false);

  const particles = useMemo(
    () =>
      Array.from({ length: 12 }).map((_, i) => ({
        id: i,
        delay: i * 0.3,
        x: Math.random() * 90 + 5,
        y: Math.random() * 80 + 10,
        size: Math.random() * 8 + 4,
      })),
    []
  );

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
      {/* Background particles */}
      {particles.map((p) => (
        <Particle key={p.id} {...p} />
      ))}

      {/* Pulse rings */}
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
        {/* Morphing logo */}
        <div className="flex items-center justify-center gap-0">
          {letters.map((letter, i) => (
            <div key={i} className="relative w-[2.2rem] h-14 flex items-center justify-center">
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

        {/* Tagline with shimmer */}
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: showTagline ? 1 : 0, y: showTagline ? 0 : 10 }}
          transition={{ duration: 0.5 }}
          className="text-primary-foreground/70 text-sm font-medium tracking-wider uppercase"
        >
          Your Health, Our Priority
        </motion.p>

        {/* Progress bar */}
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: "120px" }}
          transition={{ duration: 3, ease: "linear" }}
          className="h-1 rounded-full bg-primary-foreground/30 overflow-hidden"
        >
          <motion.div
            initial={{ width: "0%" }}
            animate={{ width: "100%" }}
            transition={{ duration: 3, ease: "linear" }}
            className="h-full rounded-full bg-primary-foreground/60"
          />
        </motion.div>
      </div>
    </div>
  );
};

export default Splash;
