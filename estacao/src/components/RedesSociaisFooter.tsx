'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRedesSociais } from '@/hooks/redesSociaisHook';

export default function RedesSociaisFooter() {
  const { redesSociais, isLoading } = useRedesSociais();

  // Fallback para valores padrão caso não tenha dados
  const instagram = redesSociais && redesSociais.length > 0 && redesSociais[0].Instagram 
    ? redesSociais[0].Instagram 
    : 'https://www.instagram.com/estacaoterapia';
  const facebook = redesSociais && redesSociais.length > 0 && redesSociais[0].Facebook 
    ? redesSociais[0].Facebook 
    : 'https://www.facebook.com/profile.php?id=61582287230956';
  const linkedin = redesSociais && redesSociais.length > 0 && redesSociais[0].Linkedin 
    ? redesSociais[0].Linkedin 
    : 'https://www.linkedin.com/in/estacaoterapia';
  const tiktok = redesSociais && redesSociais.length > 0 && redesSociais[0].Tiktok 
    ? redesSociais[0].Tiktok 
    : 'http://tiktok.com/@estacaoterapia';
  const youtube = redesSociais && redesSociais.length > 0 && redesSociais[0].Youtube 
    ? redesSociais[0].Youtube 
    : null;

  if (isLoading) {
    return (
      <div className="hidden md:flex flex-col items-center md:items-end md:w-1/4 w-full mt-4 md:mt-0">
        <span className="text-[#22223B] font-medium mb-3 text-center md:text-right w-full">Nos siga nas redes sociais:</span>
        <div className="flex gap-3 justify-end w-full">
          <div className="w-6 h-6 bg-gray-200 animate-pulse rounded"></div>
          <div className="w-6 h-6 bg-gray-200 animate-pulse rounded"></div>
          <div className="w-6 h-6 bg-gray-200 animate-pulse rounded"></div>
          <div className="w-6 h-6 bg-gray-200 animate-pulse rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="hidden md:flex flex-col items-center md:items-end md:w-1/4 w-full mt-4 md:mt-0">
      <span className="text-[#22223B] font-medium mb-3 text-center md:text-right w-full">Nos siga nas redes sociais:</span>
      <div className="flex gap-3 justify-end w-full items-center mb-3">
        {instagram && (
          <Link href={instagram} target="_blank" rel="noopener noreferrer" aria-label="Instagram">
            <Image src="/assets/icons/instagram.webp" alt="Instagram" className="w-6 h-6" width={24} height={24} sizes="24px" quality={80} loading="lazy" />
          </Link>
        )}
        {facebook && (
          <Link href={facebook} target="_blank" rel="noopener noreferrer" aria-label="Facebook">
            <Image src="/assets/icons/facebook.webp" alt="Facebook" className="w-6 h-6" width={24} height={24} sizes="24px" quality={80} loading="lazy" />
          </Link>
        )}
        {linkedin && (
          <Link href={linkedin} target="_blank" rel="noopener noreferrer" aria-label="LinkedIn">
            <Image src="/assets/icons/linkedin.webp" alt="LinkedIn" className="w-6 h-6" width={24} height={24} sizes="24px" quality={80} loading="lazy" />
          </Link>
        )}
        {tiktok && (
          <Link href={tiktok} target="_blank" rel="noopener noreferrer" aria-label="TikTok">
            <Image src="/assets/icons/tiktok.webp" alt="TikTok" className="w-6 h-6" width={24} height={24} sizes="24px" quality={80} loading="lazy" />
          </Link>
        )}
        {youtube && (
          <Link href={youtube} target="_blank" rel="noopener noreferrer" aria-label="YouTube">
            <Image src="/assets/icons/youtube.webp" alt="YouTube" className="w-6 h-6" width={24} height={24} sizes="24px" quality={80} loading="lazy" />
          </Link>
        )}
      </div>
      {/* Logo Reclame Aqui abaixo das redes sociais, alinhado à direita */}
      <div className="flex justify-end w-full">
        <Link href="https://www.reclameaqui.com.br" target="_blank" rel="noopener noreferrer" aria-label="Reclame Aqui" className="transition-opacity hover:opacity-80">
          <Image src="/assets/logo-reclame-aqui.webp" alt="Reclame Aqui" className="h-auto w-auto max-w-[160px]" width={160} height={52} sizes="160px" quality={85} loading="lazy" />
        </Link>
      </div>
    </div>
  );
}

