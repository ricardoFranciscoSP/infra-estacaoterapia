import Head from 'next/head';

const LocalBusinessSchema = () => {
  const schema = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "name": "Estação Terapia",
    "url": "https://estacaoterapia.com.br",
    "telephone": "+55-11-96089-2131",
    "address": {
      "@type": "PostalAddress",
      "streetAddress": "Al. Rio Negro, 503 - Sala 2020",
      "addressLocality": "Barueri",
      "addressRegion": "SP",
      "postalCode": "06454-000",
      "addressCountry": "BR"
    },
    "openingHours": "Mo-Fr 09:00-18:00",
    "image": [
      "https://estacaoterapia.com.br/logo.png"
    ],
    "priceRange": "R$"
  } as const;

  return (
    <Head>
      <script type="application/ld+json">
        {JSON.stringify(schema)}
      </script>
    </Head>
  );
};

export default LocalBusinessSchema;
