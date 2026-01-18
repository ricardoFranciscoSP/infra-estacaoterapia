"use client";
import Image from "next/image";
import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";

const faqs = [
	{
		question: "Como funciona o processo de pré-cadastro?",
		answer:
			"Você preenche seus dados profissionais e envia documentos. Após análise e aprovação, você terá acesso à plataforma para configurar sua agenda e começar a atender.",
	},
	{
		question: "Preciso pagar para usar a plataforma?",
		answer:
			"Não há mensalidade ou taxa de adesão. Você só paga uma taxa administrativa sobre cada atendimento realizado, sem custos fixos.",
	},
	{
		question: "Como recebo pelos meus atendimentos?",
		answer:
			"Os valores das sessões são repassados diretamente para você, de forma segura, após a confirmação do atendimento pelo paciente.",
	},
];

export default function ParaPsicologosPage() {
	const [openIndex, setOpenIndex] = useState<number | null>(null);

	const handleAccordion = (idx: number) => {
		setOpenIndex(openIndex === idx ? null : idx);
	};

	return (
		<div className="w-full overflow-x-hidden">
			<div className="w-full py-8">
				<div className="w-full max-w-screen-xl mx-auto px-4 sm:px-6">
					<div className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-12">
						{/* Conteúdo de texto */}
						<div className="text-left w-full max-w-md order-2 md:order-1">
							<h1 className="fira-sans font-semibold text-[32px] md:text-[40px] leading-[38px] md:leading-[48px] align-middle mb-6 text-[#444D9D]">
								Atenda com liberdade, cuidado e segurança
							</h1>
							<p className="fira-sans font-normal text-[16px] md:text-[18px] leading-[24px] md:leading-[28px] align-middle text-[#49525A] mb-4">
								Aqui na Estação Terapia, você tem autonomia para construir sua
								agenda e oferecer atendimento online com qualidade para seus
								pacientes.
							</p>
							<div className="flex justify-start w-full">
								<Link
									href="/register?tab=psicologo"
									className="flex items-center justify-center w-full md:w-[486px] h-[48px] px-[24px] gap-[12px] rounded-[8px] bg-[#8494E9] opacity-100 fira-sans font-medium text-[16px] text-white hover:bg-[#6B7DD8] transition-colors duration-200"
								>
									Realizar meu pré-cadastro agora
								</Link>
							</div>
						</div>

						{/* Imagem bloco 1 */}
						<div className="order-1 md:order-2 flex justify-center items-center w-full md:w-auto">
							<Image
								src="/assets/para-psicologos.svg"
								alt="Atendimento para psicólogos"
								width={350}
								height={350}
								className="w-[70vw] max-w-[350px] h-auto sm:w-[212px] sm:h-[212px] md:w-[350px] md:h-[350px] object-contain"
							/>
						</div>
					</div>
				</div>
			</div>

			{/* Divisor visual */}
			<div className="w-full">
				<div className="max-w-screen-xl mx-auto px-4 sm:px-6">
					<hr className="w-full h-0 border border-[#CACFD4] opacity-100 m-0" />
				</div>
			</div>

			<div className="w-full py-8">
				<div className="w-full max-w-screen-xl mx-auto px-4 sm:px-6">
					<div className="flex flex-col md:flex-row items-center md:items-start justify-center gap-8 md:gap-12">
						{/* Imagem à esquerda */}
						<div className="order-1 md:order-1 flex-shrink-0 flex justify-center items-center w-full md:w-auto">
							<Image
								src="/assets/blob.png"
								alt="Psicóloga atendendo online"
								width={350}
								height={350}
								className="w-[70vw] max-w-[350px] h-auto sm:w-[250px] sm:h-[245px] md:w-[350px] md:h-[350px] object-contain opacity-100"
								loading="lazy"
								quality={85}
								sizes="(max-width: 640px) 70vw, (max-width: 768px) 250px, 350px"
							/>
						</div>
						{/* Conteúdo à direita */}
						<div className="text-left w-full max-w-xl order-2 md:order-2 flex flex-col justify-center">
							<h2 className="fira-sans font-semibold text-[24px] md:text-[32px] leading-[30px] md:leading-[40px] mb-2 text-[#26220D]">
								Por que escolher a Estação terapia?
							</h2>
							<p className="fira-sans font-normal text-[16px] md:text-[18px] leading-[24px] md:leading-[28px] text-[#49525A] mb-6">
								Alguns benefícios que te proporcionamos caso decida usufruir da
								nossa plataforma
							</p>
							<ul className="flex flex-col gap-4">
								<li className="flex items-start gap-2">
									<span className="mt-1">
										<Image
											src="/assets/icons/thick-arrow-right.svg"
											alt=""
											width={32}
											height={32}
										/>
									</span>
									<span>
										<span className="font-semibold text-[#444D9D]">
											Agenda flexível:
										</span>
										<span className="text-[#49525A]">
											{" "}
											Você decide quando e como atender, com total controle da
											sua disponibilidade.
										</span>
									</span>
								</li>
								<li className="flex items-start gap-2">
									<span className="mt-1">
										<Image
											src="/assets/icons/thick-arrow-right.svg"
											alt=""
											width={32}
											height={32}
										/>
									</span>
									<span>
										<span className="font-semibold text-[#444D9D]">
											Aqui valorizamos seu trabalho:
										</span>
										<span className="text-[#49525A]">
											{" "}
											Repassamos os valores de suas sessões com preços
											competitivos com o mercado.
										</span>
									</span>
								</li>
								<li className="flex items-start gap-2">
									<span className="mt-1">
										<Image
											src="/assets/icons/thick-arrow-right.svg"
											alt=""
											width={32}
											height={32}
										/>
									</span>
									<span>
										<span className="font-semibold text-[#444D9D]">
											Expanda sua presença:
										</span>
										<span className="text-[#49525A]">
											{" "}
											Alcance novos pacientes sem se preocupar com divulgação ou
											burocracia.
										</span>
									</span>
								</li>
								<li className="flex items-start gap-2">
									<span className="mt-1">
										<Image
											src="/assets/icons/thick-arrow-right.svg"
											alt=""
											width={32}
											height={32}
										/>
									</span>
									<span>
										<span className="font-semibold text-[#444D9D]">
										Ambiente seguro e confiável:
										</span>
										<span className="text-[#49525A]">
											{" "}
											Nos preocupamos com a segurança de cada sessão respeitando a
											LGPD e sigilo profissional.
										</span>
									</span>
								</li>
							</ul>
						</div>
					</div>
				</div>
			</div>

			<div className="w-full py-8 bg-[#E7EBF8]">
				<div className="w-full max-w-screen-xl mx-auto px-4 sm:px-6">
					<h3 className="fira-sans font-semibold text-[20px] md:text-[28px] leading-[28px] md:leading-[36px] text-center text-[#212529] mb-10">
						Como funciona nossa plataforma para psicólogos
					</h3>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-8">
						{/* Item 1 */}
						<div className="flex flex-row items-center gap-4 bg-transparent w-full">
							{/* Coluna da imagem */}
							<div className="flex items-center justify-center w-[64px] min-w-[64px]">
								<Image
									src="/assets/icons/pre-cadastro.svg"
									alt=""
									width={48}
									height={48}
								/>
							</div>
							{/* Coluna dos textos */}
							<div className="flex flex-col justify-center text-left w-full">
								<span className="fira-sans font-semibold text-[18px] leading-[28px] text-[#444D9D]">
									Faça seu pré-cadastro
								</span>
								<span className="fira-sans font-normal text-[16px] leading-[24px] text-[#49525A]">
									Preencha algumas informações profissionais e envie seus
									documentos. Essa etapa garante que todos os profissionais da
									plataforma estejam dentro das diretrizes.
								</span>
							</div>
						</div>
						{/* Item 2 */}
						<div className="flex flex-row items-center gap-4 bg-transparent w-full">
							{/* Coluna da imagem */}
							<div className="flex items-center justify-center w-[64px] min-w-[64px]">
								<Image
									src="/assets/icons/analise-aprovacao.svg"
									alt=""
									width={48}
									height={48}
								/>
							</div>
							{/* Coluna dos textos */}
							<div className="flex flex-col justify-center text-left w-full">
								<span className="fira-sans font-semibold text-[18px] leading-[28px] text-[#444D9D]">
									Análise e aprovação
								</span>
								<span className="fira-sans font-normal text-[16px] leading-[24px] text-[#49525A]">
									Sua cadastro passa por uma etapa de análise, onde nosso time
									irá revisar e analisar os dados e informações. Após aprovado o
									cadastro você terá acesso completo à plataforma.
								</span>
							</div>
						</div>
						{/* Item 3 */}
						<div className="flex flex-row items-center gap-4 bg-transparent w-full">
							{/* Coluna da imagem */}
							<div className="flex items-center justify-center w-[64px] min-w-[64px]">
								<Image
									src="/assets/icons/configure-agenda.svg"
									alt=""
									width={48}
									height={48}
								/>
							</div>
							{/* Coluna dos textos */}
							<div className="flex flex-col justify-center text-left w-full">
								<span className="fira-sans font-semibold text-[18px] leading-[28px] text-[#444D9D]">
									Configure sua agenda
								</span>
								<span className="fira-sans font-normal text-[16px] leading-[24px] text-[#49525A]">
									Escolha os dias e horários dos seus atendimentos, adaptando
									eles à sua rotina com liberdade e organização.
								</span>
							</div>
						</div>
						{/* Item 4 */}
						<div className="flex flex-row items-center gap-4 bg-transparent w-full">
							{/* Coluna da imagem */}
							<div className="flex items-center justify-center w-[64px] min-w-[64px]">
								<Image
									src="/assets/icons/realize-atendimentos.svg"
									alt=""
									width={48}
									height={48}
								/>
							</div>
							{/* Coluna dos textos */}
							<div className="flex flex-col justify-center text-left w-full">
								<span className="fira-sans font-semibold text-[18px] leading-[28px] text-[#444D9D]">
									Realize seus atendimentos
								</span>
								<span className="fira-sans font-normal text-[16px] leading-[24px] text-[#49525A]">
									Te ajudamos a se conectar com pacientes compatíveis com sua
									agenda, perfil e abordagem.
								</span>
							</div>
						</div>
					</div>
				</div>
			</div>

			{/* Bloco final conforme imagem anexa */}
			<div className="w-full bg-[#fff] py-12">
				<div className="max-w-screen-xl mx-auto px-4 sm:px-6">
					<div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
						{/* Coluna da esquerda: título */}
						<div>
							<h2 className="fira-sans font-semibold text-[24px] md:text-[32px] leading-[32px] md:leading-[40px] text-[#444D9D] mb-2">
								Pronto(a) para expandir seus atendimentos?
							</h2>
						</div>
						{/* Coluna da direita: texto + botão alinhados à esquerda */}
						<div className="flex flex-col items-start gap-4 w-full">
							<span className="fira-sans font-normal text-[16px] md:text-[18px] leading-[24px] md:leading-[28px] text-[#49525A] mb-2 text-left">
								Mais autonomia, mais pacientes e
								<br />mais valorização
							</span>
							<Link
								href="/register?tab=psicologo"
								className="flex items-center justify-center w-full md:w-[486px] h-[48px] px-[24px] gap-[12px] rounded-[8px] bg-[#8494E9] opacity-100 fira-sans font-medium text-[16px] text-white hover:bg-[#6B7DD8] transition-colors duration-200"
							>
								Realizar meu pré-cadastro agora
							</Link>
						</div>
					</div>
				</div>
			</div>

			{/* Divisor abaixo do 4º bloco */}
			<div className="w-full">
				<div className="max-w-screen-xl mx-auto px-4 sm:px-6">
					<hr className="w-full h-0 border border-[#CACFD4] opacity-100 m-0" />
				</div>
			</div>

			{/* 5º bloco - Dúvidas frequentes */}
			<div className="w-full bg-[#fff] py-12">
				<div className="max-w-screen-xl mx-auto px-4 sm:px-6 grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
					{/* Coluna esquerda */}
					<div className="flex flex-col justify-start">
						<h2 className="fira-sans font-bold text-[20px] md:text-[28px] leading-[28px] md:leading-[36px] text-[#212529] mb-2">
							Dúvidas frequentes
						</h2>
						<p className="fira-sans font-normal text-[15px] md:text-[16px] leading-[22px] md:leading-[24px] text-[#212529] mb-6">
							Tire suas principais dúvidas sobre a plataforma e como ela pode te
							ajudar em sua jornada como profissional.
						</p>
						<div className="flex flex-row flex-wrap items-center gap-2 mt-2">
							<span className="fira-sans font-semibold text-[14px] md:text-[15px] text-[#212529]">
								Não conseguiu tirar sua dúvida?
							</span>
							<a
								href="#"
								className="fira-sans font-normal text-[14px] md:text-[15px] text-[#444D9D] hover:underline transition-colors"
							>
								Veja mais respostas aqui
							</a>
						</div>
					</div>
					{/* Coluna direita - FAQ com acordions animados */}
					<div className="flex flex-col gap-4">
						{faqs.map((faq, idx) => (
							<motion.div
								key={idx}
								initial={false}
								animate={{
									boxShadow:
										openIndex === idx
											? "0 2px 8px rgba(132,148,233,0.12)"
											: "none",
								}}
								className="w-full bg-[#E7EBF8] rounded-[8px] px-6 py-4"
							>
								<button
									className="flex items-center justify-between w-full focus:outline-none"
									onClick={() => handleAccordion(idx)}
									aria-expanded={openIndex === idx}
								>
									<span className="fira-sans font-medium text-[16px] text-[#212529] text-left">
										{faq.question}
									</span>
									<motion.span
										animate={{ rotate: openIndex === idx ? 180 : 0 }}
										transition={{ duration: 0.5, ease: "easeInOut" }}
									>
										<svg width="24" height="24" fill="none">
											<path
												d="M8 10l4 4 4-4"
												stroke="#444D9D"
												strokeWidth="2"
												strokeLinecap="round"
												strokeLinejoin="round"
											/>
										</svg>
									</motion.span>
								</button>
								<motion.div
									initial={false}
									animate={
										openIndex === idx
											? { height: "auto", opacity: 1 }
											: { height: 0, opacity: 0 }
									}
									transition={{ duration: 0.5, ease: "easeInOut" }}
									className="overflow-hidden"
								>
									{openIndex === idx && (
										<div className="mt-3 fira-sans text-[15px] text-[#49525A]">
											{faq.answer}
										</div>
									)}
								</motion.div>
							</motion.div>
						))}
					</div>
				</div>
			</div>
		</div>
	);
}