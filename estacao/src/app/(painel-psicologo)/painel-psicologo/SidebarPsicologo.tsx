"use client";
import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/store/authStore";

const menuItems = [
	{
		label: "Painel geral",
		href: "/painel-psicologo",
		icon: (props?: { className?: string }) => (
			<Image src="/assets/icons/icon-pc.svg" alt="Painel geral" width={20} height={20} className={props?.className} style={props?.className?.includes("text-white") ? { filter: "brightness(0) invert(1)" } : {}} />
		),
		active: true,
	},
	{
		label: "Agenda",
		href: "/painel-psicologo/agenda",
		icon: (props?: { className?: string }) => (
			<Image src="/assets/icons/icon-calendar.svg" alt="Agenda" width={20} height={20} className={props?.className} style={props?.className?.includes("text-white") ? { filter: "brightness(0) invert(1)" } : {}} />
		),
	},
	{
		label: "Financeiro",
		href: "/painel-psicologo/financeiro",
		icon: (props?: { className?: string }) => (
			<Image src="/assets/icons/icon-union.svg" alt="Financeiro" width={20} height={20} className={props?.className} style={props?.className?.includes("text-white") ? { filter: "brightness(0) invert(1)" } : {}} />
		),
	},
	{
		label: "Meus pacientes",
		href: "/painel-psicologo/consultas",
		icon: (props?: { className?: string }) => (
			<Image src="/assets/icons/icon-message.svg" alt="Meus pacientes" width={20} height={20} className={props?.className} style={props?.className?.includes("text-white") ? { filter: "brightness(0) invert(1)" } : {}} />
		),
	},
	{
		label: "Solicitações",
		href: "/painel-psicologo/solicitacoes",
		icon: (props?: { className?: string }) => (
			<Image src="/assets/icons/icon-pc.svg" alt="Solicitações" width={20} height={20} className={props?.className} style={props?.className?.includes("text-white") ? { filter: "brightness(0) invert(1)" } : {}} />
		),
	},
	{
		label: "Meu perfil",
		href: "/painel-psicologo/meu-perfil",
		icon: (props?: { className?: string }) => (
			<Image src="/assets/icons/user.svg" alt="Meu perfil" width={20} height={20} className={props?.className} style={props?.className?.includes("text-white") ? { filter: "brightness(0) invert(1)" } : {}} />
		),
	},
	{
		label: "Políticas e Termos",
		href: "/painel-psicologo/politicas-e-termos",
		icon: (props?: { className?: string }) => (
			<svg 
				width="20" 
				height="20" 
				viewBox="0 0 24 24" 
				fill="none" 
				className={props?.className}
				style={props?.className?.includes("text-white") ? { filter: "brightness(0) invert(1)" } : {}}
			>
				<path 
					d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" 
					stroke="currentColor" 
					strokeWidth="2" 
					strokeLinecap="round" 
					strokeLinejoin="round"
				/>
				<path 
					d="M14 2v6h6" 
					stroke="currentColor" 
					strokeWidth="2" 
					strokeLinecap="round" 
					strokeLinejoin="round"
				/>
				<path 
					d="M16 13H8" 
					stroke="currentColor" 
					strokeWidth="2" 
					strokeLinecap="round" 
					strokeLinejoin="round"
				/>
				<path 
					d="M16 17H8" 
					stroke="currentColor" 
					strokeWidth="2" 
					strokeLinecap="round" 
					strokeLinejoin="round"
				/>
				<path 
					d="M10 9H8" 
					stroke="currentColor" 
					strokeWidth="2" 
					strokeLinecap="round" 
					strokeLinejoin="round"
				/>
			</svg>
		),
	},
	{
		label: "Suporte",
		href: "#",
		isExternal: true,
		icon: (props?: { className?: string }) => (
			<svg 
				width="20" 
				height="20" 
				viewBox="0 0 24 24" 
				fill="none" 
				className={props?.className}
				style={props?.className?.includes("text-white") ? { filter: "brightness(0) invert(1)" } : {}}
			>
				<path 
					d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" 
					fill="currentColor"
				/>
			</svg>
		),
	},
];

export default function SidebarPsicologo() {
	// Sidebar inicia aberto por padrão
	const [sidebarOpen, setSidebarOpen] = useState(true);
	const [agendaOpen, setAgendaOpen] = useState(false);
	const agendaRef = useRef<HTMLLIElement>(null);

	const pathname = usePathname();
	const router = useRouter();
	const logout = useAuthStore((state) => state.logout);

	// Persiste estado do sidebar no localStorage
	useEffect(() => {
		const savedState = localStorage.getItem("sidebar-psicologo-open");
		if (savedState !== null) {
			setSidebarOpen(savedState === "true");
		}
	}, []);

	// Abre o submenu de agenda se estiver em uma rota relacionada
	useEffect(() => {
		if (pathname?.includes("/agenda")) {
			setAgendaOpen(true);
		}
	}, [pathname]);

	useEffect(() => {
		localStorage.setItem("sidebar-psicologo-open", sidebarOpen.toString());
	}, [sidebarOpen]);

	// Atualiza o sidebar imediatamente ao navegar
	function handleLinkClick(href: string) {
		if (pathname !== href) {
			router.push(href);
		}
	}

	// Fecha submenu ao clicar fora
	useEffect(() => {
		function handleClickOutside(event: MouseEvent) {
			if (
				agendaRef.current &&
				!agendaRef.current.contains(event.target as Node)
			) {
				setAgendaOpen(false);
			}
		}
		if (agendaOpen) {
			document.addEventListener("mousedown", handleClickOutside);
		}
		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
		};
	}, [agendaOpen]);

	const handleToggleSidebar = () => {
		setSidebarOpen((prev) => !prev);
		setAgendaOpen(false);
	};

	return (
		<aside
			className={`${
				sidebarOpen ? "w-[240px]" : "w-16"
			} flex-shrink-0 hidden sm:flex flex-col bg-white rounded-xl shadow-lg border border-gray-100 transition-all duration-300 ease-in-out min-h-[370px] mt-6 mb-6 overflow-visible`}
		>
			{/* Header com botão de toggle */}
			<div className="flex items-center justify-between px-3 py-3 border-b border-gray-200 bg-gradient-to-r from-[#F9F9F6] to-white">
				{sidebarOpen && (
					<span className="text-sm font-semibold text-gray-700 transition-opacity duration-200">
						Menu
					</span>
				)}
				<button
					className="text-gray-500 hover:text-[#6D75C0] p-2 rounded-lg hover:bg-gray-100 transition-all duration-200 group"
					onClick={handleToggleSidebar}
					aria-label={sidebarOpen ? "Fechar sidebar" : "Abrir sidebar"}
					title={sidebarOpen ? "Fechar menu" : "Abrir menu"}
				>
					{sidebarOpen ? (
						<svg 
							width="20" 
							height="20" 
							fill="none" 
							viewBox="0 0 24 24"
							className="group-hover:scale-110 transition-transform duration-200"
						>
							<path
								d="M15 19l-7-7 7-7"
								stroke="currentColor"
								strokeWidth="2"
								strokeLinecap="round"
								strokeLinejoin="round"
							/>
						</svg>
					) : (
						<svg 
							width="20" 
							height="20" 
							fill="none" 
							viewBox="0 0 24 24"
							className="group-hover:scale-110 transition-transform duration-200"
						>
							<path
								d="M9 5l7 7-7 7"
								stroke="currentColor"
								strokeWidth="2"
								strokeLinecap="round"
								strokeLinejoin="round"
							/>
						</svg>
					)}
				</button>
			</div>

			{/* Navegação */}
			<nav className="flex-1 px-2 py-4 overflow-y-auto overflow-x-visible relative">
				<ul className="space-y-1">
					{menuItems.map((item) => {
						const isActive = pathname === item.href || (item.href !== "/painel-psicologo" && pathname?.startsWith(item.href));
						
						// Link externo para Suporte (WhatsApp)
						if (item.isExternal && item.label === "Suporte") {
							const whatsappNumber = "5511960892131";
							const whatsappMessage = "Olá, preciso de suporte na Estação Terapia.";
							const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(whatsappMessage)}`;
							
							return (
								<li key={item.label}>
									<a
										href={whatsappUrl}
										target="_blank"
										rel="noopener noreferrer"
										className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group relative
											${
												sidebarOpen
													? "text-gray-700 hover:bg-gray-50 hover:shadow-sm"
													: "justify-center text-gray-700 hover:bg-gray-50"
											}
										`}
										title={!sidebarOpen ? item.label : undefined}
									>
										<span className="flex-shrink-0 text-[#25D366] group-hover:scale-110 transition-transform duration-200">
											{typeof item.icon === "function"
												? item.icon({ className: "text-[#25D366]" })
												: item.icon}
										</span>
										{sidebarOpen && (
											<span className="text-[14px] leading-6 text-[#26220D] font-[500] font-[fira-sans]">
												{item.label}
											</span>
										)}
										{/* Tooltip quando fechado */}
										{!sidebarOpen && (
											<span className="absolute left-full ml-3 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 z-50 shadow-lg">
												{item.label}
											</span>
										)}
									</a>
								</li>
							);
						}
						
						// Submenu para Agenda
						if (item.label === "Agenda") {
							return (
								<li 
									key={item.label} 
									className="relative" 
									ref={agendaRef}
									style={{ zIndex: agendaOpen ? 50 : 'auto' }}
								>
									{sidebarOpen ? (
										<button
											type="button"
											onClick={(e) => {
												e.preventDefault();
												e.stopPropagation();
												setAgendaOpen((v) => !v);
											}}
											className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 cursor-pointer group
												${
													isActive
														? "bg-[#6D75C0] text-white font-semibold shadow-md"
														: "text-gray-700 hover:bg-gray-50 hover:shadow-sm"
												}
											`}
											aria-expanded={agendaOpen}
										>
											<span className={`flex-shrink-0 ${isActive ? "text-white" : "text-[#6D75C0]"} group-hover:scale-110 transition-transform duration-200`}>
												{typeof item.icon === "function"
													? item.icon({ className: isActive ? "text-white" : "text-[#6D75C0]" })
													: item.icon}
											</span>
											<span className={`flex-1 text-left ${
												isActive
													? "text-white text-[14px] leading-6 font-[500] font-[fira-sans]"
													: "text-[14px] leading-6 text-[#26220D] font-[500] font-[fira-sans]"
											}`}>
												{item.label}
											</span>
											<svg
												className={`ml-auto w-4 h-4 transition-all duration-200 ${
													agendaOpen ? "rotate-90" : ""
												} ${isActive ? "text-white" : "text-gray-400"}`}
												fill="none"
												viewBox="0 0 24 24"
												stroke="currentColor"
											>
												<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
											</svg>
										</button>
									) : (
										<div className="relative">
											<Link
												href="/painel-psicologo/agenda"
												className={`w-full flex items-center justify-center px-3 py-2.5 rounded-lg transition-all duration-200 group relative
													${
														isActive
															? "bg-[#6D75C0] text-white shadow-md"
															: "text-gray-700 hover:bg-gray-50"
													}
												`}
												onClick={(e) => {
													e.preventDefault();
													handleLinkClick("/painel-psicologo/agenda");
												}}
												title="Agenda"
											>
												<span className={`${isActive ? "text-white" : "text-[#6D75C0]"} group-hover:scale-110 transition-transform duration-200`}>
													{typeof item.icon === "function"
														? item.icon({ className: isActive ? "text-white" : "text-[#6D75C0]" })
														: item.icon}
												</span>
												{/* Tooltip quando fechado */}
												{!sidebarOpen && (
													<span className="absolute left-full ml-3 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 z-50 shadow-lg">
														Agenda
													</span>
												)}
											</Link>
										</div>
									)}
									
									{/* Submenu para baixo */}
									{sidebarOpen && agendaOpen && (
										<ul className="absolute top-full left-0 mt-1 w-full bg-white rounded-lg shadow-xl border border-gray-100 py-2 z-[100] min-w-[200px]">
											<li>
												<Link
													href="/painel-psicologo/agenda"
													className="block px-4 py-2.5 transition-all duration-200 text-[14px] leading-6 text-[#26220D] font-[500] font-[fira-sans] hover:bg-[#E3E4F3] hover:text-[#6366f1] rounded-lg mx-1"
													onClick={(e) => {
														e.preventDefault();
														e.stopPropagation();
														setAgendaOpen(false);
														handleLinkClick("/painel-psicologo/agenda");
													}}
												>
													Agenda
												</Link>
											</li>
											<li>
												<Link
													href="/painel-psicologo/ver-agenda"
													className="block px-4 py-2.5 transition-all duration-200 text-[14px] leading-6 text-[#26220D] font-[500] font-[fira-sans] hover:bg-[#E3E4F3] hover:text-[#6366f1] rounded-lg mx-1"
													onClick={(e) => {
														e.preventDefault();
														e.stopPropagation();
														setAgendaOpen(false);
														handleLinkClick("/painel-psicologo/ver-agenda");
													}}
												>
													Ver agenda
												</Link>
											</li>
										</ul>
									)}
								</li>
							);
						}
						
						return (
							<li 
								key={item.label}
							>
								<Link
									href={item.href}
									className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group relative
										${
											sidebarOpen
												? isActive
													? "bg-[#6D75C0] text-white font-semibold shadow-md"
													: "text-gray-700 hover:bg-gray-50 hover:shadow-sm"
												: isActive
													? "bg-[#6D75C0] text-white justify-center shadow-md"
													: "justify-center text-gray-700 hover:bg-gray-50"
										}
									`}
									onClick={(e) => {
										e.preventDefault();
										handleLinkClick(item.href);
									}}
									title={!sidebarOpen ? item.label : undefined}
								>
									<span className={`flex-shrink-0 ${isActive ? "text-white" : "text-[#6D75C0]"} group-hover:scale-110 transition-transform duration-200`}>
										{typeof item.icon === "function"
											? item.icon({ className: isActive ? "text-white" : "text-[#6D75C0]" })
											: item.icon}
									</span>
									{sidebarOpen && (
										<span className={`${
											isActive
												? "text-white text-[14px] leading-6 font-[500] font-[fira-sans]"
												: "text-[14px] leading-6 text-[#26220D] font-[500] font-[fira-sans]"
										}`}>
											{item.label}
										</span>
									)}
									{/* Tooltip quando fechado */}
									{!sidebarOpen && (
										<span className="absolute left-full ml-3 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 z-50 shadow-lg">
											{item.label}
										</span>
									)}
								</Link>
							</li>
						);
					})}
				</ul>
				
				<hr className="my-4 border-gray-200" />
				
				<ul>
					<li>
						<button
							type="button"
							className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-700 hover:bg-gray-50 transition-all duration-200 group relative w-full ${
								sidebarOpen ? "" : "justify-center"
							}`}
							onClick={async () => {
								await logout();
							}}
							title={!sidebarOpen ? "Sair" : undefined}
						>
							<Image 
								src="/assets/icons/exit.svg" 
								alt="Sair" 
								width={20} 
								height={20}
								className="group-hover:scale-110 transition-transform duration-200"
							/>
							{sidebarOpen && (
								<span className="text-[14px] leading-6 text-[#26220D] font-[500] font-[fira-sans]">
									Sair
								</span>
							)}
							{/* Tooltip quando fechado */}
							{!sidebarOpen && (
								<span className="absolute left-full ml-3 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 z-50 shadow-lg">
									Sair
								</span>
							)}
						</button>
					</li>
				</ul>
			</nav>
		</aside>
	);
}
