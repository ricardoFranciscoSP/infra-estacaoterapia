"use client";
import Image from "next/image";
import { useRouter } from "next/navigation";
import React from "react";

interface BreadcrumbsVoltarProps {
    label?: string;
    onClick?: (e?: React.MouseEvent<HTMLButtonElement>) => void;
    className?: string;
}

export default function BreadcrumbsVoltar({ 
    label = 'Voltar', 
    onClick,
    className = '' 
}: BreadcrumbsVoltarProps) {
    const router = useRouter();
    
    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
        if (onClick) {
            onClick(e);
        } else {
            router.back();
        }
    };
    
    return (
        <button
            type="button"
            className={`fira-sans font-medium text-[14px] leading-[24px] text-[#6D75C0] p-0 min-w-fit mb-2 flex items-center gap-1 align-middle hover:underline transition-colors ${className}`}
            onClick={handleClick}
        >
            <Image
                src="/assets/icons/caret-left.svg"
                alt="Voltar"
                width={16}
                height={16}
                className="w-4 h-4"
                unoptimized
            />
            {label}
        </button>
    );
}
