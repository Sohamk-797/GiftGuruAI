import { useEffect, useState } from "react";

interface AnimatedBackgroundProps {
  intensity?: 'off' | 'low' | 'medium' | 'high';
  isEnabled?: boolean;
}

export const AnimatedBackground = ({ 
  intensity = 'high', 
  isEnabled = true 
}: AnimatedBackgroundProps) => {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    // Check for prefers-reduced-motion
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setReducedMotion(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  if (!isEnabled || intensity === 'off') {
    return (
      <div className="fixed inset-0 -z-10 bg-gradient-to-br from-background via-background to-muted/20 transition-colors duration-500" />
    );
  }

  const shouldAnimate = !reducedMotion && intensity !== 'low';
  const animationClass = shouldAnimate ? 'animate-float-slow' : '';
  const mediumAnimationClass = shouldAnimate ? 'animate-float-medium' : '';
  const fastAnimationClass = shouldAnimate ? 'animate-float-fast' : '';

  return (
    <div 
      className="fixed inset-0 -z-10 overflow-hidden pointer-events-none transition-colors duration-500"
      role="presentation"
      aria-hidden="true"
    >
      {/* Animated gradient orbs - theme-aware colors with WCAG compliant opacity */}
      <div 
        className={`absolute -top-24 -left-24 w-96 h-96 bg-primary/30 dark:bg-primary/20 rounded-full blur-3xl ${animationClass}`}
        style={{ 
          animationDelay: "0s",
          willChange: shouldAnimate ? "transform" : "auto"
        }} 
      />
      <div 
        className={`absolute top-1/4 right-1/4 w-[32rem] h-[32rem] bg-accent/25 dark:bg-accent/15 rounded-full blur-3xl ${mediumAnimationClass}`}
        style={{ 
          animationDelay: "2s",
          willChange: shouldAnimate ? "transform" : "auto"
        }} 
      />
      <div 
        className={`absolute bottom-0 left-1/3 w-[28rem] h-[28rem] bg-primary-glow/20 dark:bg-primary-glow/10 rounded-full blur-3xl ${animationClass}`}
        style={{ 
          animationDelay: "4s",
          willChange: shouldAnimate ? "transform" : "auto"
        }} 
      />
      <div 
        className={`absolute top-1/2 right-0 w-80 h-80 bg-secondary/40 dark:bg-secondary/20 rounded-full blur-3xl ${fastAnimationClass}`}
        style={{ 
          animationDelay: "1s",
          willChange: shouldAnimate ? "transform" : "auto"
        }} 
      />
      <div 
        className={`absolute bottom-1/4 right-1/2 w-72 h-72 bg-accent/20 dark:bg-accent/10 rounded-full blur-3xl ${mediumAnimationClass}`}
        style={{ 
          animationDelay: "3s",
          willChange: shouldAnimate ? "transform" : "auto"
        }} 
      />
      
      {/* Radial gradient overlay for depth and contrast preservation */}
      <div className="absolute inset-0 bg-gradient-radial from-transparent via-background/50 to-background transition-colors duration-500" />
      
      {/* Subtle grain texture for premium feel - respects reduced motion */}
      {intensity === 'high' && (
        <div className="absolute inset-0 opacity-[0.015] dark:opacity-[0.025] bg-noise" />
      )}
    </div>
  );
};
