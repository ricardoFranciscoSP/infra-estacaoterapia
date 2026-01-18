module.exports = {
  siteUrl: process.env.NEXT_PUBLIC_WEBSITE_URL || "https://estacaoterapia.com.br",
  // robots.txt é gerado pelo App Router em src/app/robots.ts
  // Evita conflitos e diretivas inválidas na geração do build
  generateRobotsTxt: false,
  sitemapSize: 7000,
};
