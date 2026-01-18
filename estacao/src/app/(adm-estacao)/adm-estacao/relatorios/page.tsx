"use client";
import React, { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import {
    useClientesCadastroReport,
    usePsicologosCredenciamentoReport,
    usePlanosMovimentacaoReport,
    useAcessoResetReport,
    useSessoesHistoricoReport,
    useAvaliacoesSessoesReport,
    useFaturamentoClienteReport,
    useAcessoResetPsicologoReport,
    useAgendaPsicologoReport,
    useCarteiraPagamentoPsicologoReport,
    useOnboardingObjetivosReport,
} from "@/hooks/admin/useComprehensiveReports";
import {
    getClientesCadastroReport,
    getPsicologosCredenciamentoReport,
    getPlanosMovimentacaoReport,
    getAcessoResetReport,
    getAcessoResetPsicologoReport,
    getSessoesHistoricoReport,
    getAvaliacoesSessoesReport,
    getFaturamentoClienteReport,
    getAgendaPsicologoReport,
    getCarteiraPagamentoPsicologoReport,
    getOnboardingObjetivosReport,
    ComprehensiveReportFilters,
    type ComprehensiveReportResponse,
} from "@/services/admComprehensiveReports";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { 
    FileSpreadsheet, 
    FileText, 
    Calendar, 
    Filter, 
    Search, 
    X,
    BarChart3,
    TrendingUp,
    Users,
    DollarSign,
    FileBarChart,
    Sparkles,
    CreditCard,
    UserCheck,
    ClipboardList,
    Target,
    ArrowRight
} from "lucide-react";
import BreadcrumbsVoltar from "@/components/BreadcrumbsVoltar";
import toast from "react-hot-toast";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);

type ReportType =
    | "clientes-cadastro"
    | "psicologos-credenciamento"
    | "planos-movimentacao"
    | "acesso-reset"
    | "sessoes-historico"
    | "avaliacoes-sessoes"
    | "faturamento-cliente"
    | "acesso-reset-psicologo"
    | "agenda-psicologo"
    | "carteira-pagamento-psicologo"
    | "onboarding-objetivos";

interface ReportConfig {
    key: ReportType;
    label: string;
    description: string;
    icon: React.ReactNode;
    category: "usuarios" | "financeiro" | "operacional" | "analise";
    color: string;
    bgGradient: string;
}

const reports: ReportConfig[] = [
    {
        key: "clientes-cadastro",
        label: "Cadastro de Clientes",
        description: "Clientes ativos e inativos com informações completas",
        icon: <Users className="w-6 h-6" />,
        category: "usuarios",
        color: "text-blue-600",
        bgGradient: "from-blue-500 to-blue-600",
    },
    {
        key: "psicologos-credenciamento",
        label: "Credenciamento de Psicólogos",
        description: "Psicólogos ativos e inativos com status de credenciamento",
        icon: <UserCheck className="w-6 h-6" />,
        category: "usuarios",
        color: "text-indigo-600",
        bgGradient: "from-indigo-500 to-indigo-600",
    },
    {
        key: "planos-movimentacao",
        label: "Movimentações de Planos",
        description: "Aquisição e movimentações de planos dos clientes",
        icon: <ClipboardList className="w-6 h-6" />,
        category: "financeiro",
        color: "text-green-600",
        bgGradient: "from-green-500 to-green-600",
    },
    {
        key: "faturamento-cliente",
        label: "Faturamento por Cliente",
        description: "Transações de faturamento por cliente PF",
        icon: <DollarSign className="w-6 h-6" />,
        category: "financeiro",
        color: "text-emerald-600",
        bgGradient: "from-emerald-500 to-emerald-600",
    },
    {
        key: "carteira-pagamento-psicologo",
        label: "Carteira e Pagamento",
        description: "Carteira e pagamentos dos psicólogos",
        icon: <CreditCard className="w-6 h-6" />,
        category: "financeiro",
        color: "text-teal-600",
        bgGradient: "from-teal-500 to-teal-600",
    },
    {
        key: "sessoes-historico",
        label: "Histórico de Sessões",
        description: "Histórico completo de todas as sessões",
        icon: <BarChart3 className="w-6 h-6" />,
        category: "operacional",
        color: "text-purple-600",
        bgGradient: "from-purple-500 to-purple-600",
    },
    {
        key: "agenda-psicologo",
        label: "Agenda do Psicólogo",
        description: "Agenda completa dos psicólogos",
        icon: <Calendar className="w-6 h-6" />,
        category: "operacional",
        color: "text-pink-600",
        bgGradient: "from-pink-500 to-pink-600",
    },
    {
        key: "acesso-reset",
        label: "Acesso e Reset - Clientes",
        description: "Acesso à plataforma e reset de senha - Clientes e Psicólogos",
        icon: <Sparkles className="w-6 h-6" />,
        category: "operacional",
        color: "text-orange-600",
        bgGradient: "from-orange-500 to-orange-600",
    },
    {
        key: "acesso-reset-psicologo",
        label: "Acesso e Reset - Psicólogos",
        description: "Acesso à plataforma e reset de senha - Psicólogos",
        icon: <Sparkles className="w-6 h-6" />,
        category: "operacional",
        color: "text-amber-600",
        bgGradient: "from-amber-500 to-amber-600",
    },
    {
        key: "avaliacoes-sessoes",
        label: "Avaliações de Sessões",
        description: "Avaliações realizadas pelos pacientes",
        icon: <TrendingUp className="w-6 h-6" />,
        category: "analise",
        color: "text-yellow-600",
        bgGradient: "from-yellow-500 to-yellow-600",
    },
    {
        key: "onboarding-objetivos",
        label: "Objetivos do Onboarding",
        description: "Objetivos selecionados pelos pacientes no onboarding",
        icon: <Target className="w-6 h-6" />,
        category: "analise",
        color: "text-cyan-600",
        bgGradient: "from-cyan-500 to-cyan-600",
    },
];

export default function RelatoriosPage() {
    useProtectedRoute("Admin");

    const [selectedReport, setSelectedReport] = useState<ReportType | null>(null);
    const [filters, setFilters] = useState<ComprehensiveReportFilters>({
        startDate: dayjs().subtract(30, "days").format("YYYY-MM-DD"),
        endDate: dayjs().format("YYYY-MM-DD"),
    });
    const [searchTerm, setSearchTerm] = useState("");
    const [showFilters, setShowFilters] = useState(true);
    const [isExporting, setIsExporting] = useState(false);

    // Queries para cada relatório
    const clientesQuery = useClientesCadastroReport(filters);
    const psicologosQuery = usePsicologosCredenciamentoReport(filters);
    const planosQuery = usePlanosMovimentacaoReport(filters);
    const acessoResetQuery = useAcessoResetReport(filters);
    const sessoesQuery = useSessoesHistoricoReport(filters);
    const avaliacoesQuery = useAvaliacoesSessoesReport(filters);
    const faturamentoQuery = useFaturamentoClienteReport(filters);
    const acessoResetPsicologoQuery = useAcessoResetPsicologoReport(filters);
    const agendaQuery = useAgendaPsicologoReport(filters);
    const carteiraQuery = useCarteiraPagamentoPsicologoReport(filters);
    const onboardingQuery = useOnboardingObjetivosReport(filters);

    // Função para obter dados do relatório selecionado
    const getReportData = useMemo(() => {
        if (!selectedReport) return [];
        
        switch (selectedReport) {
            case "clientes-cadastro":
                return (clientesQuery.data as ComprehensiveReportResponse<Record<string, unknown>>)?.data || [];
            case "psicologos-credenciamento":
                return (psicologosQuery.data as ComprehensiveReportResponse<Record<string, unknown>>)?.data || [];
            case "planos-movimentacao":
                return (planosQuery.data as ComprehensiveReportResponse<Record<string, unknown>>)?.data || [];
            case "acesso-reset":
                return (acessoResetQuery.data as ComprehensiveReportResponse<Record<string, unknown>>)?.data || [];
            case "sessoes-historico":
                return (sessoesQuery.data as ComprehensiveReportResponse<Record<string, unknown>>)?.data || [];
            case "avaliacoes-sessoes":
                return (avaliacoesQuery.data as ComprehensiveReportResponse<Record<string, unknown>>)?.data || [];
            case "faturamento-cliente":
                return (faturamentoQuery.data as ComprehensiveReportResponse<Record<string, unknown>>)?.data || [];
            case "acesso-reset-psicologo":
                return (acessoResetPsicologoQuery.data as ComprehensiveReportResponse<Record<string, unknown>>)?.data || [];
            case "agenda-psicologo":
                return (agendaQuery.data as ComprehensiveReportResponse<Record<string, unknown>>)?.data || [];
            case "carteira-pagamento-psicologo":
                return (carteiraQuery.data as ComprehensiveReportResponse<Record<string, unknown>>)?.data || [];
            case "onboarding-objetivos":
                return (onboardingQuery.data as ComprehensiveReportResponse<Record<string, unknown>>)?.data || [];
            default:
                return [];
        }
    }, [
        clientesQuery.data,
        psicologosQuery.data,
        planosQuery.data,
        acessoResetQuery.data,
        sessoesQuery.data,
        avaliacoesQuery.data,
        faturamentoQuery.data,
        acessoResetPsicologoQuery.data,
        agendaQuery.data,
        carteiraQuery.data,
        onboardingQuery.data,
        selectedReport,
    ]);

    const getReportLoading = () => {
        if (!selectedReport) return false;
        
        switch (selectedReport) {
            case "clientes-cadastro":
                return clientesQuery.isLoading;
            case "psicologos-credenciamento":
                return psicologosQuery.isLoading;
            case "planos-movimentacao":
                return planosQuery.isLoading;
            case "acesso-reset":
                return acessoResetQuery.isLoading;
            case "sessoes-historico":
                return sessoesQuery.isLoading;
            case "avaliacoes-sessoes":
                return avaliacoesQuery.isLoading;
            case "faturamento-cliente":
                return faturamentoQuery.isLoading;
            case "acesso-reset-psicologo":
                return acessoResetPsicologoQuery.isLoading;
            case "agenda-psicologo":
                return agendaQuery.isLoading;
            case "carteira-pagamento-psicologo":
                return carteiraQuery.isLoading;
            case "onboarding-objetivos":
                return onboardingQuery.isLoading;
            default:
                return false;
        }
    };

    // Filtrar dados por termo de busca
    const filteredData = useMemo(() => {
        const data = getReportData;
        if (!searchTerm) return data;

        const searchLower = searchTerm.toLowerCase();
        return data.filter((item: Record<string, unknown>) => {
            return Object.values(item).some((value) => {
                if (value === null || value === undefined) return false;
                return String(value).toLowerCase().includes(searchLower);
            });
        });
    }, [getReportData, searchTerm]);

    // Função para exportar relatório
    const handleExport = async (format: "excel" | "pdf") => {
        if (!selectedReport || filteredData.length === 0) {
            toast.error("Nenhum dado para exportar");
            return;
        }

        setIsExporting(true);
        try {
            let blob: Blob;

            switch (selectedReport) {
                case "clientes-cadastro":
                    blob = (await getClientesCadastroReport(filters, format)) as Blob;
                    break;
                case "psicologos-credenciamento":
                    blob = (await getPsicologosCredenciamentoReport(filters, format)) as Blob;
                    break;
                case "planos-movimentacao":
                    blob = (await getPlanosMovimentacaoReport(filters, format)) as Blob;
                    break;
                case "acesso-reset":
                    blob = (await getAcessoResetReport(filters, format)) as Blob;
                    break;
                case "sessoes-historico":
                    blob = (await getSessoesHistoricoReport(filters, format)) as Blob;
                    break;
                case "avaliacoes-sessoes":
                    blob = (await getAvaliacoesSessoesReport(filters, format)) as Blob;
                    break;
                case "faturamento-cliente":
                    blob = (await getFaturamentoClienteReport(filters, format)) as Blob;
                    break;
                case "acesso-reset-psicologo":
                    blob = (await getAcessoResetPsicologoReport(filters, format)) as Blob;
                    break;
                case "agenda-psicologo":
                    blob = (await getAgendaPsicologoReport(filters, format)) as Blob;
                    break;
                case "carteira-pagamento-psicologo":
                    blob = (await getCarteiraPagamentoPsicologoReport(filters, format)) as Blob;
                    break;
                case "onboarding-objetivos":
                    blob = (await getOnboardingObjetivosReport(filters, format)) as Blob;
                    break;
                default:
                    return;
            }

            const url = window.URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = `${selectedReport}_${dayjs().format("YYYY-MM-DD_HH-mm-ss")}.${format === "excel" ? "xlsx" : "pdf"}`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);

            toast.success(`Relatório exportado em ${format.toUpperCase()} com sucesso!`);
        } catch (error: unknown) {
            console.error("Erro ao exportar relatório:", error);
            const errorMessage = error && typeof error === 'object' && 'response' in error
                ? (error as { response?: { data?: { error?: string } } })?.response?.data?.error
                : undefined;
            toast.error(errorMessage || "Erro ao exportar relatório");
        } finally {
            setIsExporting(false);
        }
    };

    // Função para formatar CPF
    const formatCPF = (value: string | number | null | undefined): string => {
        if (value === null || value === undefined) return "-";
        const numeric = String(value).replace(/\D/g, "");
        if (numeric.length === 11) {
            return numeric.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
        }
        return String(value);
    };

    // Função para formatar telefone
    const formatPhone = (value: string | number | null | undefined): string => {
        if (value === null || value === undefined) return "-";
        const numeric = String(value).replace(/\D/g, "");
        if (numeric.length === 10) {
            return numeric.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3");
        } else if (numeric.length === 11) {
            return numeric.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
        }
        return String(value);
    };

    const formatDateTime = (date: Date | string | null | undefined): string => {
        if (!date) return "-";
        return dayjs(date).tz("America/Sao_Paulo").format("DD/MM/YYYY HH:mm");
    };

    const formatCurrency = (value: number | null | undefined): string => {
        if (value === null || value === undefined) return "-";
        return new Intl.NumberFormat("pt-BR", {
            style: "currency",
            currency: "BRL",
        }).format(value);
    };

    const formatNumber = (value: number | null | undefined): string => {
        if (value === null || value === undefined) return "-";
        return new Intl.NumberFormat("pt-BR").format(value);
    };

    // Mapeamento de cabeçalhos para português
    const translateHeader = (header: string): string => {
        const translations: Record<string, string> = {
            "Nome": "Nome",
            "Email": "E-mail",
            "Telefone": "Telefone",
            "Cpf": "CPF",
            "CPF": "CPF",
            "Rg": "RG",
            "RG": "RG",
            "DataNascimento": "Data de Nascimento",
            "Data Nascimento": "Data de Nascimento",
            "Sexo": "Sexo",
            "Pronome": "Pronome",
            "RacaCor": "Raça/Cor",
            "Raça/Cor": "Raça/Cor",
            "Status": "Status",
            "CreatedAt": "Data de Criação",
            "Data Criação": "Data de Criação",
            "UpdatedAt": "Data de Atualização",
            "Data Atualização": "Data de Atualização",
            "PacienteNome": "Nome do Paciente",
            "PsicologoNome": "Nome do Psicólogo",
            "PacienteEmail": "E-mail do Paciente",
            "PsicologoEmail": "E-mail do Psicólogo",
            "Valor": "Valor",
            "Preco": "Preço",
            "Total": "Total",
            "TotalCiclos": "Total de Ciclos",
            "Total Ciclos": "Total de Ciclos",
            "Ciclos": "Ciclos",
            "Objetivos": "Objetivos",
            "ObjetivosArray": "Objetivos (Array)",
            "Completed": "Concluído",
            "Concluído": "Concluído",
            "DataCriacao": "Data de Criação",
            "DataAtualizacao": "Data de Atualização",
            "DataAquisicao": "Data de Aquisição",
            "DataInicio": "Data de Início",
            "DataFim": "Data de Fim",
            "DataCancelamento": "Data de Cancelamento",
            "MotivoCancelamento": "Motivo do Cancelamento",
            "TipoPlano": "Tipo de Plano",
            "PlanoNome": "Nome do Plano",
            "PlanoId": "ID do Plano",
            "PlanoAtivo": "Plano Ativo",
            "StatusPlano": "Status do Plano",
            "EnderecoCompleto": "Endereço Completo",
            "UltimoAcesso": "Último Acesso",
            "DataCadastro": "Data de Cadastro",
            "Data": "Data",
            "Horario": "Horário",
            "Faturada": "Faturada",
            "DuracaoMinutos": "Duração (Minutos)",
            "Avaliacao": "Avaliação",
            "ComentarioAvaliacao": "Comentário da Avaliação",
            "OrigemStatus": "Origem do Status",
            "TipoAcao": "Tipo de Ação",
            "DataAcao": "Data da Ação",
            "IP": "IP",
            "UserAgent": "Agente do Usuário",
            "Periodo": "Período",
            "ConsultasRealizadas": "Consultas Realizadas",
            "DataVencimento": "Data de Vencimento",
            "DataPagamento": "Data de Pagamento",
            "Tipo": "Tipo",
            "Banco": "Banco",
            "Agencia": "Agência",
            "Conta": "Conta",
            "PIX": "PIX",
            "Genero": "Gênero",
            "ClienteNome": "Nome do Cliente",
            "ClienteEmail": "E-mail do Cliente",
            "ClienteId": "ID do Cliente",
            "ValorPlano": "Valor do Plano",
            "ValorTotalPago": "Valor Total Pago",
            "TotalConsultasUsadas": "Total de Consultas Usadas",
            "TotalConsultasDisponiveis": "Total de Consultas Disponíveis",
            "TotalConsultas": "Total de Consultas",
        };
        return translations[header] || header.replace(/([A-Z])/g, " $1").replace(/^./, (str) => str.toUpperCase()).trim();
    };

    // Função para traduzir valores de status e outros campos
    const translateValue = (value: unknown, header: string): string => {
        if (value === null || value === undefined) return "-";
        
        const headerLower = header.toLowerCase();
        const valueStr = String(value);

        // Traduzir status
        if (headerLower.includes("status")) {
            const statusTranslations: Record<string, string> = {
                "Ativo": "Ativo",
                "EmAnalise": "Em Análise",
                "PendenteDocumentacao": "Pendente Documentação",
                "AnaliseContrato": "Análise Contrato",
                "Inativo": "Inativo",
                "Reprovado": "Reprovado",
                "DescredenciadoVoluntario": "Descredenciado Voluntário",
                "DescredenciadoInvoluntario": "Descredenciado Involuntário",
                "Bloqueado": "Bloqueado",
                "Pendente": "Pendente",
                "Deletado": "Deletado",
                "EmAnaliseContrato": "Análise Contrato",
                "Aprovado": "Aprovado",
                "AguardandoPagamento": "Aguardando Pagamento",
                "Expirado": "Expirado",
                "Cancelado": "Cancelado",
                "pago": "Pago",
                "pendente": "Pendente",
                "processando": "Processando",
                "aprovado": "Aprovado",
                "cancelado": "Cancelado",
                "retido": "Retido",
                "Reservado": "Reservado",
                "Disponivel": "Disponível",
                "Indisponivel": "Indisponível",
                "Andamento": "Em Andamento",
                "Concluido": "Concluído",
                "Realizada": "Realizada",
                "Agendada": "Agendada",
                "EmAndamento": "Em Andamento",
                "PacienteNaoCompareceu": "Paciente Não Compareceu",
                "PsicologoNaoCompareceu": "Psicólogo Não Compareceu",
                "CanceladaPacienteNoPrazo": "Cancelada pelo Paciente (no prazo)",
                "CanceladaPsicologoNoPrazo": "Cancelada pelo Psicólogo (no prazo)",
                "CanceladaPacienteForaDoPrazo": "Cancelada pelo Paciente (fora do prazo)",
                "CanceladaPsicologoForaDoPrazo": "Cancelada pelo Psicólogo (fora do prazo)",
                "CanceladaForcaMaior": "Cancelada por Força Maior",
                "CanceladaNaoCumprimentoContratualPaciente": "Cancelada - Não Cumprimento Contratual (Paciente)",
                "CanceladaNaoCumprimentoContratualPsicologo": "Cancelada - Não Cumprimento Contratual (Psicólogo)",
                "CanceladoAdministrador": "Cancelada pelo Administrador",
                "PsicologoDescredenciado": "Psicólogo Descredenciado",
                "ReagendadaPacienteNoPrazo": "Reagendada pelo Paciente (no prazo)",
                "ReagendadaPsicologoNoPrazo": "Reagendada pelo Psicólogo (no prazo)",
                "ReagendadaPsicologoForaDoPrazo": "Reagendada pelo Psicólogo (fora do prazo)",
                "Reagendada": "Reagendada",
            };
            return statusTranslations[valueStr] || valueStr;
        }

        // Traduzir gênero/sexo
        if (headerLower.includes("sexo") || headerLower.includes("genero")) {
            const generoTranslations: Record<string, string> = {
                "Masculino": "Masculino",
                "Feminino": "Feminino",
                "NaoBinario": "Não Binário",
                "PrefiroNaoDeclarar": "Prefiro Não Declarar",
            };
            return generoTranslations[valueStr] || valueStr;
        }

        // Traduzir raça/cor
        if (headerLower.includes("raca") || headerLower.includes("cor")) {
            const racaTranslations: Record<string, string> = {
                "Branca": "Branca",
                "Preta": "Preta",
                "Parda": "Parda",
                "Amarela": "Amarela",
                "Indigena": "Indígena",
                "PrefiroNaoInformar": "Prefiro Não Informar",
            };
            return racaTranslations[valueStr] || valueStr;
        }

        // Traduzir pronome
        if (headerLower.includes("pronome")) {
            const pronomeTranslations: Record<string, string> = {
                "EleDele": "Ele/Dele",
                "ElaDela": "Ela/Dela",
                "ElesDeles": "Eles/Deles",
                "ElasDelas": "Elas/Delas",
                "EluDelu": "Elu/Delu",
                "Outro": "Outro",
                "Dr": "Dr.",
                "Dra": "Dra.",
                "Psic": "Psic.",
                "Prof": "Prof.",
                "Mestre": "Mestre",
                "Phd": "Ph.D.",
            };
            return pronomeTranslations[valueStr] || valueStr;
        }

        // Traduzir tipo de plano
        if (headerLower.includes("tipoplano") || headerLower.includes("tipo plano")) {
            const tipoTranslations: Record<string, string> = {
                "Mensal": "Mensal",
                "Trimestral": "Trimestral",
                "Semestral": "Semestral",
                "Anual": "Anual",
            };
            return tipoTranslations[valueStr] || valueStr;
        }

        // Traduzir tipo de ação
        if (headerLower.includes("tipoacao") || headerLower.includes("tipo acao")) {
            const acaoTranslations: Record<string, string> = {
                "Login": "Login",
                "Logout": "Logout",
                "ResetSenha": "Reset de Senha",
                "AlteracaoSenha": "Alteração de Senha",
            };
            return acaoTranslations[valueStr] || valueStr;
        }

        return valueStr;
    };

    const selectedReportConfig = selectedReport ? reports.find((r) => r.key === selectedReport) : null;

    // Renderizar tabela
    const renderTable = () => {
        const data = filteredData;
        if (data.length === 0) {
            return (
                <div className="text-center py-16">
                    <FileBarChart className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                    <p className="text-gray-500 text-lg font-medium">Nenhum dado encontrado</p>
                    <p className="text-gray-400 text-sm mt-2">Tente ajustar os filtros ou selecione outro relatório</p>
                </div>
            );
        }

        const headers = Object.keys(data[0] || {});
        const displayHeaders = headers.filter((h) => !h.toLowerCase().includes("id") && h !== "Id");

        return (
            <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="w-full border-collapse bg-white">
                    <thead>
                        <tr className="bg-gradient-to-r from-[#8494E9] to-[#6B7DE0] text-white">
                            {displayHeaders.map((header) => (
                                <th
                                    key={header}
                                    className="px-6 py-4 text-left text-sm font-semibold border-b border-[#8494E9]/20"
                                >
                                    {translateHeader(header)}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {data.slice(0, 100).map((row: Record<string, unknown>, index: number) => (
                            <tr
                                key={index}
                                className={`transition-colors ${
                                    index % 2 === 0 ? "bg-white" : "bg-gray-50"
                                } hover:bg-[#F2F4FD]`}
                            >
                                {displayHeaders.map((header) => {
                                    const value = row[header];
                                    let displayValue: string;
                                    const headerLower = header.toLowerCase();

                                    // Formatação de datas (verificar primeiro)
                                    if (value instanceof Date) {
                                        displayValue = formatDateTime(value);
                                    } else if (typeof value === "string" && (value.includes("T") || value.match(/^\d{4}-\d{2}-\d{2}/))) {
                                        displayValue = formatDateTime(value);
                                    }
                                    // Formatação de CPF
                                    else if (headerLower.includes("cpf")) {
                                        displayValue = formatCPF(value as string | number | null | undefined);
                                    }
                                    // Formatação de telefone
                                    else if (headerLower.includes("telefone") || headerLower.includes("whatsapp")) {
                                        displayValue = formatPhone(value as string | number | null | undefined);
                                    }
                                    // Formatação de números inteiros (ciclos, quantidades, etc) - verificar primeiro
                                    else if (
                                        typeof value === "number" &&
                                        (headerLower.includes("ciclo") ||
                                            headerLower.includes("quantidade") ||
                                            headerLower.includes("qtd") ||
                                            (headerLower.includes("total") && headerLower.includes("ciclo")))
                                    ) {
                                        displayValue = formatNumber(value);
                                    }
                                    // Formatação de valores monetários
                                    else if (
                                        typeof value === "number" &&
                                        (headerLower.includes("valor") ||
                                            headerLower.includes("preco") ||
                                            headerLower.includes("total"))
                                    ) {
                                        displayValue = formatCurrency(value);
                                    }
                                    // Formatação de booleanos
                                    else if (typeof value === "boolean") {
                                        displayValue = value ? "Sim" : "Não";
                                    }
                                    // Traduzir valores de texto (status, gênero, etc)
                                    else if (typeof value === "string") {
                                        displayValue = translateValue(value, header);
                                    }
                                    // Valor padrão
                                    else {
                                        displayValue = translateValue(value, header);
                                    }

                                    return (
                                        <td
                                            key={header}
                                            className="px-6 py-4 text-sm text-gray-700 border-b border-gray-100"
                                        >
                                            {displayValue}
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
                {data.length > 100 && (
                    <div className="bg-gray-50 px-6 py-4 text-sm text-gray-600 text-center border-t border-gray-200">
                        Mostrando 100 de {data.length} registros. Exporte para ver todos.
                    </div>
                )}
            </div>
        );
    };

    // Se um relatório foi selecionado, mostrar os dados
    if (selectedReport) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
                <div className="container mx-auto px-4 py-8 max-w-7xl">
                    {/* Header com botão voltar */}
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-6"
                    >
                        <BreadcrumbsVoltar
                            label="Voltar para relatórios"
                            onClick={() => setSelectedReport(null)}
                            className="mb-4"
                        />
                        <div className="flex items-center justify-between">
                            <div>
                                <h1 className="text-4xl font-bold text-gray-900 mb-2 flex items-center gap-3">
                                    <div className={`p-3 bg-gradient-to-br ${selectedReportConfig?.bgGradient} rounded-xl text-white shadow-lg`}>
                                        {selectedReportConfig?.icon}
                                    </div>
                                    {selectedReportConfig?.label}
                                </h1>
                                <p className="text-gray-600 text-lg">
                                    {selectedReportConfig?.description}
                                </p>
                            </div>
                        </div>
                    </motion.div>

                    {/* Filtros */}
                    {showFilters && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mb-6"
                        >
                            <Card className="shadow-lg border-0">
                                <CardHeader className="pb-3">
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="flex items-center gap-2 text-lg">
                                            <Filter className="w-5 h-5 text-[#8494E9]" />
                                            Filtros
                                        </CardTitle>
                                        <div className="flex gap-2">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => setShowFilters(false)}
                                            >
                                                Ocultar
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => {
                                                    setFilters({
                                                        startDate: dayjs().subtract(30, "days").format("YYYY-MM-DD"),
                                                        endDate: dayjs().format("YYYY-MM-DD"),
                                                    });
                                                    setSearchTerm("");
                                                }}
                                                className="text-xs"
                                            >
                                                <X className="w-3 h-3 mr-1" />
                                                Limpar
                                            </Button>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div>
                                            <Label htmlFor="startDate" className="text-sm font-medium mb-2 block">
                                                Data Inicial
                                            </Label>
                                            <div className="relative">
                                                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                                <input
                                                    id="startDate"
                                                    type="date"
                                                    value={filters.startDate || ""}
                                                    onChange={(e) =>
                                                        setFilters({ ...filters, startDate: e.target.value })
                                                    }
                                                    className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8494E9] focus:border-transparent transition-all"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <Label htmlFor="endDate" className="text-sm font-medium mb-2 block">
                                                Data Final
                                            </Label>
                                            <div className="relative">
                                                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                                <input
                                                    id="endDate"
                                                    type="date"
                                                    value={filters.endDate || ""}
                                                    onChange={(e) =>
                                                        setFilters({ ...filters, endDate: e.target.value })
                                                    }
                                                    className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8494E9] focus:border-transparent transition-all"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <Label htmlFor="search" className="text-sm font-medium mb-2 block">
                                                Buscar
                                            </Label>
                                            <div className="relative">
                                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                                <input
                                                    id="search"
                                                    type="text"
                                                    placeholder="Buscar em todos os campos..."
                                                    value={searchTerm}
                                                    onChange={(e) => setSearchTerm(e.target.value)}
                                                    className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8494E9] focus:border-transparent transition-all"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    )}

                    {!showFilters && (
                        <Button
                            variant="outline"
                            onClick={() => setShowFilters(true)}
                            className="mb-6"
                        >
                            <Filter className="w-4 h-4 mr-2" />
                            Mostrar Filtros
                        </Button>
                    )}

                    {/* Card do Relatório */}
                    <Card className="shadow-lg border-0">
                        <CardHeader>
                            <div className="flex items-center justify-between flex-wrap gap-4">
                                <div>
                                    <CardDescription className="text-base mb-2">
                                        Total de registros: <span className="font-bold text-[#8494E9]">{filteredData.length}</span>
                                    </CardDescription>
                                    {filteredData.length > 0 && (
                                        <CardDescription className="text-sm">
                                            Período: {filters.startDate
                                                ? dayjs(filters.startDate).format("DD/MM/YYYY")
                                                : "-"}{" "}
                                            até{" "}
                                            {filters.endDate
                                                ? dayjs(filters.endDate).format("DD/MM/YYYY")
                                                : "-"}
                                        </CardDescription>
                                    )}
                                </div>
                                <div className="flex gap-2">
                                    <Button
                                        onClick={() => handleExport("excel")}
                                        disabled={getReportLoading() || filteredData.length === 0 || isExporting}
                                        className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white shadow-md"
                                    >
                                        <FileSpreadsheet className="w-4 h-4 mr-2" />
                                        {isExporting ? "Exportando..." : "Excel"}
                                    </Button>
                                    <Button
                                        onClick={() => handleExport("pdf")}
                                        disabled={getReportLoading() || filteredData.length === 0 || isExporting}
                                        className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white shadow-md"
                                    >
                                        <FileText className="w-4 h-4 mr-2" />
                                        {isExporting ? "Exportando..." : "PDF"}
                                    </Button>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {getReportLoading() ? (
                                <div className="flex items-center justify-center py-16">
                                    <div className="text-center">
                                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#8494E9] mx-auto mb-4"></div>
                                        <p className="text-gray-600">Carregando dados...</p>
                                    </div>
                                </div>
                            ) : (
                                renderTable()
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        );
    }

    // Mostrar cards dos relatórios
    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
            <div className="container mx-auto px-4 py-8 max-w-7xl">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-8"
                >
                    <h1 className="text-4xl font-bold text-gray-900 mb-2 flex items-center gap-3">
                        <div className="p-3 bg-gradient-to-br from-[#8494E9] to-[#6B7DE0] rounded-xl text-white shadow-lg">
                            <FileBarChart className="w-8 h-8" />
                        </div>
                        Relatórios
                    </h1>
                    <p className="text-gray-600 text-lg">
                        Selecione um relatório para visualizar os dados
                    </p>
                </motion.div>

                {/* Grid de Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {reports.map((report) => (
                        <motion.div
                            key={report.key}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            whileHover={{ y: -4 }}
                            transition={{ duration: 0.2 }}
                        >
                            <Card
                                className="cursor-pointer shadow-lg border-0 hover:shadow-xl transition-all duration-300 h-full"
                                onClick={() => setSelectedReport(report.key)}
                            >
                                <CardHeader>
                                    <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${report.bgGradient} flex items-center justify-center text-white mb-4 shadow-md`}>
                                        {report.icon}
                                    </div>
                                    <CardTitle className="text-xl mb-2">{report.label}</CardTitle>
                                    <CardDescription className="text-sm">
                                        {report.description}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex items-center text-[#8494E9] font-medium text-sm">
                                        Ver relatório
                                        <ArrowRight className="w-4 h-4 ml-2" />
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    ))}
                </div>
            </div>
        </div>
    );
}
