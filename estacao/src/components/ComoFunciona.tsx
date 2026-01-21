import Card from "./Card";
import { motion } from "framer-motion";

const ComoFunciona = () => {
    const cards: Array<{
        imgSrc: string;
        title: string;
        text: string;
        align: "right" | "left";
        style: { marginTop: string; marginBottom: string };
    }> = [
        {
            imgSrc: '/icons/lupa.svg',
            title: 'Pesquise',
            text: 'E veja nossa lista de profissionais qualificados e credenciados prontos para lhe atender',
            align: 'right',
            style: { marginTop: '0', marginBottom: '20px' }
        },
        {
            imgSrc: '/icons/escolhe.svg',
            title: 'Escolha',
            text: 'Encontre o(a) profissional que procura e escolha o melhor dia e horário para ser atendido(a)',
            align: 'left',
            style: { marginTop: '0', marginBottom: '20px' }
        },
        {
            imgSrc: '/icons/agende.svg',
            title: 'Agende',
            text: 'Agende sua consulta, escolha o melhor plano para você e conclua o agendamento da sua sessão',
            align: 'right',
            style: { marginTop: '0', marginBottom: '20px' }
        },
        {
            imgSrc: '/icons/consulta.svg',
            title: 'Hora da consulta',
            text: 'No dia de sua consulta encontre um lugar calmo e acesse sua conta pelo celular ou computador',
            align: 'left',
            style: { marginTop: '0', marginBottom: '20px' }
        },
        {
            imgSrc: '/icons/Icon-reload.svg',
            title: 'Duração da sessão',
            text: 'Oferecemos psicoterapia com sessões de duração de 60 minutos',
            align: 'right',
            style: { marginTop: '0', marginBottom: '0' }
        }
    ];

    return (
        <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="w-full px-4 lg:px-6 xl:px-24 2xl:px-48 py-8 md:py-12 relative font-fira-sans"
            style={{ minHeight: '600px' }}
        >
            <h2 className="text-center mb-12 md:mb-8 text-2xl md:text-4xl font-fira-sans font-bold text-[#262B58]">
                Como funciona            
            </h2>
            <div className="relative flex flex-col md:flex-row md:items-start justify-center gap-6 md:gap-8" style={{ zIndex: '10' }}>
                {/* Linha cinza centralizada atrás dos ícones (desktop) */}
                <div className="hidden md:block absolute top-[40px] left-0 right-0 mx-auto bg-[#B3BBC1] h-0.5 opacity-50"
                    style={{ height: '2px', zIndex: '1', width: '100%' }}
                ></div>
                {/* Linha vertical contínua no mobile */}
                <div className="md:hidden absolute top-[-50px] bottom-0 left-1/2 transform -translate-x-1/2 bg-[#B3BBC1] w-[2px] z-0"></div>
                {cards.map((card, index) => (
                    <div key={`card-${index}`} className="flex flex-col md:flex-row items-center justify-center w-full">
                        <Card {...card} />
                    </div>
                ))}
            </div>
        </motion.div>
    );
};

export default ComoFunciona;