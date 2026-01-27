import React from 'react';
import Image from 'next/image';

interface CardProps {
    imgSrc: string;
    title: string;
    text: string;
    align: 'left' | 'right';
    style?: React.CSSProperties;
}

const Card: React.FC<CardProps> = ({ imgSrc, title, text, align, style }) => {
    return (
        <div className="w-full relative" style={style}>
            {/* Mobile: layout em blocos — ícone na linha central (círculo roxo) + texto alternando esq/dir */}
            <div className="flex flex-col md:grid md:grid-cols-1 md:items-center md:max-w-[240px] md:min-h-[200px] mx-auto">
                {/* Container mobile: grid 3 colunas — [texto esq] | [ícone centro] | [texto dir] */}
                <div className="md:hidden w-full grid grid-cols-[1fr_auto_1fr] gap-0 items-center">
                    {/* Coluna esquerda: texto à esquerda da linha (align left) */}
                    <div className={`min-w-0 ${align === 'left' ? 'pr-3' : ''}`}>
                        {align === 'left' && (
                            <div className="text-right">
                                <h2 className="text-[14px] leading-[16px] text-[#212529] font-bold">
                                    {title}
                                </h2>
                                <p className="text-[#212529] text-[12px] leading-[16px] mt-1">
                                    {text}
                                </p>
                            </div>
                        )}
                    </div>
                    {/* Centro: logo em cima da linha (SVG já tem círculo lilás + ícone branco) */}
                    <div className="flex-shrink-0 flex items-center justify-center relative z-10">
                        <Image
                            src={imgSrc}
                            alt={title}
                            width={78}
                            height={78}
                            priority
                            sizes="(max-width: 768px) 48px, 78px"
                            className="w-12 h-12 object-contain"
                        />
                    </div>
                    {/* Coluna direita: texto à direita da linha (align right) */}
                    <div className={`min-w-0 ${align === 'right' ? 'pl-3' : ''}`}>
                        {align === 'right' && (
                            <div className="text-left">
                                <h2 className="text-[14px] leading-[16px] text-[#212529] font-bold">
                                    {title}
                                </h2>
                                <p className="text-[#212529] text-[12px] leading-[16px] mt-1">
                                    {text}
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Desktop: ícone + texto centralizado em coluna (SVG já tem círculo lilás + ícone branco) */}
                <div className="hidden md:grid md:grid-cols-1 md:items-center md:gap-0">
                    <div className="flex items-center justify-center md:col-start-1 md:row-start-1" style={{ zIndex: 20 }}>
                        <Image
                            src={imgSrc}
                            alt={title}
                            width={78}
                            height={78}
                            priority
                            sizes="78px"
                            className="w-[78px] h-[78px] object-contain"
                        />
                    </div>
                    <div className="md:col-start-1 md:row-start-2 md:w-full md:text-center md:px-0 md:mt-6">
                        <h2 className="text-[18px] leading-[22px] text-[#212529] font-bold">
                            {title}
                        </h2>
                        <p className="text-[#212529] text-[16px] leading-[24px] mt-4">
                            {text}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Card;
