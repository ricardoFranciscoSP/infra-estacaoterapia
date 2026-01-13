/**
 * Utilitários para otimização de imagens
 */

/**
 * Verifica se uma URL é um arquivo SVG
 */
export function isSvgUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  return url.toLowerCase().endsWith('.svg') || url.includes('.svg?');
}

/**
 * Verifica se uma URL é uma imagem externa
 */
export function isExternalUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  return url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:');
}

/**
 * Determina se uma imagem deve ser não otimizada
 * SVGs e imagens externas geralmente devem ser unoptimized
 */
export function shouldUnoptimizeImage(url: string | null | undefined): boolean {
  if (!url) return false;
  return isSvgUrl(url) || isExternalUrl(url);
}

/**
 * Obtém props padrão para imagens SVG
 */
export function getSvgImageProps(src: string, alt: string, width: number, height: number) {
  return {
    src,
    alt,
    width,
    height,
    unoptimized: true, // SVGs devem sempre ser unoptimized
  };
}

