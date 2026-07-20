import React, { useEffect, useState, useRef } from 'react';

interface AudioWaveformProps {
  isPlaying: boolean;
  barCount?: number;
  className?: string;
  glowColor?: string;
}

export const AudioWaveform: React.FC<AudioWaveformProps> = ({
  isPlaying,
  barCount = 36,
  className = "",
  glowColor = "#db1fff"
}) => {
  const [heights, setHeights] = useState<number[]>([]);
  const animationRef = useRef<number | null>(null);
  const phaseRef = useRef<number>(0);

  // Initialize bars with random idle heights
  useEffect(() => {
    const initial = Array.from({ length: barCount }, () => Math.random() * 20 + 10);
    setHeights(initial);
  }, [barCount]);

  // Animate frequencies
  useEffect(() => {
    let lastTime = 0;
    const interval = 60; // Update frequency values every 60ms for fluid visual animation

    const animate = (timestamp: number) => {
      if (!lastTime) lastTime = timestamp;
      const elapsed = timestamp - lastTime;

      if (elapsed >= interval) {
        lastTime = timestamp;
        phaseRef.current += 0.15;

        setHeights((prev) => {
          return prev.map((_, index) => {
            if (isPlaying) {
              // Create a multi-wave synthetic audio visualizer effect
              const sineBase = Math.sin(phaseRef.current + index * 0.4) * 20;
              const cosineBase = Math.cos(phaseRef.current * 1.5 - index * 0.25) * 15;
              const noise = Math.random() * 45;
              
              // Combine and clamp to elegant height range (15% to 100%)
              const height = Math.max(15, Math.min(100, 35 + sineBase + cosineBase + noise));
              return height;
            } else {
              // Gentle, low-amplitude breathing idle wave
              const idleSine = Math.sin(phaseRef.current * 0.5 + index * 0.3) * 6;
              return Math.max(8, 12 + idleSine);
            }
          });
        });
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, barCount]);

  return (
    <div className={`flex items-end justify-center gap-[3.5px] sm:gap-[5px] md:gap-1.5 w-full select-none ${className || "h-14"}`}>
      {heights.map((height, i) => {
        // Create an elegant gradient index mapping
        const ratio = i / barCount;
        
        // Dynamic styling for beautiful center-weighted heights and gorgeous multi-colors
        // Center bars have slightly higher limits to look more active
        const weightedRatio = 1 - Math.abs(ratio - 0.5) * 2; // 0 at edges, 1 at center
        const displayHeight = isPlaying ? height * (0.4 + weightedRatio * 0.6) : height;

        return (
          <div
            key={i}
            className="w-[3px] sm:w-[5px] md:w-[6px] rounded-full transition-all duration-75 ease-out shrink-0"
            style={{
              height: `${displayHeight}%`,
              backgroundColor: glowColor,
              opacity: isPlaying ? 0.3 + weightedRatio * 0.7 : 0.25 + weightedRatio * 0.35,
            }}
          />
        );
      })}
    </div>
  );
};
