'use client';

import FAQPsicologo from "@/components/FAQPsicologo";
import { AnimatePresence, motion } from "framer-motion";
import SidebarPsicologo from "../SidebarPsicologo";

const FaqPage = () => {
  return (
    <div className="min-h-screen font-fira bg-[#F6F7FB]">
      <div className="max-w-[1200px] mx-auto w-full flex">
        <div className="hidden md:flex">
          <SidebarPsicologo />
        </div>
        <main className="flex-1 py-4 sm:py-8 px-4 sm:px-6 font-fira-sans w-full">
          <AnimatePresence mode="wait">
            <motion.div
              key="faq-page"
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -40 }}
              transition={{ duration: 0.3 }}
            >
              <FAQPsicologo />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
};

export default FaqPage;

