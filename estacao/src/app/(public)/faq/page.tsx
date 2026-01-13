'use client';

import FAQPage from "@/components/faq";
import { AnimatePresence, motion } from "framer-motion";


const FaqPage = () => {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key="faq-page"
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -40 }}
        transition={{ duration: 0.3 }}
      >
        <FAQPage />
      </motion.div>
    </AnimatePresence>
  );
};

export default FaqPage;
