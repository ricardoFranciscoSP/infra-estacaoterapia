// components/GlobalLoader.tsx
'use client'

import { useUIStore } from '@/store/uiStore'
import { motion, AnimatePresence } from 'framer-motion'

interface UIStoreState {
  isLoading: boolean;
  setLoading: (value: boolean) => void;
}

export function GlobalLoader(): React.ReactElement | null {
  const isLoading = useUIStore((s: UIStoreState) => s.isLoading);

  return (
    <AnimatePresence>
      {isLoading && (
        <motion.div
          className="fixed top-0 left-0 w-full h-full bg-black/60 flex items-center justify-center z-[1000]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div className="loader" />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
