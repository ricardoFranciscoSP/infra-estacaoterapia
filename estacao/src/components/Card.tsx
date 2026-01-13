import React from 'react';
import Image from 'next/image';

interface CardProps {
    imgSrc: string;
    title: string;
    text: string;
    align: 'left' | 'right';
    style?: React.CSSProperties;
}

const Card: React.FC<CardProps> = ({ imgSrc, title, text, align, style }) => (
    <div className="flex md:hidden items-start justify-center w-full relative">
        <div className="flex w-full max-w-[320px] items-start justify-between">
            <div className="w-2/5">
                {align === 'left' && (
                    <div className="text-right pr-3 w-[110px]" style={style}>
                        <h2 className="inline-block text-[14px] leading-[16px] text-[#212529] font-bold whitespace-nowrap overflow-hidden text-ellipsis mx-[5px]">
                            {title}
                        </h2>
                        <p className="text-[#212529] text-[12px] leading-[16px] mt-[4px] -regular">
                            {text}
                        </p>
                    </div>
                )}
            </div>
            <div className="w-1/5 flex items-center justify-center relative" style={{ zIndex: '20' }}>
                <div className="bg-transparent w-[48px] h-[48px] relative" style={{ aspectRatio: '1/1', zIndex: '20' }}>
                    <Image
                        src={imgSrc}
                        alt={title}
                        width={48}
                        height={48}
                        priority
                        sizes="48px"
                        className="w-[48px] h-[48px] relative"
                        style={{ aspectRatio: '1/1', zIndex: '20' }}
                    />
                </div>
            </div>
            <div className="w-2/5">
                {align === 'right' && (
                    <div className="text-left pl-3 w-[110px]" style={style}>
                        <h2 className="inline-block text-[14px] leading-[16px] text-[#212529] font-bold whitespace-nowrap overflow-hidden text-ellipsis mx-[5px]">
                            {title}
                        </h2>
                        <p className="text-[#212529] text-[12px] leading-[16px] mt-[4px] ">
                            {text}
                        </p>
                    </div>
                )}
            </div>
        </div>
    </div>
);

export default Card;
