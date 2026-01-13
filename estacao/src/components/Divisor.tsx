// src/components/Divisor.tsx
import React from "react";
import { motion } from "framer-motion";

const Divisor: React.FC = () => (
  <motion.div
    initial={{ opacity: 0, y: 30 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.7, ease: "easeOut" }}
  >
    <div className="w-full flex justify-center">
      <hr
        className="w-full max-w-[1200px] border-t border-[#CACFD4] opacity-100 my-8"
        style={{ height: 0 }}
      />
    </div>
  </motion.div>
);

export default Divisor;