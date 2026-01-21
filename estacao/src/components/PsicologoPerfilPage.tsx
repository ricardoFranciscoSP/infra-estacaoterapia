'use client';
import { useParams } from "next/navigation";
import { usePsicologoById } from "@/hooks/psicologoHook";
import { useAuthStore } from '@/store/authStore';
import { useReviews, useAverageRating } from '@/hooks/reviewHook';
import BreadcrumbsVoltar from "@/components/BreadcrumbsVoltar";
import ModalQueixas from "@/components/ModalQueixas";
import ModalAbordagens from "@/components/ModalAbordagens";
import Image from "next/image";
import { FiX } from 'react-icons/fi';
import ModalReview from "@/components/ModalReview";
import CalendarioRotativo from "@/components/CalendarioRotativo";
import React, { useState, useEffect, useCallback } from "react";
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from "framer-motion";
import 'react-calendar/dist/Calendar.css';
import { useFavoritos, useAddFavorito, useRemoveFavorito } from "@/hooks/paciente/favoritosHook";

// Lazy load Calendar - biblioteca pesada (~50KB) que não precisa estar no bundle inicial
const Calendar = dynamic(
  () => import('react-calendar'),
  {
    loading: () => (
      <div className="flex items-center justify-center h-[350px] bg-gray-50 rounded-lg">
        <div className="text-gray-500 text-sm">Carregando calendário...</div>
      </div>
    ),
    ssr: false, // Calendar não precisa ser renderizado no servidor
  }
);
import ModalCadastroAgendamento from "./ModalCadastroAgendamento";
import { useDraftSession } from "@/hooks/useDraftSession";
import Link from "next/link";
import { Formacao, ProfessionalProfiles } from '@/types/psicologoTypes';
import { normalizeEnum, normalizeExperienciaClinica } from "@/utils/enumUtils";
import { agendamentoService } from '@/services/agendamentoService';
import { HorarioAgendamento } from '@/types/agendamentoTypes';
import toast from "react-hot-toast";

export default function PsicologoPerfilPage() {
  // Estado para loading de remoção de imagem
  const [removendoImagem, setRemovendoImagem] = useState(false);
  const { iniciarDraftSession } = useDraftSession();
  const params = useParams();
  const id = params && 'id' in params ? params.id : undefined;
  const idStr = Array.isArray(id) ? (id[0] ? String(id[0]).trim() : undefined) : (id ? String(id).trim() : undefined);

  // Validação do ID antes de fazer a requisição
  const isValidId = idStr && idStr.length > 0;
  
  const { psicologo, isLoading, isError } = usePsicologoById(isValidId ? idStr : undefined);

  const user = useAuthStore((s) => s.user);
  const isUserValid = !!user && !!user.Id;
  
  // Hooks de favoritos
  const { favoritos } = useFavoritos();
  const addFavorito = useAddFavorito();
  const removeFavorito = useRemoveFavorito();
  
  const [favorited, setFavorited] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false); 
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [agendamentoModal, setAgendamentoModal] = useState<{ data: string; hora: string; agendaId?: string } | null>(null);
  const [isQueixasModalOpen, setIsQueixasModalOpen] = useState(false);
  const [isAbordagensModalOpen, setIsAbordagensModalOpen] = useState(false);
  const { reviews = []} = useReviews(idStr?.toString() || "");
  const { averageRating } = useAverageRating(idStr?.toString() || "");
  
  // Estados para busca dinâmica de horários (mesma lógica do painel do psicólogo)
  const [loadingAgenda, setLoadingAgenda] = useState<boolean>(false);
  // Ref para controlar se já foi carregado (evita loop de requisições)
  const agendasCarregadasRef = React.useRef<string | null>(null);

  // Verifica se o psicólogo está favoritado
  useEffect(() => {
    if (favoritos?.favorites && idStr) {
      const isFavorited = favoritos.favorites.some(
        (fav) => fav.psychologist.id === idStr
      );
      setFavorited(isFavorited);
    }
  }, [favoritos, idStr]);

  // Função para formatar data para YYYY-MM-DD
  const formatDateToYMD = useCallback((date: Date) => {
    return date.toISOString().split("T")[0];
  }, []);

  // Busca TODAS as agendas disponíveis do psicólogo (para todos os dias)
  const fetchTodasAgendasDisponiveis = useCallback(async () => {
    if (!idStr || !psicologo?.Id) {
      setLoadingAgenda(false);
      agendasCarregadasRef.current = null;
      return;
    }
    
    // Evita múltiplas buscas se já foi carregado para este psicólogo
    if (agendasCarregadasRef.current === psicologo.Id) {
      console.log('[PsicologoPerfilPage] Agendas já carregadas para este psicólogo, pulando busca');
      return;
    }
    
    if (loadingAgenda) {
      return; // Evita múltiplas buscas simultâneas
    }
    
    setLoadingAgenda(true);
    
    try {
      console.log('[PsicologoPerfilPage] Buscando todas as agendas do psicólogo:', psicologo.Id);
      const response = await agendamentoService().listarAgendasPorPsicologo(psicologo.Id);
      const agendas = response.data || [];
      
      type AgendaResponse = {
        id?: string;
        Id?: string;
        data?: string;
        Data?: string;
        horario?: string;
        Horario?: string;
        status?: string;
        Status?: string;
      };
      
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      const hojeYMD = formatDateToYMD(hoje);
      const minutosAgora = hoje.getHours() * 60 + hoje.getMinutes();
      
      // Função auxiliar para converter horário em minutos
      const horarioParaMinutos = (horario: string): number => {
        const [h, m] = horario.split(":").map(Number);
        return h * 60 + m;
      };
      
      // Filtra e processa todas as agendas disponíveis
      const agendasProcessadas = Array.isArray(agendas)
        ? agendas
            .filter((h: unknown): h is AgendaResponse => {
              if (!h || typeof h !== 'object') return false;
              const agenda = h as AgendaResponse;
              const id = agenda.id || agenda.Id || '';
              const data = agenda.data || agenda.Data || '';
              const horario = agenda.horario || agenda.Horario || '';
              const status = agenda.status || agenda.Status || '';
              
              // Valida se tem ID, data e horário (obrigatórios)
              if (!id || !data || !horario) return false;
              
              // Filtra APENAS agendas com status exatamente igual a 'Disponivel' (case-sensitive)
              if (status !== 'Disponivel') return false;
              
              // Filtra datas passadas
              const dataYMD = formatDateToYMD(new Date(data));
              if (dataYMD < hojeYMD) return false;
              
              // Se for hoje, filtra horários passados
              if (dataYMD === hojeYMD) {
                const minutosHorario = horarioParaMinutos(horario);
                if (minutosHorario <= minutosAgora) return false;
              }
              
              return true;
            })
            .map((h: AgendaResponse) => {
              const data = h.data || h.Data || '';
              const dataYMD = formatDateToYMD(new Date(data));
              const horario = h.horario || h.Horario || '';
              // Normaliza horário para formato HH:MM (remove segundos se houver)
              const horarioNormalizado = horario.includes(':') ? horario.split(':').slice(0, 2).join(':') : horario;
              const id = h.id || h.Id || '';
              
              return {
                Id: id,
                Horario: horarioNormalizado,
                Status: 'Disponivel' as const,
                _data: dataYMD // Campo auxiliar para agrupamento
              } as HorarioAgendamento & { _data: string };
            })
        : [];
      
      console.log('[PsicologoPerfilPage] Total de agendas disponíveis encontradas:', agendasProcessadas.length);
      
      // Agrupa por data para o CalendarioRotativo com objetos {horario, id}
      const horariosPorDataMap: Record<string, Array<{ horario: string; id: string }>> = {};
      
      agendasProcessadas.forEach((agenda: HorarioAgendamento & { _data: string }) => {
        const data = agenda._data; // Acessa campo auxiliar
        
        // Agrupa por data para o CalendarioRotativo com objetos {horario, id}
        if (!horariosPorDataMap[data]) {
          horariosPorDataMap[data] = [];
        }
        horariosPorDataMap[data].push({
          horario: agenda.Horario,
          id: agenda.Id
        });
      });
      
      // Ordena horários por data
      Object.keys(horariosPorDataMap).forEach(data => {
        horariosPorDataMap[data].sort((a, b) => a.horario.localeCompare(b.horario));
      });
      
      console.log('[PsicologoPerfilPage] Horários agrupados por data:', Object.keys(horariosPorDataMap).length, 'dias');
      
      // Atualiza horariosPorData através de um estado separado
      setHorariosPorDataState(horariosPorDataMap);
      
      // Marca como carregado para evitar novas buscas
      agendasCarregadasRef.current = psicologo.Id;
      
    } catch (error: unknown) {
      console.error('[PsicologoPerfilPage] Erro ao buscar agendas disponíveis:', error);
      agendasCarregadasRef.current = null;
      toast.error('Erro ao buscar horários disponíveis');
    } finally {
      setLoadingAgenda(false);
    }
  }, [idStr, psicologo?.Id, loadingAgenda, formatDateToYMD]);
  
  // Estado para armazenar horários agrupados por data
  const [horariosPorDataState, setHorariosPorDataState] = useState<Record<string, Array<{ horario: string; id: string }>>>({});

  // Usa o estado de horários agrupados por data
  const horariosPorData: Record<string, Array<{ horario: string; id: string }>> = horariosPorDataState;

  // ...existing code...
  // Função para normalizar o tipo de formação
  const mapTipoFormacao = (tipo?: string) => {
    const map: { [key: string]: string } = {
      'Bacharelado': 'Bacharelado',
      'Curso': 'Curso',
      'Graduacao': 'Graduação',
      'PosGraduacao': 'Pós-Graduação',
      'Mestrado': 'Mestrado',
      'Doutorado': 'Doutorado',
      'PosDoutorado': 'Pós-Doutorado',
      'Residencia': 'Residência',
      'Especializacao': 'Especialização',
      'CursoLivre': 'Curso Livre',
      'Certificacao': 'Certificação',
      'Outro': 'Outro',
    };
    return map[tipo || 'Outro'] || tipo || 'Outro';
  };
  const handleFavoriteClick = async () => {
    if (!idStr) return;

    try {
      if (favorited) {
        // Remove favorito
        const favoritoToRemove = favoritos?.favorites.find(
          (fav) => fav.psychologist.id === idStr
        );
        if (favoritoToRemove) {
          await removeFavorito.mutateAsync(favoritoToRemove.id);
          setFavorited(false);
        }
      } else {
        // Adiciona favorito
        await addFavorito.mutateAsync(idStr);
        setFavorited(true);
      }
    } catch (error) {
      console.error('Erro ao favoritar/desfavoritar:', error);
    }
  };

  const handleShareClick = async () => {
    const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
    const perfilUrl = `${baseUrl}/psicologo/${idStr}`;
    const mensagem = `Minha indicação: profissional da Estação Terapia. Teste por R$ 49,90 — vale conhecer: ${perfilUrl}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: psicologo?.Nome || "Psicólogo",
          text: mensagem,
        });
      } catch {
        // Usuário cancelou ou erro
      }
    } else {
      try {
        await navigator.clipboard.writeText(mensagem);
        alert(mensagem);
      } catch {
        alert("Não foi possível copiar a mensagem.");
      }
    }
  };

  // Usa normalizeExperienciaClinica para normalizar experiência clínica

  // Função para mapear tipo de atendimento
  const mapTipoAtendimento = (tipos?: string[]) => {
    const map: { [key: string]: string } = {
      'CRIANÇAS': 'Crianças',
      'ADOLESCENTES': 'Adolescentes',
      'ADULTOS': 'Adultos',
      'IDOSOS': 'Idosos',
      'CASAIS': 'Casais'
    };
    return tipos?.map(tipo => map[tipo] || tipo) || ['Adultos', 'Casais', 'Idosos'];
  };

  // Função para mapear idiomas
  const mapIdiomas = (idiomas?: string[]) => {
    const map: { [key: string]: string } = {
      'PORTUGUES': 'Português',
      'INGLES': 'Inglês',
      'ESPANHOL': 'Espanhol',
      'FRANCES': 'Francês'
    };
    return idiomas?.map(idioma => map[idioma] || idioma) || ['Português', 'Inglês'];
  };

  // Função para mapear abordagens usando normalizeEnum
  const mapAbordagens = (abordagens?: string[]) => {
    return abordagens?.map(abordagem => normalizeEnum(abordagem)) || [];
  };

  // Função para mapear queixas usando normalizeEnum
  const mapQueixas = (queixas?: string[]) => {
    return queixas?.map(queixa => normalizeEnum(queixa)) || [];
  };

  // Função para obter próxima data disponível
  const getProximaDataDisponivel = () => {
    if (psicologo?.PsicologoAgenda && psicologo.PsicologoAgenda.length > 0) {
      const proximaAgenda = psicologo.PsicologoAgenda
        .sort((a, b) => new Date(a.Data).getTime() - new Date(b.Data).getTime())[0];
      return new Date(proximaAgenda.Data).toLocaleDateString('pt-BR');
    }
    
    const dataAtual = new Date();
    const dia = String(dataAtual.getDate()).padStart(2, '0');
    const mes = String(dataAtual.getMonth() + 1).padStart(2, '0');
    const ano = dataAtual.getFullYear();
    return `${dia}/${mes}/${ano}`;
  };

  // Obter dados do perfil profissional
  const perfilProfissional: ProfessionalProfiles | undefined = psicologo?.ProfessionalProfiles?.[0];


  const allAbordagens = mapAbordagens(perfilProfissional?.Abordagens);
  const allQueixas = mapQueixas(perfilProfissional?.Queixas);

  // Função auxiliar para obter a imagem do psicólogo ou avatar padrão
  const [imagemRemovida, setImagemRemovida] = useState(false);
  const getPsicologoImage = () => {
    if (imagemRemovida) return '/assets/avatar-placeholder.svg';
    // Verifica tanto Image (singular) quanto Images (plural) - a API pode retornar qualquer um
    const images = psicologo?.Image || psicologo?.Images || [];
    const imageUrl = images?.[0]?.Url;
    if (imageUrl && imageUrl.trim() !== '') {
      return imageUrl;
    }
    return '/assets/avatar-placeholder.svg';
  };

  // Função para remover imagem do psicólogo
  const handleRemoverImagem = async () => {
    if (!psicologo?.Id) return;
    setRemovendoImagem(true);
    try {
      // Chama endpoint de remoção de imagem (ajuste a URL se necessário)
      const res = await fetch(`/api/psicologos/${psicologo.Id}/imagem`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        setImagemRemovida(true);
        toast.success('Imagem removida com sucesso!');
      } else {
        toast.error('Erro ao remover imagem.');
      }
    } catch {
      toast.error('Erro ao remover imagem.');
    } finally {
      setRemovendoImagem(false);
    }
  };

  const [abordagensToShow, setAbordagensToShow] = useState(4);
  const [showCloseAbordagens, setShowCloseAbordagens] = useState(false);
  const [queixasToShow, setQueixasToShow] = useState(6);
  const [showCloseQueixas, setShowCloseQueixas] = useState(false);

  const handleVerTodasAbordagens = () => {
    const next = Math.min(abordagensToShow + 3, allAbordagens.length);
    setAbordagensToShow(next);
    if (next === allAbordagens.length) setShowCloseAbordagens(true);
  };

  const handleFecharAbordagens = () => {
    setAbordagensToShow(4);
    setShowCloseAbordagens(false);
  };

  const handleVerTodasQueixas = () => {
    const next = Math.min(queixasToShow + 1, allQueixas.length);
    setQueixasToShow(next);
    if (next === allQueixas.length) setShowCloseQueixas(true);
  };

  const handleFecharQueixas = () => {
    setQueixasToShow(6);
    setShowCloseQueixas(false);
  };

  const renderSidebarDetails = () => {
    const tipoAtendimento = mapTipoAtendimento(perfilProfissional?.TipoAtendimento);
    const idiomas = mapIdiomas(perfilProfissional?.Idiomas);
    const experiencia = normalizeExperienciaClinica(perfilProfissional?.ExperienciaClinica);

    return (
      <div className="mb-6 lg:mb-0">
        <div className="w-full mb-4 flex lg:justify-start justify-center relative group">
          <Image
            src={getPsicologoImage()}
            alt="Foto do Psicólogo"
            width={80}
            height={80}
            className="rounded-full border-[1px] border-[#6D75C0] object-cover"
            style={{ width: 80, height: 80, aspectRatio: '1/1' }}
            unoptimized={getPsicologoImage()?.startsWith('http') || getPsicologoImage()?.startsWith('data:')}
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              if (target.src !== '/assets/avatar-placeholder.svg') {
                target.src = '/assets/avatar-placeholder.svg';
              }
            }}
          />
          {/* Botão X para remover imagem */}
          {getPsicologoImage() !== '/assets/avatar-placeholder.svg' && (
            <button
              type="button"
              title="Remover imagem"
              className="absolute top-0 right-0 bg-white rounded-full p-1 shadow-md border border-gray-200 hover:bg-red-100 transition-opacity opacity-80 group-hover:opacity-100"
              style={{ transform: 'translate(40%, -40%)' }}
              onClick={handleRemoverImagem}
              disabled={removendoImagem}
            >
              <FiX size={18} className="text-red-500" />
            </button>
          )}
        </div>
        {/* Sexo */}
        <div className="flex items-center gap-1 mb-2">
          <span className="font-semibold text-[18px] leading-6 text-[#6D75C0]">Sexo:</span>
          <span className="font-normal text-[16px] leading-6 text-[#49525A]">
            {psicologo?.Sexo === 'Feminino' ? 'Feminino' : psicologo?.Sexo === 'Masculino' ? 'Masculino' : 'Não informado'}
          </span>
        </div>
        {/* Experiência */}
        <div className="mb-2">
          <span className="font-semibold text-[18px] leading-6 text-[#6D75C0]">Experiência:</span>
          <div className="font-normal text-[16px] leading-6 text-[#49525A] mt-0.5">
            {experiencia}
          </div>
        </div>
        {/* Atende */}
        <div className="mb-2">
          <span className="font-semibold text-[18px] leading-6 text-[#6D75C0]">Atende:</span>
          <div className="font-normal text-[16px] leading-6 text-[#49525A] mt-0.5 flex flex-col">
            {tipoAtendimento.map((tipo, idx) => (
              <span key={idx}>{tipo}</span>
            ))}
          </div>
        </div>
        {/* Idiomas */}
        <div>
          <span className="font-semibold text-[18px] leading-6 text-[#6D75C0]">Idiomas:</span>
          <div className="font-normal text-[16px] leading-6 text-[#49525A] mt-0.5 flex flex-col">
            {idiomas.map((idioma, idx) => (
              <span key={idx}>{idioma}</span>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderProfileDetails = () => {
    const tipoAtendimento = mapTipoAtendimento(perfilProfissional?.TipoAtendimento);
    const idiomas = mapIdiomas(perfilProfissional?.Idiomas);
    const experiencia = normalizeExperienciaClinica(perfilProfissional?.ExperienciaClinica);

    return (
      <div>
        <div className="flex flex-col w-full">
          {/* Layout Mobile customizado */}
          <div className="flex lg:hidden w-full mb-4 items-center justify-between">
            {/* Avatar à esquerda */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <Image
                src={getPsicologoImage()}
                alt="Foto do Psicólogo"
                width={48}
                height={48}
                className="rounded-full border-2 border-[#6D75C0] object-cover aspect-square"
              />
              <div className="flex flex-col items-start min-w-0 ml-2">
                <span className="font-semibold text-[15px] leading-[20px] text-[#212529] break-words whitespace-normal max-w-[120px]">
                  {psicologo?.Nome || "Nome do Psicólogo"}
                </span>
                <span className="font-normal text-[12px] leading-[16px] text-[#75838F]">
                  CRP {psicologo?.Crp || '06/12345'}
                </span>
              </div>
            </div>
            {/* Ícones Favoritar e Compartilhar à direita, sem texto */}
            <div className="flex flex-row items-center gap-2 flex-shrink-0">
              {isUserValid && (
                <button
                  className="flex items-center text-[#6D75C0] hover:text-[#49525A] transition-colors cursor-pointer hover:scale-105"
                  onClick={handleFavoriteClick}
                  type="button"
                  aria-label="Favoritar"
                >
                  <Image
                    src={
                      favorited
                        ? "/icons/heart-filled.svg"
                        : "/icons/heart-line.svg"
                    }
                    alt={favorited ? "Desfavoritar" : "Favoritar"}
                    width={20}
                    height={20}
                    className={favorited ? "w-[20px] h-[20px]" : "w-[20px] h-[20px]"}
                    style={favorited ? { filter: 'brightness(0) saturate(100%) invert(45%) sepia(16%) saturate(1274%) hue-rotate(202deg) brightness(91%) contrast(88%)' } : undefined}
                  />
                </button>
              )}
              <button
                className="flex items-center text-[#6D75C0] hover:text-[#49525A] transition-colors cursor-pointer hover:scale-105"
                onClick={handleShareClick}
                type="button"
                aria-label="Compartilhar"
              >
                <Image
                  src="/icons/share.svg"
                  alt="Compartilhar"
                  width={20}
                  height={20}
                  className="w-[20px] h-[20px]"
                />
              </button>
            </div>
          </div>
          {/* Layout Desktop - nome e CRP em coluna, ícones ao lado */}
          <div className="hidden lg:flex flex-row items-center justify-between w-full mb-4 flex-wrap">
            <div className="flex flex-col items-start min-w-0">
              <span className="font-semibold text-[18px] leading-[24px] text-[#212529] break-words whitespace-normal">
                {psicologo?.Nome || ""}
              </span>
              <span className="font-normal text-[14px] leading-[20px] text-[#75838F]">
                CRP {psicologo?.Crp || ''}
              </span>
            </div>
            <div className="flex flex-row items-center gap-6">
              {isUserValid && (
                <button
                  className="flex items-center gap-1 text-[#6D75C0] hover:text-[#49525A] transition-colors cursor-pointer hover:scale-105"
                  onClick={handleFavoriteClick}
                  type="button"
                >
                  <Image
                    src={
                      favorited
                        ? "/icons/heart-filled.svg"
                        : "/icons/heart-line.svg"
                    }
                    alt={favorited ? "Desfavoritar" : "Favoritar"}
                    width={22}
                    height={22}
                    className={favorited ? "w-[22px] h-[22px]" : "w-[22px] h-[22px]"}
                    style={favorited ? { filter: 'brightness(0) saturate(100%) invert(45%) sepia(16%) saturate(1274%) hue-rotate(202deg) brightness(91%) contrast(88%)' } : undefined}
                  />
                  <span className="text-[13px] font-medium">Favoritar</span>
                </button>
              )}
              <button
                className="flex items-center gap-1 text-[#6D75C0] hover:text-[#49525A] transition-colors cursor-pointer hover:scale-105"
                onClick={handleShareClick}
                type="button"
              >
                <Image
                  src="/icons/share.svg"
                  alt="Compartilhar"
                  width={22}
                  height={22}
                  className="w-[22px] h-[22px]"
                />
                <span className="text-[13px] font-medium">Compartilhar</span>
              </button>
            </div>
          </div>
          {/* Conteúdo abaixo: estrelas, abordagens, queixas */}
          <div className="w-full">
            {/* Estrelas, avaliações e link */}
            <div className="flex items-center mt-1 w-full mb-4">
              {[1, 2, 3, 4, 5].map((star) => (
                <Image
                  key={star}
                  src={star <= Math.round(averageRating ?? 0) ? "/icons/star.svg" : "/icons/star-inline.svg"}
                  alt={star <= Math.round(averageRating ?? 0) ? "estrela cheia" : "estrela vazia"}
                  width={24}
                  height={24}
                  className="w-6 h-6"
                />
              ))}
              <span className="ml-2 text-[#75838F] text-[16px] font-normal">({reviews.length})</span>
              {reviews.length > 0 && (
                <button
                  type="button"
                  onClick={() => setIsReviewModalOpen(true)}
                  className="ml-2 text-[#6D75C0] text-[16px] font-medium underline hover:text-[#49525A] transition-colors"
                >
                  Ver avaliações
                </button>
              )}
            </div>
            
            {/* Abordagens - Mobile */}
            <div className="flex lg:hidden flex-wrap gap-3 mt-2 w-full mb-4">
              <AnimatePresence initial={false}>
                {allAbordagens.slice(0, abordagensToShow).map((abord, idx) => (
                  <motion.span
                    key={abord}
                    className="font-normal text-[16px] leading-[24px] align-middle text-[#ADB6BD]"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    transition={{ duration: 0.2, delay: idx * 0.04 }}
                  >
                    {abord}
                  </motion.span>
                ))}
              </AnimatePresence>
              {allAbordagens.length > 2 && (
                <motion.button
                  type="button"
                  onClick={() => setIsAbordagensModalOpen(true)}
                  className="font-medium text-[14px] leading-[24px] align-middle text-[#6D75C0] hover:text-[#49525A] transition-colors underline"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ duration: 0.2, delay: 0.1 }}
                >
                  Ver mais
                </motion.button>
              )}
            </div>

            {/* Abordagens - Desktop */}
            <div className="hidden lg:flex flex-wrap gap-3 mt-2 w-full mb-4">
              <AnimatePresence initial={false}>
                {allAbordagens.slice(0, abordagensToShow).map((abord, idx) => (
                  <motion.span
                    key={abord}
                    className="font-normal text-[16px] leading-[24px] align-middle text-[#ADB6BD]"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    transition={{ duration: 0.2, delay: idx * 0.04 }}
                  >
                    {abord}
                  </motion.span>
                ))}
              </AnimatePresence>
              {!showCloseAbordagens && abordagensToShow < allAbordagens.length && (
                <motion.button
                  type="button"
                  onClick={handleVerTodasAbordagens}
                  className="font-medium text-[14px] leading-[24px] align-middle text-[#6D75C0] hover:text-[#49525A] transition-colors underline"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ duration: 0.2, delay: 0.1 }}
                >
                  Ver mais
                </motion.button>
              )}
              {showCloseAbordagens && (
                <motion.button
                  type="button"
                  onClick={handleFecharAbordagens}
                  className="font-medium text-[14px] leading-[24px] align-middle text-[#6D75C0] hover:text-[#49525A] transition-colors underline"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ duration: 0.2, delay: 0.1 }}
                >
                  Fechar
                </motion.button>
              )}
            </div>
            {/* Seção Informações Básicas - Mobile */}
            <div className="flex lg:hidden w-full gap-6 mb-6 mt-6">
              <div className="flex-1">
                <div className="mb-4">
                  <span className="font-semibold block text-[16px] leading-[24px] text-[#212529] mb-1">Sexo:</span> 
                  <span className="font-normal text-[16px] leading-[24px] text-[#75838F]">{psicologo?.Sexo === 'Feminino' ? 'Feminino' : psicologo?.Sexo === 'Masculino' ? 'Masculino' : 'Não informado'}</span>
                </div>
                <div>
                  <span className="font-semibold block text-[16px] leading-[24px] text-[#212529] mb-1">Atende:</span> 
                  <span className="font-normal text-[16px] leading-[24px] text-[#75838F]">{tipoAtendimento.join(', ')}</span>
                </div>
              </div>
              <div className="flex-1">
                <div className="mb-4">
                  <span className="font-semibold block text-[16px] leading-[24px] text-[#212529] mb-1">Experiência:</span> 
                  <span className="font-normal text-[16px] leading-[24px] text-[#75838F]">{experiencia}</span>
                </div>
                <div>
                  <span className="font-semibold block text-[16px] leading-[24px] text-[#212529] mb-1">Idiomas:</span> 
                  <span className="font-normal text-[16px] leading-[24px] text-[#75838F]">{idiomas.join(', ')}</span>
                </div>
              </div>
            </div>
            {/* Queixas */}
            <div className="mt-4 w-full flex flex-col">
              <div className="w-full flex flex-wrap gap-3">
                <AnimatePresence initial={false}>
                  {allQueixas.slice(0, queixasToShow).map((queixa, idx) => (
                    <motion.div
                      key={queixa}
                      className="border border-[#6D75C0] rounded-[4px] px-4 py-2 text-[#6D75C0] font-normal text-[14px] leading-[24px] text-center"
                      style={{
                        minWidth: "fit-content",
                        maxWidth: "100%",
                        flex: "1 1 30%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        wordBreak: "break-word"
                      }}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      transition={{ duration: 0.2, delay: idx * 0.04 }}
                    >
                      {queixa}
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
              {/* Ver todos/Fechar - Mobile */}
              {allQueixas.length > 2 && (
                <motion.div
                  className="flex lg:hidden justify-center mt-3 w-full"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ duration: 0.2 }}
                >
                  <button
                    type="button"
                    onClick={() => setIsQueixasModalOpen(true)}
                    className="font-medium text-[14px] leading-[24px] align-middle text-[#6D75C0] hover:text-[#49525A] transition-colors underline"
                  >
                    Ver mais
                  </button>
                </motion.div>
              )}
              
              {/* Ver todos/Fechar - Desktop */}
              {!showCloseQueixas && queixasToShow < allQueixas.length && (
                <motion.div
                  className="hidden lg:flex justify-center mt-3 w-full"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ duration: 0.2 }}
                >
                  <button
                    type="button"
                    onClick={handleVerTodasQueixas}
                    className="font-medium text-[14px] leading-[24px] align-middle text-[#6D75C0] hover:text-[#49525A] transition-colors underline"
                  >
                    Ver mais
                  </button>
                </motion.div>
              )}
              {showCloseQueixas && (
                <motion.div
                  className="hidden lg:flex justify-center mt-3 w-full"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ duration: 0.2 }}
                >
                  <button
                    type="button"
                    onClick={handleFecharQueixas}
                    className="font-medium text-[14px] leading-[24px] align-middle text-[#6D75C0] hover:text-[#49525A] transition-colors underline"
                  >
                    Fechar
                  </button>
                </motion.div>
              )}
            </div>
            {/* Sobre mim */}
            <div className="w-full mt-6">
              <div className="font-semibold text-[18px] leading-[24px] text-[#212529] mb-2">
                Sobre mim
              </div>
              <div className="font-normal text-[16px] leading-[24px] text-[#75838F]">
                {perfilProfissional?.SobreMim || 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed vitae dictum sem. Suspendisse placerat ipsum eget eros malesuada commodo. Donec quis vestibulum dui. Vivamus elementum nunc finibus magna rhoncus, ac efficitur enim venenatis. Etiam dui est, egestas vel mi quis, rutrum porta velit.'}
              </div>
            </div>
            {/* Formação acadêmica */}
            <div className="w-full mt-6">
              <div className="font-semibold text-[18px] leading-[24px] text-[#212529] mb-2">
                Formação acadêmica
              </div>
              {/* Card Formações */}
              {perfilProfissional?.Formacoes && perfilProfissional.Formacoes.length > 0 ?  
              perfilProfissional.Formacoes.map((formacao: Formacao) => (
                <div
                  key={formacao.Id}
                  className="w-full max-w-[588px] bg-[#F1F2F4] border border-[#E3E6E8] rounded-[8px] p-4 mb-6 flex flex-col gap-2 shadow-sm"
                >
                  <div className="font-medium text-[15px] leading-[24px] text-[#49525A] mb-1">
                    {formacao.TipoFormacao ? `${mapTipoFormacao(formacao.TipoFormacao)} - ${formacao.Curso}` : formacao.Curso}
                  </div>
                  <div className="font-normal text-[14px] leading-[22px] text-[#75838F] mb-1">
                    {formacao.Instituicao}
                  </div>
                  <div className="font-normal text-[14px] leading-[22px] text-[#75838F] mb-1">
                    <span className="font-semibold">Período:</span> {formacao.DataInicio} - {formacao.DataConclusao}
                  </div>
                  <div className="font-normal text-[14px] leading-[22px] text-[#75838F]">
                    <span className="font-semibold">Status:</span> {formacao.Status}
                  </div>
                </div>
              ))
              : (
               <div className="font-normal text-[14px] leading-[24px] text-[#75838F]">Nenhuma formação cadastrada.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Estado para data selecionada
  const [dataSelecionada, setDataSelecionada] = useState<Date | null>(null);
  const [showCalendar, setShowCalendar] = useState(false);

  // Função para abrir o calendário
  const handleOpenCalendar = () => setShowCalendar(true);
  // Função para fechar o calendário
  const handleCloseCalendar = () => setShowCalendar(false);

  // Função para atualizar a data selecionada
  const handleChangeCalendar = (date: Date) => {
    setDataSelecionada(date);
    setShowCalendar(false);
  };

  // Função para obter data de hoje em Brasília
  const getBrasiliaDate = useCallback(() => {
    const now = new Date();
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const brDate = new Date(utc - (3 * 60 * 60 * 1000));
    brDate.setHours(0, 0, 0, 0);
    return brDate;
  }, []);

  // Inicializa a data e busca todas as agendas quando o psicólogo é carregado (apenas uma vez)
  useEffect(() => {
    if (psicologo?.Id && agendasCarregadasRef.current !== psicologo.Id) {
      const hojeBrasilia = getBrasiliaDate();
      const hojeString = formatDateToYMD(hojeBrasilia);
      const dataAtualString = dataSelecionada ? formatDateToYMD(dataSelecionada) : null;
      
      // Só inicializa se não houver data selecionada ou se a data atual for diferente de hoje
      if (!dataSelecionada || dataAtualString !== hojeString) {
        console.log('[PsicologoPerfilPage] Inicializando data para hoje:', hojeString);
        setDataSelecionada(hojeBrasilia);
      }
      
      // Busca todas as agendas disponíveis do psicólogo (apenas uma vez)
      fetchTodasAgendasDisponiveis();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [psicologo?.Id]); // Removido fetchTodasAgendasDisponiveis das dependências para evitar loop

  // Não precisa mais buscar por data específica, pois já buscamos todas as agendas

  const renderAgenda = () => {
    // Se não houver data selecionada, usar a próxima disponível ou atual
    const dataFormatada = dataSelecionada
      ? dataSelecionada.toLocaleDateString('pt-BR')
      : getProximaDataDisponivel();

    return (
      <div className="w-full mt-6 relative">
        <div
          className="w-full max-w-[384px] h-[88px] rounded-[8px] border border-[#919CA6] p-4 flex items-center justify-between cursor-pointer"
          onClick={handleOpenCalendar}
        >
          <div className="flex flex-col gap-1">
            <span className="font-semibold text-[#49525A] text-[16px]">Data</span>
            <span className="text-[#919CA6] text-[15px]">A partir de: {dataFormatada}</span>
          </div>
          <Image src="/icons/calendar.svg" alt="Calendário" width={32} height={32} className="w-8 h-8" />
        </div>
        {showCalendar && (
          <div
            className="absolute z-50 mt-2 bg-white border border-gray-300 rounded shadow-lg flex flex-col items-center p-4"
            style={{ left: 0 }}
          >
            <Calendar
              onChange={(date) => {
                // Garante que sempre será Date
                if (date instanceof Date) {
                  handleChangeCalendar(date);
                } else if (Array.isArray(date) && date[0] instanceof Date) {
                  handleChangeCalendar(date[0]);
                }
              }}
              value={dataSelecionada ?? new Date()}
              locale="pt-BR"
              minDate={new Date()}
              className="w-full"
            />
            <div className="flex flex-row gap-2 mt-4 w-full justify-between">
              <button
                className="px-4 py-2 bg-[#6D75C0] text-white rounded font-semibold hover:bg-[#49525A]"
                onClick={handleCloseCalendar}
              >
                Fechar
              </button>
              <button
                className="px-4 py-2 bg-[#F1F2F4] text-[#6D75C0] rounded font-semibold hover:bg-[#E3E6E8]"
                onClick={() => { setDataSelecionada(null); setShowCalendar(false); }}
              >
                Limpar
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Tratamento de loading e erro
  if (isLoading) {
    return (
      <div className="w-full max-w-[1350px] mx-auto px-4 sm:px-6 lg:px-20 mb-40 sm:mb-0 mt-8 py-4 bg-[#FCFBF6]">
        <BreadcrumbsVoltar />
        <div className="flex items-center justify-center min-h-[400px]">
          <p className="text-gray-500">Carregando dados do psicólogo...</p>
        </div>
      </div>
    );
  }

  if (isError || !isValidId) {
    return (
      <div className="w-full max-w-[1350px] mx-auto px-4 sm:px-6 lg:px-20 mb-40 sm:mb-0 mt-8 py-4 bg-[#FCFBF6]">
        <BreadcrumbsVoltar />
        <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
          <p className="text-lg font-semibold text-[#23253A] mb-2">Psicólogo indisponível</p>
          <p className="text-gray-500 text-sm mb-6">
            Este perfil não está disponível no momento. Verifique o link ou volte para a lista de psicólogos.
          </p>
          <Link
            href="/psicologos"
            className="px-5 py-2 rounded-md bg-[#6D75C0] text-white font-semibold hover:bg-[#5A62A8] transition"
          >
            Ver psicólogos disponíveis
          </Link>
        </div>
      </div>
    );
  }

  if (!psicologo) {
    return (
      <div className="w-full max-w-[1350px] mx-auto px-4 sm:px-6 lg:px-20 mb-40 sm:mb-0 mt-8 py-4 bg-[#FCFBF6]">
        <BreadcrumbsVoltar />
        <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
          <p className="text-lg font-semibold text-[#23253A] mb-2">Psicólogo não encontrado</p>
          <p className="text-gray-500 text-sm mb-6">
            O perfil solicitado não foi localizado. Volte para a lista e escolha outro profissional.
          </p>
          <Link
            href="/psicologos"
            className="px-5 py-2 rounded-md bg-[#6D75C0] text-white font-semibold hover:bg-[#5A62A8] transition"
          >
            Voltar para a lista
          </Link>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 24 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="w-full max-w-[1350px] mx-auto px-4 sm:px-6 lg:px-20 mb-40 sm:mb-0 mt-8 py-4 bg-[#FCFBF6]"
    >
      <BreadcrumbsVoltar />
      <div className="flex flex-col lg:flex-row gap-6 h-full lg:gap-8 xl:gap-12 2xl:gap-16">
        {/* Sidebar Details - oculto no mobile */}
        <div className="hidden lg:block w-full lg:w-[180px] mb-6 lg:mb-0">{renderSidebarDetails()}</div>
        {/* Profile Details */}
        <div className="w-full lg:w-[588px]">{renderProfileDetails()}</div>
        {/* Componente de data + calendário rotativo na direita */}
        <div className="w-full lg:w-[384px]">
          {renderAgenda()}
          <div className="mt-4">
            <CalendarioRotativo
              dataSelecionada={dataSelecionada}
              horariosPorData={horariosPorData}
              onAgendar={(dataSelecionada: Date, hora: string, agendaId?: string) => {
                // O agendaId agora vem diretamente do CalendarioRotativo (como no listPsicologo)
                if (!agendaId) {
                  console.error('[PsicologoPerfilPage] AgendaId não fornecido pelo CalendarioRotativo');
                  toast.error('Erro ao identificar o horário selecionado. Por favor, tente novamente.');
                  return;
                }
                
                console.log('[PsicologoPerfilPage] AgendaId recebido:', agendaId);
                
                  const agendamento = {
                  psicologoId: psicologo?.Id,
                  agendaId: agendaId,
                  nome: psicologo?.Nome,
                  imagem: getPsicologoImage(),
                  abordagem: psicologo?.ProfessionalProfiles?.[0]?.Abordagens?.[0] || '',
                  data: dataSelecionada.toISOString(),
                  hora,
                };
                if (isUserValid) {
                  setAgendamentoModal({ data: agendamento.data, hora: agendamento.hora, agendaId: agendaId });
                  setIsModalOpen(true);
                } else {
                  iniciarDraftSession(
                    agendamento.psicologoId ?? "",
                    agendamento.agendaId,
                  ).then((draftId: string) => {
                    window.localStorage.setItem("draftId", draftId);
                    const agendamentoComContexto = {
                      ...agendamento,
                      contexto: "primeira_sessao",
                      origem: "marketplace",
                      timestamp: Date.now(),
                    };
                    window.sessionStorage.setItem("agendamento-pendente", JSON.stringify(agendamentoComContexto));
                    window.location.href = `/register?tab=paciente&psicologoId=${agendamento.psicologoId}&contexto=primeira_sessao&origem=marketplace`;
                  });
                }
              }}
            />
          </div>
          {/* Links de política */}
        <div className="flex flex-col mt-4 gap-2">
          <Link
            href={isUserValid ? "/painel/politica-de-cancelamento" : "/politica-de-cancelamento"}
            className="font-medium text-[18px] leading-[24px] align-middle text-[#6D75C0] hover:text-[#49525A] transition-colors underline"
          >
            Política de cancelamento
          </Link>
        </div>
        </div>
        
      </div>
      <ModalReview
        isOpen={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
        reviews={reviews}
      />
      <ModalCadastroAgendamento
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={() => setIsModalOpen(false)}
        psicologo={{
          Nome: psicologo?.Nome || '',
          AvatarUrl: getPsicologoImage(),
          Data: agendamentoModal?.data || '',
          Horario: agendamentoModal?.hora || '',
          Id: psicologo?.Id || '',
        }}
        psicologoAgendaId={agendamentoModal?.agendaId || ''}
      />
      <ModalQueixas 
        isOpen={isQueixasModalOpen}
        onClose={() => setIsQueixasModalOpen(false)}
        queixas={allQueixas}
      />
      <ModalAbordagens 
        isOpen={isAbordagensModalOpen}
        onClose={() => setIsAbordagensModalOpen(false)}
        abordagens={allAbordagens}
      />
    </motion.div>
  );
}
