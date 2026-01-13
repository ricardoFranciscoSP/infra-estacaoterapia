"use client";
import React, { useState } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import { useAllReviews } from '@/hooks/reviewHook';
import { useRouter } from "next/navigation";

// Tipo para review
type Review = {
    Id: string;
    UserId: string;
    PsicologoId: string;
    Rating: number;
    Comentario: string;
    Status: string;
    MostrarNaHome: boolean;
    MostrarNaPsicologo: boolean;
    CreatedAt: string;
    UpdatedAt: string;
    User?: {
        Id: string;
        Nome: string;
        Email: string;
        Images?: { Id: string; UserId: string; Url: string; CreatedAt: string; UpdatedAt: string }[];
    };
    Psicologo?: {
        Id: string;
        Nome: string;
        Email: string;
        Images?: { Id: string; UserId?: string; Url: string; CreatedAt: string; UpdatedAt: string }[];
    };
};

const TestimonialCarousel: React.FC = () => {
    const [current, setCurrent] = useState(0);
    const { reviews = [], isLoading } = useAllReviews();
    const total = reviews.length;
    const [touchStartX, setTouchStartX] = useState<number | null>(null);
    const [touchEndX, setTouchEndX] = useState<number | null>(null);
    const router = useRouter();

    // Autoplay
    React.useEffect(() => {
        if (total === 0) return;
        const interval = setInterval(() => {
            setCurrent((prev) => (prev + 1) % total);
        }, 4000);
        return () => clearInterval(interval);
    }, [total]);

    // Swipe handlers
    const handleTouchStart = (e: React.TouchEvent) => {
        setTouchStartX(e.touches[0].clientX);
    };
    const handleTouchMove = (e: React.TouchEvent) => {
        setTouchEndX(e.touches[0].clientX);
    };
    const handleTouchEnd = () => {
        if (touchStartX !== null && touchEndX !== null) {
            const diff = touchStartX - touchEndX;
            if (diff > 50) {
                setCurrent((prev) => (prev + 1) % total); // swipe left
            } else if (diff < -50) {
                setCurrent((prev) => (prev - 1 + total) % total); // swipe right
            }
        }
        setTouchStartX(null);
        setTouchEndX(null);
    };


    // Sempre retorna o avatar placeholder para paciente anônimo
    const getPacienteImage = () => "/assets/avatar-placeholder.svg";

    // Retorna a imagem do psicólogo se houver, senão o avatar placeholder
    const getPsicologoImage = (review: Review) => {
        const images = review?.Psicologo?.Images;
        if (images && images.length > 0 && images[0].Url) {
            return images[0].Url;
        }
        return "/assets/avatar-placeholder.svg";
    };

    const getPrimeiroNomePsicologo = (review: Review) => {
        const nome = review?.Psicologo?.Nome || "";
        return nome.split(" ")[0];
    };

    const handleVerMais = (psicologoId: string) => {
        router.push(`/psicologo/${psicologoId}`);
    };

    // Oculta o bloco quando não houver reviews
    if (!isLoading && total === 0) {
        return null;
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="w-full flex flex-col items-center py-8 bg-[#FDFDFB]"
        >
            <h2 className="text-2xl md:text-3xl font-bold text-center mb-2 text-dark">
                Depoimentos
            </h2>
            <p className="text-center text-gray-600 mb-8 max-w-2xl mx-auto text-[15px] md:text-base">
                Algumas das incríveis experiências que proporcionamos a quem escolhe nossa
                plataforma para realizar suas sessões de terapia e transformar sua vida para
                melhor
            </p>
            <div
                className="flex flex-row gap-4 w-full max-w-6xl justify-center items-stretch mb-6 overflow-x-auto scrollbar-hide"
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
            >
                {isLoading && (
                    <div className="text-center w-full">Carregando depoimentos...</div>
                )}
                {!isLoading && reviews.map((review, idx) => (
                    <div
                        key={`${review.Id}-${idx}`}
                        className="bg-[#F2F4FD] border border-[#E3E6F0] rounded-xl p-5 flex flex-col w-full max-w-xs min-w-[260px] shadow-sm"
                    >
                        <div className="flex items-center mb-2">
                            <div className="bg-[#E3E6F0] rounded-full w-10 h-10 flex items-center justify-center mr-3">
                                <Image
                                    src={getPacienteImage()}
                                    alt="Paciente anônimo"
                                    width={32}
                                    height={32}
                                    className="w-8 h-8 rounded-full object-cover"
                                />
                            </div>
                            <span className="font-semibold text-dark text-base">
                                Paciente anônimo
                            </span>
                        </div>
                        <p className="text-dark text-[15px] mb-4 min-h-[72px]">
                            {review.Comentario}
                        </p>
                        <div className="flex items-center mb-3">
                            {[...Array(5)].map((_, i) => (
                                <svg
                                    key={i}
                                    className="w-4 h-4 text-[#FFD600] mr-1"
                                    fill="currentColor"
                                    viewBox="0 0 20 20"
                                >
                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.967a1 1 0 00.95.69h4.175c.969 0 1.371 1.24.588 1.81l-3.38 2.455a1 1 0 00-.364 1.118l1.287 3.966c.3.922-.755 1.688-1.54 1.118l-3.38-2.454a1 1 0 00-1.175 0l-3.38 2.454c-.784.57-1.838-.196-1.539-1.118l1.287-3.966a1 1 0 00-.364-1.118L2.05 9.394c-.783-.57-.38-1.81.588-1.81h4.175a1 1 0 00.95-.69l1.286-3.967z" />
                                </svg>
                            ))}
                        </div>
                        <div className="flex items-center mt-auto">
                            <Image
                                src={getPsicologoImage(review)}
                                alt="Psicologo"
                                width={32}
                                height={32}
                                className="w-8 h-8 rounded-full mr-2 border border-[#E3E6F0] object-cover"
                            />
                            <div className="flex flex-col flex-1">
                                <span className="text-xs text-gray-700 font-semibold">
                                    Psicólogo(a):
                                </span>
                                <span className="text-xs text-gray-700 font-semibold">{getPrimeiroNomePsicologo(review)}</span>
                            </div>
                            <button
                                className="ml-auto bg-[#6B7DD8] text-white text-xs px-3 py-1 rounded-md font-semibold hover:bg-[#444D9D] transition-colors duration-200"
                                onClick={() => handleVerMais(review.PsicologoId)}
                            >
                                Ver mais
                            </button>
                        </div>
                    </div>
                ))}
            </div>
            <div className="flex items-center gap-2 mb-4">
                {Array.from({ length: total }).map((_, i) => (
                    <button
                        key={i}
                        className={`transition-all duration-200
              ${
                                i === current
                                    ? "w-10 h-2 rounded-[8px] bg-[#505AB4] opacity-100"
                                    : "w-5 h-2 rounded-[8px] bg-[#BBBFE2] opacity-100"
                            }
            `}
                        style={{ transform: "rotate(0deg)" }}
                        onClick={() => setCurrent(i)}
                        aria-label={`Ir para o depoimento ${i + 1}`}
                    />
                ))}
            </div>
            <p className="text-xs text-gray-500 mt-2 text-center max-w-2xl mx-auto">
                *As avaliações aqui apresentadas são anônimas em conformidade com a Nota
                Técnica nº 1/2022 do Conselho Federal de Psicologia (CFP)&apos;
            </p>
        </motion.div>
    );
};

export default TestimonialCarousel;