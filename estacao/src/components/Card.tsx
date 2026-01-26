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
    const textPositionClasses =
        align === 'left'
            ? 'col-start-1 text-right pr-3'
            : 'col-start-3 text-left pl-3';

    return (
        <div className="w-full relative">
            {/* Mobile: ícone e texto lado a lado, alinhados verticalmente */}
            <div className="flex flex-row items-center justify-center w-full max-w-[320px] md:grid md:grid-cols-1 md:items-center md:max-w-[200px] md:min-h-[200px] mx-auto">
                {/* Ícone */}
                <div className="flex-shrink-0 flex items-center justify-center md:col-start-1 md:row-start-1 md:mb-0 mr-3 md:mr-0" style={{ zIndex: 20 }}>
                    <div className="bg-transparent w-[48px] h-[48px] md:w-[78px] md:h-[78px] flex items-center justify-center" style={{ aspectRatio: '1/1', zIndex: 20 }}>
                        <Image
                            src={imgSrc}
                            alt={title}
                            width={78}
                            height={78}
                            priority
                            sizes="(max-width: 768px) 48px, 78px"
                            className="w-[48px] h-[48px] md:w-[78px] md:h-[78px]"
                            style={{ aspectRatio: '1/1', zIndex: 20 }}
                        />
                    </div>
                </div>
                {/* Texto */}
                <div
                    className={`flex-1 ${textPositionClasses} md:col-start-1 md:row-start-2 md:w-full md:text-center md:px-0`}
                    style={style}
                >
                    <h2 className="inline-block text-[14px] leading-[16px] text-[#212529] font-bold whitespace-nowrap overflow-hidden text-ellipsis mx-[5px] md:text-[18px] md:leading-[22px] md:mt-4">
                        {title}
                    </h2>
                    <p className="text-[#212529] text-[12px] leading-[16px] mt-[4px] md:text-[16px] md:leading-[24px] md:mt-[15px]">
                        {text}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Card;
