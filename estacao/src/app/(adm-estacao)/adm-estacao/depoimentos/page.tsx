"use client";
import React, { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useAdmReviews } from "@/hooks/admin/useReviews";

const EyeIcon = () => (
	<svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
		<path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
		<path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
	</svg>
);

const PencilIcon = () => (
	<svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
		<path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
	</svg>
);

const SearchIcon = () => (
	<svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
		<path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
	</svg>
);

const FilterIcon = () => (
	<svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
		<path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
	</svg>
);

export default function DepoimentosPage() {
	const { reviews, isLoading, getReviewById } = useAdmReviews();
	const [modalOpen, setModalOpen] = useState(false);
	const [modalReview, setModalReview] = useState<null | {
		Id?: string;
		Comentario?: string;
		User?: { Nome?: string };
		Psicologo?: { Nome?: string };
		Rating?: number;
	}>(null);
	const [busca, setBusca] = useState("");
	const [filtroStatus, setFiltroStatus] = useState("Todos");
	const [pagina, setPagina] = useState(1);
	const porPagina = 10;

	const handleOpenModal = async (id: string) => {
		const review = await getReviewById(id);
		setModalReview(review);
		setModalOpen(true);
	};

	const handleCloseModal = () => {
		setModalOpen(false);
		setModalReview(null);
	};

	// Filtros
	const depoimentosFiltrados = (reviews || []).filter((d) => {
		const buscaMatch = 
			d.User?.Nome?.toLowerCase().includes(busca.toLowerCase()) ||
			d.Psicologo?.Nome?.toLowerCase().includes(busca.toLowerCase()) ||
			d.Comentario?.toLowerCase().includes(busca.toLowerCase());
		const statusMatch = filtroStatus === "Todos" || d.Status === filtroStatus;
		return buscaMatch && statusMatch;
	});

	const total = depoimentosFiltrados.length;
	const totalPaginas = Math.ceil(total / porPagina);
	const depoimentosPaginados = depoimentosFiltrados.slice((pagina - 1) * porPagina, pagina * porPagina);

	return (
		<main className="w-full p-4 sm:p-6 lg:p-8">
			{/* Header */}
			<motion.div 
				initial={{ opacity: 0, y: -20 }}
				animate={{ opacity: 1, y: 0 }}
				className="mb-6"
			>
				<h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">Depoimentos</h1>
				<p className="text-sm text-gray-500">Gerencie e visualize todas as avaliações dos pacientes</p>
			</motion.div>

			{/* Filtros */}
			<motion.div 
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ delay: 0.1 }}
				className="bg-white rounded-xl shadow-sm border border-[#E5E9FA] p-4 sm:p-5 mb-5"
			>
				<div className="flex flex-col lg:flex-row gap-4">
					{/* Campo de busca */}
					<div className="flex-1 relative">
						<div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
							<SearchIcon />
						</div>
						<input
							type="text"
							placeholder="Buscar por paciente, psicólogo ou comentário..."
							className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#8494E9] focus:border-transparent transition-all outline-none"
							value={busca}
							onChange={(e) => setBusca(e.target.value)}
						/>
					</div>

					{/* Filtro de status */}
					<div className="relative min-w-[200px]">
						<div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
							<FilterIcon />
						</div>
						<select
							className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#8494E9] focus:border-transparent transition-all outline-none appearance-none bg-white cursor-pointer"
							value={filtroStatus}
							onChange={(e) => setFiltroStatus(e.target.value)}
						>
							<option value="Todos">Todos os status</option>
							<option value="Aprovado">Aprovado</option>
							<option value="Pendente">Pendente</option>
							<option value="Reprovado">Reprovado</option>
						</select>
					</div>
				</div>

				{/* Info e paginação superior */}
				<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mt-4 pt-4 border-t border-gray-100">
					<span className="text-sm font-medium text-gray-600">
						{total > 0 ? (
							<>Exibindo <span className="text-[#8494E9] font-semibold">{(pagina - 1) * porPagina + 1}</span> a <span className="text-[#8494E9] font-semibold">{Math.min(pagina * porPagina, total)}</span> de <span className="text-[#8494E9] font-semibold">{total}</span> depoimentos</>
						) : (
							"Nenhum depoimento encontrado"
						)}
					</span>
					<div className="flex items-center gap-2">
						<button
							className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
							onClick={() => setPagina((p) => Math.max(1, p - 1))}
							disabled={pagina === 1}
						>
							← Anterior
						</button>
						<span className="text-sm font-medium text-gray-600 px-3">
							{pagina} / {totalPaginas || 1}
						</span>
						<button
							className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
							onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
							disabled={pagina === totalPaginas || totalPaginas === 0}
						>
							Próxima →
						</button>
					</div>
				</div>
			</motion.div>

			{/* Tabela Desktop */}
			<motion.div 
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ delay: 0.2 }}
				className="hidden md:block bg-white rounded-xl shadow-sm border border-[#E5E9FA] overflow-hidden"
			>
				<div className="overflow-x-auto">
					<table className="w-full">
						<thead className="bg-gradient-to-r from-[#8494E9]/5 to-[#8494E9]/10">
							<tr>
								<th className="py-4 px-6 text-left text-xs font-semibold text-[#8494E9] uppercase tracking-wider">Paciente</th>
								<th className="py-4 px-6 text-left text-xs font-semibold text-[#8494E9] uppercase tracking-wider">Profissional</th>
								<th className="py-4 px-6 text-left text-xs font-semibold text-[#8494E9] uppercase tracking-wider">Avaliação</th>
								<th className="py-4 px-6 text-left text-xs font-semibold text-[#8494E9] uppercase tracking-wider">Data</th>
								<th className="py-4 px-6 text-left text-xs font-semibold text-[#8494E9] uppercase tracking-wider">Status</th>
								<th className="py-4 px-6 text-center text-xs font-semibold text-[#8494E9] uppercase tracking-wider">Ações</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-gray-100">
							{isLoading ? (
								<tr>
									<td colSpan={6} className="py-12 text-center">
										<div className="flex flex-col items-center justify-center gap-3">
											<div className="w-10 h-10 border-4 border-[#8494E9] border-t-transparent rounded-full animate-spin"></div>
											<span className="text-gray-500 text-sm">Carregando depoimentos...</span>
										</div>
									</td>
								</tr>
							) : depoimentosPaginados.length === 0 ? (
								<tr>
									<td colSpan={6} className="py-12 text-center">
										<div className="flex flex-col items-center justify-center gap-2">
											<span className="text-gray-400 text-4xl">💬</span>
											<span className="text-gray-500 font-medium">Nenhum depoimento encontrado</span>
											<span className="text-gray-400 text-sm">Tente ajustar os filtros de busca</span>
										</div>
									</td>
								</tr>
							) : (
								depoimentosPaginados.map((d, i) => (
									<motion.tr 
										key={d.Id}
										initial={{ opacity: 0 }}
										animate={{ opacity: 1 }}
										transition={{ delay: i * 0.05 }}
										className="hover:bg-gray-50 transition-colors"
									>
										<td className="py-4 px-6">
											<span className="font-medium text-gray-800">{d.User?.Nome ?? '-'}</span>
										</td>
										<td className="py-4 px-6 text-sm text-gray-600">{d.Psicologo?.Nome ?? '-'}</td>
										<td className="py-4 px-6">
											<div className="flex items-center gap-1">
												{[...Array(5)].map((_, idx) => (
													<svg 
														key={idx}
														className={`w-4 h-4 ${idx < (d.Rating ?? 0) ? 'text-yellow-400' : 'text-gray-300'}`}
														fill="currentColor"
														viewBox="0 0 20 20"
													>
														<path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.967a1 1 0 00.95.69h4.175c.969 0 1.371 1.24.588 1.81l-3.38 2.455a1 1 0 00-.364 1.118l1.287 3.967c.3.921-.755 1.688-1.54 1.118l-3.38-2.455a1 1 0 00-1.175 0l-3.38 2.455c-.784.57-1.838-.197-1.539-1.118l1.287-3.967a1 1 0 00-.364-1.118L2.05 9.394c-.783-.57-.38-1.81.588-1.81h4.175a1 1 0 00.95-.69l1.286-3.967z" />
													</svg>
												))}
												<span className="text-sm text-gray-600 ml-1">({d.Rating ?? 0})</span>
											</div>
										</td>
										<td className="py-4 px-6 text-sm text-gray-600">
											{d.CreatedAt ? new Date(d.CreatedAt).toLocaleDateString("pt-BR") : '-'}
										</td>
										<td className="py-4 px-6">
											<span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
												d.Status === "Aprovado"
													? "bg-green-100 text-green-700"
													: d.Status === "Reprovado"
													? "bg-red-100 text-red-700"
													: "bg-yellow-100 text-yellow-700"
											}`}>
												{d.Status}
											</span>
										</td>
										<td className="py-4 px-6">
											<div className="flex items-center justify-center gap-2">
												<button
													onClick={() => handleOpenModal(d.Id)}
													className="p-2 text-[#8494E9] hover:bg-[#8494E9]/10 rounded-lg transition-all"
													title="Visualizar"
												>
													<EyeIcon />
												</button>
												<Link
													href={`/adm-estacao/depoimentos/${d.Id}?edit=1`}
													className="p-2 text-[#8494E9] hover:bg-[#8494E9]/10 rounded-lg transition-all"
													title="Editar"
												>
													<PencilIcon />
												</Link>
											</div>
										</td>
									</motion.tr>
								))
							)}
						</tbody>
					</table>
				</div>
			</motion.div>

			{/* Cards Mobile */}
			<motion.div 
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ delay: 0.2 }}
				className="md:hidden space-y-3"
			>
				{isLoading ? (
					<div className="bg-white rounded-xl shadow-sm border border-[#E5E9FA] p-8 text-center">
						<div className="flex flex-col items-center justify-center gap-3">
							<div className="w-10 h-10 border-4 border-[#8494E9] border-t-transparent rounded-full animate-spin"></div>
							<span className="text-gray-500 text-sm"></span>
						</div>
					</div>
				) : depoimentosPaginados.length === 0 ? (
					<div className="bg-white rounded-xl shadow-sm border border-[#E5E9FA] p-8 text-center">
						<span className="text-gray-400 text-4xl block mb-2">💬</span>
						<span className="text-gray-500 font-medium block">Nenhum depoimento encontrado</span>
					</div>
				) : (
					depoimentosPaginados.map((d, i) => (
						<motion.div
							key={d.Id}
							initial={{ opacity: 0, x: -20 }}
							animate={{ opacity: 1, x: 0 }}
							transition={{ delay: i * 0.05 }}
							className="bg-white rounded-xl shadow-sm border border-[#E5E9FA] p-4 hover:shadow-md transition-shadow"
						>
							<div className="flex items-start justify-between mb-3">
								<div className="flex-1 min-w-0">
									<h3 className="font-semibold text-gray-800 truncate">{d.User?.Nome ?? '-'}</h3>
									<p className="text-sm text-gray-500">{d.Psicologo?.Nome ?? '-'}</p>
									<div className="flex items-center gap-1 mt-1">
										{[...Array(5)].map((_, idx) => (
											<svg 
												key={idx}
												className={`w-3 h-3 ${idx < (d.Rating ?? 0) ? 'text-yellow-400' : 'text-gray-300'}`}
												fill="currentColor"
												viewBox="0 0 20 20"
											>
												<path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.967a1 1 0 00.95.69h4.175c.969 0 1.371 1.24.588 1.81l-3.38 2.455a1 1 0 00-.364 1.118l1.287 3.967c.3.921-.755 1.688-1.54 1.118l-3.38-2.455a1 1 0 00-1.175 0l-3.38 2.455c-.784.57-1.838-.197-1.539-1.118l1.287-3.967a1 1 0 00-.364-1.118L2.05 9.394c-.783-.57-.38-1.81.588-1.81h4.175a1 1 0 00.95-.69l1.286-3.967z" />
											</svg>
										))}
									</div>
								</div>
								<span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold flex-shrink-0 ml-2 ${
									d.Status === "Aprovado"
										? "bg-green-100 text-green-700"
										: d.Status === "Reprovado"
										? "bg-red-100 text-red-700"
										: "bg-yellow-100 text-yellow-700"
								}`}>
									{d.Status}
								</span>
							</div>

							<p className="text-sm text-gray-600 mb-3 line-clamp-2">{d.Comentario ?? 'Sem comentário'}</p>

							<div className="flex gap-2 pt-3 border-t border-gray-100">
								<button
									onClick={() => handleOpenModal(d.Id)}
									className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-[#8494E9] text-white rounded-lg hover:bg-[#6B7DE0] transition-all text-sm font-medium"
								>
									<EyeIcon />
									Visualizar
								</button>
								<Link
									href={`/adm-estacao/depoimentos/${d.Id}?edit=1`}
									className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-white border border-[#E5E9FA] text-[#8494E9] rounded-lg hover:bg-gray-50 transition-all text-sm font-medium"
								>
									<PencilIcon />
									Editar
								</Link>
							</div>
						</motion.div>
					))
				)}
			</motion.div>

			{/* Modal de Visualização */}
			{modalOpen && modalReview && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-transparent">
					<motion.div
						initial={{ scale: 0.95, opacity: 0 }}
						animate={{ scale: 1, opacity: 1 }}
						transition={{ duration: 0.2 }}
						className="bg-white rounded-xl shadow-lg max-w-md w-full mx-4 p-6 relative"
					>
						<button
							onClick={handleCloseModal}
							className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 transition-colors"
						>
							<svg
								className="w-6 h-6"
								fill="none"
								stroke="currentColor"
								strokeWidth={2}
								viewBox="0 0 24 24"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									d="M6 18L18 6M6 6l12 12"
								/>
							</svg>
						</button>
						<h2 className="text-xl font-semibold mb-4 text-gray-800">
							Depoimento de {modalReview.User?.Nome ?? '-'}
						</h2>
						<div className="space-y-3 mb-4">
							<p className="text-sm text-gray-600">
								<span className="font-medium">Profissional:</span>{' '}
								<span className="text-gray-800">{modalReview.Psicologo?.Nome ?? '-'}</span>
							</p>
							<div className="flex items-center gap-2">
								<span className="text-sm font-medium text-gray-600">Avaliação:</span>
								<div className="flex items-center gap-1">
									{[...Array(5)].map((_, i) => (
										<svg
											key={i}
											className={`w-5 h-5 ${
												i < (modalReview.Rating ?? 0)
													? "text-yellow-400"
													: "text-gray-300"
											}`}
											fill="currentColor"
											viewBox="0 0 20 20"
										>
											<path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.967a1 1 0 00.95.69h4.175c.969 0 1.371 1.24.588 1.81l-3.38 2.455a1 1 0 00-.364 1.118l1.287 3.967c.3.921-.755 1.688-1.54 1.118l-3.38-2.455a1 1 0 00-1.175 0l-3.38 2.455c-.784.57-1.838-.197-1.539-1.118l1.287-3.967a1 1 0 00-.364-1.118L2.05 9.394c-.783-.57-.38-1.81.588-1.81h4.175a1 1 0 00.95-.69l1.286-3.967z" />
										</svg>
									))}
									<span className="text-sm text-gray-600 ml-1">({modalReview.Rating ?? 0})</span>
								</div>
							</div>
						</div>
						<div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
							<p className="text-gray-800 text-sm leading-relaxed italic">
								{modalReview.Comentario ?? 'Sem comentário'}
							</p>
						</div>
						<button
							onClick={handleCloseModal}
							className="mt-5 w-full px-4 py-2.5 bg-[#8494E9] text-white rounded-lg hover:bg-[#6B7DE0] transition-all font-medium"
						>
							Fechar
						</button>
					</motion.div>
				</div>
			)}
		</main>
	);
}