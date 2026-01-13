'use client';

import Image from 'next/image';
import { useState, useEffect } from 'react';
import { shouldUnoptimizeImage } from '@/utils/imageUtils';

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
  fill?: boolean;
  sizes?: string;
  quality?: number;
  fallback?: string;
  unoptimized?: boolean;
  style?: React.CSSProperties;
  onError?: () => void;
}

/**
 * Componente de imagem otimizada com fallback automático
 * Garante que imagens quebradas sempre tenham um fallback
 * 
 * @example
 * <OptimizedImage 
 *   src="/path/to/image.jpg" 
 *   alt="Description" 
 *   width={200} 
 *   height={200}
 *   fallback="/assets/avatar-placeholder.svg"
 * />
 */
export default function OptimizedImage({
  src,
  alt,
  width,
  height,
  className = '',
  priority = false,
  fill = false,
  sizes,
  quality,
  fallback = '/assets/avatar-placeholder.svg',
  unoptimized = false,
  style,
  onError,
}: OptimizedImageProps) {
  const [imgSrc, setImgSrc] = useState<string>(src || fallback);
  const [hasError, setHasError] = useState(false);

  // Atualiza src quando a prop muda
  useEffect(() => {
    if (src && src !== imgSrc && !hasError) {
      setImgSrc(src);
      setHasError(false);
    }
  }, [src, imgSrc, hasError]);

  const handleError = () => {
    if (!hasError && imgSrc !== fallback) {
      setHasError(true);
      setImgSrc(fallback);
      if (onError) {
        onError();
      }
    }
  };

  // Valida se é URL externa ou SVG
  const shouldUnoptimize = unoptimized || shouldUnoptimizeImage(imgSrc);

  // Se fill está ativo, não precisa de width/height
  if (fill) {
    return (
      <Image
        src={imgSrc}
        alt={alt || 'Imagem'}
        fill
        className={className}
        priority={priority}
        sizes={sizes || '100vw'}
        quality={quality}
        unoptimized={shouldUnoptimize}
        style={style}
        onError={handleError}
      />
    );
  }

  // Valida width e height
  if (!width || !height) {
    console.warn('OptimizedImage: width e height são obrigatórios quando fill não está ativo');
    return null;
  }

  return (
    <Image
      src={imgSrc}
      alt={alt || 'Imagem'}
      width={width}
      height={height}
      className={className}
      priority={priority}
      quality={quality}
      unoptimized={shouldUnoptimize}
      style={style}
      onError={handleError}
    />
  );
}

