import React from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';

const PlataformaBeneficios: React.FC = () => {
    const features = [
        {
            title: 'Profissionais qualificados e certificados:',
            description: 'Todos os profissionais da plataforma são credenciados e altamente capacitados para cuidar de você.',
        },
        {
            title: 'Praticidade na sua rotina:',
            description: 'Aqui é você escolhe qual dia e horário são melhores para realizar sua sessão e adaptar a sua rotina.',
        },
        {
            title: 'Privacidade garantida:',
            description: 'Cuidamos para que sua sessão seja 100% confidencial e segura.',
        },
        {
            title: 'Pagamento flexível e que cabe no seu bolso:',
            description: 'Oferecemos formas de pagamento flexíveis e que cabem no seu bolso.',
        },
    ];

    return (
        <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
            className="w-full py-8"
        >
            <div className="w-full max-w-screen-xl mx-auto px-4 sm:px-6">
                <div className="flex flex-col md:flex-row items-center md:items-start justify-center gap-8 md:gap-12">
                    {/* Imagem à esquerda */}
                    <div className="order-1 md:order-1 flex-shrink-0 flex justify-center items-center w-full md:w-auto">
                        <Image
                            src="/assets/blob.png"
                            alt="Paciente usando plataforma online"
                            width={320}
                            height={480}
                            className="w-[70vw] max-w-[350px] h-auto sm:w-[250px] sm:h-[245px] md:w-[350px] md:h-[350px] object-contain opacity-100"
                            loading="lazy"
                            quality={75}
                            sizes="(max-width: 640px) 70vw, (max-width: 768px) 250px, 350px"
                        />
                    </div>
                    {/* Conteúdo à direita */}
                    <div className="text-left w-full max-w-xl order-2 md:order-2 flex flex-col justify-center">
                        <h2 className="font-fira-sans font-bold text-[24px] md:text-[32px] leading-[30px] md:leading-[40px] mb-2 text-[#262B58] text-center md:text-left">
                            Por quê escolher nossa plataforma?
                        </h2>
                        <ul className="flex flex-col gap-4">
                            {features.map((feature, index) => (
                                <li key={index} className="flex items-start gap-2">
                                    <span className="mt-1 flex-shrink-0">
                                        <Image
                                            src="/assets/icons/thick-arrow-right.svg"
                                            alt=""
                                            width={32}
                                            height={32}
                                            className="w-8 h-8"
                                        />
                                    </span>
                                    <div className="flex-1 min-w-0">
                                        <div className="font-semibold text-[#444D9D] mb-1">
                                            {feature.title}
                                        </div>
                                        <div className="text-[#49525A]">
                                            {feature.description}
                                        </div>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

export default PlataformaBeneficios;
