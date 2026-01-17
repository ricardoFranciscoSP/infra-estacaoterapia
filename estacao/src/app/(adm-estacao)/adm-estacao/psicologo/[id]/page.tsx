"use client";
import { motion } from "framer-motion";
import React, { useEffect, useState } from "react";
import { useSearchParams, useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { useAdmPsicologoById, useDeleteAdmPsicologo, usePreviaContrato, useGerarContrato, useUpdateAdmPsicologo } from "@/hooks/admin/useAdmPsicologo";
import type { Psicologo } from "@/types/psicologoTypes";
import { useDocuments } from "@/hooks/useDocuments";
import { documentsFilesService } from "@/services/documentsFiles";
import { formatDateBR } from "@/utils/formatarDataHora";
import { normalizeConsulta, type GenericObject } from "@/utils/normalizarConsulta";
import Link from "next/link";
import toast from "react-hot-toast";
import ModalPreviaContratoPsicologo from "@/components/ModalPreviaContratoPsicologo";
import { FiEdit2 } from "react-icons/fi";
import EditModal from '@/components/painelPsicologo/EditModal';
import { useEnums } from "@/hooks/enumsHook";
import FormDadosPessoaisAdmin from "@/components/admin/FormDadosPessoaisAdmin";
import FormEnderecoAdmin from "@/components/admin/FormEnderecoAdmin";
import FormJuridicoAdmin from "@/components/admin/FormJuridicoAdmin";
import FormBancarioAdmin from "@/components/admin/FormBancarioAdmin";
import FormProfissionaisAdmin from "@/components/admin/FormProfissionaisAdmin";
import { normalizeEnum, normalizeExperienciaClinica } from "@/utils/enumUtils";
import { getApiUrl } from "@/config/env";
import { getStatusTagInfo } from "@/utils/statusConsulta.util";
import { admPsicologoService } from "@/services/admPsicologoService";

function Input({
  label,
  value,
  disabled,
  type = "text",
  onChange,
}: {
  label: string;
  value: string;
  disabled?: boolean;
  type?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div className="mb-4">
      <label className="block text-xs font-semibold text-[#6C757D] uppercase tracking-wider mb-2">{label}</label>
      <input
        type={type}
        value={value}
        disabled={disabled}
        readOnly={!onChange}
        onChange={onChange}
        className={`w-full px-4 py-3 border rounded-lg shadow-sm text-sm font-medium transition-all ${
          disabled 
            ? "bg-[#F9FAFB] text-[#212529] border-[#E5E9FA] cursor-not-allowed" 
            : "bg-white text-[#212529] border-[#E5E9FA] focus:ring-2 focus:ring-[#8494E9] focus:border-[#8494E9]"
        }`}
      />
    </div>
  );
}

function TextArea({
  label,
  value,
  disabled,
  onChange,
}: {
  label: string;
  value: string;
  disabled?: boolean;
  onChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
}) {
  return (
    <div className="mb-4">
      <label className="block text-xs font-semibold text-[#6C757D] uppercase tracking-wider mb-2">{label}</label>
      <textarea
        value={value}
        disabled={disabled}
        readOnly={!onChange}
        onChange={onChange}
        rows={4}
        className={`w-full px-4 py-3 border rounded-lg shadow-sm text-sm font-medium transition-all resize-none ${
          disabled 
            ? "bg-[#F9FAFB] text-[#212529] border-[#E5E9FA] cursor-not-allowed" 
            : "bg-white text-[#212529] border-[#E5E9FA] focus:ring-2 focus:ring-[#8494E9] focus:border-[#8494E9]"
        }`}
      />
    </div>
  );
}

function Section({ title, children, right, onEdit, editMode }: { title: string; children: React.ReactNode; right?: React.ReactNode; onEdit?: () => void; editMode?: boolean }) {
  return (
    <section className="mb-6 bg-white rounded-xl shadow-md p-6 border border-[#E5E9FA] h-full">
      <div className="flex items-center justify-between mb-5 pb-3 border-b border-[#E5E9FA]">
        <h2 className="text-base font-bold text-[#212529]">{title}</h2>
        <div className="flex items-center gap-2">
          {right && <div className="flex items-center gap-2">{right}</div>}
          {onEdit && editMode && (
            <button
              onClick={onEdit}
              className="p-2 text-[#8494E9] hover:bg-[#F2F4FD] rounded-lg transition-colors"
              title="Editar"
              aria-label="Editar"
            >
              <FiEdit2 className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
      <div>{children}</div>
    </section>
  );
}

type Documento = { id?: string; nome: string; status: string; url?: string; descricao?: string; expiresAt?: string | null };
type Consulta = {
  Id: string | number;
  Status?: string;
  Estrelas?: number;
  Data?: string;
  Hora?: string;
  Paciente?: string;
  ReservaSessaoStatus?: string;
  ReservaSessaoChannel?: string | null;
  Valor?: number;
};

function calcularNota(consultas: Consulta[]) {
  const realizadas = consultas?.filter((c) => c.Status === "Realizada" && typeof c.Estrelas === "number") || [];
  if (realizadas.length === 0) return 0;
  const soma = realizadas.reduce((acc, c) => acc + (c.Estrelas as number), 0);
  return soma / realizadas.length;
}

function statusNota(nota: number) {
  if (nota >= 4.5) return "Ótimo";
  if (nota >= 3.5) return "Bom";
  if (nota >= 2.5) return "Médio";
  return "Ruim";
}

function formatarStatus(status: string) {
  if (status === "EmAnalise") return "Em Análise";
  if (status === "EmAnaliseContrato") return "Análise Contrato";
  return status;
}

function DocumentoModal({
  open,
  onClose,
  doc,
}: {
  open: boolean;
  onClose: () => void;
  doc: Documento | null;
}) {
  const [finalUrl, setFinalUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  useEffect(() => {
    const loadUrl = async () => {
      if (!open || !doc) {
        setFinalUrl(null);
        setError(null);
        setPreviewUrl(null);
        return;
      }

      setError(null);
      // Se já veio uma URL e não há expiração conhecida, usa imediatamente
      const urlCandidate = doc.url || null;
      const expiresAt = doc.expiresAt || null;

      // Se temos id e a URL está ausente ou expirada, busca uma nova URL
      const needsRefresh = !!doc.id && (!urlCandidate || (expiresAt ? documentsFilesService().isUrlExpired(expiresAt) : false));

      if (needsRefresh && doc.id) {
        try {
          setLoading(true);
          const resp = await documentsFilesService().getDocument(doc.id);
          setFinalUrl(resp.data.url);
          return;
        } catch (e) {
          console.error('[DocumentoModal] Erro ao obter URL assinada:', e);
          setError('Não foi possível carregar a URL do documento.');
        } finally {
          setLoading(false);
        }
      }

      // Fallback: usa a URL recebida
      setFinalUrl(urlCandidate);
    };

    loadUrl();
  }, [open, doc]);

  useEffect(() => {
    if (!open || !doc) return;
    const inlineUrl = doc.id ? `${getApiUrl()}/files/psychologist/documents/${doc.id}/inline` : null;
    if (inlineUrl) {
      setPreviewUrl(inlineUrl);
      setPreviewLoading(false);
      return;
    }

    const urlToPreview = finalUrl || doc.url || null;
    if (!urlToPreview) return;

    const urlLower = urlToPreview.toLowerCase();
    const nameLower = (doc.nome || "").toLowerCase();
    const endsWithExt = (s: string, ext: string) => new RegExp(`\\.${ext}(\\?|$)`, "i").test(s);
    const isPdfCandidate = endsWithExt(urlLower, "pdf") || endsWithExt(nameLower, "pdf");
    const isImageCandidate = ["png", "jpg", "jpeg", "gif", "webp", "svg"].some((ext) => endsWithExt(urlLower, ext) || endsWithExt(nameLower, ext));

    if (!isPdfCandidate && !isImageCandidate) {
      setPreviewUrl(null);
      return;
    }

    const controller = new AbortController();
    let objectUrl: string | null = null;

    const fetchPreview = async () => {
      try {
        setPreviewLoading(true);
        const response = await fetch(urlToPreview, { signal: controller.signal });
        if (!response.ok) {
          throw new Error(`Falha ao carregar arquivo (${response.status})`);
        }
        const blob = await response.blob();
        objectUrl = URL.createObjectURL(blob);
        setPreviewUrl(objectUrl);
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        console.error("[DocumentoModal] Erro ao gerar pré-visualização:", err);
        setPreviewUrl(null);
        setError("Não foi possível pré-visualizar o documento.");
      } finally {
        setPreviewLoading(false);
      }
    };

    fetchPreview();

    return () => {
      controller.abort();
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [open, doc, finalUrl]);

  if (!open || !doc) return null;

  const urlStr = (finalUrl || doc.url || '').toLowerCase();
  const nameStr = (doc.nome || '').toLowerCase();
  const endsWithExt = (s: string, ext: string) => new RegExp(`\\.${ext}(\\?|$)`, 'i').test(s);
  const isPDF = endsWithExt(urlStr, 'pdf') || endsWithExt(nameStr, 'pdf');
  const isImage = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].some((ext) => endsWithExt(urlStr, ext) || endsWithExt(nameStr, ext));
  const isDoc = ['doc', 'docx'].some((ext) => endsWithExt(urlStr, ext) || endsWithExt(nameStr, ext));
  const officeViewerUrl = isDoc && (finalUrl || doc.url) ? `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(finalUrl || doc.url || '')}` : undefined;
  const previewSource = previewUrl || finalUrl || doc.url || "";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-transparent p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col relative">
        <button
          className="absolute top-4 right-4 z-10 text-gray-500 hover:text-gray-700 text-2xl transition-colors bg-white rounded-full w-10 h-10 flex items-center justify-center shadow-md"
          onClick={onClose}
          aria-label="Fechar"
        >
          &times;
        </button>

        <div className="p-6 border-b border-gray-200">
          <h3 className="text-xl font-semibold text-gray-800">{doc.nome}</h3>
          {doc.descricao && (
            <p className="text-sm text-gray-500 mt-1">{doc.descricao}</p>
          )}
        </div>

        <div className="flex-1 overflow-auto p-6">
          {loading || previewLoading ? (
            <div className="flex flex-col items-center justify-center text-center text-gray-600 gap-3 py-12">
              <div className="w-10 h-10 border-4 border-[#8494E9] border-t-transparent rounded-full animate-spin"></div>
              <p className="text-sm">Carregando documento...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center text-center text-gray-600 gap-3 py-12">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-sm font-semibold">Erro ao carregar documento</p>
              <p className="text-xs text-gray-500">{error}</p>
            </div>
          ) : isPDF && previewSource ? (
            <iframe
              src={previewSource}
              title="Documento PDF"
              className="w-full h-full min-h-[60vh] border rounded-lg"
            />
          ) : isImage && previewSource ? (
            <div className="flex items-center justify-center">
              <Image
                src={previewSource}
                alt={doc.nome}
                width={800}
                height={600}
                className="max-h-[60vh] w-auto mx-auto rounded-lg object-contain"
                unoptimized
                onError={() => setError('Erro ao carregar a imagem. O arquivo pode não estar disponível.')}
              />
            </div>
          ) : isDoc && officeViewerUrl ? (
            <div className="flex flex-col gap-3">
              <iframe
                src={officeViewerUrl}
                title="Documento do Word"
                className="w-full h-full min-h-[60vh] border rounded-lg"
              />
              <p className="text-xs text-gray-500">
                Pré-visualização fornecida pelo Microsoft Office Viewer. Caso não carregue, utilize o botão Baixar abaixo.
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-center text-gray-600 gap-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-sm">Tipo de arquivo não suportado para visualização no navegador.</p>
              <p className="text-xs text-gray-500">Clique em Baixar para abrir no aplicativo apropriado.</p>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-200 flex justify-between items-center bg-gray-50">
          <span className="text-sm text-gray-600">
            Clique em &ldquo;Baixar&rdquo; para salvar o documento
          </span>
          <a
            href={finalUrl || doc.url || undefined}
            download
            target="_blank"
            rel="noopener noreferrer"
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-6 py-2.5 rounded-lg transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Baixar documento
          </a>
        </div>
      </div>
    </div>
  );
}

// Modal removido - agora usando ModalPreviaContratoPsicologo

export default function PsicologoDetalhePage() {
  // Busca profunda por objetos que contenham ReservaSessao/ScheduledAt dentro do objeto do psicólogo
  const coletarReservasDoObjeto = (obj: unknown, psicId?: string): Consulta[] => {
    const resultados: Consulta[] = [];
    const visitado = new WeakSet<object>();
    const walk = (node: unknown): void => {
      if (!node || typeof node !== "object") return;
      if (visitado.has(node as object)) return; // evita ciclos
      visitado.add(node as object);

      const nodeObj = node as Record<string, unknown>;
      
      // Se o nó tem ReservaSessao embutida (ex.: { ReservaSessao: {...}, Paciente: {...}, Agenda: {...} })
      if (nodeObj.ReservaSessao && typeof nodeObj.ReservaSessao === "object") {
        const reserva = nodeObj.ReservaSessao as Record<string, unknown>;
        const scheduled: string | undefined = (reserva?.ScheduledAt || reserva?.scheduledAt) as string | undefined;
        const isoLike = scheduled ? (scheduled.includes("T") ? scheduled : scheduled.replace(" ", "T")) : undefined;
        const [datePart, timePart] = isoLike ? isoLike.split("T") : [undefined, undefined];
        const data = datePart;
        const hora = timePart ? timePart.slice(0, 5) : undefined;
        const statusConsulta = (nodeObj?.Status || nodeObj?.status || (nodeObj?.Agenda as Record<string, unknown>)?.Status || (nodeObj?.Agenda as Record<string, unknown>)?.status) as string | undefined;
        
        // Coleta nome do paciente de múltiplas fontes
        const pacienteObj = nodeObj?.Paciente as Record<string, unknown> | string | undefined;
        let pacienteNome: string | undefined;
        if (typeof pacienteObj === 'object' && pacienteObj) {
          pacienteNome = (pacienteObj?.Nome || pacienteObj?.name || pacienteObj?.Name || pacienteObj?.nome) as string | undefined;
        } else if (typeof pacienteObj === 'string') {
          pacienteNome = pacienteObj;
        }
        
        // Tenta também no objeto Consulta
        const consultaObj = nodeObj?.Consulta as Record<string, unknown> | undefined;
        if (!pacienteNome && consultaObj) {
          const pacienteConsulta = consultaObj?.Paciente as Record<string, unknown> | string | undefined;
          if (typeof pacienteConsulta === 'object' && pacienteConsulta) {
            pacienteNome = (pacienteConsulta?.Nome || pacienteConsulta?.name || pacienteConsulta?.Name || pacienteConsulta?.nome) as string | undefined;
          } else if (typeof pacienteConsulta === 'string') {
            pacienteNome = pacienteConsulta;
          }
        }
        
        // Tenta também em PacienteId relacionado
        if (!pacienteNome && nodeObj?.PacienteId) {
          const pacienteRelacionado = (nodeObj as Record<string, unknown>)["Paciente"] as Record<string, unknown> | undefined;
          if (pacienteRelacionado && typeof pacienteRelacionado === 'object') {
            pacienteNome = (pacienteRelacionado["Nome"] || pacienteRelacionado["name"] || pacienteRelacionado["Name"] || pacienteRelacionado["nome"]) as string | undefined;
          }
        }
        
        const id = (nodeObj?.Id || nodeObj?.ConsultaId || reserva?.ConsultaId || reserva?.ReservationId || Math.random().toString(36).slice(2)) as string;
        const valor = (nodeObj?.Valor ?? nodeObj?.Preco ?? nodeObj?.Price ?? (nodeObj?.consulta as Record<string, unknown>)?.Valor ?? (nodeObj?.ReservaSessao as Record<string, unknown>)?.Valor) as number | undefined;
        // Filtra por psicólogo (quando possível)
        const psicologoIdDoNodo = (nodeObj?.PsicologoId || nodeObj?.PsychologistId || reserva?.PsychologistId || (nodeObj?.Agenda as Record<string, unknown>)?.PsicologoId) as string | undefined;
        if (!psicId || !psicologoIdDoNodo || String(psicologoIdDoNodo) === String(psicId)) {
          resultados.push({
            Id: id,
            Status: statusConsulta,
            Data: data,
            Hora: hora,
            Paciente: pacienteNome || undefined,
            ReservaSessaoStatus: (reserva?.Status || reserva?.status) as string | undefined,
            ReservaSessaoChannel: (reserva?.AgoraChannel ?? null) as string | null,
            Valor: typeof valor === "number" ? valor : undefined,
          });
        }
      }

      // Caso seja um objeto que se parece com a própria ReservaSessao isolada
      if ((nodeObj.ScheduledAt || nodeObj.scheduledAt) && (nodeObj.Status || nodeObj.status)) {
        const scheduled: string = (nodeObj.ScheduledAt || nodeObj.scheduledAt) as string;
        const isoLike = scheduled.includes("T") ? scheduled : scheduled.replace(" ", "T");
        const [datePart, timePart] = isoLike.split("T");
        
        // Tenta coletar nome do paciente
        const pacienteObj = nodeObj?.Paciente as Record<string, unknown> | string | undefined;
        let pacienteNome: string | undefined;
        if (typeof pacienteObj === 'object' && pacienteObj) {
          pacienteNome = (pacienteObj?.Nome || pacienteObj?.name || pacienteObj?.Name || pacienteObj?.nome) as string | undefined;
        } else if (typeof pacienteObj === 'string') {
          pacienteNome = pacienteObj;
        }
        
        // Tenta também em PacienteId relacionado
        if (!pacienteNome && nodeObj?.PacienteId) {
          const pacienteRelacionado = (nodeObj as Record<string, unknown>)["Paciente"] as Record<string, unknown> | undefined;
          if (pacienteRelacionado && typeof pacienteRelacionado === 'object') {
            pacienteNome = (pacienteRelacionado["Nome"] || pacienteRelacionado["name"] || pacienteRelacionado["Name"] || pacienteRelacionado["nome"]) as string | undefined;
          }
        }
        
        const id = (nodeObj?.ConsultaId || nodeObj?.ReservationId || Math.random().toString(36).slice(2)) as string;
        const valor = (nodeObj?.Valor ?? nodeObj?.Preco ?? nodeObj?.Price) as number | undefined;
        const psicologoIdDoNodo = nodeObj?.PsychologistId as string | undefined;
        if (!psicId || !psicologoIdDoNodo || String(psicologoIdDoNodo) === String(psicId)) {
          resultados.push({
            Id: id,
            Status: (nodeObj.Status || nodeObj.status) as string | undefined,
            Data: datePart,
            Hora: timePart ? timePart.slice(0, 5) : undefined,
            Paciente: pacienteNome || undefined,
            ReservaSessaoStatus: (nodeObj.Status || nodeObj.status) as string | undefined,
            ReservaSessaoChannel: (nodeObj.AgoraChannel ?? null) as string | null,
            Valor: typeof valor === "number" ? valor : undefined,
          });
        }
      }

      // Percorre filhos
      for (const k of Object.keys(nodeObj)) {
        const v = nodeObj[k];
        if (v && typeof v === "object") {
          if (Array.isArray(v)) v.forEach(walk);
          else walk(v);
        }
      }
    };
    walk(obj);
    return resultados;
  };
  const params = useParams();
  const id = params && "id" in params ? params.id : undefined;
  const idStr = Array.isArray(id) ? id[0] : id;
  const router = useRouter();
  const { psicologo: psicologoRaw, isLoading: isLoadingPsicologo, refetch } = useAdmPsicologoById(idStr);
  const psicologo = Array.isArray(psicologoRaw) ? psicologoRaw[0] : psicologoRaw;
  
  // Estado para controlar se deve carregar a prévia do contrato
  const [shouldLoadPrevia, setShouldLoadPrevia] = useState(false);
  
  const { data: previaContratoData, isLoading: isLoadingPrevContrato, refetch: refetchPreviaContrato } = usePreviaContrato(idStr, shouldLoadPrevia);
  const gerarContratoMutation = useGerarContrato();
  const updatePsicologoMutation = useUpdateAdmPsicologo();
  const deletePsicologoMutation = useDeleteAdmPsicologo();
  const searchParams = useSearchParams();
  const editMode = searchParams?.get("edit") === "1";
  const [statusEdit, setStatusEdit] = useState(psicologo?.Status || "");
  const { enums } = useEnums();
  const [modal, setModal] = useState<null | string>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  // Estados para edição de foto
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(false);
  
  // Estados para campos editáveis
  const [nomeEdit, setNomeEdit] = useState("");
  const [emailEdit, setEmailEdit] = useState("");
  const [telefoneEdit, setTelefoneEdit] = useState("");
  const [cpfEdit, setCpfEdit] = useState("");
  const [rgEdit, setRgEdit] = useState("");
  const [dataNascimentoEdit, setDataNascimentoEdit] = useState("");
  const [sexoEdit, setSexoEdit] = useState("");
  const [pronomeEdit, setPronomeEdit] = useState("");
  const [racaCorEdit, setRacaCorEdit] = useState("");
  const [enderecoEdit, setEnderecoEdit] = useState({
    Cep: "",
    Rua: "",
    Numero: "",
    Complemento: "",
    Bairro: "",
    Cidade: "",
    Estado: "",
  });
  const [billingAddressEdit, setBillingAddressEdit] = useState({
    Cep: "",
    Rua: "",
    Numero: "",
    Complemento: "",
    Bairro: "",
    Cidade: "",
    Estado: "",
  });
  const [pessoaJuridicaEdit, setPessoaJuridicaEdit] = useState({
    CNPJ: "",
    RazaoSocial: "",
    NomeFantasia: "",
    InscricaoEstadual: "",
    SimplesNacional: false,
    DescricaoExtenso: "",
  });
  
  // Inicializa estados quando psicologo carrega
  useEffect(() => {
    if (psicologo) {
      const dataNasc = psicologo?.DataNascimento ? (() => {
        if (typeof psicologo.DataNascimento === "string") {
          if (/^\d{4}-\d{2}-\d{2}$/.test(psicologo.DataNascimento)) {
            return psicologo.DataNascimento;
          }
          const date = new Date(psicologo.DataNascimento);
          if (!isNaN(date.getTime())) {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
          }
        }
        return "";
      })() : "";
      
      setNomeEdit(psicologo.Nome || "");
      setEmailEdit(psicologo.Email || "");
      setTelefoneEdit(psicologo.Telefone || "");
      setCpfEdit(psicologo.Cpf || "");
      setRgEdit(psicologo.Rg || "");
      setDataNascimentoEdit(dataNasc);
      setSexoEdit(psicologo.Sexo || "");
      setPronomeEdit(psicologo.Pronome || "");
      setRacaCorEdit(psicologo.RacaCor || "");
      
      const addressRaw = psicologo?.Address;
      const addressCurrent = Array.isArray(addressRaw) ? addressRaw[0] : addressRaw;
      if (addressCurrent) {
        setEnderecoEdit({
          Cep: addressCurrent.Cep || "",
          Rua: addressCurrent.Rua || "",
          Numero: addressCurrent.Numero || "",
          Complemento: addressCurrent.Complemento || "",
          Bairro: addressCurrent.Bairro || "",
          Cidade: addressCurrent.Cidade || "",
          Estado: addressCurrent.Estado || "",
        });
      }
      
      const billingAddressRaw = psicologo?.BillingAddress;
      const billingAddressCurrent = Array.isArray(billingAddressRaw) ? billingAddressRaw[0] : billingAddressRaw;
      if (billingAddressCurrent) {
        setBillingAddressEdit({
          Cep: billingAddressCurrent.Cep || "",
          Rua: billingAddressCurrent.Rua || "",
          Numero: billingAddressCurrent.Numero || "",
          Complemento: billingAddressCurrent.Complemento || "",
          Bairro: billingAddressCurrent.Bairro || "",
          Cidade: billingAddressCurrent.Cidade || "",
          Estado: billingAddressCurrent.Estado || "",
        });
      }
      
      if (psicologo.PessoalJuridica) {
        setPessoaJuridicaEdit({
          CNPJ: psicologo.PessoalJuridica.CNPJ || "",
          RazaoSocial: psicologo.PessoalJuridica.RazaoSocial || "",
          NomeFantasia: psicologo.PessoalJuridica.NomeFantasia || "",
          InscricaoEstadual: psicologo.PessoalJuridica.InscricaoEstadual || "",
          SimplesNacional: psicologo.PessoalJuridica.SimplesNacional || false,
          DescricaoExtenso: psicologo.PessoalJuridica.DescricaoExtenso || "",
        });
      }
      
      // Inicializa preview da imagem
      const images = psicologo.Images || psicologo.Image;
      if (Array.isArray(images) && images.length > 0 && images[0]?.Url) {
        setImagePreview(images[0].Url);
      } else if (!Array.isArray(images) && images?.Url) {
        setImagePreview(images.Url);
      } else {
        setImagePreview(null);
      }
    }
  }, [psicologo]);


  // Buscar documentos de TODOS os perfis profissionais do psicólogo
  type ProfessionalProfile = {
    Id: string;
  };
  const professionalProfiles: ProfessionalProfile[] = psicologo?.ProfessionalProfiles || [];
  // Se não houver perfis, tenta pelo idStr (fallback)
  const profileIds: string[] = professionalProfiles.length > 0
    ? professionalProfiles.map((p) => p.Id)
    : idStr ? [idStr] : [];


  // Hook para o primeiro perfil profissional (ou idStr como fallback)
  const firstProfileId = profileIds[0];
  const documentsHook = useDocuments(firstProfileId);
  const documentsFromHook = documentsHook.documents;
  const loadingDocuments = documentsHook.loading;
  const errorDocuments = documentsHook.error;
  const downloadDocument = documentsHook.downloadDocument;
  const deleteDocument = documentsHook.deleteDocument;
  const isUrlExpired = documentsHook.isUrlExpired;
  const formatExpirationTime = documentsHook.formatExpirationTime;

  // Verifica se já existe contrato e está disponível no storage
  const hasContrato = React.useMemo(() => {
    return documentsFromHook.some(doc => 
      (doc.type === "ContratoPsicologo" || doc.type === "Contrato" || doc.fileName?.toLowerCase().includes("contrato")) &&
      doc.fileExists &&
      doc.url
    );
  }, [documentsFromHook]);

  useEffect(() => {
    setStatusEdit(psicologo?.Status || "");
  }, [psicologo?.Status]);

  // Normaliza consultas vindas da API para obter Data/Hora/Paciente de forma consistente
  // Primeiro tenta Consultas, depois ConsultaPsicologos
  const consultasArray = Array.isArray(psicologo?.Consultas) 
    ? psicologo.Consultas 
    : Array.isArray(psicologo?.ConsultaPsicologos)
    ? psicologo.ConsultaPsicologos
    : [];
  
  const consultasBase: Consulta[] = (consultasArray as Record<string, unknown>[])
        .filter((c) => !!c)
        .map((c) => {
          const n = normalizeConsulta(c as GenericObject);
          const agenda = c["Agenda"] as Record<string, unknown> | undefined;
          const consulta = c["Consulta"] as Record<string, unknown> | undefined;
          const paciente = c["Paciente"] as Record<string, unknown> | undefined;
          const reservaSessao = c["ReservaSessao"] as Record<string, unknown> | undefined;
          const reservaSessaoAlt = c["reservaSessao"] as Record<string, unknown> | undefined;
          const reserva = reservaSessao || reservaSessaoAlt || {};

          const status = (c["Status"] as string | undefined)
            || (c["status"] as string | undefined)
            || (agenda?.["Status"] as string | undefined)
            || (agenda?.["status"] as string | undefined);

          const estrelas = (c["Estrelas"] as number | undefined)
            ?? (c["estrelas"] as number | undefined)
            ?? (c["Rating"] as number | undefined)
            ?? (c["rating"] as number | undefined);

          const reservaStatus = (reserva["Status"] as string | undefined)
            || (reserva["status"] as string | undefined);
          const reservaChannel = (reserva["AgoraChannel"] as string | null | undefined)
            ?? (reserva["agoraChannel"] as string | null | undefined)
            ?? null;

          // Fallbacks para ID e Data/Hora vindos da ReservaSessao
          const scheduled: string | undefined = (reserva["ScheduledAt"] as string | undefined)
            || (reserva["scheduledAt"] as string | undefined);
          let dataFromScheduled: string | undefined;
          let horaFromScheduled: string | undefined;
          if (scheduled && typeof scheduled === "string") {
            // formatos possíveis: "YYYY-MM-DD HH:mm:ss" ou ISO
            const isoLike = scheduled.includes("T") ? scheduled : scheduled.replace(" ", "T");
            const [datePart, timePart] = isoLike.split("T");
            if (datePart) dataFromScheduled = datePart;
            if (timePart) horaFromScheduled = timePart.slice(0, 5); // HH:mm
          }

          const idFinal =
            c["Id"]
            || (consulta?.["Id"])
            || c["ConsultaId"]
            || reserva["ConsultaId"]
            || n.id
            || Math.random().toString(36).slice(2);

          const valor = (c["Valor"] as number | undefined)
            ?? (c["valor"] as number | undefined)
            ?? (c["Preco"] as number | undefined)
            ?? (c["price"] as number | undefined)
            ?? (consulta?.["Valor"] as number | undefined);

          // Coleta nome do paciente de múltiplas fontes
          let pacienteNome: string | undefined;
          
          // Da normalização
          if (n.paciente?.nome) {
            pacienteNome = n.paciente.nome;
          }
          
          // Do objeto Paciente direto (tenta várias propriedades)
          if (!pacienteNome && paciente) {
            pacienteNome = (paciente["Nome"] || paciente["name"] || paciente["Name"] || paciente["nome"] || paciente["NomeCompleto"] || paciente["nomeCompleto"]) as string | undefined;
          }
          
          // Do objeto Consulta.Paciente
          if (!pacienteNome && consulta) {
            const pacienteConsulta = consulta["Paciente"] as Record<string, unknown> | string | undefined;
            if (typeof pacienteConsulta === 'object' && pacienteConsulta) {
              pacienteNome = (pacienteConsulta["Nome"] || pacienteConsulta["name"] || pacienteConsulta["Name"] || pacienteConsulta["nome"] || pacienteConsulta["NomeCompleto"] || pacienteConsulta["nomeCompleto"]) as string | undefined;
            } else if (typeof pacienteConsulta === 'string') {
              pacienteNome = pacienteConsulta;
            }
          }
          
          // Do objeto principal (pode ser ConsultaPsicologos que tem PacienteId e precisa buscar)
          if (!pacienteNome) {
            const pacientePrincipal = c["Paciente"] as Record<string, unknown> | string | undefined;
            if (typeof pacientePrincipal === 'object' && pacientePrincipal) {
              pacienteNome = (pacientePrincipal["Nome"] || pacientePrincipal["name"] || pacientePrincipal["Name"] || pacientePrincipal["nome"] || pacientePrincipal["NomeCompleto"] || pacientePrincipal["nomeCompleto"]) as string | undefined;
            } else if (typeof pacientePrincipal === 'string') {
              pacienteNome = pacientePrincipal;
            }
          }
          
          // Tenta também em PacienteId (se for um ID, não podemos buscar aqui, mas vamos tentar outras estruturas)
          if (!pacienteNome && c["PacienteId"]) {
            // Se houver um objeto relacionado, tenta buscar
            const pacienteRelacionado = (c as Record<string, unknown>)["Paciente"] as Record<string, unknown> | undefined;
            if (pacienteRelacionado && typeof pacienteRelacionado === 'object') {
              pacienteNome = (pacienteRelacionado["Nome"] || pacienteRelacionado["name"] || pacienteRelacionado["Name"] || pacienteRelacionado["nome"] || pacienteRelacionado["NomeCompleto"] || pacienteRelacionado["nomeCompleto"]) as string | undefined;
            }
          }
          
          // Tenta também em c["paciente"] (lowercase)
          if (!pacienteNome && c["paciente"]) {
            const pacienteLower = c["paciente"] as Record<string, unknown> | string | undefined;
            if (typeof pacienteLower === 'object' && pacienteLower) {
              pacienteNome = (pacienteLower["Nome"] || pacienteLower["name"] || pacienteLower["Name"] || pacienteLower["nome"] || pacienteLower["NomeCompleto"] || pacienteLower["nomeCompleto"]) as string | undefined;
            } else if (typeof pacienteLower === 'string') {
              pacienteNome = pacienteLower;
            }
          }

          return {
            Id: idFinal as string | number,
            Status: status,
            Estrelas: typeof estrelas === "number" ? estrelas : undefined,
            Data: n.date || (agenda?.["Data"] as string | undefined) || (c["Date"] as string | undefined) || dataFromScheduled,
            Hora: n.time || (agenda?.["Horario"] as string | undefined) || (c["Time"] as string | undefined) || horaFromScheduled,
            Paciente: pacienteNome || undefined,
            ReservaSessaoStatus: reservaStatus,
            ReservaSessaoChannel: reservaChannel,
            Valor: typeof valor === "number" ? valor : undefined,
          };
        });

  // Fallback: se não houver em Consultas, varre o objeto do psicólogo à procura de ReservaSessao
  const reservasExtras = coletarReservasDoObjeto(psicologo, idStr);
  // Mescla e remove duplicados por Id
  const consultas: Consulta[] = Object.values(
    [...consultasBase, ...reservasExtras].reduce<Record<string | number, Consulta>>((acc, cur) => {
      const key = cur.Id;
      if (!acc[key]) acc[key] = cur;
      return acc;
    }, {})
  );

  const nota = Number(calcularNota(consultas).toFixed(1));
  const statusDaNota = statusNota(nota);
  const porPagina = 10;
  const [pagina, setPagina] = useState(1);
  // Filtros de consultas (status e busca por paciente)
  const [filtroStatus, setFiltroStatus] = useState<string>("Todos");
  const [filtroBusca, setFiltroBusca] = useState<string>("");

  const todasOpcoesStatus = Array.from(
    new Set(
      consultas
        .map((c) => c.Status)
        .filter((s): s is string => !!s)
    )
  );

  const consultasFiltradas = consultas.filter((c) => {
    const statusOk =
      filtroStatus === "Todos" ||
      c.Status === filtroStatus;
    const buscaOk =
      !filtroBusca ||
      (c.Paciente || "").toLowerCase().includes(filtroBusca.toLowerCase());
    return statusOk && buscaOk;
  });

  // Ordena por Data+Hora (mais recentes primeiro) e pagina as consultas filtradas
  const consultasOrdenadas = [...consultasFiltradas].sort((a, b) => {
    const aKey = `${(a.Data || "").split("T")[0]} ${a.Hora || "00:00"}`.trim();
    const bKey = `${(b.Data || "").split("T")[0]} ${b.Hora || "00:00"}`.trim();
    const aDate = new Date(aKey.replace(" ", "T"));
    const bDate = new Date(bKey.replace(" ", "T"));
    return bDate.getTime() - aDate.getTime();
  });
  
  // Total de consultas filtradas (para exibição)
  const totalConsultasFiltradas = consultasOrdenadas.length;
  // Total de todas as consultas (para referência)
  const totalConsultasGeral = consultas.length;
  const totalPaginas = Math.ceil(totalConsultasFiltradas / porPagina);
  const consultasPaginadas = consultasOrdenadas.slice((pagina - 1) * porPagina, pagina * porPagina);
  
  // Resetar página quando filtros mudarem
  useEffect(() => {
    setPagina(1);
  }, [filtroStatus, filtroBusca]);
  const [dataAprovacaoEdit, setDataAprovacaoEdit] = useState(psicologo?.DataAprovacao || "");

  useEffect(() => {
    if (statusEdit === "Ativo" && !dataAprovacaoEdit) {
      const now = new Date();
      const pad = (n: number) => n.toString().padStart(2, "0");
      setDataAprovacaoEdit(`${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`);
    }
    if (statusEdit !== "Ativo") {
      setDataAprovacaoEdit("");
    }
  }, [statusEdit, dataAprovacaoEdit]);

  const [modalDoc, setModalDoc] = useState<Documento | null>(null);
  const [modalContratoOpen, setModalContratoOpen] = useState(false);
  const [deletingDocumentId, setDeletingDocumentId] = useState<string | null>(null);

  const nome = psicologo?.Nome || "";
  const crp = psicologo?.Crp || "";
  const dataCadastro = psicologo?.CreatedAt || "";
  const dataAprovacao = psicologo?.DataAprovacao || "";
  const ultimoAcesso = psicologo?.UpdatedAt || "";
  
  // Fallback: unifica todos os documentos de todos os perfis profissionais
  type ProfessionalProfileWithDocuments = {
    Documents?: Array<{
      Type?: string | null;
      Url?: string | null;
      Description?: string | null;
    }>;
  };
  const documentos: Documento[] = (psicologo?.ProfessionalProfiles || [])
    .flatMap((profile: ProfessionalProfileWithDocuments) =>
      (profile?.Documents || []).map((doc) => ({
        nome: (doc.Type ?? "") || "",
        status: doc.Url ? "Recebido" : "Pendente",
        url: doc.Url ?? undefined,
        descricao: doc.Description ?? undefined,
      }))
    );

  // Normaliza BillingAddress (pode vir como array ou objeto)
  const billingAddressRaw = psicologo?.BillingAddress;
  const billingAddress = Array.isArray(billingAddressRaw) ? billingAddressRaw[0] : billingAddressRaw;

  // Verifica se é Pessoa Jurídica
  const isPessoaJuridica = React.useMemo(() => {
    const tipoPessoa = psicologo?.ProfessionalProfiles?.[0]?.TipoPessoaJuridico;
    if (!tipoPessoa) return false;
    if (Array.isArray(tipoPessoa)) {
      return tipoPessoa.some(t => t === "Juridico" || t === "PjAutonomo" || t === "Ei" || t === "Mei" || t === "SociedadeLtda" || t === "Eireli" || t === "Slu");
    }
    return tipoPessoa === "Juridico" || tipoPessoa === "PjAutonomo" || tipoPessoa === "Ei" || tipoPessoa === "Mei" || tipoPessoa === "SociedadeLtda" || tipoPessoa === "Eireli" || tipoPessoa === "Slu";
  }, [psicologo]);

  // Verifica se é Autônomo (não pessoa jurídica)
  const isAutonomo = React.useMemo(() => {
    const tipoPessoa = psicologo?.ProfessionalProfiles?.[0]?.TipoPessoaJuridico;
    if (!tipoPessoa) return false;
    if (Array.isArray(tipoPessoa)) {
      // É autônomo se contém "Autonomo" mas não contém nenhum tipo de PJ
      const temAutonomo = tipoPessoa.some(t => t === "Autonomo");
      const temPJ = tipoPessoa.some(t => t === "Juridico" || t === "PjAutonomo" || t === "Ei" || t === "Mei" || t === "SociedadeLtda" || t === "Eireli" || t === "Slu");
      return temAutonomo && !temPJ;
    }
    return tipoPessoa === "Autonomo";
  }, [psicologo]);

  // PessoalJuridica é objeto (não array)
  const pessoaJuridica = psicologo?.PessoalJuridica;

  // Função para aprovar psicólogo
  const handleAprovar = async () => {
    if (!idStr || !psicologo) return;
    
    try {
      await updatePsicologoMutation.mutateAsync({
        id: idStr,
        update: {
          ...psicologo,
          Status: "Ativo",
          DataAprovacao: new Date().toISOString(),
        }
      });
      
      // Recarregar dados
      refetch();
      toast.success("Psicólogo aprovado com sucesso!");
    } catch (error) {
      console.error("Erro ao aprovar psicólogo:", error);
      toast.error("Erro ao aprovar psicólogo. Tente novamente.");
    }
  };

  const handleDeletePsicologo = async () => {
    if (!idStr) return;
    try {
      await deletePsicologoMutation.mutateAsync(idStr);
      toast.success("Psicólogo deletado com sucesso.");
      setShowDeleteConfirm(false);
      router.push("/adm-estacao/psicologos");
    } catch (error) {
      console.error("Erro ao deletar psicólogo:", error);
      toast.error("Erro ao deletar psicólogo. Tente novamente.");
    }
  };

  // Função para lidar com upload de imagem
  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setImagePreview(URL.createObjectURL(file));
    setImageLoading(true);

    try {
      const images = psicologo?.Images || psicologo?.Image;
      const currentImage = Array.isArray(images) && images.length > 0 ? images[0] : (!Array.isArray(images) && images ? images : null);
      
      if (currentImage?.Id) {
        // Atualiza imagem existente
        await admPsicologoService().updateImage(idStr || "", currentImage.Id, file);
        toast.success('Imagem atualizada com sucesso!');
      } else {
        // Faz upload de nova imagem
        await admPsicologoService().uploadImage(idStr || "", file);
        toast.success('Imagem adicionada com sucesso!');
      }
      
      await refetch();
      setImageLoading(false);
    } catch (error) {
      console.error("Erro ao atualizar imagem:", error);
      toast.error('Erro ao atualizar imagem.');
      setImageLoading(false);
      const images = psicologo?.Images || psicologo?.Image;
      const imageUrl = Array.isArray(images) && images.length > 0 ? images[0]?.Url : (!Array.isArray(images) && images ? images.Url : null);
      setImagePreview(imageUrl || null);
    }
  };

  // Função para deletar imagem
  const handleDeleteImage = async () => {
    const images = psicologo?.Images || psicologo?.Image;
    const currentImage = Array.isArray(images) && images.length > 0 ? images[0] : (!Array.isArray(images) && images ? images : null);
    
    if (!currentImage?.Id) return;

    if (!confirm('Tem certeza que deseja excluir a foto? Esta ação não pode ser desfeita.')) {
      return;
    }

    try {
      setImageLoading(true);
      await admPsicologoService().deleteImage(currentImage.Id);
      toast.success('Foto excluída com sucesso!');
      setImagePreview(null);
      await refetch();
      setImageLoading(false);
    } catch (error) {
      console.error("Erro ao deletar imagem:", error);
      toast.error('Erro ao excluir foto.');
      setImageLoading(false);
    }
  };

  // Função para salvar edição
  const handleSalvarEdicao = async () => {
    if (!idStr || !psicologo) return;
    
    try {
      const updateData: Partial<Psicologo> = {
        ...psicologo,
        Nome: nomeEdit,
        Email: emailEdit,
        Telefone: telefoneEdit,
        Cpf: cpfEdit,
        Rg: rgEdit,
        DataNascimento: dataNascimentoEdit ? new Date(dataNascimentoEdit).toISOString() : psicologo.DataNascimento,
        Sexo: sexoEdit || undefined,
        Pronome: pronomeEdit || undefined,
        RacaCor: racaCorEdit || undefined,
        Status: statusEdit,
        Address: enderecoEdit,
        BillingAddress: billingAddressEdit,
        // Não enviar DataAprovacao e CreatedAt
        DataAprovacao: undefined,
        CreatedAt: undefined,
      };
      
      // Adiciona PessoalJuridica se for pessoa jurídica
      if (isPessoaJuridica && pessoaJuridicaEdit) {
        updateData.PessoalJuridica = pessoaJuridicaEdit;
      }
      
      await updatePsicologoMutation.mutateAsync({
        id: idStr,
        update: updateData as Psicologo,
      });
      
      // Recarregar dados
      refetch();
      toast.success("Psicólogo atualizado com sucesso!");
    } catch (error) {
      console.error("Erro ao salvar edição:", error);
      toast.error("Erro ao atualizar o Psicólogo, tente novamente.");
    }
  };

  if (isLoadingPsicologo) {
    return <div className="text-center py-10 text-gray-500"></div>;
  }
  if (!psicologo) {
    return <div className="text-center py-10 text-red-500">Psicólogo não encontrado.</div>;
  }

  return (
    <motion.main
      className="w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      {/* Breadcrumb */}
      <nav className="text-xs sm:text-sm text-[#6C757D] mb-4 sm:mb-6" aria-label="Breadcrumb">
        <ol className="flex items-center space-x-2">
          <li>
            <Link href="/adm-estacao/psicologos" className="text-[#8494E9] hover:text-[#6B7FD7] transition-colors font-medium">
              Psicólogos
            </Link>
          </li>
          <li className="text-[#6C757D]">/</li>
          <li className="text-[#212529] font-semibold">{nome}</li>
        </ol>
      </nav>

      {/* Header + Status e Datas lado a lado (larguras simétricas) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 items-stretch gap-6 mb-6">
        {/* Card do avatar, status e avaliação (esquerda) */}
        <div className="bg-white rounded-xl shadow-md border border-[#E5E9FA] p-4 sm:p-6 h-full">
          <div className="flex flex-col gap-6">
            {/* Info do Psicólogo */}
            <div className="flex items-center gap-4">
              <div className="relative">
                {imagePreview ? (
                  <div className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-[#8494E9] flex-shrink-0">
                    <Image
                      src={imagePreview}
                      alt={nome}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                ) : (
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#8494E9] to-[#6B7FD7] flex items-center justify-center text-white font-bold text-2xl shadow-lg flex-shrink-0">
                    {nome.charAt(0).toUpperCase()}
                  </div>
                )}
                <label className="absolute bottom-0 right-0 w-6 h-6 bg-[#8494E9] rounded-full flex items-center justify-center cursor-pointer hover:bg-[#6B7FD7] transition-colors shadow-md">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                    disabled={imageLoading}
                  />
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </label>
                {imagePreview && (
                  <button
                    onClick={handleDeleteImage}
                    disabled={imageLoading}
                    className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white hover:bg-red-600 transition-colors shadow-md"
                    title="Excluir foto"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
                {imageLoading && (
                  <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-xl sm:text-2xl font-bold text-[#212529] mb-1 break-words">{nome}</h1>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-[#6C757D]">CRP: {crp}</span>
                  {isPessoaJuridica ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
                      Pessoa Jurídica
                    </span>
                  ) : isAutonomo ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                      Autônomo
                    </span>
                  ) : null}
                </div>
              </div>
            </div>

            {/* Avaliação + Emitir/Ver contrato lado a lado e com mesma altura */}
            <div className="flex items-stretch gap-4 flex-col sm:flex-row">
              <div className="bg-gradient-to-br from-[#F2F4FD] to-white rounded-xl p-5 flex flex-col items-center justify-center gap-3 border border-[#E5E9FA] flex-1 min-w-0">
                <div className="text-4xl font-bold text-[#8494E9]">{nota}</div>
                <div className="flex gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <svg
                      key={i}
                      className={`w-4 h-4 ${i < Math.round(nota) ? "text-yellow-400" : "text-gray-300"}`}
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.967a1 1 0 00.95.69h4.175c.969 0 1.371 1.24.588 1.81l-3.38 2.455a1 1 0 00-.364 1.118l1.287 3.966c.3.922-.755 1.688-1.54 1.118l-3.38-2.454a1 1 0 00-1.175 0l-3.38 2.454c-.784.57-1.838-.196-1.54-1.118l1.287-3.966a1 1 0 00-.364-1.118L2.05 9.394c-.783-.57-.38-1.81.588-1.81h4.175a1 1 0 00.95-.69l1.286-3.967z" />
                    </svg>
                  ))}
                </div>
                <div className="text-center">
                  <span className="block text-base font-bold text-[#212529] whitespace-nowrap">{statusDaNota}</span>
                  <span className="block text-xs text-[#6C757D] mt-1">Avaliação média</span>
                </div>
              </div>
              <button
                className={`bg-gradient-to-br from-[#F2F4FD] to-white p-5 border border-[#E5E9FA] font-semibold rounded-xl transition-all flex flex-col items-center justify-center gap-3 text-center min-w-[180px] flex-shrink-0 ${
                  hasContrato || editMode
                    ? "text-[#8494E9] hover:bg-[#F2F4FD] cursor-pointer"
                    : "text-gray-400 cursor-not-allowed opacity-60"
                }`}
                type="button"
                onClick={async () => {
                  if (hasContrato || editMode) {
                    setModalContratoOpen(true);
                    // Ativa o carregamento da prévia e refetch quando o modal é aberto
                    setShouldLoadPrevia(true);
                    try {
                      await refetchPreviaContrato();
                    } catch (error) {
                      console.error('[Contrato] Erro ao buscar prévia do contrato:', error);
                    }
                  }
                }}
                disabled={!hasContrato && !editMode}
              >
                <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#8494E9]/10">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </span>
                <span className="leading-tight text-sm">{hasContrato ? "Ver contrato" : (editMode ? "Emitir contrato" : "Ver contrato")}</span>
              </button>
            </div>
          </div>

          {/* Botões de Ação */}
          <div className="flex flex-wrap gap-3 mt-6 pt-4 border-t border-[#E5E9FA]">
            {psicologo.Status !== "Ativo" && (
              <button
                className="bg-gradient-to-r from-[#8494E9] to-[#6B7FD7] hover:from-[#6B7FD7] hover:to-[#8494E9] text-white font-semibold px-5 py-2.5 rounded-lg transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                type="button"
                onClick={handleAprovar}
                disabled={updatePsicologoMutation.status === "pending"}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                {updatePsicologoMutation.status === "pending" ? "Aprovando..." : "Aprovar"}
              </button>
            )}
            <button
              className="bg-red-600 hover:bg-red-700 text-white font-semibold px-5 py-2.5 rounded-lg transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              disabled={deletePsicologoMutation.status === "pending"}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M10 4h4a1 1 0 011 1v2H9V5a1 1 0 011-1z" />
              </svg>
              {deletePsicologoMutation.status === "pending" ? "Deletando..." : "Deletar"}
            </button>
          </div>
        </div>

        {/* Status e Datas (direita) */}
        <Section
          title="Status e Datas"
          editMode={editMode}
          right={
            editMode ? (
              <select
                className="px-3 py-1.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 font-medium text-gray-800"
                value={statusEdit}
                onChange={e => setStatusEdit(e.target.value)}
              >
                <option value="Ativo">Ativo</option>
                <option value="Inativo">Inativo</option>
                <option value="Bloqueado">Bloqueado</option>
                <option value="Pendente">Pendente</option>
                <option value="Deletado">Deletado</option>
                <option value="Em Análise">Em Análise</option>
                <option value="Em Análise Contrato">Em Análise Contrato</option>
              </select>
            ) : (
              <span className={`px-4 py-2 rounded-full font-semibold text-white whitespace-nowrap
                ${psicologo.Status === "Ativo" ? "bg-green-500" : psicologo.Status === "Pendente" ? "bg-yellow-500" : "bg-gray-500"}
              `}>
                Status: {formatarStatus(psicologo.Status)}
              </span>
            )
          }
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            <Input label="Data de Cadastro" value={formatDateBR(dataCadastro?.split("T")[0] || "")} disabled />
            <Input label="Aprovação" value={dataAprovacao ? formatDateBR(dataAprovacao?.split("T")[0]) : "-"} disabled />
            <Input label="Último Acesso" value={formatDateBR(ultimoAcesso?.split("T")[0] || "")} disabled />
          </div>
          {editMode && (
            <button
              className="w-full mt-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-lg transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              type="button"
              onClick={handleSalvarEdicao}
              disabled={updatePsicologoMutation.status === "pending"}
            >
              {updatePsicologoMutation.status === "pending" ? "Salvando..." : "Salvar edição"}
            </button>
          )}
        </Section>
      </div>

      <div className="flex flex-col gap-6">
        {/* 1. Dados Pessoais */}
        <Section 
          title={isAutonomo ? "Dados Pessoais" : "Dados Pessoais - Representante Legal da Empresa"}
          onEdit={() => setModal("dadosPessoais")}
          editMode={editMode}
        >
            {isAutonomo ? (
              <>
                <Input 
                  label="Pronome" 
                  value={pronomeEdit} 
                  onChange={(e) => setPronomeEdit(e.target.value)}
                  disabled={!editMode} 
                />
                <Input 
                  label="Nome" 
                  value={nomeEdit} 
                  onChange={(e) => setNomeEdit(e.target.value)}
                  disabled={!editMode} 
                />
                <Input 
                  label="E-mail" 
                  value={emailEdit} 
                  onChange={(e) => setEmailEdit(e.target.value)}
                  disabled={!editMode} 
                />
                <Input 
                  label="Telefone" 
                  value={telefoneEdit} 
                  onChange={(e) => setTelefoneEdit(e.target.value)}
                  disabled={!editMode} 
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input 
                    label="CPF" 
                    value={cpfEdit} 
                    onChange={(e) => setCpfEdit(e.target.value)}
                    disabled={!editMode} 
                  />
                  <Input 
                    label="RG" 
                    value={rgEdit} 
                    onChange={(e) => setRgEdit(e.target.value)}
                    disabled={!editMode} 
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input 
                    label="Data de Nascimento" 
                    value={dataNascimentoEdit} 
                    onChange={(e) => setDataNascimentoEdit(e.target.value)}
                    disabled={!editMode} 
                    type="date"
                  />
                  <Input 
                    label="Gênero" 
                    value={sexoEdit} 
                    onChange={(e) => setSexoEdit(e.target.value)}
                    disabled={!editMode} 
                  />
                </div>
                <Input 
                  label="Raça/Cor" 
                  value={racaCorEdit} 
                  onChange={(e) => setRacaCorEdit(e.target.value)}
                  disabled={!editMode} 
                />
              </>
            ) : (
              <>
                <Input 
                  label="Nome Completo" 
                  value={nomeEdit} 
                  onChange={(e) => setNomeEdit(e.target.value)}
                  disabled={!editMode} 
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input 
                    label="CPF" 
                    value={cpfEdit} 
                    onChange={(e) => setCpfEdit(e.target.value)}
                    disabled={!editMode} 
                  />
                  <Input 
                    label="RG" 
                    value={rgEdit} 
                    onChange={(e) => setRgEdit(e.target.value)}
                    disabled={!editMode} 
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input 
                    label="Telefone" 
                    value={telefoneEdit} 
                    onChange={(e) => setTelefoneEdit(e.target.value)}
                    disabled={!editMode} 
                  />
                  <Input 
                    label="E-mail" 
                    value={emailEdit} 
                    onChange={(e) => setEmailEdit(e.target.value)}
                    disabled={!editMode} 
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input 
                    label="Gênero" 
                    value={sexoEdit} 
                    onChange={(e) => setSexoEdit(e.target.value)}
                    disabled={!editMode} 
                  />
                  <Input 
                    label="Pronome" 
                    value={pronomeEdit} 
                    onChange={(e) => setPronomeEdit(e.target.value)}
                    disabled={!editMode} 
                  />
                </div>
                <Input 
                  label="Raça/Cor" 
                  value={racaCorEdit} 
                  onChange={(e) => setRacaCorEdit(e.target.value)}
                  disabled={!editMode} 
                />
              </>
            )}
          </Section>

          {/* 2. Endereço (Representante Legal) */}
          <Section 
            title={isPessoaJuridica ? "Endereço - Representante Legal" : "Endereço"}
            onEdit={() => setModal("endereco")}
            editMode={editMode}
          >
            <Input 
              label="CEP" 
              value={enderecoEdit.Cep} 
              onChange={(e) => setEnderecoEdit({ ...enderecoEdit, Cep: e.target.value })}
              disabled={!editMode} 
            />
            <Input 
              label="Rua" 
              value={enderecoEdit.Rua} 
              onChange={(e) => setEnderecoEdit({ ...enderecoEdit, Rua: e.target.value })}
              disabled={!editMode} 
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input 
                label="Número" 
                value={enderecoEdit.Numero} 
                onChange={(e) => setEnderecoEdit({ ...enderecoEdit, Numero: e.target.value })}
                disabled={!editMode} 
              />
              <Input 
                label="Complemento" 
                value={enderecoEdit.Complemento} 
                onChange={(e) => setEnderecoEdit({ ...enderecoEdit, Complemento: e.target.value })}
                disabled={!editMode} 
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input 
                label="Bairro" 
                value={enderecoEdit.Bairro} 
                onChange={(e) => setEnderecoEdit({ ...enderecoEdit, Bairro: e.target.value })}
                disabled={!editMode} 
              />
              <Input 
                label="Cidade" 
                value={enderecoEdit.Cidade} 
                onChange={(e) => setEnderecoEdit({ ...enderecoEdit, Cidade: e.target.value })}
                disabled={!editMode} 
              />
              <Input 
                label="Estado" 
                value={enderecoEdit.Estado} 
                onChange={(e) => setEnderecoEdit({ ...enderecoEdit, Estado: e.target.value })}
                disabled={!editMode} 
              />
            </div>
          </Section>

          {/* 3. Dados da Empresa (apenas para PJ) */}
          {isPessoaJuridica && (
            <Section 
              title="Dados da Empresa"
              onEdit={() => setModal("juridico")}
              editMode={editMode}
            >
              <div className="space-y-4 mb-6">
                <Input 
                  label="Razão Social" 
                  value={pessoaJuridicaEdit.RazaoSocial} 
                  onChange={(e) => setPessoaJuridicaEdit({ ...pessoaJuridicaEdit, RazaoSocial: e.target.value })}
                  disabled={!editMode} 
                />
                <Input 
                  label="Nome Fantasia" 
                  value={pessoaJuridicaEdit.NomeFantasia} 
                  onChange={(e) => setPessoaJuridicaEdit({ ...pessoaJuridicaEdit, NomeFantasia: e.target.value })}
                  disabled={!editMode} 
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                <Input 
                  label="CNPJ" 
                  value={pessoaJuridicaEdit.CNPJ} 
                  onChange={(e) => setPessoaJuridicaEdit({ ...pessoaJuridicaEdit, CNPJ: e.target.value })}
                  disabled={!editMode} 
                />
                <Input 
                  label="Inscrição Estadual" 
                  value={pessoaJuridicaEdit.InscricaoEstadual} 
                  onChange={(e) => setPessoaJuridicaEdit({ ...pessoaJuridicaEdit, InscricaoEstadual: e.target.value })}
                  disabled={!editMode} 
                />
              </div>
              <div className="mb-4">
                <label className="block text-xs font-semibold text-[#6C757D] uppercase tracking-wider mb-2">Simples Nacional</label>
                <select
                  value={pessoaJuridicaEdit.SimplesNacional ? "Sim" : "Não"}
                  onChange={(e) => setPessoaJuridicaEdit({ ...pessoaJuridicaEdit, SimplesNacional: e.target.value === "Sim" })}
                  disabled={!editMode}
                  className={`w-full px-4 py-2.5 border rounded-lg shadow-sm text-sm font-medium transition-all border-[#E5E9FA] ${
                    !editMode 
                      ? "bg-[#F9FAFB] text-[#212529] cursor-not-allowed" 
                      : "bg-white text-[#212529] focus:ring-2 focus:ring-[#8494E9] focus:border-[#8494E9]"
                  }`}
                >
                  <option value="Sim">Sim</option>
                  <option value="Não">Não</option>
                </select>
              </div>
              {pessoaJuridicaEdit.DescricaoExtenso && (
                <TextArea 
                  label="Descrição por Extenso" 
                  value={pessoaJuridicaEdit.DescricaoExtenso} 
                  onChange={(e) => setPessoaJuridicaEdit({ ...pessoaJuridicaEdit, DescricaoExtenso: e.target.value })}
                  disabled={!editMode} 
                />
              )}
              <button
                className="w-full mt-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-lg transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                type="button"
                onClick={handleSalvarEdicao}
                disabled={updatePsicologoMutation.isPending}
              >
                {updatePsicologoMutation.isPending ? "Salvando..." : "Salvar alterações da empresa"}
              </button>
            </Section>
          )}

          {/* 4. Endereço da Empresa (apenas para PJ) */}
          {isPessoaJuridica && billingAddress && (
            <Section 
              title="Endereço - Empresa"
              onEdit={() => setModal("enderecoEmpresa")}
              editMode={editMode}
            >
              <Input 
                label="CEP" 
                value={billingAddressEdit.Cep} 
                onChange={(e) => setBillingAddressEdit({ ...billingAddressEdit, Cep: e.target.value })}
                disabled={!editMode} 
              />
              <Input 
                label="Rua" 
                value={billingAddressEdit.Rua} 
                onChange={(e) => setBillingAddressEdit({ ...billingAddressEdit, Rua: e.target.value })}
                disabled={!editMode} 
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input 
                  label="Número" 
                  value={billingAddressEdit.Numero} 
                  onChange={(e) => setBillingAddressEdit({ ...billingAddressEdit, Numero: e.target.value })}
                  disabled={!editMode} 
                />
                <Input 
                  label="Complemento" 
                  value={billingAddressEdit.Complemento} 
                  onChange={(e) => setBillingAddressEdit({ ...billingAddressEdit, Complemento: e.target.value })}
                  disabled={!editMode} 
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Input 
                  label="Bairro" 
                  value={billingAddressEdit.Bairro} 
                  onChange={(e) => setBillingAddressEdit({ ...billingAddressEdit, Bairro: e.target.value })}
                  disabled={!editMode} 
                />
                <Input 
                  label="Cidade" 
                  value={billingAddressEdit.Cidade} 
                  onChange={(e) => setBillingAddressEdit({ ...billingAddressEdit, Cidade: e.target.value })}
                  disabled={!editMode} 
                />
                <Input 
                  label="Estado" 
                  value={billingAddressEdit.Estado} 
                  onChange={(e) => setBillingAddressEdit({ ...billingAddressEdit, Estado: e.target.value })}
                  disabled={!editMode} 
                />
              </div>
              <button
                className="w-full mt-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-lg transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                type="button"
                onClick={handleSalvarEdicao}
                disabled={updatePsicologoMutation.isPending}
              >
                {updatePsicologoMutation.isPending ? "Salvando..." : "Salvar alterações de endereço da empresa"}
              </button>
            </Section>
          )}
          <Section 
            title="Dados Profissionais"
            onEdit={() => setModal("profissionais")}
            editMode={editMode}
          >
            <div className="mb-4">
              <label className="block text-xs font-semibold text-[#6C757D] uppercase tracking-wider mb-2">CRP</label>
              <p className="text-sm font-medium text-[#212529]">{crp || "-"}</p>
            </div>
            {/* Campos adicionais do perfil profissional */}
            {psicologo.ProfessionalProfiles?.[0] && (
              <>
                <div className="mb-4">
                  <label className="block text-xs font-semibold text-[#6C757D] uppercase tracking-wider mb-2">Tempo de experiência clínica</label>
                  <p className="text-sm font-medium text-[#212529]">
                    {normalizeExperienciaClinica(psicologo.ProfessionalProfiles[0].ExperienciaClinica) || "-"}
                  </p>
                </div>
                {Array.isArray(psicologo.ProfessionalProfiles?.[0]?.Idiomas) && psicologo.ProfessionalProfiles[0].Idiomas.length > 0 && (
                  <div className="mb-4">
                    <label className="block text-xs font-semibold text-[#6C757D] uppercase tracking-wider mb-2">Idiomas</label>
                    <div className="flex flex-wrap gap-2">
                      {psicologo.ProfessionalProfiles[0].Idiomas.map((i: string) => (
                        <span key={i} className="bg-[#EDF3F8] text-[#0A66C2] text-xs px-3 py-1 rounded-full font-semibold shadow-sm">
                          {i}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {Array.isArray(psicologo.ProfessionalProfiles?.[0]?.Abordagens) && psicologo.ProfessionalProfiles[0].Abordagens.length > 0 && (
                  <div className="mb-4">
                    <label className="block text-xs font-semibold text-[#6C757D] uppercase tracking-wider mb-2">Abordagens</label>
                    <div className="flex flex-wrap gap-2">
                      {psicologo.ProfessionalProfiles[0].Abordagens.map((a: string) => (
                        <span key={a} className="bg-[#E3E4F3] text-[#23253A] text-xs px-3 py-1 rounded-full font-semibold shadow-sm">
                          {normalizeEnum(a)}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {Array.isArray(psicologo.ProfessionalProfiles?.[0]?.Queixas) && psicologo.ProfessionalProfiles[0].Queixas.length > 0 && (
                  <div className="mb-4">
                    <label className="block text-xs font-semibold text-[#6C757D] uppercase tracking-wider mb-2">Queixas</label>
                    <div className="flex flex-wrap gap-2">
                      {psicologo.ProfessionalProfiles[0].Queixas.map((q: string) => (
                        <span key={q} className="bg-[#FFE6E6] text-[#E57373] text-xs px-3 py-1 rounded-full font-semibold shadow-sm">
                          {normalizeEnum(q)}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {psicologo.ProfessionalProfiles?.[0]?.SobreMim && (
                  <div className="mb-4">
                    <label className="block text-xs font-semibold text-[#6C757D] uppercase tracking-wider mb-2">Sobre mim</label>
                    <p className="text-sm font-medium text-[#212529] whitespace-pre-wrap">{psicologo.ProfessionalProfiles[0].SobreMim}</p>
                  </div>
                )}
              </>
            )}
          </Section>

          <Section 
            title="Dados Bancários"
            onEdit={() => setModal("bancario")}
            editMode={editMode}
          >
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-yellow-800">
                <strong>Atenção!</strong> A Chave PIX deverá ser obrigatoriamente o CPF (caso você seja autônomo atualmente) ou o CNPJ da sua empresa.
              </p>
            </div>
            <Input 
              label="Chave PIX" 
              value={
                isAutonomo 
                  ? (psicologo?.ProfessionalProfiles?.[0]?.DadosBancarios?.ChavePix || "-")
                  : (pessoaJuridica?.DadosBancarios?.ChavePix || "-")
              } 
              disabled={!editMode} 
            />
          </Section>
          <Section title="Documentos Enviados">
            {loadingDocuments ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                <span className="ml-3 text-gray-600">Carregando documentos...</span>
              </div>
            ) : errorDocuments ? (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                <p className="text-red-600 text-sm">{errorDocuments}</p>
              </div>
            ) : documentsFromHook.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {documentsFromHook.map((doc) => {
                  const expired = isUrlExpired(doc.expiresAt);
                  const hasError = !doc.fileExists || !!doc.error;

                  return (
                    <div
                      key={doc.id}
                      className={`bg-gradient-to-br from-white to-[#F9FAFB] border rounded-xl shadow-sm p-6 flex flex-col items-center hover:shadow-md transition-all ${
                        hasError ? 'border-red-300' : 'border-[#E5E9FA]'
                      }`}
                    >
                      {/* Ícone centralizado (mesmo do botão "Emitir contrato") */}
                      <span className="inline-flex items-center justify-center w-14 h-14 rounded bg-[#8494E9]/10 text-[#8494E9] mb-4">
                        <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </span>
                      {/* Status e expiração */}
                      <div className="flex items-center gap-2 flex-wrap justify-center mb-2">
                        <span className={`inline-flex items-center text-xs px-2.5 py-1 rounded-full font-semibold ${
                          doc.fileExists ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
                        }`}>
                          {doc.fileExists ? "✓ Recebido" : "⚠ Pendente"}
                        </span>
                        {expired && (
                          <span className="inline-flex items-center text-xs px-2.5 py-1 rounded-full font-semibold bg-orange-100 text-orange-700">
                            🕐 URL expirada
                          </span>
                        )}
                      </div>

                      {/* Descrição */}
                      {doc.description && (
                        <p className="text-xs text-[#6C757D] mb-2 text-center">{doc.description}</p>
                      )}

                      {/* Tempo de expiração */}
                      {!expired && doc.expiresAt && (
                        <p className="text-xs text-gray-500 mb-2 text-center">
                          Expira em: {formatExpirationTime(doc.expiresAt)}
                        </p>
                      )}

                      {/* Erro */}
                      {hasError && (
                        <p className="text-xs text-red-600 mb-2 text-center">
                          {doc.error || 'Arquivo não encontrado no servidor'}
                        </p>
                      )}

                      {/* Botões de Ação */}
                      <div className="flex flex-col items-center gap-2 mt-3 w-full">
                        {/* Botões principais: Visualizar e Baixar */}
                        {doc.url && !expired && doc.fileExists && (
                          <div className="flex flex-row items-center justify-center gap-3 w-full">
                            <button
                              type="button"
                              onClick={() => setModalDoc({
                                id: doc.id,
                                nome: doc.fileName,
                                status: doc.fileExists ? "Recebido" : "Pendente",
                                url: doc.url ?? undefined,
                                descricao: doc.description,
                                expiresAt: doc.expiresAt ?? null,
                              })}
                              className="flex items-center justify-center gap-1.5 text-[#8494E9] hover:text-[#6B7FD7] text-xs font-semibold transition-colors px-3 py-1.5 rounded-lg hover:bg-[#8494E9]/5"
                              title="Visualizar documento"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                              Visualizar
                            </button>
                            <button
                              type="button"
                              onClick={async () => {
                                try {
                                  await downloadDocument(doc.id);
                                  toast.success('Download iniciado!');
                                } catch {
                                  toast.error('Erro ao baixar documento');
                                }
                              }}
                              className="flex items-center justify-center gap-1.5 text-green-600 hover:text-green-700 text-xs font-semibold transition-colors px-3 py-1.5 rounded-lg hover:bg-green-50"
                              title="Baixar documento"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                              </svg>
                              Baixar
                            </button>
                          </div>
                        )}
                        
                        {/* Separador visual (linha divisória) */}
                        {doc.url && !expired && doc.fileExists && (
                          <div className="w-full border-t border-gray-200 my-1"></div>
                        )}
                        
                        {/* Botão Excluir (sempre visível, destacado) */}
                        <button
                          type="button"
                          onClick={async () => {
                            if (confirm('Tem certeza que deseja excluir este documento? Esta ação não pode ser desfeita.')) {
                              setDeletingDocumentId(doc.id);
                              try {
                                await deleteDocument(doc.id);
                                toast.success('Documento excluído com sucesso!');
                              } catch (error) {
                                const errorMessage = error instanceof Error ? error.message : 'Erro ao excluir documento';
                                toast.error(errorMessage);
                              } finally {
                                setDeletingDocumentId(null);
                              }
                            }
                          }}
                          disabled={deletingDocumentId === doc.id}
                          className={`flex items-center justify-center gap-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 text-xs font-semibold transition-all px-3 py-1.5 rounded-lg border border-red-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent w-full ${
                            deletingDocumentId === doc.id ? 'opacity-50 cursor-not-allowed' : ''
                          }`}
                          title="Excluir documento"
                        >
                          {deletingDocumentId === doc.id ? (
                            <>
                              <span className="animate-spin h-4 w-4 border-2 border-red-600 border-t-transparent rounded-full"></span>
                              Excluindo...
                            </>
                          ) : (
                            <>
                              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                              Excluir
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : documentos.length > 0 ? (
              // Fallback para documentos antigos (sem usar o hook)
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {documentos.map((doc, i) => (
                  <div
                    key={i}
                    className="bg-gradient-to-br from-white to-[#F9FAFB] border border-[#E5E9FA] rounded-xl shadow-sm p-4 hover:shadow-md transition-colors"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <span className="font-semibold text-sm text-[#212529] block mb-1">
                          {doc.nome.replace(/(\w)(\w*)/g, (_, f, r) => f.toUpperCase() + r.toLowerCase()).replace(/\s+/g, ' ')}
                        </span>
                        <span className={`inline-flex items-center text-xs px-2.5 py-1 rounded-full font-semibold ${
                          doc.status === "Recebido" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
                        }`}>
                          {doc.status}
                        </span>
                      </div>
                    </div>
                    {doc.descricao && (
                      <p className="text-xs text-[#6C757D] mb-3">{doc.descricao}</p>
                    )}
                    <div className="flex items-center gap-2">
                      {doc.url && (
                        <>
                          <button
                            type="button"
                            className="flex items-center gap-1.5 text-[#8494E9] hover:text-[#6B7FD7] text-xs font-semibold transition-colors"
                            onClick={() => setModalDoc(doc)}
                            title="Ver documento"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            Visualizar
                          </button>
                          <a
                            href={doc.url}
                            download
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 text-green-600 hover:text-green-700 text-xs font-semibold transition-colors"
                            title="Baixar documento"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                            Baixar
                          </a>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#F2F4FD] mb-4">
                  <svg className="w-8 h-8 text-[#8494E9]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <p className="text-[#6C757D] text-base font-medium">Nenhum documento enviado</p>
              </div>
            )}
          </Section>
        </div>

      <div className="mt-8">
        <h2 className="text-xl font-bold text-[#212529] mb-4 flex items-center gap-2">
          <svg className="w-6 h-6 text-[#8494E9]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Dados Financeiros
        </h2>
        <Section title="Últimos 5 pagamentos">
          {[].length === 0 ? (
            <div className="text-center py-12">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#F2F4FD] mb-4">
                <svg className="w-8 h-8 text-[#8494E9]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className="text-[#6C757D] text-base font-medium">Ainda não há movimentações financeiras para esse psicólogo</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm text-[#212529]">
                <thead>
                  <tr className="bg-[#F9FAFB] text-left">
                    <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider text-[#6C757D]">Nome do Plano</th>
                    <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider text-[#6C757D]">Data de Início</th>
                    <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider text-[#6C757D]">Data de Fim</th>
                    <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider text-[#6C757D]">Status</th>
                    <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider text-[#6C757D]">Dia de Pagamento</th>
                    <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider text-[#6C757D]">Status do Pagamento</th>
                  </tr>
                </thead>
                <tbody>
                  {[{
                    plano: "Plano Mensal",
                    inicio: "2025-08-01",
                    fim: "2025-08-31",
                    status: "Ativo",
                    diaPagamento: "2025-08-05",
                    statusPagamento: "Pago"
                  }, {
                    plano: "Plano Mensal",
                    inicio: "2025-07-01",
                    fim: "2025-07-31",
                    status: "Expirado",
                    diaPagamento: "2025-07-05",
                    statusPagamento: "Pago"
                  }, {
                    plano: "Plano Mensal",
                    inicio: "2025-06-01",
                    fim: "2025-06-30",
                    status: "Expirado",
                    diaPagamento: "2025-06-05",
                    statusPagamento: "Pago"
                  }, {
                    plano: "Plano Mensal",
                    inicio: "2025-05-01",
                    fim: "2025-05-31",
                    status: "Expirado",
                    diaPagamento: "2025-05-05",
                    statusPagamento: "Pago"
                  }, {
                    plano: "Plano Mensal",
                    inicio: "2025-04-01",
                    fim: "2025-04-30",
                    status: "Expirado",
                    diaPagamento: "2025-04-05",
                    statusPagamento: "Pago"
                  }].map((p, idx) => (
                    <tr key={idx} className="border-b border-[#E5E9FA] hover:bg-[#F9FAFB] transition-colors">
                      <td className="px-4 py-3 font-medium">{p.plano}</td>
                      <td className="px-4 py-3 text-[#6C757D]">{formatDateBR(p.inicio)}</td>
                      <td className="px-4 py-3 text-[#6C757D]">{formatDateBR(p.fim)}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                          p.status === "Ativo" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"
                        }`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[#6C757D]">{formatDateBR(p.diaPagamento)}</td>
                      <td className="px-4 py-3">
                        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                          {p.statusPagamento}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>
        <h2 className="text-xl font-bold text-[#212529] mb-4 mt-8 flex items-center gap-2">
          <svg className="w-6 h-6 text-[#8494E9]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Consultas do Psicólogo
        </h2>
        {/* Filtros */}
        <div className="bg-white rounded-xl border border-[#E5E9FA] p-4 mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3 flex-1">
            <div className="flex items-center gap-2">
              <label className="text-sm text-[#6C757D] font-medium">Status</label>
              <select
                className="px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 text-sm"
                value={filtroStatus}
                onChange={(e) => setFiltroStatus(e.target.value)}
              >
                <option value="Todos">Todos</option>
                {todasOpcoesStatus.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2 flex-1">
              <label className="text-sm text-[#6C757D] font-medium">Paciente</label>
              <input
                type="text"
                placeholder="Buscar por nome"
                className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 text-sm"
                value={filtroBusca}
                onChange={(e) => setFiltroBusca(e.target.value)}
              />
            </div>
          </div>
          <div className="text-sm text-[#6C757D]">
            Total: {totalConsultasFiltradas} {filtroStatus !== "Todos" || filtroBusca ? `de ${totalConsultasGeral}` : ""}
          </div>
        </div>

        {/* Tabela de consultas agendadas (qualquer status) */}
        {consultasOrdenadas.length === 0 ? (
          <div className="bg-white rounded-xl shadow-md p-12 border border-[#E5E9FA] text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#F2F4FD] mb-4">
              <svg className="w-8 h-8 text-[#8494E9]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-[#6C757D] text-base font-medium">Não existem consultas para os filtros selecionados</p>
          </div>
        ) : (
          <div className="overflow-x-auto bg-white rounded-xl border border-[#E5E9FA]">
            <table className="min-w-full text-sm text-[#212529]">
              <thead>
                <tr className="bg-[#F9FAFB] text-left">
                  <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider text-[#6C757D]">Data</th>
                  <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider text-[#6C757D]">Hora</th>
                  <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider text-[#6C757D]">Paciente</th>
                  <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider text-[#6C757D]">Status Consulta</th>
                  <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider text-[#6C757D]">Valor</th>
                </tr>
              </thead>
              <tbody>
                {consultasPaginadas.map((c) => (
                  <tr key={c.Id} className="border-b border-[#E5E9FA] hover:bg-[#F9FAFB] transition-colors">
                    <td className="px-4 py-3">{formatDateBR((c.Data || "").split("T")[0])}</td>
                    <td className="px-4 py-3">{c.Hora || "--:--"}</td>
                    <td className="px-4 py-3">{c.Paciente || "-"}</td>
                    <td className="px-4 py-3">
                      {(() => {
                        const statusTag = getStatusTagInfo(c.Status);
                        return (
                          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${statusTag.bg} ${statusTag.text}`}>
                            {statusTag.texto}
                          </span>
                        );
                      })()}
                    </td>


                    <td className="px-4 py-3">{typeof c.Valor === 'number' ? `R$ ${c.Valor.toFixed(2).replace('.', ',')}` : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="flex justify-end items-center gap-3 mt-6 px-4 py-3">
          <button
            className="px-4 py-2 border border-[#E5E9FA] rounded-lg text-[#212529] font-medium hover:bg-[#F9FAFB] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            onClick={() => setPagina((p) => Math.max(1, p - 1))}
            disabled={pagina === 1}
          >
            ← Anterior
          </button>
          <span className="text-sm text-[#6C757D] font-medium">
            Página {pagina} de {totalPaginas || 1}
          </span>
          <button
            className="px-4 py-2 border border-[#E5E9FA] rounded-lg text-[#212529] font-medium hover:bg-[#F9FAFB] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
            disabled={pagina === totalPaginas || totalPaginas === 0}
          >
            Próxima →
          </button>
        </div>
      </div>

      <DocumentoModal
        open={!!modalDoc}
        onClose={() => setModalDoc(null)}
        doc={modalDoc}
      />
      <ModalPreviaContratoPsicologo
        open={modalContratoOpen}
        onClose={() => {
          setModalContratoOpen(false);
          // Reseta o estado para não carregar automaticamente na próxima vez
          setShouldLoadPrevia(false);
        }}
        contratoHtml={previaContratoData || null}
        isLoading={isLoadingPrevContrato}
        emitirLoading={gerarContratoMutation.status === "pending"}
        onlyView={!editMode}
        onEmitirContrato={() => {
          if (idStr) {
            gerarContratoMutation.mutate(idStr, {
              onSuccess: async () => {
                toast.success('Contrato emitido com sucesso!');
                setModalContratoOpen(false);
                // Reseta o estado após emitir contrato
                setShouldLoadPrevia(false);
                // Recarrega a lista de documentos para mostrar o contrato gerado
                if (firstProfileId) {
                  try {
                    await documentsHook.refetch();
                    console.log('[Contrato] Lista de documentos atualizada após geração do contrato');
                  } catch (error) {
                    console.error('[Contrato] Erro ao recarregar documentos:', error);
                  }
                }
              },
              onError: (error: unknown) => {
                const errorMessage = error instanceof Error ? error.message : 'Erro ao emitir contrato';
                toast.error(errorMessage);
              },
            });
          }
        }}
      />

      {/* Modais de edição */}
      <EditModal
        open={modal === "dadosPessoais"}
        title="Editar Dados Pessoais"
        onClose={() => setModal(null)}
        isLoading={updatePsicologoMutation.isPending}
      >
        {enums && psicologo && (
          <FormDadosPessoaisAdmin 
            psicologo={psicologo} 
            enums={enums} 
            onSuccess={() => {
              setModal(null);
              refetch();
            }} 
          />
        )}
      </EditModal>

      <EditModal
        open={modal === "endereco"}
        title="Editar Endereço"
        onClose={() => setModal(null)}
        isLoading={updatePsicologoMutation.isPending}
      >
        {psicologo && (
          <FormEnderecoAdmin 
            psicologo={psicologo} 
            onSuccess={() => {
              setModal(null);
              refetch();
            }} 
          />
        )}
      </EditModal>

      {isPessoaJuridica && (
        <>
          <EditModal
            open={modal === "enderecoEmpresa"}
            title="Editar Endereço da Empresa"
            onClose={() => setModal(null)}
            isLoading={updatePsicologoMutation.isPending}
          >
            {psicologo && (
              <FormEnderecoAdmin 
                psicologo={psicologo} 
                isBillingAddress={true}
                onSuccess={() => {
                  setModal(null);
                  refetch();
                }} 
              />
            )}
          </EditModal>

          <EditModal
            open={modal === "juridico"}
            title="Editar Dados da Empresa"
            onClose={() => setModal(null)}
            isLoading={updatePsicologoMutation.isPending}
          >
            {psicologo && (
              <FormJuridicoAdmin 
                psicologo={psicologo} 
                onSuccess={() => {
                  setModal(null);
                  refetch();
                }} 
              />
            )}
          </EditModal>
        </>
      )}

      <EditModal
        open={modal === "bancario"}
        title="Editar Dados Bancários"
        onClose={() => setModal(null)}
        isLoading={updatePsicologoMutation.isPending}
      >
        {psicologo && (
          <FormBancarioAdmin 
            psicologo={psicologo} 
            onSuccess={() => {
              setModal(null);
              refetch();
            }} 
          />
        )}
      </EditModal>

      <EditModal
        open={modal === "profissionais"}
        title="Editar Dados Profissionais"
        onClose={() => setModal(null)}
        isLoading={updatePsicologoMutation.isPending}
      >
        {enums && psicologo && (
          <FormProfissionaisAdmin 
            psicologo={psicologo} 
            enums={enums}
            onSuccess={() => {
              setModal(null);
              refetch();
            }} 
          />
        )}
      </EditModal>
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Confirmar exclusão</h3>
            <p className="text-sm text-gray-600 mb-6">
              Tem certeza que deseja excluir este psicólogo? Esta ação remove documentos e imagens do storage e mantém o histórico de consultas e financeiro.
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deletePsicologoMutation.status === "pending"}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                onClick={handleDeletePsicologo}
                disabled={deletePsicologoMutation.status === "pending"}
              >
                {deletePsicologoMutation.status === "pending" ? "Deletando..." : "Confirmar exclusão"}
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.main>
  );
}