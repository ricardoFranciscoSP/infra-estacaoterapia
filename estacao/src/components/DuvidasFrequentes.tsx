"use client";
import React, { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";

const perguntas = [
	{
		pergunta: "Como funciona a terapia online na Estação Terapia?",
		resposta:
			"A terapia online é realizada por videochamada, garantindo privacidade e segurança para o paciente.", // Exemplo de resposta
	},
	{
		pergunta: "Qual a duração de uma sessão?",
		resposta: "Cada sessão tem duração média de 60 minutos.", // Exemplo de resposta
	},
	{
		pergunta: "Posso escolher o psicólogo?",
		resposta: "Sim, você pode escolher o profissional que melhor se adequa ao seu perfil.", // Exemplo de resposta
	},
	{
		pergunta: "É possível cancelar ou reagendar uma sessão?",
		resposta:
			"Sim, é possível cancelar ou reagendar com antecedência mínima de 24 horas.", // Exemplo de resposta
	},
	{
		pergunta: "Como faço para adquirir o reembolso pelo convênio?",
		resposta:
			"Após a sessão, você receberá um recibo para solicitar o reembolso junto ao seu convênio.", // Exemplo de resposta
	},
];

const FaqSection: React.FC = () => {
	const [aberta, setAberta] = useState<number | null>(null);

	return (
		<motion.div
			initial={{ opacity: 0, y: 30 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.7, ease: "easeOut" }}
		>
			<section className="bg-[#FCFBF6] py-10 rounded-lg my-8">
				<div className="max-w-[1100px] mx-auto flex flex-col md:flex-row gap-8 items-start">
					<div className="flex-1">
						<h2 className="text-[#444] font-bold text-2xl md:text-3xl mb-4">
							Dúvidas frequentes
						</h2>
						<p className="text-[#444] text-base md:text-lg mb-8">
							Tire suas principais dúvidas sobre a plataforma e descubra como é
							prático e fácil iniciar sua jornada de autoconhecimento agora!
						</p>
						<div className="font-semibold text-[#444] mb-2 flex items-center gap-2">
							Não conseguiu tirar sua dúvida?
							<Link
								href="/faq"
								className="text-[#6C63FF] font-normal ml-2 hover:underline flex items-center"
							>
								<span className="text-lg">→</span> Veja mais respostas aqui
							</Link>
						</div>
					</div>
					<div className="flex-1 flex flex-col gap-3 w-full">
						{perguntas.map((item, idx) => (
							<div
								key={item.pergunta}
								className={`bg-[#E9EDFB] rounded-md shadow-sm cursor-pointer border transition-all duration-200 ${
									aberta === idx ? "border-[#6C63FF]" : "border-transparent"
								}`}
								onClick={() => setAberta(aberta === idx ? null : idx)}
							>
								<div className="flex items-center justify-between px-5 py-4 font-semibold text-[#444] text-base md:text-lg select-none">
									{item.pergunta}
									<span
										className={`transition-transform duration-200 text-xl ${
											aberta === idx ? "rotate-180" : ""
										}`}
									>
										▼
									</span>
								</div>
								{aberta === idx && (
									<div className="px-5 pb-4 pt-0 text-[#444] text-base bg-[#F7F8FD] rounded-b-md">
										{item.resposta}
									</div>
								)}
							</div>
						))}
					</div>
				</div>
			</section>
		</motion.div>
	);
};

export default FaqSection;
