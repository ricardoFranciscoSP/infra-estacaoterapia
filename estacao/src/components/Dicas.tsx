import Image from "next/image";
import React from "react";

const tips = [
  {
    title: "Sua sessão em um ambiente silencioso",
    description:
      "Escolha um local sem ruídos e que você esteja só, para que você tenha maior sigilo e evite interrupções",
    iconSrc: "/assets/icons/icon-audio-sala.svg",
  },
  {
    title: "Use fones de ouvido",
    description:
      "Para que você tenha um bom áudio e proteger sua privacidade durante toda sua sessão",
    iconSrc: "/assets/icons/icon-phone-sala.svg",
  },
  {
    title: "Tenha uma conexão estável",
    description:
      "Certifique que sua internet esteja estável. Caso ocorra queda por motivos técnicos, a mesma não será reagendada",
    iconSrc: "/assets/icons/icon-wi-fi-sala.svg",
  },
  {
    title: "Evite fazer a sessão em transportes",
    description:
      "Não é permitido na plataforma sessões realizadas em transportes em movimento para garantir sua segurança",
    iconSrc: "/assets/icons/icon-transporte-sala.svg",
  },
  {
    title: "Fuso horário que a plataforma segue",
    description:
      "Todos os agendamentos seguem o fuso horário de Brasília, mesmo que você (ou o(a) profissional) esteja em outro país",
    iconSrc: "/assets/icons/icon-fuso-sala.svg",
  },
  {
    title: "Tolerância",
    description:
      "A tolerância para atrasos é de até 10 minutos. Após esse período a sessão é cancelada, sem direito a reembolso",
    iconSrc: "/assets/icons/icon-tolerancia-sala.svg",
  },
];

const Dicas: React.FC = () => {
  return (
    <div>
      {/* Dicas desktop (já existente) */}
      <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-6">
        {tips.map((tip, i) => (
          <div
            key={i}
            className="flex items-center w-[384px] h-[132px] border border-indigo-500 rounded-lg bg-blue-50 gap-6 p-4 opacity-100"
          >
            <Image
              src={tip.iconSrc}
              alt="Dicas"
              className="w-8 h-8 flex-shrink-0"
              width={16}
              height={16}
            />
            <div>
              <h3 className="font-semibold text-sm text-gray-800">
                {tip.title}
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                {tip.description}
              </p>
            </div>
          </div>
        ))}
      </div>
      {/* Dicas mobile */}
      <div className="flex flex-col gap-3 sm:hidden">
        {/* Linha 1 */}
        <div className="flex flex-row gap-3 justify-center items-stretch">
          <div className="flex flex-col items-center justify-start bg-[#F2F4FD] rounded-xl shadow w-full max-w-[180px] min-h-[130px] px-2 py-4 mx-1">
            <Image
              src="/assets/icons/icon-audio-sala.svg"
              width={32}
              height={32}
              alt="Dica 1"
              className="mb-2"
            />
            <span className="text-xs text-center font-medium text-[#232A5C] mt-2">
              Use fones de ouvido para melhor qualidade
            </span>
          </div>
          <div className="flex flex-col items-center justify-start bg-[#F2F4FD] rounded-xl shadow w-full max-w-[180px] min-h-[130px] px-2 py-4 mx-1">
            <Image
              src="/icons/Icon-audio.svg"
              width={32}
              height={32}
              alt="Dica 2"
              className="mb-2"
            />
            <span className="text-xs text-center font-medium text-[#232A5C] mt-2">
              Esteja em local silencioso e iluminado
            </span>
          </div>
        </div>
        {/* Linha 2 */}
        <div className="flex flex-row gap-3 justify-center items-stretch">
          <div className="flex flex-col items-center justify-start bg-[#F2F4FD] rounded-xl shadow w-full max-w-[180px] min-h-[130px] px-2 py-4 mx-1">
            <Image
              src="/icons/Icon-conexao.svg"
              width={32}
              height={32}
              alt="Dica 3"
              className="mb-2"
            />
            <span className="text-xs text-center font-medium text-[#232A5C] mt-2">
              Tenha boa conexão de internet
            </span>
          </div>
          <div className="flex flex-col items-center justify-start bg-[#F2F4FD] rounded-xl shadow w-full max-w-[180px] min-h-[130px] px-2 py-4 mx-1">
            <Image
              src="/icons/info-azul.svg"
              width={32}
              height={32}
              alt="Dica 4"
              className="mb-2"
            />
            <span className="text-xs text-center font-medium text-[#232A5C] mt-2">
              Evite interrupções durante a sessão
            </span>
          </div>
        </div>
        {/* Linha 3 */}
        <div className="flex flex-row gap-3 justify-center items-stretch">
          <div className="flex flex-col items-center justify-start bg-[#F2F4FD] rounded-xl shadow w-full max-w-[180px] min-h-[130px] px-2 py-4 mx-1">
            <Image
              src="/icons/Icon-plataforma.svg"
              width={32}
              height={32}
              alt="Dica 5"
              className="mb-2"
            />
            <span className="text-xs text-center font-medium text-[#232A5C] mt-2">
              Tenha água por perto
            </span>
          </div>
          <div className="flex flex-col items-center justify-start bg-[#F2F4FD] rounded-xl shadow w-full max-w-[180px] min-h-[130px] px-2 py-4 mx-1">
            <Image
              src="/icons/Icon-tolerancia.svg"
              width={32}
              height={32}
              alt="Dica 6"
              className="mb-2"
            />
            <span className="text-xs text-center font-medium text-[#232A5C] mt-2">
              Prepare-se alguns minutos antes
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dicas;
