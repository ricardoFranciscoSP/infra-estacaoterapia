"use client";
import React from "react";
import { usePsicologoPage } from "@/hooks/psicologos/usePsicologo";
import ReactQueryProvider from "@/app/ReactQueryProvider";
import ModalCadastroAgendamento from "@/components/ModalCadastroAgendamento";
import { FiltrosPsicologo } from "@/components/filtrosPsicologo";
import CardPsicologos from "@/components/cardPsicologo";
import ListPsicologo from "@/components/listPsicologo";
import Image from "next/image";
import { usePsicologoSearch } from '@/hooks/usePsicologoSearch';
import { usePsicologoFilterStore } from "@/store/filters/psicologoFilterStore";
import { PsicologoAtivo } from "@/types/psicologoTypes";

export default function PsicologosListPage() {
  return (
    <ReactQueryProvider>
      <PsicologosPage />
    </ReactQueryProvider>
  );
}

function PsicologosPage() {
  const {
    PAGE_SIZE,
    cardsVisiveis,
    setCardsVisiveis,
    totalDias,
    datas,
    startIdx,
    setStartIdx,
    diasVisiveis,
    diaSelecionado,
    setDiaSelecionado,
    horariosPorData,
    horariosSelecionados,
    setHorariosSelecionados,
    selecionarHorario,
    bloqueioHorarios,
    router,
    motion,
    AnimatePresence,
    agendaResumo,
    abrirResumoAgenda,
    fecharResumoAgenda,
  } = usePsicologoPage();
  const [busca, setBusca] = React.useState("");
  const { psicologos, searchPsicologos, isLoading } = usePsicologoSearch();
  
  const {
    queixas,
    abordagens,
    sexo,
    atendimentos,
    idiomas,
    data,
    periodo,
  } = usePsicologoFilterStore();

  // Carregar lista padrão ao montar
  React.useEffect(() => {
    handleBuscar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Busca ao clicar no botão, usando todos os filtros
  const handleBuscar = () => {
    // Monta objeto de filtros
    const filtrosBusca = {
      nome: busca,
      queixas,
      abordagens,
      sexo,
      atendimentos,
      idiomas,
      data,
      periodo,
    };
    searchPsicologos(filtrosBusca);
  };

  // Estado para controlar o calendário no mobile
  const [showMobileCalendar, setShowMobileCalendar] = React.useState(false);
  // Estado para controlar o modal de filtros no mobile
  const [showMobileFilters, setShowMobileFilters] = React.useState(false);

  // Função para abrir o calendário (mobile)
  const handleOpenMobileCalendar = () => setShowMobileCalendar(true);
  const handleCloseMobileCalendar = () => setShowMobileCalendar(false);
  
  // Função para abrir/fechar o modal de filtros (mobile)
  const handleOpenMobileFilters = () => setShowMobileFilters(true);
  const handleCloseMobileFilters = () => setShowMobileFilters(false);

  // ========== FUNÇÕES DE PRIORIZAÇÃO ==========
  
  /**
   * Converte ExperienciaClinica enum para anos numéricos
   */
  const experienciaClinicaParaAnos = (experiencia?: string | null): number => {
    if (!experiencia) return 0;
    
    const map: { [key: string]: number } = {
      'Entre1_5Anos': 3,
      'Entre6_10Anos': 8,
      'Entre11_15Anos': 13,
      'Entre15_20Anos': 18,
      'Mais20Anos': 21,
      // Compatibilidade com formatos anteriores
      'Nenhuma': 0,
      'Menos1Ano': 1,
      'Ano1': 1,
      'Entre1_3Anos': 2,
      'Entre3_5Anos': 4,
      'Entre5_10Anos': 8,
      'Mais10Anos': 13,
      // Compatibilidade com formatos antigos
      'ENTRE_1_2_ANOS': 2,
      'ENTRE_3_5_ANOS': 4,
      'ENTRE_5_10_ANOS': 8,
      'MAIS_10_ANOS': 13,
    };
    
    return map[experiencia] ?? 0;
  };

  /**
   * Calcula a compatibilidade com filtros aplicados (0-100%)
   * Baseado em: abordagem, queixa, idioma, tipo de atendimento, horários (data/periodo)
   * Nota: Sexo já é filtrado no backend, então não precisa ser verificado aqui
   */
  const calcularCompatibilidade = (psicologo: PsicologoAtivo): number => {
    const profile = psicologo.ProfessionalProfiles?.[0];
    if (!profile) return 0;

    let totalFiltros = 0;
    let filtrosCorrespondentes = 0;

    // Filtro: Abordagens
    if (abordagens && abordagens.length > 0) {
      totalFiltros++;
      const abordagensPsicologo = profile.Abordagens || [];
      const temAbordagem = abordagens.some(a => 
        abordagensPsicologo.some(ap => ap.toLowerCase() === a.toLowerCase())
      );
      if (temAbordagem) filtrosCorrespondentes++;
    }

    // Filtro: Queixas
    if (queixas && queixas.length > 0) {
      totalFiltros++;
      const queixasPsicologo = profile.Queixas || [];
      const temQueixa = queixas.some(q => 
        queixasPsicologo.some(qp => qp.toLowerCase() === q.toLowerCase())
      );
      if (temQueixa) filtrosCorrespondentes++;
    }

    // Filtro: Idiomas
    if (idiomas && idiomas.length > 0) {
      totalFiltros++;
      const idiomasPsicologo = profile.Idiomas || [];
      const temIdioma = idiomas.some(i => 
        idiomasPsicologo.some(ip => ip.toLowerCase() === i.toLowerCase())
      );
      if (temIdioma) filtrosCorrespondentes++;
    }

    // Filtro: Tipo de Atendimento
    if (atendimentos && atendimentos.length > 0) {
      totalFiltros++;
      const tiposAtendimentoPsicologo = profile.TipoAtendimento || [];
      const temTipoAtendimento = atendimentos.some(a => 
        tiposAtendimentoPsicologo.some(tap => tap.toLowerCase() === a.toLowerCase())
      );
      if (temTipoAtendimento) filtrosCorrespondentes++;
    }

    // Filtro: Data/Período (horários disponíveis)
    // Nota: A verificação de disponibilidade de horários é mais complexa
    // e pode requerer verificação da agenda. Por enquanto, se houver filtro de data,
    // verificamos se o psicólogo tem agendas
    if (data || periodo) {
      totalFiltros++;
      const temAgendas = psicologo.PsychologistAgendas && psicologo.PsychologistAgendas.length > 0;
      if (temAgendas) filtrosCorrespondentes++;
    }

    // Se não há filtros aplicados, retorna 100% (compatibilidade total)
    if (totalFiltros === 0) return 100;

    // Retorna percentual de correspondência
    return Math.round((filtrosCorrespondentes / totalFiltros) * 100);
  };

  /**
   * Ordena psicólogos conforme critérios de priorização:
   * 1. Compatibilidade com filtros (100% → 0%, decrescente)
   * 2. Taxa de ocupação (menor é melhor, crescente)
   * 3. Experiência clínica (maior é melhor, decrescente) - critério de desempate
   */
  const calcularNotaMedia = (psicologo: PsicologoAtivo): number => {
    const reviews = psicologo.ReviewsReceived || [];
    if (reviews.length === 0) return 0;
    const soma = reviews.reduce((acc, r) => acc + (r.Rating || 0), 0);
    return soma / reviews.length;
  };

  const temHorariosDisponiveis = (psicologo: PsicologoAtivo): boolean => {
    return Array.isArray(psicologo.PsychologistAgendas) && psicologo.PsychologistAgendas.length > 0;
  };

  const ordenarPsicologos = (psicologosList: PsicologoAtivo[]): PsicologoAtivo[] => {
    // 1º: Filtros selecionados (compatibilidade)
    // 2º: Quem tem mais horários livres (agenda disponível)
    // 3º: Maior tempo de experiência
    // 4º: Maior nota média
    // Psicólogos sem horários disponíveis sempre por último
    return [...psicologosList].sort((a, b) => {
      // 1. Compatibilidade com filtros
      const compatibilidadeA = calcularCompatibilidade(a);
      const compatibilidadeB = calcularCompatibilidade(b);
      if (compatibilidadeA !== compatibilidadeB) {
        return compatibilidadeB - compatibilidadeA;
      }

      // 2. Disponibilidade de horários (quem tem agenda vem antes)
      const horariosA = temHorariosDisponiveis(a);
      const horariosB = temHorariosDisponiveis(b);
      if (horariosA !== horariosB) {
        return horariosB ? 1 : -1;
      }
      // Se ambos têm horários, prioriza quem tem mais horários livres
      if (horariosA && horariosB) {
        const livresA = a.PsychologistAgendas?.filter(h => h.Status === 'Disponível').length || 0;
        const livresB = b.PsychologistAgendas?.filter(h => h.Status === 'Disponível').length || 0;
        if (livresA !== livresB) {
          return livresB - livresA;
        }
      }

      // 3. Maior tempo de experiência
      const experienciaA = experienciaClinicaParaAnos(a.ProfessionalProfiles?.[0]?.ExperienciaClinica);
      const experienciaB = experienciaClinicaParaAnos(b.ProfessionalProfiles?.[0]?.ExperienciaClinica);
      if (experienciaA !== experienciaB) {
        return experienciaB - experienciaA;
      }

      // 4. Maior nota média
      const notaA = calcularNotaMedia(a);
      const notaB = calcularNotaMedia(b);
      return notaB - notaA;
    });
  };

  // Aplica ordenação aos psicólogos
  const psicologosOrdenados = React.useMemo(() => {
    if (!Array.isArray(psicologos) || psicologos.length === 0) {
      return [];
    }
    return ordenarPsicologos(psicologos);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [psicologos, queixas, abordagens, sexo, atendimentos, idiomas, data, periodo]);

  return (
    <div className="flex flex-col items-center min-h-screen bg-[#FCFBF6]">
      <ModalCadastroAgendamento
        open={!!agendaResumo}
        onClose={fecharResumoAgenda}
        onConfirm={fecharResumoAgenda}
        psicologo={
          agendaResumo
            ? {
                Nome: agendaResumo.Nome,
                AvatarUrl:
                  (psicologosOrdenados.find((p: PsicologoAtivo) => String(p.Id) === String(agendaResumo.PsicologoId))?.Images?.[0]?.Url) ||
                  "/assets/avatar-placeholder.svg",
                Data: agendaResumo.Data,
                Horario: agendaResumo.Horario,
                Id: agendaResumo.PsicologoId,
              }
            : {
                Nome: "",
                AvatarUrl: "/assets/avatar-placeholder.svg",
                Data: "",
                Horario: "",
                Id: "",
              }
        }
        psicologoAgendaId={agendaResumo?.AgendaId ?? ""}
      />
      <div className="w-full max-w-[1440px] flex flex-col md:flex-row bg-[#FCFBF6] mt-6 mb-8 overflow-hidden px-4 md:px-8">
        {/* Sidebar Filtros - MOBILE: apenas busca e data, DESKTOP: filtros completos */}
        <aside className="w-full md:w-[400px] md:min-w-[400px] md:max-w-[400px] bg-[#FCFBF6] border-r-0 md:border-r border-[#e6eefe] p-2 md:p-4 flex flex-col gap-4 md:gap-4 md:sticky md:top-0 z-10">
          {/* MOBILE: Busca e Data */}
          <div className="block md:hidden w-full">
            {/* Campo de busca: botão varinha à esquerda e input ao lado, sem lupa, sem duplicidade */}
            <div className="flex items-center gap-2 mb-3">
              <button
                type="button"
                className="flex items-center justify-center w-10 h-8 rounded-[4px] border border-[#8494E9] bg-[#FCFBF6] pr-3 pl-3"
                style={{ minWidth: 40, minHeight: 32, gap: 8, opacity: 1, borderWidth: 1 }}
                onClick={handleOpenMobileFilters}
                aria-label="Abrir filtros"
              >
                <Image
                  src="/icons/magic-wand.svg"
                  alt="Magic Wand"
                  width={20}
                  height={20}
                  className="w-5 h-5"
                  style={{ width: 20, height: 20, transform: 'rotate(0deg)' }}
                />
              </button>
              <input
                type="text"
                placeholder="Pesquisar psicólogo"
                className="flex-1 h-8 rounded-[4px] border border-[#8494E9] bg-white text-sm focus:outline-none px-3"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                style={{ minHeight: 32, borderWidth: 1 }}
              />
            </div>
            {/* Card de data com borda igual ao desktop e estilos fornecidos */}
            <div className="relative flex flex-row items-center gap-4 mb-2 ml-0 w-full h-[52px] rounded-[8px] border border-[#919CA6] bg-white px-2 py-2 opacity-100" style={{ padding: 8 }}>
              <div className="flex flex-col items-start">
                <span className="text-xs text-[#75838F] font-medium leading-none">Data</span>
                <span className="text-sm text-[#75838F] font-semibold mt-0.5 leading-none">A partir de: 15/01/2025</span>
              </div>
              <button
                className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center border border-[#8494E9] rounded-[8px] bg-white"
                type="button"
                onClick={handleOpenMobileCalendar}
                tabIndex={0}
                aria-label="Abrir calendário"
              >
                {/* Ícone calendário */}
                <svg width="20" height="20" fill="none" viewBox="0 0 28 28">
                  <rect x="4" y="7" width="20" height="16" rx="3" fill="#8494E9" fillOpacity="0.08"/>
                  <rect x="4" y="7" width="20" height="16" rx="3" stroke="#8494E9" strokeWidth="1.5"/>
                  <rect x="8" y="2" width="2" height="6" rx="1" fill="#8494E9"/>
                  <rect x="18" y="2" width="2" height="6" rx="1" fill="#8494E9"/>
                </svg>
              </button>
              {/* Modal/calendário mobile */}
              {showMobileCalendar && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-transparent">
                  <div className="bg-white rounded-lg shadow-lg p-4 max-w-xs w-full relative">
                    <div className="mb-4 px-2 py-3">
                      <span className="block text-base font-semibold mb-2">Selecione a data</span>
                      {/* Exemplo de input date, troque pelo seu calendário customizado se necessário */}
                      <input
                        type="date"
                        className="w-full border border-[#8494E9] rounded px-3 py-2"
                        onChange={() => {
                          // Aqui você pode atualizar o estado/data conforme sua lógica
                          handleCloseMobileCalendar();
                        }}
                        autoFocus
                      />
                    </div>
                    <button
                      className="absolute top-2 right-2 text-[#8494E9] hover:text-[#6c6bb6] text-xl"
                      onClick={handleCloseMobileCalendar}
                      aria-label="Fechar"
                    >
                      ×
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
          {/* DESKTOP: Filtros avançados */}
          <div className="hidden md:block">
            <FiltrosPsicologo />
          </div>
        </aside>
        {/* Modal de Filtros Mobile */}
        <AnimatePresence>
          {showMobileFilters && (
            <>
              <div 
                className="fixed inset-0 z-40 bg-transparent md:hidden"
                onClick={handleCloseMobileFilters}
              />
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-lg shadow-lg w-full max-h-[90vh] flex flex-col md:hidden"
              >
                {/* Header do Modal */}
                <div className="flex items-center justify-between p-4 border-b border-gray-200 sticky top-0 bg-white z-10">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      className="flex items-center justify-center w-10 h-10 rounded-[4px] border border-[#8494E9] bg-white"
                    >
                      <Image
                        src="/icons/magic-wand.svg"
                        alt="Magic Wand"
                        width={20}
                        height={20}
                        className="w-5 h-5"
                      />
                    </button>
                    <h2 className="font-bold text-lg text-[#212529]">Encontre seu psicólogo</h2>
                  </div>
                  <button
                    className="text-[#8494E9] hover:text-[#6c6bb6] text-2xl font-bold w-8 h-8 flex items-center justify-center"
                    onClick={handleCloseMobileFilters}
                    aria-label="Fechar filtros"
                  >
                    ×
                  </button>
                </div>
                {/* Conteúdo dos Filtros */}
                <div className="flex-1 overflow-y-auto p-4">
                  <FiltrosPsicologo autoTrigger={false} />
                </div>
                {/* Botão Aplicar Filtro */}
                <div className="sticky bottom-0 p-4 bg-white border-t border-gray-200">
                  <button
                    className="w-full bg-[#CACFD4] text-white font-bold rounded-md py-3 text-base"
                    onClick={() => {
                      handleBuscar();
                      handleCloseMobileFilters();
                    }}
                  >
                    Aplicar filtro
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
        {/* Lista de Psicólogos */}
        <main className="flex-1 overflow-y-auto p-0 md:p-6 max-w-full">
          <div className="flex flex-col gap-3 md:gap-6 px-0 md:px-0">
            {/* Input de pesquisa com ícone de lupa (oculto no mobile) */}
            <div className="relative w-full md:w-[662px] max-w-full hidden md:block" style={{ opacity: 1 }}>
              <input
                type="text"
                placeholder="Pesquisar psicólogo..."
                className="w-full h-[40px] rounded-[6px] border border-[#CACFD4] bg-[#FCFBF6] px-4 pr-10 text-sm focus:outline-none"
                style={{ borderWidth: 1, borderRadius: 6, paddingLeft: 16, paddingRight: 40 }}
                value={busca}
                onChange={e => setBusca(e.target.value)}
              />
              <button
                className="absolute right-4 top-1/2 -translate-y-1/2 text-[#CACFD4]"
                style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
                onClick={handleBuscar}
                aria-label="Buscar psicólogo"
              >
                <Image src="/assets/icons/lupa-search.svg" alt="Search Icon" width={36} height={36} />
              </button>
            </div>
            {/* Fim do input de pesquisa */}
            {isLoading ? (
              <div className="text-center py-8 text-[#8494E9]"></div>
            ) : psicologosOrdenados.length === 0 ? (
              <div className="text-center py-8 text-[#8494E9]">Nenhum psicólogo encontrado...</div>
            ) : (
              <AnimatePresence>
                {psicologosOrdenados.slice(0, cardsVisiveis).map((p: PsicologoAtivo, idx: number) => {
                  const avatarUrl = Array.isArray(p.Images) && p.Images.length > 0 && p.Images[0]?.Url ? p.Images[0].Url : "/assets/avatar-placeholder.svg";
                  const nome = p.Nome ?? "";
                  const crp = p.Crp ?? "";
                  const sobreMim = Array.isArray(p.ProfessionalProfiles) && p.ProfessionalProfiles.length > 0 && p.ProfessionalProfiles[0]?.SobreMim ? p.ProfessionalProfiles[0].SobreMim : "";
                  return (
                    <motion.div
                      key={p.Id || `psicologo-${idx}`}
                      initial={{ opacity: 0, y: 30 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 30 }}
                      transition={{ duration: 0.3, delay: idx * 0.07 }}
                      className="w-full h-[344px] md:w-full md:max-w-7xl md:h-[450px] mx-auto flex flex-col md:flex-row opacity-100 rounded-[8px] overflow-hidden border border-[#9BA9ED] bg-[#FCFBF6] mb-3 md:mb-0"
                      style={{ height: "344px" }}
                    >
                      <CardPsicologos
                        p={p}
                        avatarUrl={avatarUrl}
                        nome={nome}
                        crp={crp}
                        sobreMim={sobreMim}
                        router={router}
                        idx={idx}
                        motion={motion}
                      />
                      <ListPsicologo
                        idx={idx}
                        p={p}
                        datas={datas}
                        startIdx={startIdx}
                        setStartIdx={setStartIdx}
                        totalDias={totalDias}
                        diasVisiveis={diasVisiveis}
                        diaSelecionado={diaSelecionado ?? 0}
                        setDiaSelecionado={setDiaSelecionado}
                        horariosPorData={horariosPorData}
                        horariosSelecionados={horariosSelecionados}
                        setHorariosSelecionados={setHorariosSelecionados}
                        selecionarHorario={selecionarHorario}
                        bloqueioHorarios={bloqueioHorarios}
                        abrirResumoAgenda={abrirResumoAgenda}
                      />
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            )}
            {cardsVisiveis < psicologosOrdenados.length && (
              <button
                className="mx-auto mt-4 md:mt-6 bg-[#8494E9] text-white font-bold rounded-md px-6 md:px-8 py-2 text-base hover:bg-[#6c6bb6] w-full md:w-auto"
                onClick={() => setCardsVisiveis((prev) => Math.min(prev + PAGE_SIZE, psicologosOrdenados.length))}
              >
                Ver mais
              </button>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}