'use client';

import Link from 'next/link';
import { useRedesSociais } from '@/hooks/redesSociaisHook';
import { FaInstagram, FaFacebookF, FaLinkedinIn, FaTiktok, FaYoutube } from 'react-icons/fa';

export default function RedesSociaisCadastro() {
  const { redesSociais, isLoading } = useRedesSociais();

  // Fallback para valores padrão caso não tenha dados
  const instagram = redesSociais && redesSociais.length > 0 && redesSociais[0].Instagram 
    ? redesSociais[0].Instagram 
    : '#';
  const facebook = redesSociais && redesSociais.length > 0 && redesSociais[0].Facebook 
    ? redesSociais[0].Facebook 
    : '#';
  const linkedin = redesSociais && redesSociais.length > 0 && redesSociais[0].Linkedin 
    ? redesSociais[0].Linkedin 
    : '#';
  const tiktok = redesSociais && redesSociais.length > 0 && redesSociais[0].Tiktok 
    ? redesSociais[0].Tiktok 
    : '#';
  const youtube = redesSociais && redesSociais.length > 0 && redesSociais[0].Youtube 
    ? redesSociais[0].Youtube 
    : null;

  if (isLoading) {
    return (
      <div className="flex flex-col sm:flex-row items-center justify-center sm:justify-between gap-3 sm:gap-0">
        <p className="fira-sans font-medium text-[14px] sm:text-[16px] lg:text-[18px] leading-[20px] sm:leading-[24px] lg:leading-[28px] text-[#444D9D] text-center sm:text-left">
          Aproveite e nos siga nas redes sociais:
        </p>
        <div className="flex gap-[2px] text-[#8494E9]">
          <div className="w-[28px] h-[28px] sm:w-[32px] sm:h-[32px] bg-gray-200 animate-pulse rounded"></div>
          <div className="w-[28px] h-[28px] sm:w-[32px] sm:h-[32px] bg-gray-200 animate-pulse rounded"></div>
          <div className="w-[28px] h-[28px] sm:w-[32px] sm:h-[32px] bg-gray-200 animate-pulse rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col sm:flex-row items-center justify-center sm:justify-between gap-3 sm:gap-0">
      <p className="fira-sans font-medium text-[14px] sm:text-[16px] lg:text-[18px] leading-[20px] sm:leading-[24px] lg:leading-[28px] text-[#444D9D] text-center sm:text-left">
        Aproveite e nos siga nas redes sociais:
      </p>
      <div className="flex gap-[2px] text-[#8494E9]">
        {instagram && (
          <Link href={instagram} aria-label="Instagram" className="w-[28px] h-[28px] sm:w-[32px] sm:h-[32px] flex items-center justify-center hover:text-[#6D75C0] transition-colors">
            <FaInstagram className="text-[16px] sm:text-[18px]" />
          </Link>
        )}
        {facebook && (
          <Link href={facebook} aria-label="Facebook" className="w-[28px] h-[28px] sm:w-[32px] sm:h-[32px] flex items-center justify-center hover:text-[#6D75C0] transition-colors">
            <FaFacebookF className="text-[16px] sm:text-[18px]" />
          </Link>
        )}
        {linkedin && (
          <Link href={linkedin} aria-label="LinkedIn" className="w-[28px] h-[28px] sm:w-[32px] sm:h-[32px] flex items-center justify-center hover:text-[#6D75C0] transition-colors">
            <FaLinkedinIn className="text-[16px] sm:text-[18px]" />
          </Link>
        )}
        {tiktok && (
          <Link href={tiktok} aria-label="TikTok" className="w-[28px] h-[28px] sm:w-[32px] sm:h-[32px] flex items-center justify-center hover:text-[#6D75C0] transition-colors">
            <FaTiktok className="text-[16px] sm:text-[18px]" />
          </Link>
        )}
        {youtube && (
          <Link href={youtube} aria-label="YouTube" className="w-[28px] h-[28px] sm:w-[32px] sm:h-[32px] flex items-center justify-center hover:text-[#6D75C0] transition-colors">
            <FaYoutube className="text-[16px] sm:text-[18px]" />
          </Link>
        )}
      </div>
    </div>
  );
}

