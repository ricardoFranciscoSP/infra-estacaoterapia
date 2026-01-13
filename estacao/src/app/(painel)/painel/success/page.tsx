"use client";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useDraftSession } from "@/hooks/useDraftSession";
import { useAuth } from "@/hooks/authHook";
import { useGetUserPlano } from "@/hooks/user/userHook";
import { limparDadosPrimeiraCompra } from "@/utils/primeiraCompraStorage";

export default function SuccessPage() {
	const router = useRouter();
	const { draftId, confirmarDraftSession, clearDraftSession } = useDraftSession();
	const { user } = useAuth();
	const { plano, refetch: refetchPlano } = useGetUserPlano();
	const [feedback, setFeedback] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);
	const [planoAtivado, setPlanoAtivado] = useState(false);

		useEffect(() => {
			const tryConfirmDraft = async () => {
				if (!draftId) return;
				if (!user?.Id) return;
				setLoading(true);
				try {
					await confirmarDraftSession(user.Id);
					setFeedback("Agendamento confirmado com sucesso!");
					clearDraftSession();
					window.localStorage.removeItem("draftId");
				} catch (err: unknown) {
					if (
						typeof err === "object" &&
						err !== null &&
						"response" in err &&
						typeof (err as { response?: { status?: number } }).response?.status === "number" &&
						(err as { response: { status: number } }).response.status === 410
					) {
						setFeedback("O tempo da reserva expirou. Por favor, escolha outro horário.");
						clearDraftSession();
						window.localStorage.removeItem("draftId");
					} else {
						setFeedback("Não foi possível confirmar o agendamento. Tente novamente.");
					}
				} finally {
					setLoading(false);
				}
		};
		tryConfirmDraft();
	}, [draftId, user?.Id, confirmarDraftSession, clearDraftSession]);

	// ⚡ Polling para verificar se plano foi ativado (após compra de plano)
	useEffect(() => {
		let intervalId: NodeJS.Timeout | null = null;
		let attempts = 0;
		const maxAttempts = 12; // 12 tentativas = 1 minuto (5s * 12)

		const checkPlanoAtivado = async () => {
			attempts++;
			await refetchPlano();

			// Verifica se há plano ativo
			const temPlanoAtivo = Array.isArray(plano) && plano.some(
				(p: { Status: string }) => p.Status === 'Ativo'
			);

			if (temPlanoAtivo) {
				setPlanoAtivado(true);
				if (intervalId) {
					clearInterval(intervalId);
				}
				return;
			}

			// Para após maxAttempts tentativas
			if (attempts >= maxAttempts && intervalId) {
				clearInterval(intervalId);
			}
		};

		// Inicia polling imediatamente e depois a cada 5 segundos
		checkPlanoAtivado();
		intervalId = setInterval(checkPlanoAtivado, 5000);

		return () => {
			if (intervalId) {
				clearInterval(intervalId);
			}
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [refetchPlano]); // plano não precisa estar nas deps (é atualizado pelo refetch)

	// Limpa dados temporários da primeira compra ao montar a página (garantia final)
	useEffect(() => {
		limparDadosPrimeiraCompra();
	}, []);

	const handleConcluir = () => {
		sessionStorage.removeItem('contratoAceito');
		sessionStorage.removeItem('contratoAssinaturaImg');
		sessionStorage.removeItem('contratoHtmlAssinado');
		// Garante limpeza final dos dados temporários
		limparDadosPrimeiraCompra();
		router.push("/painel");
	};

	return (
		<div
			className="flex flex-col items-center justify-center min-h-screen bg-white px-4"
			style={{ minHeight: '100vh', paddingBottom: 'env(safe-area-inset-bottom, 32px)' }}
		>
			<div className="flex-1 flex flex-col items-center justify-center w-full" style={{ minHeight: 'calc(100vh - 64px)', paddingBottom: 32 }}>
				<div className="mb-8 text-center">
					<h1 className="text-2xl md:text-3xl font-bold text-[#23272F]">Compra efetuada</h1>
					<h2 className="text-2xl md:text-3xl font-bold text-[#23272F]">com sucesso!</h2>
				</div>
				<Image
					src="/assets/success.svg"
					alt="Sucesso"
					width={282}
					height={282}
					style={{ opacity: 1 }}
					className="mb-8 w-[180px] h-[180px] md:w-[282px] md:h-[282px]"
				/>
				{loading && (
					<div className="mb-4 text-[#6D75C0] text-lg font-semibold">Confirmando agendamento...</div>
				)}
				{feedback && (
					<div className="mb-4 text-[#6D75C0] text-lg font-semibold">{feedback}</div>
				)}
				{!loading && !feedback && (
					<div className="mb-6 text-center space-y-2">
						<p className="text-[#6D75C0] text-lg font-semibold">✅ Pagamento realizado com sucesso!</p>
						{planoAtivado ? (
							<>
								<p className="text-green-600 text-base font-semibold">🎉 Seu plano foi ativado!</p>
								<p className="text-[#49525A] text-sm">Você já pode usar seus benefícios</p>
							</>
						) : (
							<>
								<p className="text-[#49525A] text-base">Aguarde a ativação de seu saldo</p>
								<p className="text-[#606C76] text-sm">Isso geralmente leva alguns segundos</p>
							</>
						)}
					</div>
				)}
				<button 
					className="
						w-full max-w-[384px] h-12
						px-6
						flex items-center justify-center gap-3
						rounded-lg border border-[#6D75C0]
						bg-[#6D75C0] text-white font-semibold text-base
						transition hover:bg-[#5a61a8]"
					style={{ opacity: 1 }}
					onClick={handleConcluir}
				>
					Concluir
				</button>
			</div>
		</div>
	);
}
