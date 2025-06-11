'use client';

import { cn } from '@/lib/utils';
import { motion, HTMLMotionProps } from 'framer-motion';
import React, { useEffect, useState, HTMLAttributes } from 'react';

interface GlassCardProps extends Omit<HTMLMotionProps<"div">, "children"> {
  hoverEffect?: boolean;
  children: React.ReactNode;
}

const GlassCard = ({
  className,
  hoverEffect = true,
  children,
  ...props
}: GlassCardProps) => {
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  // Base styles that are consistent between server and client
  const baseStyles = cn(
    "relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl",
    className
  );

  // Client-side only styles
  const clientStyles = cn(
    baseStyles,
    hoverEffect && "transition-all duration-300 ease-in-out hover:border-white/20 hover:bg-white/10 hover:shadow-lg hover:shadow-white/5"
  );

  // Extract motion-specific props and standard HTML props
  const {
    style,
    animate,
    initial,
    transition,
    onDrag,
    whileHover,
    onDragEnd,
    onDragStart,
    onDragTransitionEnd,
    ...restProps
  } = props;

  // Create a clean set of HTML props for server-side rendering
  const htmlProps: HTMLAttributes<HTMLDivElement> = {
    className: baseStyles,
    ...restProps
  };

  if (!hasMounted) {
    return (
      <div {...htmlProps}>
        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-50" />
        <div className="relative z-10">
          {children}
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className={clientStyles}
      {...props}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-50" />
      <div className="relative z-10">
        {children}
      </div>
    </motion.div>
  );
};

export default GlassCard; 