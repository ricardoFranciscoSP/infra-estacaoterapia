"use client";
// ...existing code...
"use client";
import { Toaster, ToastBar, toast } from 'react-hot-toast';
import React from 'react';

export function CustomToastProvider() {
  return (
    <Toaster
      position="top-right"
      toastOptions={{
        duration: 4000,
        className: '', // Remove qualquer classe default do container do react-hot-toast
        style: { background: 'none', boxShadow: 'none', padding: 0, minWidth: 0, maxWidth: 'none' },
      }}
    >
      {(t) => (
        <ToastBar toast={t}>
          {({ icon, message }) => (
            <div
              className={`inline-flex items-center gap-3 rounded-[20px] px-5 py-5 min-h-[56px] max-w-full ${
                t.type === 'error'
                  ? 'bg-[#FFE0E0] text-[#B30000] font-normal text-[16px] leading-6'
                  : t.type === 'success'
                  ? 'bg-[#F1F6EE] text-[#3B7A2A] font-normal text-[16px] leading-6'
                  : 'text-[#23253a] font-normal text-[16px] leading-6'
              }`}
              style={{ width: 'fit-content', maxWidth: '100%' }}
            >
              {icon}
              <span className="break-words whitespace-pre-line">{message}</span>
            </div>
          )}
        </ToastBar>
      )}
    </Toaster>
  );
}

export { toast };
