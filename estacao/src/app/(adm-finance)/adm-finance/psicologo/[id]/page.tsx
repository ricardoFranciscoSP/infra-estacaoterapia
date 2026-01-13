"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { FinanceiroPsicologo, ListaPaginada, PsicologoFinanceiro } from "@/types/admFinanceTypes";
import { Psicologo } from "@/types/psicologoTypes";
import { FormularioSaqueAutonomo } from "@/types/formularioSaqueAutonomoTypes";
import { formularioSaqueAutonomoService } from "@/services/formularioSaqueAutonomoService";
import { admFinanceService } from "@/services/admFinanceService";
import { api } from "@/lib/axios";
import { useQuery } from "@tanstack/react-query";
import ModalAprovarPagamento from "./ModalAprovarPagamento";
import ModalReprovarPagamento from "./ModalReprovarPagamento";
import ModalBaixarPagamento from "./ModalBaixarPagamento";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  User, 
  Building2, 
  CreditCard, 
  MapPin, 
  FileText, 
  FileCheck, 
  Phone,
  Mail,
  Calendar,
  IdCard,
  Banknote,
  Wallet
} from "lucide-react";
import BreadcrumbsVoltar from "@/components/BreadcrumbsVoltar";
import Image from "next/image";
import { maskTelefoneByCountry, getFlagUrl, onlyDigits } from "@/utils/phoneCountries";
import { formatDateBR } from "@/utils/formatarDataHora";

// Type guard para verificar se é um erro do Axios
interface AxiosErrorLike {
  response?: {
    status?: number;
    data?: unknown;
  };
}

const isAxiosError = (error: unknown): error is AxiosErrorLike => {
  return (
    typeof error === 'object' &&
    error !== null &&
    'response' in error &&
    typeof (error as AxiosErrorLike).response === 'object'
  );
};

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
};

const formatDate = (dateString: string | null | undefined): string => {
  if (!dateString) return "-";
  try {
    return formatDateBR(dateString);
  } catch {
    return "-";
  }
};

const formatDateTime = (dateString: string | null | undefined): string => {
  if (!dateString) return "-";
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "-";
    const dateFormatted = formatDateBR(dateString);
    const time = date.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });
    return `${dateFormatted} às ${time}`;
  } catch {
    return "-";
  }
};

const formatCPF = (cpf: string | null | undefined): string => {
  if (!cpf) return "-";
  return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
};

const formatCNPJ = (cnpj: string | null | undefined): string => {
  if (!cnpj) return "-";
  return cnpj.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
};

const formatCEP = (cep: string | null | undefined): string => {
  if (!cep) return "-";
  return cep.replace(/(\d{5})(\d{3})/, "$1-$2");
};

// Detecta o país do telefone (padrão: BR)
const detectPhoneCountry = (phone: string | null | undefined): string => {
  if (!phone) return "BR";
  const digits = onlyDigits(phone);
  
  // Se começa com código de país conhecido
  if (digits.startsWith("55") && digits.length >= 12) return "BR";
  if (digits.startsWith("1") && digits.length >= 10) {
    // Pode ser US, CA, etc.
    return "US";
  }
  
  // Por padrão, assume Brasil
  return "BR";
};

// Formata telefone com bandeira
const formatPhoneWithFlag = (phone: string | null | undefined): { formatted: string; countryCode: string; flagUrl: string } => {
  if (!phone) return { formatted: "-", countryCode: "BR", flagUrl: getFlagUrl("BR") };
  
  const countryCode = detectPhoneCountry(phone);
  const digits = onlyDigits(phone);
  const formatted = maskTelefoneByCountry(countryCode, digits);
  const flagUrl = getFlagUrl(countryCode);
  
  return { formatted, countryCode, flagUrl };
};

// Normaliza pronome
const normalizePronome = (pronome: string | null | undefined): string | null => {
  if (!pronome) return null;
  
  const map: { [key: string]: string } = {
    'eledele': 'Ele/Dele',
    'ele/dele': 'Ele/Dele',
    'eladela': 'Ela/Dela',
    'ela/dela': 'Ela/Dela',
    'elesdeles': 'Eles/Deles',
    'eles/deles': 'Eles/Deles',
    'elasdelas': 'Elas/Delas',
    'elas/delas': 'Elas/Delas',
    'eludelu': 'Elu/Delu',
    'elu/delu': 'Elu/Delu',
    'outro': 'Outro',
    'dr': 'Dr',
    'dra': 'Dra',
    'psic': 'Psic',
    'prof': 'Prof',
    'mestre': 'Mestre',
    'phd': 'Phd',
  };
  
  const key = pronome.trim().toLowerCase().replace(/[\s\/]/g, '');
  return map[key] || pronome;
};

const getStatusBadge = (status: string) => {
  const statusConfig: Record<string, "default" | "secondary" | "destructive" | "success" | "warning" | "outline"> = {
    Ativo: "success",
    Inativo: "secondary",
    Pendente: "warning",
    Bloqueado: "destructive",
    EmAnalise: "default",
    pago: "success",
    aprovado: "success",
    pendente: "warning",
    cancelado: "destructive",
    retido: "secondary",
  };

  const variant = statusConfig[status] || "outline";
  return <Badge variant={variant}>{status}</Badge>;
};

const getTipoPessoa = (psicologo: Psicologo | null | undefined): "Autônomo" | "Pessoa Jurídica" => {
  if (!psicologo?.ProfessionalProfiles?.[0]) return "Autônomo";
  const tipoPessoa = psicologo.ProfessionalProfiles[0].TipoPessoaJuridico;
  if (Array.isArray(tipoPessoa)) {
    const temPJ = tipoPessoa.some(t => 
      t === "Juridico" || t === "PjAutonomo" || t === "Ei" || 
      t === "Mei" || t === "SociedadeLtda" || t === "Eireli" || t === "Slu"
    );
    return temPJ ? "Pessoa Jurídica" : "Autônomo";
  }
  return tipoPessoa === "Autonomo" ? "Autônomo" : "Pessoa Jurídica";
};

const getChavePixTipo = (chavePix: string | null | undefined): string => {
  if (!chavePix) return "-";
  const value = (chavePix || "").trim();
  const digits = value.replace(/\D/g, "");
  
  // Verifica se é Email
  if (value.includes("@")) return "Email";
  
  // Verifica se é CPF (11 dígitos)
  if (digits.length === 11) return "CPF";
  
  // Verifica se é CNPJ (14 dígitos)
  if (digits.length === 14) return "CNPJ";
  
  // Verifica se é Chave Aleatória (UUID format)
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) return "Aleatória";
  
  // Verifica se é Chave Aleatória (32 caracteres hex sem hífens)
  if (/^[0-9a-f]{32}$/i.test(value.replace(/-/g, ""))) return "Aleatória";
  
  // Se não se encaixa em nenhum padrão conhecido, assume como Aleatória
  return "Aleatória";
};

const resolveStorageUrl = (url: string | null | undefined): string | null => {
  if (!url) return null;
  
    // Se já é uma URL completa, retorna como está
    if (/^https?:\/\//i.test(url)) {
      // Verifica se é uma URL do Supabase e tenta corrigir o bucket se necessário
      // Se a URL contém um bucket que pode não existir, tenta extrair o caminho correto
      const supabaseUrlMatch = url.match(/^https?:\/\/([^\/]+)\/storage\/v1\/object\/public\/([^\/]+)\/(.+)$/);
      if (supabaseUrlMatch) {
        // Se o bucket parece incorreto, tenta com o bucket padrão
        // Mas primeiro, retorna a URL original para tentar
        return url;
      }
      return url;
    }

  // Se não é uma URL completa, constrói a partir do caminho
  const base =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_STORAGE_URL ||
    process.env.NEXT_PUBLIC_STORAGE_URL;

  const cleaned = url.replace(/^\/+/, "");
  if (base) {
    const normalizedBase = base.replace(/\/$/, "");
    if (cleaned.startsWith("storage/v1/")) {
      return `${normalizedBase}/${cleaned}`;
    }
    // Tenta extrair o bucket do caminho se estiver no formato bucket/path
    const bucketMatch = cleaned.match(/^([^\/]+)\/(.+)$/);
    if (bucketMatch) {
      const [, bucket, path] = bucketMatch;
      return `${normalizedBase}/storage/v1/object/public/${bucket}/${path}`;
    }
    return `${normalizedBase}/storage/v1/object/public/${cleaned}`;
  }

  return cleaned.startsWith("/") ? cleaned : `/${cleaned}`;
};

// Função para obter URL assinada de um documento quando a URL pública falhar
const getSignedDocumentUrl = async (documentId: string): Promise<string | null> => {
  try {
    const response = await api.get(`/files/psychologist/documents/${documentId}`);
    return response.data?.url || null;
  } catch (error) {
    console.error('[getSignedDocumentUrl] Erro ao buscar URL assinada:', error);
    return null;
  }
};

// Componente Modal para visualizar documentos
const DocumentoModal: React.FC<{
  open: boolean;
  onClose: () => void;
  documento: { url: string; nome: string; tipo?: string; documentId?: string } | null;
  loadingUrl?: boolean;
}> = ({ open, onClose, documento, loadingUrl = false }) => {
  const [urlFinal, setUrlFinal] = React.useState<string | null>(null);
  const [erroCarregamento, setErroCarregamento] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open || !documento) {
      setUrlFinal(null);
      setErroCarregamento(null);
      return;
    }

    // Se já temos uma URL, usa ela
    if (documento.url) {
      setUrlFinal(documento.url);
      
      // Se a URL parece ser do Supabase e temos um documentId, tenta buscar URL assinada
      if (documento.documentId && documento.url.includes('supabase.co')) {
        // Tenta buscar URL assinada em background
        getSignedDocumentUrl(documento.documentId).then(signedUrl => {
          if (signedUrl) {
            setUrlFinal(signedUrl);
          }
        }).catch(() => {
          // Se falhar, mantém a URL original
        });
      }
    }
  }, [open, documento]);

  if (!open || !documento) return null;

  const urlToUse = urlFinal || documento.url || "";
  const urlStr = urlToUse.toLowerCase();
  const nameStr = (documento.nome || "").toLowerCase();
  const endsWithExt = (s: string, ext: string) => new RegExp(`\\.${ext}(\\?|$)`, "i").test(s);
  const isPDF = endsWithExt(urlStr, "pdf") || endsWithExt(nameStr, "pdf");
  const isImage = ["png", "jpg", "jpeg", "gif", "webp", "svg"].some((ext) => endsWithExt(urlStr, ext) || endsWithExt(nameStr, ext));
  const isDoc = ["doc", "docx"].some((ext) => endsWithExt(urlStr, ext) || endsWithExt(nameStr, ext));
  const officeViewerUrl = isDoc && urlToUse ? `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(urlToUse)}` : undefined;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl w-[95vw] max-h-[90vh] flex flex-col p-0 gap-0 [&>button]:bg-white [&>button]:text-gray-700 [&>button]:hover:bg-gray-100">
        <DialogHeader className="p-4 sm:p-6 border-b border-gray-200 bg-[#8494E9] rounded-t-lg">
          <DialogTitle className="text-white text-lg sm:text-xl font-semibold">
            {documento.nome || documento.tipo || "Documento"}
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-auto p-4 sm:p-6 min-h-0">
          {loadingUrl ? (
            <div className="flex flex-col items-center justify-center text-center text-gray-600 gap-3 py-12">
              <div className="w-10 h-10 border-4 border-[#8494E9] border-t-transparent rounded-full animate-spin"></div>
              <p className="text-sm">Carregando documento...</p>
            </div>
          ) : erroCarregamento ? (
            <div className="flex flex-col items-center justify-center text-center text-gray-600 gap-3 py-12">
              <FileText className="w-12 h-12 text-gray-400" />
              <p className="text-sm font-semibold">Erro ao carregar documento</p>
              <p className="text-xs text-gray-500">{erroCarregamento}</p>
              {documento.documentId && (
                <button
                  onClick={async () => {
                    setErroCarregamento(null);
                    try {
                      const signedUrl = await getSignedDocumentUrl(documento.documentId!);
                      if (signedUrl) {
                        setUrlFinal(signedUrl);
                        setErroCarregamento(null);
                      } else {
                        setErroCarregamento("Não foi possível obter o documento. Verifique se o arquivo existe.");
                      }
                    } catch {
                      setErroCarregamento("Erro ao buscar documento. Tente novamente.");
                    }
                  }}
                  className="mt-2 px-4 py-2 bg-[#8494E9] text-white rounded-lg hover:bg-[#6D75C0] transition-colors text-sm"
                >
                  Tentar novamente
                </button>
              )}
            </div>
          ) : isPDF && urlFinal ? (
            <iframe
              src={urlFinal}
              title="Documento PDF"
              className="w-full h-full min-h-[50vh] sm:min-h-[60vh] border rounded-lg"
              style={{ border: '1px solid #e5e7eb' }}
              onError={() => {
                setErroCarregamento("Erro ao carregar PDF. O arquivo pode não estar disponível.");
              }}
            />
          ) : isImage && urlFinal ? (
            <div className="flex items-center justify-center w-full">
              <Image
                src={urlFinal}
                alt={documento.nome || "Documento"}
                width={800}
                height={600}
                className="max-h-[50vh] sm:max-h-[60vh] w-auto mx-auto rounded-lg object-contain"
                unoptimized
                onError={() => {
                  setErroCarregamento("Erro ao carregar imagem. O arquivo pode não estar disponível.");
                }}
              />
            </div>
          ) : isDoc && urlFinal && officeViewerUrl ? (
            <div className="flex flex-col gap-3">
              <iframe
                src={officeViewerUrl}
                title="Documento do Word"
                className="w-full h-full min-h-[50vh] sm:min-h-[60vh] border rounded-lg"
                style={{ border: '1px solid #e5e7eb' }}
              />
              <p className="text-xs text-gray-500">
                Pré-visualização fornecida pelo Microsoft Office Viewer. Caso não carregue, utilize o botão Baixar abaixo.
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-center text-gray-600 gap-3 py-12">
              <FileText className="w-12 h-12 text-gray-400" />
              <p className="text-sm">Tipo de arquivo não suportado para visualização no navegador.</p>
              <p className="text-xs text-gray-500">Clique em Baixar para abrir no aplicativo apropriado.</p>
            </div>
          )}
        </div>

        <div className="p-4 sm:p-6 border-t border-gray-200 flex flex-col sm:flex-row justify-between items-center gap-3 bg-gray-50">
          <span className="text-xs sm:text-sm text-gray-600">
            Clique em &ldquo;Baixar&rdquo; para salvar o documento
          </span>
          <a
            href={urlFinal || documento.url}
            download
            target="_blank"
            rel="noopener noreferrer"
            className="bg-[#8494E9] hover:bg-[#6D75C0] text-white font-semibold px-4 sm:px-6 py-2 sm:py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm sm:text-base"
          >
            <FileCheck className="w-4 h-4 sm:w-5 sm:h-5" />
            Baixar documento
          </a>
        </div>
      </DialogContent>
    </Dialog>
  );
};

interface InfoFieldProps {
  label: string;
  value: string | null | undefined;
  icon?: React.ReactNode;
  phoneFlag?: { formatted: string; flagUrl: string };
}

const InfoField: React.FC<InfoFieldProps> = ({ label, value, icon, phoneFlag }) => (
  <div className="space-y-1.5 sm:space-y-1">
    <div className="flex items-center gap-2 text-xs sm:text-sm font-medium text-gray-600">
      {icon && <span className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0">{icon}</span>}
      <span className="break-words">{label}</span>
    </div>
    {phoneFlag && phoneFlag.formatted !== "-" ? (
      <div className="flex items-center gap-2">
        <Image
          src={phoneFlag.flagUrl}
          alt=""
          width={16}
          height={12}
          unoptimized
          className="w-4 h-3 object-contain flex-shrink-0"
        />
        <p className="text-sm sm:text-base text-gray-900 break-words">{phoneFlag.formatted}</p>
      </div>
    ) : (
      <p className="text-sm sm:text-base text-gray-900 break-words">{value || "-"}</p>
    )}
  </div>
);

export default function PsicologoDetalhesPage() {
  const params = useParams();
  const router = useRouter();
  const psicologoId = (params?.id as string) || "";
  const admService = useMemo(() => admFinanceService(), []);

  const [pagamentoSelecionado, setPagamentoSelecionado] = useState<FinanceiroPsicologo | null>(null);
  const [modalAprovar, setModalAprovar] = useState(false);
  const [modalReprovar, setModalReprovar] = useState(false);
  const [modalBaixar, setModalBaixar] = useState(false);
  const [formulario, setFormulario] = useState<FormularioSaqueAutonomo | null>(null);
  const [loadingFormulario, setLoadingFormulario] = useState(false);
  const [formularioErro, setFormularioErro] = useState<string | null>(null);
  const [documentoModalOpen, setDocumentoModalOpen] = useState(false);
  const [documentoSelecionado, setDocumentoSelecionado] = useState<{ url: string; nome: string; tipo?: string; documentId?: string } | null>(null);
  const [loadingDocumentoUrl, setLoadingDocumentoUrl] = useState(false);

  // Como estamos em /adm-finance, sempre usa a rota do financeiro
  // Query para buscar psicólogo via rota dedicada do financeiro
  const psicologoQuery = useQuery<Psicologo | null>({
    queryKey: ['psicologo-finance', psicologoId],
    queryFn: async () => {
      if (!psicologoId) return null;
      console.log('[PsicologoDetalhesPage] Buscando psicólogo via rota financeiro:', psicologoId);
      try {
        const response = await admFinanceService().obterDetalhesPsicologo(psicologoId);
        console.log('[PsicologoDetalhesPage] Resposta completa:', response);
        console.log('[PsicologoDetalhesPage] Response.data:', response.data);
        console.log('[PsicologoDetalhesPage] Response.status:', response.status);
        
        if (response.data?.success && response.data?.data) {
          const psicologoData = response.data.data;
          console.log('[PsicologoDetalhesPage] Psicólogo encontrado:', psicologoData);
          
          // Normaliza campos que podem vir em formatos diferentes
          const data = psicologoData as { Crp?: string; CRP?: string; id?: string; Id?: string; nome?: string; Nome?: string };
          const psicologoNormalizado: Psicologo = {
            ...psicologoData,
            // Garante que Crp esteja disponível (o tipo Psicologo usa Crp, não CRP)
            Crp: data.Crp || data.CRP || '',
            // Garante que id e Id estejam disponíveis
            id: data.id || data.Id || '',
            Id: data.Id || data.id || '',
            // Garante que nome e Nome estejam disponíveis
            nome: data.nome || data.Nome || '',
            Nome: data.Nome || data.nome || '',
          } as Psicologo;
          
          return psicologoNormalizado;
        }
        
        console.warn('[PsicologoDetalhesPage] Resposta sem sucesso ou sem dados:', response.data);
        return null;
      } catch (error) {
        console.error('[PsicologoDetalhesPage] Erro ao buscar psicólogo:', error);
        if (isAxiosError(error)) {
          console.error('[PsicologoDetalhesPage] Erro da API:', {
            status: error.response?.status,
            data: error.response?.data,
          });
        }
        throw error;
      }
    },
    enabled: !!psicologoId,
    retry: 1,
    staleTime: 5 * 60 * 1000,
  });

  const psicologo = psicologoQuery.data;
  const isLoadingPsicologo = psicologoQuery.isLoading;

  const pagamentosQuery = useQuery<ListaPaginada<FinanceiroPsicologo> | null>({
    queryKey: ['pagamentos-psicologo', psicologoId],
    queryFn: async () => {
      if (!psicologoId) return null;
      const response = await admService.listarPagamentosPsicologos({ psicologoId, pageSize: 1000 });
      if (response.data?.success && response.data?.data) {
        return response.data.data;
      }
      throw new Error('Não foi possível carregar os pagamentos do psicólogo');
    },
    enabled: !!psicologoId,
    staleTime: 2 * 60 * 1000,
  });

  const psicologoFinanceiroQuery = useQuery<PsicologoFinanceiro | null>({
    queryKey: ['psicologo-financeiro-resumo', psicologoId],
    queryFn: async () => {
      if (!psicologoId) return null;
      const response = await admService.listarPsicologosComFinanceiro({ pageSize: 500 });
      if (response.data?.success && response.data?.data) {
        return response.data.data.items.find((p) => p.Id === psicologoId) || null;
      }
      throw new Error('Não foi possível carregar o resumo financeiro do psicólogo');
    },
    enabled: !!psicologoId,
    staleTime: 2 * 60 * 1000,
  });

  useEffect(() => {
    const fetchFormulario = async () => {
      if (!psicologo) return;
      const tipo = getTipoPessoa(psicologo);
      const isAutonomoLocal = tipo === "Autônomo";
      if (!isAutonomoLocal) {
        setFormulario(null);
        setFormularioErro('Formulário disponível apenas para autônomos.');
        return;
      }

      const alvoFormularioId = psicologo?.Id || psicologo?.id || psicologo?.ProfessionalProfiles?.[0]?.Id;
      if (!alvoFormularioId) {
        setFormularioErro('Identificador do psicólogo não encontrado para consultar o formulário.');
        return;
      }

      setLoadingFormulario(true);
      setFormularioErro(null);
      try {
        const response = await formularioSaqueAutonomoService.getFormularioByPsicologoId(alvoFormularioId);
        if (response.data.success && response.data.formulario) {
          setFormulario(response.data.formulario);
        }
      } catch (error) {
        console.error("Erro ao buscar formulário:", error);
        if (isAxiosError(error)) {
          if (error.response?.status === 403) {
            setFormularioErro('Perfil financeiro sem permissão para visualizar o formulário deste psicólogo.');
          } else if (error.response?.status === 404) {
            setFormularioErro('Formulário de saque não cadastrado.');
          } else {
            setFormularioErro('Não foi possível carregar o formulário.');
          }
        } else {
          setFormularioErro('Não foi possível carregar o formulário.');
        }
      } finally {
        setLoadingFormulario(false);
      }
    };

    if (psicologo) {
      fetchFormulario();
    }
  }, [psicologo]);

  const psicologoFinanceiro = psicologoFinanceiroQuery.data;
  const pagamentosFiltrados = pagamentosQuery.data?.items?.filter((p) => p.UserId === psicologoId) || [];
  const isLoadingPagamentos = pagamentosQuery.isLoading;
  const isLoadingPage = isLoadingPsicologo || isLoadingPagamentos || psicologoFinanceiroQuery.isLoading;
  const hasError = psicologoQuery.isError || pagamentosQuery.isError || psicologoFinanceiroQuery.isError;

  const handleAprovar = (pagamento: FinanceiroPsicologo) => {
    setPagamentoSelecionado(pagamento);
    setModalAprovar(true);
  };

  const handleReprovar = (pagamento: FinanceiroPsicologo) => {
    setPagamentoSelecionado(pagamento);
    setModalReprovar(true);
  };

  const handleBaixar = (pagamento: FinanceiroPsicologo) => {
    setPagamentoSelecionado(pagamento);
    setModalBaixar(true);
  };

  const handleSuccess = () => {
    pagamentosQuery.refetch();
    psicologoFinanceiroQuery.refetch();
    psicologoQuery.refetch();
    setModalAprovar(false);
    setModalReprovar(false);
    setModalBaixar(false);
    setPagamentoSelecionado(null);
  };

  // Debug logs
  useEffect(() => {
    console.log('[PsicologoDetalhesPage] Estado atual:', {
      psicologoId,
      isLoadingPsicologo,
      psicologo: psicologo ? 'existe' : 'null',
      queryState: {
        data: psicologoQuery.data ? 'existe' : 'null',
        isLoading: psicologoQuery.isLoading,
        isError: psicologoQuery.isError,
        isFetching: psicologoQuery.isFetching,
      },
    });
  }, [psicologoId, isLoadingPsicologo, psicologo, psicologoQuery]);

  if (isLoadingPage) {
    return (
      <main className="p-3 sm:p-4 md:p-6 lg:p-8 bg-[#FCFBF6] min-h-screen w-full overflow-x-hidden">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="inline-block w-10 h-10 border-4 border-[#8494E9] border-t-transparent rounded-full animate-spin"></div>
        </div>
      </main>
    );
  }

  if (hasError) {
    return (
      <main className="p-3 sm:p-4 md:p-6 lg:p-8 bg-[#FCFBF6] min-h-screen w-full overflow-x-hidden">
        <Card className="p-12 text-center">
          <p className="text-gray-500 mb-4">Não foi possível carregar as informações do psicólogo.</p>
          <button
            onClick={() => {
              psicologoQuery.refetch();
              pagamentosQuery.refetch();
              psicologoFinanceiroQuery.refetch();
            }}
            className="px-4 py-2 bg-[#8494E9] text-white rounded-lg hover:bg-[#6D75C0] transition-colors"
          >
            Tentar novamente
          </button>
        </Card>
      </main>
    );
  }

  if (!psicologo && !isLoadingPsicologo) {
    return (
      <main className="p-3 sm:p-4 md:p-6 lg:p-8 bg-[#FCFBF6] min-h-screen w-full overflow-x-hidden">
        <Card className="p-12 text-center">
          <p className="text-gray-500 mb-4">Psicólogo não encontrado</p>
          {psicologoQuery.isError && (
            <div className="mb-4 p-4 bg-red-50 rounded-lg">
              <p className="text-red-600 text-sm font-semibold mb-1">Erro ao buscar psicólogo:</p>
              <p className="text-red-500 text-xs">
                {(() => {
                  try {
                    const queryError = (psicologoQuery as { error?: unknown }).error;
                    if (queryError && typeof queryError === 'object' && 'message' in queryError) {
                      return String(queryError.message);
                    }
                    if (queryError instanceof Error) {
                      return queryError.message;
                    }
                    return 'Erro desconhecido';
                  } catch {
                    return 'Erro desconhecido';
                  }
                })()}
              </p>
            </div>
          )}
          <BreadcrumbsVoltar 
            onClick={() => router.back()}
            className="px-4 py-2 bg-[#8494E9] text-white rounded-lg hover:bg-[#6D75C0] transition-colors mb-0"
          />
        </Card>
      </main>
    );
  }

  // Type guard: garante que psicologo não é null após os early returns
  if (!psicologo) {
    return null;
  }

  const tipoPessoa = getTipoPessoa(psicologo);
  const isPessoaJuridica = tipoPessoa === "Pessoa Jurídica";
  const isAutonomo = tipoPessoa === "Autônomo";
  const address = Array.isArray(psicologo.Address) ? psicologo.Address[0] : psicologo.Address;
  const companyAddress = psicologo.PessoalJuridica?.EnderecoEmpresa;
  const dadosBancarios = isPessoaJuridica
    ? psicologo.PessoalJuridica?.DadosBancarios
    : psicologo.ProfessionalProfiles?.[0]?.DadosBancarios;
  const documentos = psicologo.ProfessionalProfiles?.flatMap(profile => profile.Documents || []) || [];
  

  return (
    <main className="p-3 sm:p-4 md:p-6 lg:p-8 bg-[#FCFBF6] min-h-screen w-full overflow-x-hidden">
      {/* Header */}
      <div className="mb-4 sm:mb-6">
        <BreadcrumbsVoltar />
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-[#23253a] mb-2 break-words">
              {psicologo.Nome}
            </h1>
            <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2 sm:gap-3 text-xs sm:text-sm md:text-base text-[#6C757D]">
              <span className="flex items-center gap-1.5 break-all">
                <Mail className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                <span className="break-all">{psicologo.Email}</span>
              </span>
              {psicologo.Crp && (
                <>
                  <span className="hidden sm:inline">•</span>
                  <span className="break-words">{psicologo.Crp}</span>
                </>
              )}
            </div>
          </div>
          <div className="flex-shrink-0">
            <Badge variant={isAutonomo ? 'default' : 'secondary'} className="text-xs sm:text-sm">
              {tipoPessoa}
            </Badge>
          </div>
        </div>
      </div>

      {/* Resumo Financeiro */}
      {psicologoFinanceiro && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 md:gap-4 mb-4 sm:mb-6">
          <Card>
            <CardContent className="p-3 sm:p-4">
              <p className="text-[10px] sm:text-xs text-gray-600 mb-1 leading-tight">Saldo Disponível</p>
              <p className="text-base sm:text-lg md:text-xl font-bold text-[#4CAF50] break-words">
                {formatCurrency(psicologoFinanceiro.SaldoDisponivel)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 sm:p-4">
              <p className="text-[10px] sm:text-xs text-gray-600 mb-1 leading-tight">Total Pago</p>
              <p className="text-base sm:text-lg md:text-xl font-bold text-gray-900 break-words">
                {formatCurrency(psicologoFinanceiro.TotalPago)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 sm:p-4">
              <p className="text-[10px] sm:text-xs text-gray-600 mb-1 leading-tight">Total Pendente</p>
              <p className="text-base sm:text-lg md:text-xl font-bold text-[#FFC107] break-words">
                {formatCurrency(psicologoFinanceiro.TotalPendente)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 sm:p-4">
              <p className="text-[10px] sm:text-xs text-gray-600 mb-1 leading-tight">Total Reprovado</p>
              <p className="text-base sm:text-lg md:text-xl font-bold text-[#E57373] break-words">
                {formatCurrency(psicologoFinanceiro.TotalReprovado)}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="space-y-4 sm:space-y-6">
        <Card className="shadow-[0_4px_16px_rgba(0,0,0,0.04)]">
          <CardHeader className="bg-[#8494E9] pb-3 sm:pb-6 rounded-t-lg">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg text-white">
              <User className="w-4 h-4 sm:w-5 sm:h-5" />
              Dados Pessoais
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 sm:pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              <InfoField label="Nome Completo" value={psicologo.Nome} icon={<User className="w-4 h-4" />} />
              <InfoField label="Email" value={psicologo.Email} icon={<Mail className="w-4 h-4" />} />
              <InfoField 
                label="Telefone" 
                value={psicologo.Telefone ? formatPhoneWithFlag(psicologo.Telefone).formatted : undefined}
                phoneFlag={psicologo.Telefone ? formatPhoneWithFlag(psicologo.Telefone) : undefined}
                icon={<Phone className="w-4 h-4" />} 
              />
              {!isPessoaJuridica && (
                <>
                  <InfoField label="CPF" value={formatCPF(psicologo.Cpf)} icon={<IdCard className="w-4 h-4" />} />
                  <InfoField label="RG" value={psicologo.Rg || undefined} icon={<IdCard className="w-4 h-4" />} />
                </>
              )}
              <InfoField label="CRP" value={psicologo.Crp || undefined} icon={<IdCard className="w-4 h-4" />} />
              <InfoField label="Data de Nascimento" value={formatDate(psicologo.DataNascimento)} icon={<Calendar className="w-4 h-4" />} />
              <InfoField label="Status" value={psicologo.Status} />
              <InfoField label="Tipo de Pessoa" value={tipoPessoa} />
              {psicologo.Sexo && <InfoField label="Sexo" value={psicologo.Sexo} />}
              {psicologo.Pronome && <InfoField label="Pronome" value={normalizePronome(psicologo.Pronome) || undefined} />}
              {psicologo.RacaCor && <InfoField label="Raça/Cor" value={psicologo.RacaCor} />}
              {psicologo.WhatsApp && (
                <InfoField 
                  label="WhatsApp" 
                  value={formatPhoneWithFlag(psicologo.WhatsApp).formatted}
                  phoneFlag={formatPhoneWithFlag(psicologo.WhatsApp)}
                  icon={<Phone className="w-4 h-4" />} 
                />
              )}
              <InfoField label="Data de Cadastro" value={formatDateTime(psicologo.CreatedAt)} icon={<Calendar className="w-4 h-4" />} />
              {psicologo.DataAprovacao && (
                <InfoField label="Data de Aprovação" value={formatDate(psicologo.DataAprovacao)} icon={<Calendar className="w-4 h-4" />} />
              )}
              <InfoField label="Último Acesso" value={formatDateTime(psicologo.UpdatedAt)} icon={<Calendar className="w-4 h-4" />} />
            </div>
          </CardContent>
        </Card>

        {isPessoaJuridica && psicologo.PessoalJuridica && (
          <Card className="shadow-[0_4px_16px_rgba(0,0,0,0.04)]">
            <CardHeader className="bg-[#8494E9] pb-3 sm:pb-6 rounded-t-lg">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg text-white">
                <Building2 className="w-4 h-4 sm:w-5 sm:h-5" />
                Dados da Empresa
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 sm:pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                <InfoField label="Razão Social" value={psicologo.PessoalJuridica.RazaoSocial} />
                <InfoField label="Nome Fantasia" value={psicologo.PessoalJuridica.NomeFantasia || undefined} />
                <InfoField label="CNPJ" value={formatCNPJ(psicologo.PessoalJuridica.CNPJ)} />
                <InfoField label="Inscrição Estadual" value={psicologo.PessoalJuridica.InscricaoEstadual || undefined} />
                <InfoField 
                  label="Simples Nacional" 
                  value={psicologo.PessoalJuridica.SimplesNacional ? "Sim" : "Não"} 
                />
                {psicologo.PessoalJuridica.DescricaoExtenso && (
                  <div className="md:col-span-2">
                    <InfoField label="Descrição" value={psicologo.PessoalJuridica.DescricaoExtenso} />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="shadow-[0_4px_16px_rgba(0,0,0,0.04)]">
          <CardHeader className="bg-[#8494E9] pb-3 sm:pb-6 rounded-t-lg">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg text-white">
              <CreditCard className="w-4 h-4 sm:w-5 sm:h-5" />
              Dados Financeiros
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 sm:pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              {dadosBancarios?.ChavePix ? (
                <>
                  <InfoField 
                    label="Tipo de Chave Pix" 
                    value={getChavePixTipo(dadosBancarios.ChavePix)} 
                    icon={<Banknote className="w-4 h-4" />}
                  />
                  <InfoField 
                    label="Chave Pix" 
                    value={dadosBancarios.ChavePix} 
                    icon={<Wallet className="w-4 h-4" />}
                  />
                </>
              ) : (
                <div className="md:col-span-2">
                  <p className="text-sm text-gray-500">Nenhum dado bancário cadastrado</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-[0_4px_16px_rgba(0,0,0,0.04)]">
          <CardHeader className="bg-[#8494E9] pb-3 sm:pb-6 rounded-t-lg">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg text-white">
              <MapPin className="w-4 h-4 sm:w-5 sm:h-5" />
              Endereço Residencial
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 sm:pt-6">
            {address ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                <InfoField label="CEP" value={formatCEP(address.Cep)} />
                <InfoField label="Rua" value={address.Rua} />
                <InfoField label="Número" value={address.Numero || undefined} />
                <InfoField label="Complemento" value={address.Complemento || undefined} />
                <InfoField label="Bairro" value={address.Bairro} />
                <InfoField label="Cidade" value={address.Cidade} />
                <InfoField label="Estado" value={address.Estado} />
              </div>
            ) : (
              <p className="text-sm text-gray-500">Endereço não cadastrado</p>
            )}
          </CardContent>
        </Card>

        {isPessoaJuridica && (
          <Card className="shadow-[0_4px_16px_rgba(0,0,0,0.04)]">
            <CardHeader className="bg-[#8494E9] pb-3 sm:pb-6 rounded-t-lg">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg text-white">
                <MapPin className="w-4 h-4 sm:w-5 sm:h-5" />
                Endereço da Empresa
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 sm:pt-6">
              {companyAddress ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                  <InfoField label="CEP" value={formatCEP(companyAddress.Cep)} />
                  <InfoField label="Rua" value={companyAddress.Rua} />
                  <InfoField label="Número" value={companyAddress.Numero || undefined} />
                  <InfoField label="Complemento" value={companyAddress.Complemento || undefined} />
                  <InfoField label="Bairro" value={companyAddress.Bairro} />
                  <InfoField label="Cidade" value={companyAddress.Cidade} />
                  <InfoField label="Estado" value={companyAddress.Estado} />
                </div>
              ) : (
                <p className="text-sm text-gray-500">Endereço da empresa não cadastrado</p>
              )}
            </CardContent>
          </Card>
        )}

        {isPessoaJuridica && documentos.length > 0 && (
          <Card className="shadow-[0_4px_16px_rgba(0,0,0,0.04)]">
            <CardHeader className="bg-[#8494E9] pb-3 sm:pb-6 rounded-t-lg">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg text-white">
                <FileText className="w-4 h-4 sm:w-5 sm:h-5" />
                Documentos Fiscais
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 sm:pt-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
                {documentos.map((doc) => {
                  const documentoUrl = resolveStorageUrl(doc.Url);
                  return (
                    <Card key={doc.Id} className="border border-[#E5E7EB]">
                      <CardContent className="p-3 sm:p-4">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
                          <div className="flex-1 space-y-2 min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-500 flex-shrink-0" />
                              <h4 className="font-semibold text-sm sm:text-base break-words">{doc.Type || "Documento"}</h4>
                              <Badge variant={documentoUrl ? "success" : "warning"} className="text-xs">
                                {documentoUrl ? "Enviado" : "Pendente"}
                              </Badge>
                            </div>
                            {doc.Description && (
                              <p className="text-xs sm:text-sm text-gray-600 break-words">{doc.Description}</p>
                            )}
                            <div className="flex flex-col sm:flex-row sm:flex-wrap gap-1 sm:gap-2 text-[10px] sm:text-xs text-gray-500">
                              <span>Enviado em: {formatDateTime(doc.CreatedAt)}</span>
                              {doc.UpdatedAt !== doc.CreatedAt && (
                                <>
                                  <span className="hidden sm:inline">•</span>
                                  <span>Atualizado em: {formatDateTime(doc.UpdatedAt)}</span>
                                </>
                              )}
                            </div>
                          </div>
                          {documentoUrl ? (
                            <button
                              onClick={() => {
                                setDocumentoSelecionado({
                                  url: documentoUrl || '',
                                  nome: doc.Type || "Documento",
                                  tipo: doc.Type || undefined,
                                  documentId: doc.Id
                                });
                                setLoadingDocumentoUrl(false);
                                setDocumentoModalOpen(true);
                              }}
                              className="px-3 py-2 sm:py-1.5 text-xs sm:text-sm bg-[#8494E9] text-white rounded-lg hover:bg-[#6D75C0] transition-colors flex items-center justify-center gap-2 flex-shrink-0 min-h-[40px] sm:min-h-0"
                            >
                              <FileCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                              <span>Visualizar</span>
                            </button>
                          ) : (
                            <Badge variant="secondary" className="text-xs flex-shrink-0">Link indisponível</Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {isAutonomo ? (
          <Card className="shadow-[0_4px_16px_rgba(0,0,0,0.04)]">
            <CardHeader className="bg-[#8494E9] pb-3 sm:pb-6 rounded-t-lg">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg text-white">
                <FileCheck className="w-4 h-4 sm:w-5 sm:h-5" />
                Formulário de Saque Autônomo
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 sm:pt-6">
              {loadingFormulario ? (
                <div className="flex items-center justify-center py-8">
                  <div className="inline-block w-8 h-8 border-4 border-[#8494E9] border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : formulario ? (
                <div className="space-y-4 sm:space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                      <Badge variant={formulario.Status ? "success" : "warning"} className="text-xs sm:text-sm">
                        {formulario.Status ? "Completo" : "Incompleto"}
                      </Badge>
                      <p className="text-xs sm:text-sm text-gray-500 mt-1.5 sm:mt-1">
                        Enviado em: {formatDateTime(formulario.CreatedAt)}
                      </p>
                    </div>
                  </div>
                  <Separator />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                    <InfoField label="Número RG" value={formulario.NumeroRg || undefined} />
                    <InfoField label="Data de Emissão RG" value={formatDate(formulario.DataEmissaoRg)} />
                    <InfoField label="Órgão Emissor" value={formulario.OrgaoEmissor || undefined} />
                    <InfoField label="UF Órgão Emissor" value={formulario.UfOrgaoEmissor || undefined} />
                    <InfoField label="Data de Nascimento" value={formatDate(formulario.DataNascimento)} />
                    <InfoField label="Nacionalidade" value={formulario.Nacionalidade || undefined} />
                    <InfoField label="Cidade de Nascimento" value={formulario.CidadeNascimentoPessoa || undefined} />
                    <InfoField label="Estado de Nascimento" value={formulario.EstadoNascimentoPessoa || undefined} />
                    <InfoField label="Sexo" value={formulario.Sexo || undefined} />
                    <InfoField label="Raça" value={formulario.Raca || undefined} />
                    <InfoField label="Estado Civil" value={formulario.EstadoCivil || undefined} />
                    <InfoField label="Nome do Cônjuge" value={formulario.NomeConjuge || undefined} />
                    <InfoField label="Regime de Bens" value={formulario.RegimeBens || undefined} />
                    <InfoField label="Possui Dependente" value={formulario.PossuiDependente || undefined} />
                    <InfoField label="Tipo de Dependente" value={formulario.TipoDependente || undefined} />
                    <InfoField label="Nome do Dependente" value={formulario.NomeDependente || undefined} />
                    <InfoField label="CPF do Dependente" value={formatCPF(formulario.CpfDependente || undefined)} />
                    <InfoField label="Data de Nascimento do Dependente" value={formatDate(formulario.DataNascimentoDependente)} />
                    <InfoField label="Cidade de Nascimento" value={formulario.CidadeNascimento || undefined} />
                    <InfoField label="Estado de Nascimento" value={formulario.EstadoNascimento || undefined} />
                    <InfoField label="Possui Deficiência" value={formulario.PossuiDeficiencia || undefined} />
                    <InfoField label="Chave Pix" value={formulario.ChavePix || undefined} icon={<Wallet className="w-4 h-4" />} />
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-500">{formularioErro || 'Formulário de saque não cadastrado'}</p>
              )}
            </CardContent>
          </Card>
        ) : null}

        {isPessoaJuridica && (
          <Card className="shadow-[0_4px_16px_rgba(0,0,0,0.04)]">
            <CardHeader className="bg-[#8494E9] pb-3 sm:pb-6 rounded-t-lg">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg text-white">
                <FileText className="w-4 h-4 sm:w-5 sm:h-5" />
                Notas Fiscais Enviadas
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 sm:pt-6">
              {(() => {
                const notasFiscais = pagamentosFiltrados
                  .filter(p => !!p.UrlDocumentoStorage)
                  .sort((a, b) => {
                    // Ordena por data (mais recente primeiro)
                    const dataA = new Date(a.UpdatedAt || a.CreatedAt).getTime();
                    const dataB = new Date(b.UpdatedAt || b.CreatedAt).getTime();
                    return dataB - dataA;
                  });

                return notasFiscais.length > 0 ? (
                  <div className="grid grid-cols-1 gap-3 sm:gap-4">
                    {notasFiscais.map((p) => {
                      const nfUrl = resolveStorageUrl(p.UrlDocumentoStorage);
                      const enviadoEm = p.UpdatedAt || p.CreatedAt;
                      return (
                        <Card key={p.Id} className="border border-[#E5E7EB]">
                          <CardContent className="p-3 sm:p-4">
                            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
                              <div className="flex-1 space-y-2 min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-500 flex-shrink-0" />
                                  <h4 className="font-semibold text-sm sm:text-base">Nota Fiscal</h4>
                                  <Badge variant={nfUrl ? 'success' : 'warning'} className="text-xs">
                                    {nfUrl ? 'Enviada' : 'Pendente'}
                                  </Badge>
                                </div>
                                <div className="flex flex-col sm:flex-row sm:flex-wrap gap-1 sm:gap-2 text-[10px] sm:text-xs text-gray-500">
                                  <span>Período: {p.Periodo || '-'}</span>
                                  <span className="hidden sm:inline">•</span>
                                  <span>Enviado em: {formatDateTime(enviadoEm)}</span>
                                </div>
                              </div>
                              {nfUrl ? (
                                <button
                                  onClick={() => {
                                    setDocumentoSelecionado({
                                      url: nfUrl,
                                      nome: `Nota Fiscal - ${p.Periodo || "N/A"}`,
                                      tipo: "Nota Fiscal"
                                    });
                                    setDocumentoModalOpen(true);
                                  }}
                                  className="px-3 py-2 sm:py-1.5 text-xs sm:text-sm bg-[#8494E9] text-white rounded-lg hover:bg-[#6D75C0] transition-colors flex items-center justify-center gap-2 flex-shrink-0 min-h-[40px] sm:min-h-0"
                                >
                                  <FileCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                  <span>Visualizar</span>
                                </button>
                              ) : (
                                <Badge variant="secondary" className="text-xs flex-shrink-0">Link indisponível</Badge>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs sm:text-sm text-gray-500">Nenhuma nota fiscal enviada</p>
                );
              })()}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Tabela de Pagamentos */}
      <Card className="mt-4 sm:mt-6 shadow-[0_4px_16px_rgba(0,0,0,0.04)]">
        <CardHeader className="bg-[#8494E9] pb-3 rounded-t-lg">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <CardTitle className="text-base sm:text-lg text-white">Histórico de Pagamentos</CardTitle>
              <p className="text-xs sm:text-sm text-white/90">Acompanhe repasses, vencimentos e comprovantes enviados.</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-4 sm:pt-6">
          {isLoadingPagamentos ? (
            <div className="p-12 text-center">
              <div className="inline-block w-10 h-10 border-4 border-[#8494E9] border-t-transparent rounded-full animate-spin"></div>
              <p className="mt-4 text-gray-500">Carregando...</p>
            </div>
          ) : pagamentosFiltrados.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-gray-500">Nenhum pagamento encontrado</p>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-[#F8F9FA]">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-[#8494E9] uppercase">Período</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-[#8494E9] uppercase">Valor</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-[#8494E9] uppercase">Vencimento</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-[#8494E9] uppercase">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-[#8494E9] uppercase">Documento Fiscal</th>
                      <th className="px-6 py-3 text-center text-xs font-semibold text-[#8494E9] uppercase">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E9FA]">
                    {pagamentosFiltrados.map((pagamento, index) => {
                      const documentoFiscalUrl = resolveStorageUrl(pagamento.UrlDocumentoStorage);
                      return (
                        <motion.tr
                          key={pagamento.Id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: index * 0.05 }}
                          className="hover:bg-[#F8F9FA] transition-colors"
                        >
                          <td className="px-6 py-4 text-sm">{pagamento.Periodo || "N/A"}</td>
                          <td className="px-6 py-4 text-sm font-semibold">{formatCurrency(pagamento.Valor)}</td>
                          <td className="px-6 py-4 text-sm">{formatDate(pagamento.DataVencimento)}</td>
                          <td className="px-6 py-4">{getStatusBadge(pagamento.Status)}</td>
                          <td className="px-6 py-4 text-sm">
                            {documentoFiscalUrl ? (
                              <button
                                onClick={() => {
                                  setDocumentoSelecionado({
                                    url: documentoFiscalUrl,
                                    nome: `Nota Fiscal - ${pagamento.Periodo || "N/A"}`,
                                    tipo: "Nota Fiscal"
                                  });
                                  setDocumentoModalOpen(true);
                                }}
                                className="text-[#8494E9] hover:text-[#6D75C0] underline cursor-pointer"
                              >
                                Visualizar
                              </button>
                            ) : (
                              <span className="text-gray-500">-</span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-center gap-2">
                              {pagamento.Status === "pendente" || pagamento.Status === "processando" ? (
                                <>
                                  <button
                                    onClick={() => handleAprovar(pagamento)}
                                    className="p-2 text-[#4CAF50] hover:bg-[#4CAF50]/10 rounded-lg transition-all"
                                    title="Aprovar"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                    </svg>
                                  </button>
                                  <button
                                    onClick={() => handleReprovar(pagamento)}
                                    className="p-2 text-[#E57373] hover:bg-[#E57373]/10 rounded-lg transition-all"
                                    title="Reprovar"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                  </button>
                                </>
                              ) : pagamento.Status === "aprovado" ? (
                                <button
                                  onClick={() => handleBaixar(pagamento)}
                                  className="p-2 text-[#8494E9] hover:bg-[#8494E9]/10 rounded-lg transition-all"
                                  title="Baixar"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                </button>
                              ) : null}
                            </div>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden divide-y divide-[#E5E9FA]">
                {pagamentosFiltrados.map((pagamento, index) => {
                  const documentoFiscalUrl = resolveStorageUrl(pagamento.UrlDocumentoStorage);
                  return (
                    <motion.div
                      key={pagamento.Id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="p-3 sm:p-4 space-y-3"
                    >
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm sm:text-base text-gray-900 break-words">{pagamento.Periodo || "N/A"}</p>
                          <p className="text-xs sm:text-sm text-gray-500 mt-1">Vencimento: {formatDate(pagamento.DataVencimento)}</p>
                          <p className="text-xs sm:text-sm text-gray-500 mt-1">
                            Documento: {documentoFiscalUrl ? (
                              <button
                                onClick={() => {
                                  setDocumentoSelecionado({
                                    url: documentoFiscalUrl,
                                    nome: `Nota Fiscal - ${pagamento.Periodo || "N/A"}`,
                                    tipo: "Nota Fiscal"
                                  });
                                  setDocumentoModalOpen(true);
                                }}
                                className="text-[#8494E9] hover:text-[#6D75C0] underline break-all cursor-pointer"
                              >
                                visualizar
                              </button>
                            ) : (
                              <span className="text-gray-500">não enviado</span>
                            )}
                          </p>
                        </div>
                        <div className="flex-shrink-0">
                          {getStatusBadge(pagamento.Status)}
                        </div>
                      </div>
                      <div className="flex justify-between items-center gap-2 pt-2 border-t border-gray-100">
                        <span className="text-base sm:text-lg font-bold break-words">{formatCurrency(pagamento.Valor)}</span>
                        <div className="flex gap-2 flex-shrink-0">
                          {(pagamento.Status === "pendente" || pagamento.Status === "processando") && (
                            <>
                              <button
                                onClick={() => handleAprovar(pagamento)}
                                className="p-2.5 text-[#4CAF50] hover:bg-[#4CAF50]/10 rounded-lg transition-all active:scale-95"
                                title="Aprovar"
                                aria-label="Aprovar pagamento"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                              </button>
                              <button
                                onClick={() => handleReprovar(pagamento)}
                                className="p-2.5 text-[#E57373] hover:bg-[#E57373]/10 rounded-lg transition-all active:scale-95"
                                title="Reprovar"
                                aria-label="Reprovar pagamento"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </>
                          )}
                          {pagamento.Status === "aprovado" && (
                            <button
                              onClick={() => handleBaixar(pagamento)}
                              className="p-2.5 text-[#8494E9] hover:bg-[#8494E9]/10 rounded-lg transition-all active:scale-95"
                              title="Baixar"
                              aria-label="Baixar pagamento"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Modais */}
      {pagamentoSelecionado && (
        <>
          <ModalAprovarPagamento
            open={modalAprovar}
            onClose={() => {
              setModalAprovar(false);
              setPagamentoSelecionado(null);
            }}
            pagamento={pagamentoSelecionado}
            onSuccess={handleSuccess}
          />
          <ModalReprovarPagamento
            open={modalReprovar}
            onClose={() => {
              setModalReprovar(false);
              setPagamentoSelecionado(null);
            }}
            pagamento={pagamentoSelecionado}
            onSuccess={handleSuccess}
          />
          <ModalBaixarPagamento
            open={modalBaixar}
            onClose={() => {
              setModalBaixar(false);
              setPagamentoSelecionado(null);
            }}
            pagamento={pagamentoSelecionado}
            onSuccess={handleSuccess}
          />
        </>
      )}

      {/* Modal de Visualização de Documento */}
      <DocumentoModal
        open={documentoModalOpen}
        onClose={() => {
          setDocumentoModalOpen(false);
          setDocumentoSelecionado(null);
        }}
        documento={documentoSelecionado}
        loadingUrl={loadingDocumentoUrl}
      />
    </main>
  );
}
