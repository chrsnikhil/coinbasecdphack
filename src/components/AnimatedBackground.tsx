'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import React, { useMemo } from 'react';

// Pre-calculated particle positions and sizes for consistency
const PARTICLE_COUNT = 50;
const particles = Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
  width: 1 + (i % 3) * 0.5,
  height: 1 + ((i + 1) % 3) * 0.5,
  left: (i * 2) % 100,
  top: (i * 3) % 100,
  opacity: 0.1 + (i % 5) * 0.1,
  duration: 10 + (i % 10),
  delay: (i % 5) * 0.5,
}));

const AnimatedBackground = ({ className }: { className?: string }) => {
  return (
    <div className={cn("absolute inset-0 overflow-hidden pointer-events-none z-0", className)}>
      {/* Animated gradient mesh */}
      <div className="absolute inset-0 opacity-30">
        <svg
          className="w-full h-full"
          xmlns="http://www.w3.org/2000/svg"
          version="1.1"
          viewBox="0 0 800 800"
          preserveAspectRatio="none"
        >
          <defs>
            <radialGradient id="glow1" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
              <stop offset="0%" stopColor="rgba(255, 255, 255, 0.3)" />
              <stop offset="100%" stopColor="rgba(255, 255, 255, 0)" />
            </radialGradient>
            <radialGradient id="glow2" cx="50%" cy="50%" r="70%" fx="50%" fy="50%">
              <stop offset="0%" stopColor="rgba(255, 255, 255, 0.25)" />
              <stop offset="100%" stopColor="rgba(255, 255, 255, 0)" />
            </radialGradient>
            <filter id="blur" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="30" />
            </filter>
          </defs>

          <g filter="url(#blur)">
            <motion.circle
              cx="150"
              cy="150"
              r="100"
              fill="url(#glow1)"
              animate={{
                cx: [150, 250, 450, 650, 550, 350, 150],
                cy: [150, 350, 250, 450, 650, 550, 150],
                scale: [1, 1.2, 1.5, 1.2, 1, 1.3, 1],
              }}
              transition={{
                duration: 60,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
            <motion.circle
              cx="600"
              cy="400"
              r="120"
              fill="url(#glow2)"
              animate={{
                cx: [600, 400, 200, 300, 500, 700, 600],
                cy: [400, 600, 500, 300, 200, 100, 400],
                scale: [1, 1.3, 1.1, 1.4, 1.2, 1.5, 1],
              }}
              transition={{
                duration: 50,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
            <motion.circle
              cx="300"
              cy="600"
              r="80"
              fill="url(#glow1)"
              animate={{
                cx: [300, 500, 700, 600, 400, 200, 300],
                cy: [600, 400, 200, 300, 500, 700, 600],
                scale: [1, 1.1, 1.4, 1.2, 1.3, 1.0, 1],
              }}
              transition={{
                duration: 40,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
          </g>
        </svg>
      </div>

      {/* Animated grid */}
      <div className="absolute inset-0">
        <motion.div
          className="absolute inset-0"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)
            `,
            backgroundSize: "60px 60px",
          }}
          animate={{
            backgroundPosition: ["0px 0px", "30px 30px"],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "linear",
          }}
        />
      </div>

      {/* Floating particles */}
      {particles.map((particle, i) => (
        <motion.div
          key={i}
          className="absolute bg-white/10 rounded-full"
          style={{
            width: `${particle.width}px`,
            height: `${particle.height}px`,
            left: `${particle.left}%`,
            top: `${particle.top}%`,
            opacity: particle.opacity,
          }}
          animate={{
            y: [0, -1000],
            opacity: [particle.opacity, 0],
          }}
          transition={{
            duration: particle.duration,
            repeat: Infinity,
            ease: "linear",
            delay: particle.delay,
          }}
        />
      ))}
    </div>
  );
};

export default AnimatedBackground; 