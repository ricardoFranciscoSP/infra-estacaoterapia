import React from 'react';

interface PlanosCardProps {
    plano: {
        possuiPlano: boolean;
        type?: string;
        consultasDisponiveis?: number;
        dataExpiracao?: string;
        pagamentoConfirmado?: boolean;
    };
    id?: string;
}

const PlanosCardBloqueado: React.FC<PlanosCardProps> = ({ plano, id }) => {
    // Considera bloqueado se possui plano e o pagamento NÃO está confirmado
    const isBloqueado = plano.possuiPlano && plano.pagamentoConfirmado === false;

    if (isBloqueado) {
        return (
            <div id={id} className="bg-[rgba(255,228,138,1)] p-4 rounded-lg w-full max-w-[380px] h-auto mt-4">
                <div className="flex justify-between items-center mb-2">
                    <p className="text-xs sm:text-sm fira-sans-bold text-dark">
                        Plano: <span className="fira-sans-medium text-gray">{plano.type}</span>
                    </p>
                    <span className="bg-[#444D9D] text-white text-xs sm:text-sm fira-sans px-2 py-1 rounded-[80px]">
                        Bloqueado
                    </span>
                </div>
                <p className="text-xs sm:text-sm mb-4 fira-sans-regular text-dark">
                    Percebemos que o pagamento do seu plano ainda não foi confirmado este mês.
                    Que tal atualizá-lo para continuar aproveitando todos os recursos da nossa plataforma e cuidando do seu bem-estar com a gente?
                </p>
                <div className="flex justify-center">
                    <a
                        href="/painel/minha-conta/meus-planos"
                        className="inline-block px-4 py-2 bg-[#444D9D] text-white rounded-md hover:bg-[#6D75C0] transition-colors duration-200 text-xs sm:text-sm fira-sans w-full text-center"
                    >
                        Ver detalhes
                    </a>
                </div>
            </div>
        );
    }

    // Versão padrão (não bloqueado)
    return (
        <div id={id} className="bg-[#E5E9FA] primary p-4 rounded-lg w-full max-w-[380px] h-auto mt-4">
            <div className="flex justify-between items-center mb-2">
                <p className="text-xs sm:text-sm fira-sans-bold text-dark">
                    Plano: <span className="fira-sans-medium text-gray">
                        {plano.possuiPlano ? plano.type : 'Sem Plano'}
                    </span>
                </p>
                {plano.possuiPlano && plano.consultasDisponiveis !== undefined && (
                    <span className="bg-[#CFD6F7] primary text-xs sm:text-sm fira-sans px-2 py-1 rounded-md">
                        {plano.consultasDisponiveis} Consultas restantes
                    </span>
                )}
            </div>
            <p className="text-xs sm:text-sm mb-4 fira-sans-regular text-dark">
                {plano.possuiPlano
                    ? `Consultas válidas para uso até ${plano.dataExpiracao ? new Date(plano.dataExpiracao).toLocaleDateString() : 'indefinido'}.`
                    : 'Você ainda não possui nenhum plano conosco. Aproveite para adquirir um agora.'}
            </p>
            <div className="flex flex-col gap-2 justify-center items-center">
                {plano.possuiPlano ? (
                    <a
                        href="/painel/minha-conta/meus-planos"
                        className="inline-block px-4 py-2 bg-[#444D9D] text-white rounded-md hover:bg-[#6D75C0] transition-colors duration-200 text-xs sm:text-sm fira-sans w-full text-center"
                    >
                        Ver detalhes
                    </a>
                ) : (
                    <a
                        href="/planos"
                        className="inline-block px-4 py-2 bg-[#8494E9] text-white rounded-md hover:bg-[#6D75C0] transition-colors duration-200 text-xs sm:text-sm fira-sans w-full text-center"
                    >
                        Comprar plano
                    </a>
                )}
                <a
                    href="/agendar-consulta"
                    className="inline-block px-4 py-2 bg-[#EBEDEF] text-[#444D9D] border border-[#444D9D] rounded-md hover:bg-[#D6DADF] transition-colors duration-200 text-xs sm:text-sm fira-sans w-full text-center"
                >
                    Agendar consulta
                </a>
            </div>
        </div>
    );
};

export default PlanosCardBloqueado;
