import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export const DarkModeToggle = () => {
  const [isDark, setIsDark] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    const theme = localStorage.getItem("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const shouldBeDark = theme === "dark" || (!theme && prefersDark);
    
    setIsDark(shouldBeDark);
    document.documentElement.classList.toggle("dark", shouldBeDark);
  }, []);

  const toggleTheme = () => {
    if (isAnimating) return;
    
    setIsAnimating(true);
    const newIsDark = !isDark;
    const root = document.documentElement;
    
    // Set longer transition duration for theme change
    root.style.setProperty('--theme-transition-duration', '0.5s');
    
    // Small delay to let animation start
    setTimeout(() => {
      setIsDark(newIsDark);
      root.classList.toggle("dark", newIsDark);
      localStorage.setItem("theme", newIsDark ? "dark" : "light");
    }, 150);
    
    setTimeout(() => {
      setIsAnimating(false);
      root.style.removeProperty('--theme-transition-duration');
    }, 600);
  };

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={toggleTheme}
      disabled={isAnimating}
      className="fixed top-4 right-4 z-[9999] rounded-full bg-card/80 backdrop-blur-md border-border/50 hover:bg-card shadow-elegant hover:shadow-glow transition-all duration-300 hover:scale-110 active:scale-95 overflow-hidden"
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      <div className="relative w-5 h-5">
        <AnimatePresence mode="wait" initial={false}>
          {isDark ? (
            <motion.div
              key="sun"
              initial={{ y: -30, rotate: -90, opacity: 0 }}
              animate={{ y: 0, rotate: 0, opacity: 1 }}
              exit={{ y: 30, rotate: 90, opacity: 0 }}
              transition={{
                duration: 0.4,
                ease: [0.34, 1.56, 0.64, 1],
              }}
              className="absolute inset-0 flex items-center justify-center"
            >
              <Sun className="h-5 w-5 text-foreground" />
            </motion.div>
          ) : (
            <motion.div
              key="moon"
              initial={{ y: -30, rotate: 90, opacity: 0 }}
              animate={{ y: 0, rotate: 0, opacity: 1 }}
              exit={{ y: 30, rotate: -90, opacity: 0 }}
              transition={{
                duration: 0.4,
                ease: [0.34, 1.56, 0.64, 1],
              }}
              className="absolute inset-0 flex items-center justify-center"
            >
              <Moon className="h-5 w-5 text-foreground" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
      {/* Subtle pulse ring during animation */}
      <AnimatePresence>
        {isAnimating && (
          <motion.span
            initial={{ scale: 0.8, opacity: 0.5 }}
            animate={{ scale: 2, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="absolute inset-0 rounded-full bg-primary/20"
          />
        )}
      </AnimatePresence>
    </Button>
  );
};
