import Image from 'next/image';
import React from 'react';

interface DesktopCardProps {
    imgSrc: string;
    title: string;
    text: string;
}

const DesktopCard: React.FC<DesktopCardProps> = ({ imgSrc, title, text }) => (
    <div className="hidden md:flex flex-col items-center justify-start text-center max-w-[200px]" style={{ minHeight: '200px' }}>
        <div className="w-20 h-20 flex items-center justify-center relative" style={{ aspectRatio: '1/1', zIndex: '20', height: '80px' }}>
            <Image
                src={imgSrc}
                alt={title}
                width={78}
                height={78}
                priority
                sizes="(max-width: 768px) 48px, 78px"
                className="w-[78px] h-[78px] relative"
                style={{ aspectRatio: '1/1', zIndex: '20' }}
            />
        </div>
        <h2 className="text-[#212529] mt-4 text-lg md:text-xl text-[18px] leading-[22px] font-bold">
            {title}
        </h2>
        <p className="text-[#212529] text-sm md:text-base text-[16px] leading-[24px] text-center mt-[15px]">
            {text}
        </p>
    </div>
);

export default DesktopCard;
