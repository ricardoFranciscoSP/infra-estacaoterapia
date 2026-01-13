import Image from "next/image";
import React, { useState, useEffect } from "react";

interface Slide {
  imageSrc: string;
  title: string;
  subtitle: string;
}

const slides: Slide[] = [
  {
    imageSrc: "/assets/slidder/relax.svg",
    title: "Cuide da sua saúde mental com praticidade!",
    subtitle:
      "Encontre psicólogos qualificados e faça suas sessões quando e onde desejar!",
  },
  {
    imageSrc: "/assets/slidder/relax.svg",
    title: "A terapia ao seu alcance!",
    subtitle: "Tenha acesso a profissionais experientes em qualquer lugar.",
  },
  {
    imageSrc: "/assets/slidder/relax.svg",
    title: "Fácil, rápido e seguro!",
    subtitle:
      "Descubra como melhorar sua qualidade de vida com poucos cliques.",
  },
];

const LoginSlider: React.FC = () => {
  const [currentSlide, setCurrentSlide] = useState(0);


  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  };
  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000); // 5 segundos
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="hidden md:flex w-full h-full flex-col justify-center items-center bg-[#f5f7ff] relative px-4 py-8">
      <button
        onClick={prevSlide}
        className="absolute left-4 top-1/2 -translate-y-1/2 bg-white rounded-full shadow p-2 hover:bg-[#e6e9fa] z-10"
        aria-label="Anterior"
      >
        <svg width="24" height="24" fill="none" stroke="#6c6bb6" strokeWidth="2" viewBox="0 0 24 24"><path d="M15 19l-7-7 7-7"/></svg>
      </button>
      <div className="flex flex-col justify-center items-center w-full">
        <div className="flex justify-center items-center w-full">
          <Image 
            src={slides[currentSlide].imageSrc} 
            alt="Ilustração" 
            className="w-[180px] h-[180px] md:w-[217px] md:h-[217px] object-contain mb-8 transition-all duration-300 opacity-100 mx-auto" 
            style={{ transform: "rotate(0deg)" }}
            width={217}
            height={217}
          />
        </div>
        <h3 className="font-semibold text-[22px] md:text-[24px] leading-[32px] md:leading-[40px] text-center text-[#212529] mb-2 px-2">{slides[currentSlide].title}</h3>
        <p className="font-normal text-[16px] md:text-[18px] leading-[24px] md:leading-[28px] text-center text-[#212529] max-w-xl px-2">{slides[currentSlide].subtitle}</p>
      </div>
      <button
        onClick={nextSlide}
        className="absolute right-4 top-1/2 -translate-y-1/2 bg-white rounded-full shadow p-2 hover:bg-[#e6e9fa] z-10"
        aria-label="Próximo"
      >
        <svg width="24" height="24" fill="none" stroke="#6c6bb6" strokeWidth="2" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"/></svg>
      </button>
      <div className="flex gap-2 mt-6 justify-center w-full">
        {slides.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setCurrentSlide(idx)}
            className={
              currentSlide === idx
                ? "w-10 h-2 rounded-[8px] bg-[#505AB4] opacity-100 transition-all duration-200"
                : "w-5 h-2 rounded-[8px] bg-[#BBBFE2] opacity-100 transition-all duration-200"
            }
            style={{ transform: "rotate(0deg)" }}
            aria-label={`Ir para o slide ${idx + 1}`}
          />
        ))}
      </div>
    </div>
  );
};

export default LoginSlider;
