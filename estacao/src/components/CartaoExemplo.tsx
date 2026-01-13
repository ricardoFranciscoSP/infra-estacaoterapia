import Image from "next/image";
import React from "react";

interface CartaoExemploProps {
  numeroCartao: string;
  nomeTitular: string;
  validade: string;
  cvv: string;
  isCardFlipped?: boolean;
  getCardLogo?: () => string;
  style?: React.CSSProperties;
}

export default function CartaoExemplo({
  numeroCartao,
  nomeTitular,
  validade,
  cvv,
  isCardFlipped = false,
  getCardLogo,
  style = {},
}: CartaoExemploProps) {
  const displayCardNumber = () => {
    if (!numeroCartao) return "**** **** **** ****";
    const digits = numeroCartao.replace(/\D/g, "");
    return digits.padEnd(16, "*").replace(/(\d{4})/g, "$1 ").trim();
  };

  return (
    <div className="card-container mb-6" style={{ ...style, maxWidth: 450 }}>
      <div
        className={`card-inner ${isCardFlipped ? "flipped" : ""}`}
        style={{ aspectRatio: '1.6 / 1', width: '100%', height: 260 }}
      >
        {/* Frente do Cartão */}
        <div className="card-front relative flex flex-col justify-between overflow-hidden" style={{ padding: '24px 24px 20px 24px', minHeight: 260 }}>
          {/* Decoração de fundo */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white rounded-full blur-2xl"></div>
          </div>
          
          {/* Header com logo e bandeira */}
          <div className="flex items-center justify-between mb-3 relative z-10">
            <Image
              src="/assets/logo/logo.svg"
              alt="Logo Plataforma"
              className="w-28 h-12 object-contain"
              width={112}
              height={48}
              style={{ display: "block" }}
            />
            <div className="flex items-center gap-2">
              {getCardLogo && (
                <Image
                  src={getCardLogo()}
                  alt="Bandeira"
                  width={44}
                  height={32}
                  className="w-11 h-8 object-contain"
                />
              )}
              {/* Símbolo Contactless */}
              <div className="contactless-icon">
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="16" cy="16" r="15" fill="rgba(255,255,255,0.2)" stroke="rgba(255,255,255,0.3)" strokeWidth="1"/>
                  <path d="M16 8C19.866 8 23 11.134 23 15C23 18.866 19.866 22 16 22" stroke="white" strokeWidth="2" strokeLinecap="round" fill="none"/>
                  <path d="M16 10C18.2091 10 20 11.7909 20 14C20 16.2091 18.2091 18 16 18" stroke="white" strokeWidth="2" strokeLinecap="round" fill="none"/>
                  <path d="M16 12C16.5523 12 17 12.4477 17 13C17 13.5523 16.5523 14 16 14" stroke="white" strokeWidth="2" strokeLinecap="round" fill="none"/>
                </svg>
              </div>
            </div>
          </div>

          {/* Chip do cartão */}
          <div className="chip-container relative z-10 mb-3">
            <div className="chip">
              <div className="chip-lines">
                <div className="chip-line"></div>
                <div className="chip-line"></div>
                <div className="chip-line"></div>
                <div className="chip-line"></div>
                <div className="chip-line"></div>
                <div className="chip-line"></div>
              </div>
            </div>
          </div>

          {/* Número do cartão */}
          <div className="relative z-10 mb-3">
            <div className="fira-sans text-xs mb-1 opacity-80">Número do cartão</div>
            <div className="fira-sans font-bold text-xl tracking-widest" style={{ letterSpacing: 2 }}>{displayCardNumber()}</div>
          </div>

          {/* Footer com nome e validade */}
          <div className="flex justify-between items-end mt-auto relative z-10 pt-2">
            <div className="flex-1">
              <div className='fira-sans text-xs opacity-80 mb-1'>Nome do Titular</div>
              <div className="fira-sans font-semibold text-sm truncate max-w-[220px]">{nomeTitular || "SEU NOME"}</div>
            </div>
            <div className="text-right">
              <div className='fira-sans text-xs opacity-80 mb-1'>Validade</div>
              <div className="fira-sans font-semibold text-sm">{validade || "MM/AA"}</div>
            </div>
          </div>
        </div>

        {/* Verso do Cartão */}
        <div className="card-back flex flex-col" style={{ minHeight: 260, padding: '0' }}>
          {/* Faixa magnética */}
          <div className="magnetic-strip"></div>
          
          {/* Área de assinatura e CVV */}
          <div className="flex-1 px-6 py-4 flex flex-col justify-between">
            <div className="signature-area">
              <div className="signature-label">Assinatura do Portador</div>
              <div className="signature-line"></div>
            </div>
            
            <div className="cvv-section">
              <div className="cvv-label">CVV</div>
              <div className="cvv-strip">{cvv || "***"}</div>
            </div>
          </div>

          {/* Informações adicionais */}
          <div className="card-back-info px-6 pb-4">
            <div className="info-text">
              Este cartão é propriedade da instituição emissora. Em caso de perda ou roubo, 
              entre em contato imediatamente com o emissor.
            </div>
            <div className="info-text-small mt-2">
              Para sua segurança, não compartilhe os dados deste cartão.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
