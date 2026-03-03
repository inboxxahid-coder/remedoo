import { motion } from "framer-motion";

const MedicalLoader = ({ text = "Loading..." }: { text?: string }) => {
  // ECG heartbeat path points
  const ecgPath = "M0,50 L15,50 L20,50 L25,20 L30,80 L35,10 L40,90 L45,50 L55,50 L60,50 L65,30 L70,70 L75,50 L100,50";

  return (
    <div className="flex flex-col items-center justify-center py-16 gap-5">
      {/* Pulsing medical cross */}
      <div className="relative w-16 h-16">
        <motion.div
          className="absolute inset-0 rounded-2xl bg-primary/20"
          animate={{ scale: [1, 1.4, 1], opacity: [0.3, 0, 0.3] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute inset-0 rounded-2xl bg-primary/10"
          animate={{ scale: [1, 1.7, 1], opacity: [0.2, 0, 0.2] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut", delay: 0.3 }}
        />
        <div className="absolute inset-0 rounded-2xl bg-primary/10 flex items-center justify-center">
          <motion.svg
            viewBox="0 0 24 24"
            className="w-8 h-8 text-primary"
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
          >
            <motion.path
              d="M12 4v16M4 12h16"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              fill="none"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
            />
          </motion.svg>
        </div>
      </div>

      {/* ECG Line */}
      <div className="w-48 h-10 overflow-hidden">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full">
          <motion.path
            d={ecgPath}
            fill="none"
            stroke="hsl(var(--primary))"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0, opacity: 0.3 }}
            animate={{ pathLength: [0, 1], opacity: [0.3, 1] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          />
          {/* Glowing dot that traces the path */}
          <motion.circle
            r="3"
            fill="hsl(var(--primary))"
            filter="url(#glow)"
            initial={{ offsetDistance: "0%" }}
            animate={{ offsetDistance: "100%" }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            style={{ offsetPath: `path('${ecgPath}')` }}
          />
          <defs>
            <filter id="glow">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
        </svg>
      </div>

      {/* Animated dots text */}
      <div className="flex items-center gap-1">
        <span className="text-sm font-medium text-muted-foreground">{text}</span>
        <span className="flex gap-0.5">
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="w-1 h-1 rounded-full bg-primary"
              animate={{ opacity: [0, 1, 0], y: [0, -3, 0] }}
              transition={{ duration: 1, repeat: Infinity, delay: i * 0.2, ease: "easeInOut" }}
            />
          ))}
        </span>
      </div>
    </div>
  );
};

export default MedicalLoader;
