"use client";
import React, { useState, useEffect, useRef, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from "framer-motion";
import { useBanners } from '@/hooks/useBanners';

interface BannerItem {
    Id: string;
    UrlImagemDesktop: string;
    UrlImagemMobile: string;
    LinkDestino: string | null;
    AltTextDesktop: string | null;
    AltTextMobile: string | null;
    TitleSEO: string | null;
}

export default function BannerRotativo() {
    const { data: bannersData, isLoading } = useBanners(true); // Busca apenas banners ativos
    const [current, setCurrent] = useState(0);
    const [isPaused, setIsPaused] = useState(false);
    const touchStartX = useRef(0);
    const touchEndX = useRef(0);
    const [isMobile, setIsMobile] = useState(false);

    // ⚡ OTIMIZAÇÃO: Detecta mobile usando media query para melhor performance
    useEffect(() => {
        const mediaQuery = window.matchMedia('(max-width: 768px)');
        const checkScreenSize = () => {
            setIsMobile(mediaQuery.matches);
        };
        
        // Define valor inicial
        checkScreenSize();
        
        // Usa addEventListener em mediaQuery para melhor performance
        if (mediaQuery.addEventListener) {
            mediaQuery.addEventListener('change', checkScreenSize);
            return () => mediaQuery.removeEventListener('change', checkScreenSize);
        } else {
            // Fallback para navegadores mais antigos
            mediaQuery.addListener(checkScreenSize);
            return () => mediaQuery.removeListener(checkScreenSize);
        }
    }, []);

    // Processa banners: filtra apenas os ativos e ordena
    const banners: BannerItem[] = useMemo(() => {
        if (!bannersData || bannersData.length === 0) return [];
        return bannersData
            .filter((banner) => banner.Ativo)
            .sort((a, b) => a.Ordem - b.Ordem)
            .map((banner) => ({
                Id: banner.Id,
                UrlImagemDesktop: banner.UrlImagemDesktop,
                UrlImagemMobile: banner.UrlImagemMobile,
                LinkDestino: banner.LinkDestino,
                AltTextDesktop: banner.AltTextDesktop || banner.Titulo || 'Banner',
                AltTextMobile: banner.AltTextMobile || banner.Titulo || 'Banner',
                TitleSEO: banner.TitleSEO || banner.Titulo || null,
            }));
    }, [bannersData]);

    // Reset current quando banners mudam
    useEffect(() => {
        if (banners.length > 0 && current >= banners.length) {
            setCurrent(0);
        }
    }, [banners.length, current]);

    // Auto-rotate dos banners
    useEffect(() => {
        if (isPaused || banners.length <= 1) return;
        
        const interval = setInterval(() => {
            setCurrent((prev) => (prev + 1) % banners.length);
        }, 7000);

        return () => clearInterval(interval);
    }, [isPaused, banners.length]);

    // Funções para swipe mobile
    const handleTouchStart = (e: React.TouchEvent) => {
        touchStartX.current = e.touches[0].clientX;
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        touchEndX.current = e.touches[0].clientX;
    };

    const handleTouchEnd = () => {
        if (banners.length <= 1) return;
        
        const delta = touchStartX.current - touchEndX.current;
        if (Math.abs(delta) > 50) {
            if (delta > 0) {
                // Swipe para esquerda - próximo
                setCurrent((prev) => (prev + 1) % banners.length);
            } else {
                // Swipe para direita - anterior
                setCurrent((prev) => (prev - 1 + banners.length) % banners.length);
            }
        }
    };

    // ⚡ OTIMIZAÇÃO: Skeleton com aspect ratio correto para evitar layout shift
    if (isLoading) {
        return (
            <div 
                className="relative flex items-center justify-center overflow-hidden bg-gray-100"
                style={{
                    width: '100vw',
                    maxWidth: '100vw',
                    margin: 0,
                    padding: 0,
                    marginLeft: 'calc((100vw - 100%) / -2)',
                    marginRight: 'calc((100vw - 100%) / -2)',
                    overflow: 'hidden',
                    // Mobile: aspect ratio 425:525 (0.81) - Desktop: aspect ratio 1920:750 (2.56)
                    aspectRatio: typeof window !== 'undefined' && window.innerWidth <= 768 ? '425 / 525' : '1920 / 750'
                }}
            >
                <div className="animate-pulse bg-gray-200 w-full h-full"></div>
            </div>
        );
    }

    if (!banners || banners.length === 0) {
        return null; // Não renderiza se não houver banners
    }

    const currentBanner = banners[current];
    if (!currentBanner) return null;

    const imageUrl = isMobile ? currentBanner.UrlImagemMobile : currentBanner.UrlImagemDesktop;
    const altText = (isMobile ? currentBanner.AltTextMobile : currentBanner.AltTextDesktop) || 'Banner';
    const linkHref = currentBanner.LinkDestino || '#';
    const ariaLabel = currentBanner.TitleSEO || altText;

    return (
        <motion.div
            initial={{ opacity: 1 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0 }}
            className="relative flex items-center justify-center overflow-hidden lg:-mt-[80px] xl:-mt-[80px] 2xl:-mt-[80px]"
            style={{ 
                padding: 0, 
                margin: 0,
                marginTop: 0,
                marginLeft: 'calc((100vw - 100%) / -2)',
                marginRight: 'calc((100vw - 100%) / -2)',
                marginBottom: 0,
                position: 'relative',
                width: '100vw', 
                maxWidth: 'none',
                minWidth: '100vw',
                touchAction: 'pan-y pinch-zoom',
                overflow: 'hidden'
            }}
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
            onFocus={() => setIsPaused(true)}
            onBlur={() => setIsPaused(false)}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            role="region"
            aria-label="Carrossel de banners"
        >
            {linkHref !== '#' ? (
                <Link 
                    href={linkHref}
                    className="relative flex items-start justify-center z-0 overflow-hidden"
                    style={{ 
                        margin: 0, 
                        padding: 0, 
                        display: 'block', 
                        width: '100vw', 
                        maxWidth: 'none',
                        minWidth: '100vw'
                    }}
                    aria-label={ariaLabel}
                >
                    <div 
                        className="relative flex items-center justify-center overflow-hidden" 
                        style={{ 
                            margin: 0, 
                            padding: 0, 
                            width: '100vw', 
                            maxWidth: 'none',
                            minWidth: '100vw',
                            // Mobile: aspect ratio 425:525 (0.81) - altura baseada na largura
                            // Desktop/Tablet: aspect ratio 1920:750 (2.56) - altura baseada na largura
                            aspectRatio: isMobile ? '425 / 525' : '1920 / 750',
                            overflow: 'hidden',
                            touchAction: 'pan-y pinch-zoom'
                        }}
                    >
                        <Image
                            src={imageUrl}
                            alt={altText || 'Banner'}
                            fill
                            sizes="100vw"
                            className="w-full h-full"
                            priority={current === 0}
                            fetchPriority={current === 0 ? "high" : "auto"}
                            quality={current === 0 ? 85 : 75}
                            loading={current === 0 ? "eager" : "lazy"}
                            title={currentBanner.TitleSEO || undefined}
                            style={{ 
                                margin: 0, 
                                padding: 0, 
                                display: 'block',
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover',
                                objectPosition: 'center'
                            }}
                            onError={() => {
                              console.warn('Erro ao carregar banner:', imageUrl);
                            }}
                        />
                        {/* Indicadores - sempre dentro do container do banner */}
                        {banners.length > 1 && (
                            <div className="absolute bottom-6 md:bottom-8 lg:bottom-10 left-1/2 -translate-x-1/2 flex gap-2 z-20 px-3 py-1.5 rounded-full bg-black/20 backdrop-blur-sm">
                                {banners.map((_, idx) => (
                                    <button
                                        key={banners[idx].Id}
                                        onClick={(e) => {
                                            e.preventDefault();
                                            setCurrent(idx);
                                        }}
                                        className={`h-1.5 md:h-2 transition-all duration-300 cursor-pointer rounded-full ${
                                            current === idx ? 'w-8 md:w-10 bg-[#6c6bb6]' : 'w-4 md:w-5 bg-[#e5e9fa]'
                                        }`}
                                        aria-label={`Ir para banner ${idx + 1} de ${banners.length}`}
                                        aria-current={current === idx ? 'true' : 'false'}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </Link>
            ) : (
                <div 
                    className="relative flex items-center justify-center overflow-hidden" 
                    style={{ 
                        margin: 0, 
                        padding: 0, 
                        width: '100vw', 
                        maxWidth: 'none',
                        minWidth: '100vw',
                        // Mobile: aspect ratio 425:525 (0.81) - altura baseada na largura
                        // Desktop/Tablet: aspect ratio 1920:750 (2.56) - altura baseada na largura
                        aspectRatio: isMobile ? '425 / 525' : '1920 / 750',
                        overflow: 'hidden',
                        touchAction: 'pan-y pinch-zoom'
                    }}
                >
                    <Image
                        src={imageUrl}
                        alt={altText}
                        fill
                        sizes="100vw"
                        className="w-full h-full"
                        priority={current === 0}
                        fetchPriority={current === 0 ? "high" : "auto"}
                        quality={current === 0 ? 80 : 70}
                        loading={current === 0 ? "eager" : "lazy"}
                        title={currentBanner.TitleSEO || undefined}
                        style={{ 
                            margin: 0, 
                            padding: 0, 
                            display: 'block',
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            objectPosition: 'center'
                        }}
                        // ⚡ OTIMIZAÇÃO: Melhorar loading de imagem
                        placeholder="blur"
                        blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWEREiMxUf/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R//2Q=="
                    />
                    {/* Indicadores - sempre dentro do container do banner */}
                    {banners.length > 1 && (
                        <div className="absolute bottom-6 md:bottom-8 lg:bottom-10 left-1/2 -translate-x-1/2 flex gap-2 z-20 px-3 py-1.5 rounded-full bg-black/20 backdrop-blur-sm">
                            {banners.map((_, idx) => (
                                <button
                                    key={banners[idx].Id}
                                    onClick={() => setCurrent(idx)}
                                    className={`h-1.5 md:h-2 transition-all duration-300 cursor-pointer rounded-full ${
                                        current === idx ? 'w-8 md:w-10 bg-[#6c6bb6]' : 'w-4 md:w-5 bg-[#e5e9fa]'
                                    }`}
                                    aria-label={`Ir para banner ${idx + 1} de ${banners.length}`}
                                    aria-current={current === idx ? 'true' : 'false'}
                                />
                            ))}
                        </div>
                    )}
                </div>
            )}
        </motion.div>
    );
}
