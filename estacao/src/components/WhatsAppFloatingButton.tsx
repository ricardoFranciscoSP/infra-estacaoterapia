"use client";
import React from 'react';
import { motion } from 'framer-motion';

interface WhatsAppFloatingButtonProps {
  phoneNumber?: string;
  message?: string;
  position?: 'bottom-right' | 'bottom-left';
}

export default function WhatsAppFloatingButton({
  phoneNumber = "5511960892131",
  message = "Olá, preciso de suporte na Estação Terapia.",
  position = 'bottom-right'
}: WhatsAppFloatingButtonProps) {
  const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;

  // Usa valores fixos para evitar problemas com Tailwind JIT
  // Mobile: bottom-24 (96px) para ficar acima do footer
  // Desktop: bottom-24 (96px) para ficar acima do botão de voltar ao topo (que está em bottom-8)
  const positionClasses = position === 'bottom-right' 
    ? `right-4 bottom-24 md:bottom-24` 
    : `left-4 bottom-24 md:bottom-24`;

  return (
    <motion.a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Fale conosco no WhatsApp"
      className={`fixed ${positionClasses} z-[999] bg-[#25D366] hover:bg-[#128C7E] rounded-full shadow-lg p-3 md:p-4 flex items-center justify-center transition-colors duration-200 cursor-pointer group`}
      style={{ boxShadow: '0 4px 12px rgba(37,211,102,0.35)' }}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ 
        type: "spring",
        stiffness: 260,
        damping: 20,
        delay: 0.2
      }}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
    >
      {/* SVG oficial WhatsApp */}
      <svg 
        width="32" 
        height="32" 
        viewBox="0 0 32 32" 
        fill="none"
        className="group-hover:scale-110 transition-transform duration-200"
      >
        <g>
          <circle cx="16" cy="16" r="16" fill="#25D366"/>
          <path 
            d="M16 7.5c-4.7 0-8.5 3.7-8.5 8.3 0 1.5.4 2.9 1.1 4.1L7 25l5.3-1.4c1.2.6 2.5.9 3.7.9 4.7 0 8.5-3.7 8.5-8.3S20.7 7.5 16 7.5zm0 14.7c-1.2 0-2.4-.3-3.5-.9l-.3-.2-3.1.8.8-3-.2-.3c-.7-1.1-1-2.3-1-3.6 0-3.7 3.2-6.7 7.1-6.7s7.1 3 7.1 6.7-3.2 6.7-7.1 6.7zm4-5.1c-.2-.1-1.2-.6-1.4-.7-.2-.1-.3-.1-.5.1-.1.1-.5.7-.6.8-.1.1-.2.2-.4.1-.2-.1-.8-.3-1.5-.9-.6-.5-1-1.2-1.1-1.3-.1-.1 0-.2.1-.3.1-.1.2-.2.3-.3.1-.1.1-.2.2-.3.1-.1.1-.2.2-.3.1-.2.1-.3 0-.5-.1-.1-.5-1.2-.7-1.7-.2-.5-.4-.4-.5-.4h-.4c-.2 0-.4.1-.6.3-.2.2-.8.8-.8 2 0 1.2.8 2.3 1.1 2.7.3.4 1.7 2.7 4.2 3.6.6.2 1.1.3 1.5.2.5-.1 1.1-.5 1.2-1 .2-.5.2-.9.1-1-.1-.1-.2-.1-.4-.2z" 
            fill="#fff"
          />
        </g>
      </svg>
      
      {/* Tooltip */}
      <span className="absolute right-full mr-3 px-3 py-1.5 bg-gray-800 text-white text-xs font-medium rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
        Fale conosco no WhatsApp
        <span className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-full border-4 border-transparent border-l-gray-800"></span>
      </span>
    </motion.a>
  );
}
