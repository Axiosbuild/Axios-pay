'use client';

import { motion, type HTMLMotionProps, type Variants } from 'framer-motion';
import type { ReactNode } from 'react';

type SectionRevealProps = HTMLMotionProps<'section'> & {
  children: ReactNode;
};

const variants: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0 },
};

export function SectionReveal({ children, className = '', ...rest }: SectionRevealProps) {
  return (
    <motion.section
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.24 }}
      transition={{ duration: 0.65, ease: 'easeOut' }}
      variants={variants}
      {...rest}
    >
      {children}
    </motion.section>
  );
}
