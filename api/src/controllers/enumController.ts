import { Request, Response } from 'express';
import {
    // Status Enums
    getCommissionStatus,
    getFinanceiroPsicologoStatus,
    getCommissionTipoPlano,
    getControleConsultaStatus,
    getPlanoCompraStatus,
    getTipoCobranca,
    getControleFinanceiroStatus,
    getUserStatus,
    getAgendaStatus,
    getConsultaAvulsaStatus,
    getFaturaStatus,
    getTipoFatura,
    getCancelamentoSessaoStatus,
    getControleConsultaMensalStatus,
    getFaqStatus,
    getFaqTipo,
    getProfessionalProfileStatus,
    getWebhookStatus,
    // User Enums
    getSexo,
    getRole,
    getPronome,
    getRacaCor,
    // Permission Enums
    getActionType,
    getModule,
    // Professional Profile Enums
    getTipoPessoaJuridica,
    getLanguages,
    getTipoAtendimento,
    getTipoFormacao,
    getRecorrencia,
    getAutorTipoCancelamento,
    getExperienciaClinica,
    getAbordagem,
    getQueixa,
    getGrauInstrucao
} from '../repositories/enumRepository';

/**
 * Função auxiliar para formatar nomes de enum em formato legível
 * Converte CamelCase para palavras separadas com primeira letra maiúscula
 */
function formatEnumName(name: string): string {
    return name
        .replace(/([A-Z])/g, ' $1') // Adiciona espaço antes de letras maiúsculas
        .replace(/([0-9]+)/g, ' $1') // Adiciona espaço antes de números
        .replace(/_/g, ' ') // Substitui underscores por espaços
        .trim()
        .split(' ')
        .map(word => {
            // Se for sigla (2 ou mais letras e todas maiúsculas), mantém maiúsculo
            if (word.length > 1 && word === word.toUpperCase()) return word;
            // Caso contrário, primeira maiúscula e resto minúsculo
            return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
        })
        .join(' ');
}

/**
 * Controller para expor todos os enums do sistema de forma otimizada
 * Retorna todos os enums disponíveis no Prisma Schema formatados para o frontend
 * 
 * @param req Request do Express
 * @param res Response do Express
 * @returns Response JSON com todos os enums organizados por categoria
 */
export const getEnums = (req: Request, res: Response) => {
    try {
        // Criar objeto com todos os enums organizados por categoria
        const enums = {
            // ==================== STATUS ENUMS ====================
            status: {
                commissionStatus: getCommissionStatus(),
                financeiroPsicologoStatus: getFinanceiroPsicologoStatus(),
                commissionTipoPlano: getCommissionTipoPlano(),
                controleConsultaStatus: getControleConsultaStatus(),
                planoCompraStatus: getPlanoCompraStatus(),
                controleFinanceiroStatus: getControleFinanceiroStatus(),
                userStatus: getUserStatus(),
                agendaStatus: getAgendaStatus(),
                consultaAvulsaStatus: getConsultaAvulsaStatus(),
                faturaStatus: getFaturaStatus(),
                cancelamentoSessaoStatus: getCancelamentoSessaoStatus(),
                controleConsultaMensalStatus: getControleConsultaMensalStatus(),
                faqStatus: getFaqStatus(),
                professionalProfileStatus: getProfessionalProfileStatus(),
                webhookStatus: getWebhookStatus()
            },

            // ==================== TIPOS ====================
            tipos: {
                tipoCobranca: getTipoCobranca(),
                tipoFatura: getTipoFatura(),
                faqTipo: getFaqTipo(),
                tipoPessoaJuridica: getTipoPessoaJuridica(),
                tipoAtendimento: getTipoAtendimento(),
                tipoFormacao: getTipoFormacao(),
                autorTipoCancelamento: getAutorTipoCancelamento()
            },

            // ==================== USUÁRIO ====================
            usuario: {
                sexo: getSexo(),
                role: getRole(),
                pronome: getPronome(),
                racaCor: getRacaCor()
            },

            // ==================== PERMISSÕES ====================
            permissoes: {
                actionType: getActionType(),
                module: getModule()
            },

            // ==================== PERFIL PROFISSIONAL ====================
            perfilProfissional: {
                languages: getLanguages(),
                experienciaClinica: getExperienciaClinica(),
                abordagem: getAbordagem(),
                queixa: getQueixa(),
                tipoAtendimento: getTipoAtendimento(),
                grauInstrucao: getGrauInstrucao()
            },

            // ==================== OUTROS ====================
            outros: {
                recorrencia: getRecorrencia()
            }
        };

        // Retornar resposta com cache headers para otimizar performance
        res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache de 1 hora
        res.status(200).json(enums);
    } catch (error) {
        console.error('Erro ao buscar enums:', error);
        res.status(500).json({
            error: 'Erro ao buscar enums do sistema',
            message: error instanceof Error ? error.message : 'Erro desconhecido'
        });
    }
};

/**
 * Controller para expor enums formatados (legíveis) para o frontend
 * Converte os valores dos enums em formato amigável para exibição
 * 
 * @param req Request do Express
 * @param res Response do Express
 * @returns Response JSON com todos os enums formatados
 */
export const getEnumsFormatted = (req: Request, res: Response) => {
    try {
        const enums = {
            status: {
                commissionStatus: getCommissionStatus().map(formatEnumName),
                financeiroPsicologoStatus: getFinanceiroPsicologoStatus().map(formatEnumName),
                commissionTipoPlano: getCommissionTipoPlano().map(formatEnumName),
                controleConsultaStatus: getControleConsultaStatus().map(formatEnumName),
                planoCompraStatus: getPlanoCompraStatus().map(formatEnumName),
                controleFinanceiroStatus: getControleFinanceiroStatus().map(formatEnumName),
                userStatus: getUserStatus().map(formatEnumName),
                agendaStatus: getAgendaStatus().map(formatEnumName),
                consultaAvulsaStatus: getConsultaAvulsaStatus().map(formatEnumName),
                faturaStatus: getFaturaStatus().map(formatEnumName),
                cancelamentoSessaoStatus: getCancelamentoSessaoStatus().map(formatEnumName),
                controleConsultaMensalStatus: getControleConsultaMensalStatus().map(formatEnumName),
                faqStatus: getFaqStatus().map(formatEnumName),
                professionalProfileStatus: getProfessionalProfileStatus().map(formatEnumName),
                webhookStatus: getWebhookStatus().map(formatEnumName)
            },
            tipos: {
                tipoCobranca: getTipoCobranca().map(formatEnumName),
                tipoFatura: getTipoFatura().map(formatEnumName),
                faqTipo: getFaqTipo().map(formatEnumName),
                tipoPessoaJuridica: getTipoPessoaJuridica().map(formatEnumName),
                tipoAtendimento: getTipoAtendimento().map(formatEnumName),
                tipoFormacao: getTipoFormacao().map(formatEnumName),
                autorTipoCancelamento: getAutorTipoCancelamento().map(formatEnumName)
            },
            usuario: {
                sexo: getSexo().map(formatEnumName),
                role: getRole().map(formatEnumName),
                pronome: getPronome().map(formatEnumName),
                racaCor: getRacaCor().map(formatEnumName)
            },
            permissoes: {
                actionType: getActionType().map(formatEnumName),
                module: getModule().map(formatEnumName)
            },
            perfilProfissional: {
                languages: getLanguages().map(formatEnumName),
                experienciaClinica: getExperienciaClinica().map(formatEnumName),
                abordagem: getAbordagem().map(formatEnumName),
                queixa: getQueixa().map(formatEnumName),
                tipoAtendimento: getTipoAtendimento().map(formatEnumName),
                grauInstrucao: getGrauInstrucao().map(formatEnumName)
            },
            outros: {
                recorrencia: getRecorrencia().map(formatEnumName)
            }
        };

        res.setHeader('Cache-Control', 'public, max-age=3600');
        res.status(200).json(enums);
    } catch (error) {
        console.error('Erro ao buscar enums formatados:', error);
        res.status(500).json({
            error: 'Erro ao buscar enums formatados',
            message: error instanceof Error ? error.message : 'Erro desconhecido'
        });
    }
};

/**
 * Controller para buscar um enum específico
 * Permite requisitar apenas um enum específico para otimizar performance
 * 
 * @param req Request do Express com parâmetro 'enumName'
 * @param res Response do Express
 * @returns Response JSON com o enum solicitado
 */
export const getSpecificEnum = (req: Request, res: Response) => {
    try {
        const { enumName } = req.params;
        const { formatted } = req.query;

        // Mapa de funções de enums disponíveis
        const enumMap: Record<string, () => string[]> = {
            // Status
            commissionStatus: getCommissionStatus,
            financeiroPsicologoStatus: getFinanceiroPsicologoStatus,
            commissionTipoPlano: getCommissionTipoPlano,
            controleConsultaStatus: getControleConsultaStatus,
            planoCompraStatus: getPlanoCompraStatus,
            tipoCobranca: getTipoCobranca,
            controleFinanceiroStatus: getControleFinanceiroStatus,
            userStatus: getUserStatus,
            agendaStatus: getAgendaStatus,
            consultaAvulsaStatus: getConsultaAvulsaStatus,
            faturaStatus: getFaturaStatus,
            tipoFatura: getTipoFatura,
            cancelamentoSessaoStatus: getCancelamentoSessaoStatus,
            controleConsultaMensalStatus: getControleConsultaMensalStatus,
            faqStatus: getFaqStatus,
            faqTipo: getFaqTipo,
            professionalProfileStatus: getProfessionalProfileStatus,
            webhookStatus: getWebhookStatus,
            // User
            sexo: getSexo,
            role: getRole,
            pronome: getPronome,
            racaCor: getRacaCor,
            // Permissions
            actionType: getActionType,
            module: getModule,
            // Professional Profile
            tipoPessoaJuridica: getTipoPessoaJuridica,
            languages: getLanguages,
            tipoAtendimento: getTipoAtendimento,
            tipoFormacao: getTipoFormacao,
            recorrencia: getRecorrencia,
            autorTipoCancelamento: getAutorTipoCancelamento,
            experienciaClinica: getExperienciaClinica,
            abordagem: getAbordagem,
            queixa: getQueixa,
            grauInstrucao: getGrauInstrucao
        };

        const enumFunction = enumMap[enumName];

        if (!enumFunction) {
            return res.status(404).json({
                error: 'Enum não encontrado',
                availableEnums: Object.keys(enumMap)
            });
        }

        let enumValues = enumFunction();

        // Formatar se solicitado
        if (formatted === 'true') {
            enumValues = enumValues.map(formatEnumName);
        }

        res.setHeader('Cache-Control', 'public, max-age=3600');
        res.status(200).json({ [enumName]: enumValues });
    } catch (error) {
        console.error('Erro ao buscar enum específico:', error);
        res.status(500).json({
            error: 'Erro ao buscar enum',
            message: error instanceof Error ? error.message : 'Erro desconhecido'
        });
    }
};
