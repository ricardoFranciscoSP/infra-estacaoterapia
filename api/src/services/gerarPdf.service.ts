import fs from "fs";
import path from "path";
import Handlebars from "handlebars";
import puppeteer from "puppeteer";
import { EmailService } from "./email.service";
import { Plano } from "../interfaces/user.interface";
import prisma from "../prisma/client";
import { supabaseAdmin, STORAGE_BUCKET } from "../services/storage.services";
import { ContratoPsicologoData, ContratoGeradoResult } from "../types/contrato.types";
const emailService = new EmailService();

const normalizeContratoText = (text: string) =>
    text
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\uFFFD/g, "")
        .toUpperCase();

const hasParceriaTitle = (text: string) => {
    const normalized = normalizeContratoText(text);
    return normalized.includes("CONTRATO DE PARCERIA") && (
        normalized.includes("INTERMEDIACAO") ||
        normalized.includes("INTERMEDIAO") ||
        normalized.includes("INTERMEDIA")
    );
};

const hasPacienteTitle = (text: string) =>
    normalizeContratoText(text).includes("CONTRATO DE PRESTACAO DE SERVICOS PSICOLOGICOS VIA PLATAFORMA VIRTUAL");

// Replace static TEMPLATES_DIR with a resolver that checks common locations
function resolveTemplatesDir(): string {
    // Ordem de preferência: src/templates primeiro (desenvolvimento), depois dist/templates (produção)
    const candidates = [
        path.resolve(process.cwd(), 'src', 'templates'),                 // projeto/src/templates (desenvolvimento)
        path.resolve(__dirname, '../../src/templates'),                  // durante desenvolvimento local
        path.resolve(__dirname, '../src/templates'),                     // durante desenvolvimento local (alternativo)
        path.resolve(process.cwd(), 'dist', 'templates'),                // /app/dist/templates (produção)
        path.resolve(process.cwd(), 'dist', 'services', 'templates'),   // /app/dist/services/templates
        path.resolve(__dirname, 'templates'),                            // relative ao arquivo compilado
        path.resolve(process.cwd(), 'templates')                         // projeto/templates
    ];

    for (const c of candidates) {
        try {
            if (fs.existsSync(c)) {
                console.info(`[Contrato] Templates directory resolved to: ${c}`);
                return c;
            }
        } catch (err: unknown) {
            // ignore and try next
        }
    }

    // Fallback: usar src/templates (mais provável durante desenvolvimento)
    const fallback = path.resolve(process.cwd(), 'src', 'templates');
    console.warn(`[Contrato] Nenhum diretório de templates encontrado nos candidatos. Usando fallback: ${fallback}`);
    return fallback;
}

const TEMPLATES_DIR = resolveTemplatesDir();

// <<< Nova função: resolveTemplatePath >>> 
function resolveTemplatePath(templateName: string): string {
    const tried: string[] = [];

    console.log(`[resolveTemplatePath] ==========================================`);
    console.log(`[resolveTemplatePath] Resolvendo template: ${templateName}`);

    // Validação crítica: se for template de psicólogo, DEVE ser contrato-parceria-psicologo.html
    if (templateName.includes('psicologo') && !templateName.includes('parceria')) {
        console.error(`[resolveTemplatePath] ❌ ERRO: Template de psicólogo sem 'parceria' detectado: ${templateName}`);
        throw new Error(`Template incorreto: ${templateName}. Para psicólogos, deve ser 'contrato-parceria-psicologo.html'`);
    }

    // 1) Se o usuário passou caminho absoluto ou relativo: testar diretamente
    const directCandidate = path.isAbsolute(templateName) ? templateName : path.resolve(process.cwd(), templateName);
    tried.push(directCandidate);
    if (fs.existsSync(directCandidate)) {
        console.info(`[resolveTemplatePath] Template resolvido diretamente: ${directCandidate}`);
        // Validação adicional: verifica se o arquivo contém o conteúdo correto
        const content = fs.readFileSync(directCandidate, 'utf8').substring(0, 500);
        if (templateName.includes('parceria') && !hasParceriaTitle(content)) {
            console.error(`[resolveTemplatePath] ❌ ERRO: Arquivo encontrado não é o template de parceria!`);
            throw new Error(`Template incorreto: O arquivo ${directCandidate} não contém o título de parceria.`);
        }
        return directCandidate;
    }

    // 2) TENTAR: src/templates (desenvolvimento local)
    const srcTemplatesPath = path.resolve(process.cwd(), 'src', 'templates', templateName);
    tried.push(srcTemplatesPath);
    if (fs.existsSync(srcTemplatesPath)) {
        console.info(`[resolveTemplatePath] Template encontrado em src/templates: ${srcTemplatesPath}`);
        // Validação adicional: verifica se o arquivo contém o conteúdo correto
        const content = fs.readFileSync(srcTemplatesPath, 'utf8').substring(0, 500);
        if (templateName.includes('parceria') && !hasParceriaTitle(content)) {
            console.error(`[resolveTemplatePath] ❌ ERRO: Arquivo encontrado não é o template de parceria!`);
            console.error(`[resolveTemplatePath] Primeiros 500 caracteres:`, content);
            throw new Error(`Template incorreto: O arquivo ${srcTemplatesPath} não contém o título de parceria.`);
        }
        console.log(`[resolveTemplatePath] ✅ Template validado: Contém título de parceria`);
        return srcTemplatesPath;
    }

    // 3) TENTAR: __dirname/../templates (relativo ao arquivo compilado)
    const relativeToCompiled = path.resolve(__dirname, '../templates', templateName);
    tried.push(relativeToCompiled);
    if (fs.existsSync(relativeToCompiled)) {
        console.info(`[resolveTemplatePath] Template encontrado relativo ao compilado: ${relativeToCompiled}`);
        // Validação adicional: verifica se o arquivo contém o conteúdo correto
        const content = fs.readFileSync(relativeToCompiled, 'utf8').substring(0, 500);
        if (templateName.includes('parceria') && !hasParceriaTitle(content)) {
            console.error(`[resolveTemplatePath] ❌ ERRO: Arquivo encontrado não é o template de parceria!`);
            console.error(`[resolveTemplatePath] Primeiros 500 caracteres:`, content);
            throw new Error(`Template incorreto: O arquivo ${relativeToCompiled} não contém o título de parceria.`);
        }
        if (templateName.includes('parceria') && hasPacienteTitle(content)) {
            console.error(`[resolveTemplatePath] ❌ ERRO: Template de PACIENTE encontrado em caminho relativo!`);
            throw new Error(`Template incorreto: O arquivo ${relativeToCompiled} contém o template de paciente, não o de parceria.`);
        }
        console.log(`[resolveTemplatePath] ✅ Template validado: Contém título de parceria`);
        return relativeToCompiled;
    }

    // 4) TENTAR: __dirname/../../src/templates (desenvolvimento, relativo ao compilado)
    const relativeSrcTemplates = path.resolve(__dirname, '../../src/templates', templateName);
    tried.push(relativeSrcTemplates);
    if (fs.existsSync(relativeSrcTemplates)) {
        console.info(`[resolveTemplatePath] Template encontrado em src/templates (relativo): ${relativeSrcTemplates}`);
        // Validação adicional: verifica se o arquivo contém o conteúdo correto
        const content = fs.readFileSync(relativeSrcTemplates, 'utf8').substring(0, 500);
        if (templateName.includes('parceria') && !hasParceriaTitle(content)) {
            console.error(`[resolveTemplatePath] ❌ ERRO: Arquivo encontrado não é o template de parceria!`);
            console.error(`[resolveTemplatePath] Primeiros 500 caracteres:`, content);
            throw new Error(`Template incorreto: O arquivo ${relativeSrcTemplates} não contém o título de parceria.`);
        }
        if (templateName.includes('parceria') && hasPacienteTitle(content)) {
            console.error(`[resolveTemplatePath] ❌ ERRO: Template de PACIENTE encontrado em src/templates relativo!`);
            throw new Error(`Template incorreto: O arquivo ${relativeSrcTemplates} contém o template de paciente, não o de parceria.`);
        }
        console.log(`[resolveTemplatePath] ✅ Template validado: Contém título de parceria`);
        return relativeSrcTemplates;
    }

    // 5) TENTAR: TEMPLATES_DIR + templateName (mantendo subpaths caso exista)
    const joinWithTemplatesDir = path.join(TEMPLATES_DIR, templateName);
    tried.push(joinWithTemplatesDir);
    if (fs.existsSync(joinWithTemplatesDir)) {
        console.info(`[resolveTemplatePath] Template encontrado em TEMPLATES_DIR: ${joinWithTemplatesDir}`);
        // Validação adicional: verifica se o arquivo contém o conteúdo correto
        const content = fs.readFileSync(joinWithTemplatesDir, 'utf8').substring(0, 500);
        if (templateName.includes('parceria') && !hasParceriaTitle(content)) {
            console.error(`[resolveTemplatePath] ❌ ERRO: Arquivo encontrado não é o template de parceria!`);
            console.error(`[resolveTemplatePath] Primeiros 500 caracteres:`, content);
            throw new Error(`Template incorreto: O arquivo ${joinWithTemplatesDir} não contém o título de parceria.`);
        }
        console.log(`[resolveTemplatePath] ✅ Template validado: Contém título de parceria`);
        return joinWithTemplatesDir;
    }

    // 6) TENTAR: TEMPLATES_DIR + basename(templateName) (caso templateName venha com path indesejado como 'app/src/templates/...')
    const basenameCandidate = path.join(TEMPLATES_DIR, path.basename(templateName));
    tried.push(basenameCandidate);
    if (fs.existsSync(basenameCandidate)) {
        console.info(`[resolveTemplatePath] Template encontrado por basename em TEMPLATES_DIR: ${basenameCandidate}`);
        // Validação adicional: verifica se o arquivo contém o conteúdo correto
        const content = fs.readFileSync(basenameCandidate, 'utf8').substring(0, 500);
        if (templateName.includes('parceria') && !hasParceriaTitle(content)) {
            console.error(`[resolveTemplatePath] ❌ ERRO: Arquivo encontrado não é o template de parceria!`);
            console.error(`[resolveTemplatePath] Primeiros 500 caracteres:`, content);
            throw new Error(`Template incorreto: O arquivo ${basenameCandidate} não contém o título de parceria.`);
        }
        if (templateName.includes('parceria') && hasPacienteTitle(content)) {
            console.error(`[resolveTemplatePath] ❌ ERRO: Template de PACIENTE encontrado por basename!`);
            throw new Error(`Template incorreto: O arquivo ${basenameCandidate} contém o template de paciente, não o de parceria.`);
        }
        console.log(`[resolveTemplatePath] ✅ Template validado: Contém título de parceria`);
        return basenameCandidate;
    }

    // 7) TENTAR: dist/templates + templateName
    const distTemplatesPath = path.resolve(process.cwd(), 'dist', 'templates', templateName);
    tried.push(distTemplatesPath);
    if (fs.existsSync(distTemplatesPath)) {
        console.info(`[resolveTemplatePath] Template encontrado em dist/templates: ${distTemplatesPath}`);
        // Validação adicional: verifica se o arquivo contém o conteúdo correto
        const content = fs.readFileSync(distTemplatesPath, 'utf8').substring(0, 500);
        if (templateName.includes('parceria') && !hasParceriaTitle(content)) {
            console.error(`[resolveTemplatePath] ❌ ERRO: Arquivo encontrado não é o template de parceria!`);
            throw new Error(`Template incorreto: O arquivo ${distTemplatesPath} não contém o título de parceria.`);
        }
        if (templateName.includes('parceria') && hasPacienteTitle(content)) {
            console.error(`[resolveTemplatePath] ❌ ERRO: Template de PACIENTE encontrado em dist/templates!`);
            throw new Error(`Template incorreto: O arquivo ${distTemplatesPath} contém o template de paciente, não o de parceria.`);
        }
        return distTemplatesPath;
    }

    // 8) TENTAR: dist + templateName e dist + basename
    const distCandidate = path.resolve(process.cwd(), 'dist', templateName);
    tried.push(distCandidate);
    if (fs.existsSync(distCandidate)) {
        console.info(`[resolveTemplatePath] Template encontrado em /dist: ${distCandidate}`);
        // Validação adicional
        const content = fs.readFileSync(distCandidate, 'utf8').substring(0, 500);
        if (templateName.includes('parceria') && !hasParceriaTitle(content)) {
            console.error(`[resolveTemplatePath] ❌ ERRO: Arquivo encontrado não é o template de parceria!`);
            throw new Error(`Template incorreto: O arquivo ${distCandidate} não contém o título de parceria.`);
        }
        if (templateName.includes('parceria') && hasPacienteTitle(content)) {
            console.error(`[resolveTemplatePath] ❌ ERRO: Template de PACIENTE encontrado em /dist!`);
            throw new Error(`Template incorreto: O arquivo ${distCandidate} contém o template de paciente, não o de parceria.`);
        }
        return distCandidate;
    }
    const distBasename = path.resolve(process.cwd(), 'dist', path.basename(templateName));
    tried.push(distBasename);
    if (fs.existsSync(distBasename)) {
        console.info(`[resolveTemplatePath] Template encontrado em /dist por basename: ${distBasename}`);
        // Validação adicional
        const content = fs.readFileSync(distBasename, 'utf8').substring(0, 500);
        if (templateName.includes('parceria') && !hasParceriaTitle(content)) {
            console.error(`[resolveTemplatePath] ❌ ERRO: Arquivo encontrado não é o template de parceria!`);
            throw new Error(`Template incorreto: O arquivo ${distBasename} não contém o título de parceria.`);
        }
        if (templateName.includes('parceria') && hasPacienteTitle(content)) {
            console.error(`[resolveTemplatePath] ❌ ERRO: Template de PACIENTE encontrado em /dist por basename!`);
            throw new Error(`Template incorreto: O arquivo ${distBasename} contém o template de paciente, não o de parceria.`);
        }
        return distBasename;
    }

    // 9) Se nada foi encontrado, tentar src/templates como último recurso
    const finalSrcPath = path.resolve(process.cwd(), 'src', 'templates', path.basename(templateName));
    tried.push(finalSrcPath);
    if (fs.existsSync(finalSrcPath)) {
        console.info(`[resolveTemplatePath] Template encontrado em src/templates (basename): ${finalSrcPath}`);
        // Validação adicional: verifica se o arquivo contém o conteúdo correto
        const content = fs.readFileSync(finalSrcPath, 'utf8').substring(0, 500);
        if (templateName.includes('parceria') && !hasParceriaTitle(content)) {
            console.error(`[resolveTemplatePath] ❌ ERRO: Arquivo encontrado não é o template de parceria!`);
            console.error(`[resolveTemplatePath] Primeiros 500 caracteres:`, content);
            throw new Error(`Template incorreto: O arquivo ${finalSrcPath} não contém o título de parceria.`);
        }
        if (templateName.includes('parceria') && hasPacienteTitle(content)) {
            console.error(`[resolveTemplatePath] ❌ ERRO: Template de PACIENTE encontrado em src/templates (basename)!`);
            throw new Error(`Template incorreto: O arquivo ${finalSrcPath} contém o template de paciente, não o de parceria.`);
        }
        console.log(`[resolveTemplatePath] ✅ Template validado: Contém título de parceria`);
        return finalSrcPath;
    }

    // 10) Se nada foi encontrado, logar todos os tentados e lançar erro claro
    const errorMsg = `[Contrato] Não foi possível localizar template '${templateName}'. Caminhos testados:\n  - ${tried.join('\n  - ')}`;
    console.error(errorMsg);
    throw new Error(errorMsg);
}
// <<< Fim resolveTemplatePath >>>

interface PacienteAddress {
    Rua: string;
    Numero: string;
    Bairro: string;
    Cidade: string;
    Estado: string;
    Cep: string;
}

interface PacienteImage {
    Url: string;
}

interface PacienteData {
    Id: string;
    Nome: string;
    Cpf: string;
    Rg: string;
    Email: string;
    Address: PacienteAddress[];
    pagamento?: Record<string, unknown>;
    rescisao?: Record<string, unknown>;
    anexoI?: Record<string, unknown>;
    IpNavegador?: string;
    Images?: PacienteImage[];
    ProfessionalProfiles?: Array<{
        Id?: string;
        Name?: string;
        [key: string]: unknown;
    }>;
}

interface PsicologoTemplateData {
    nome: string;
    crp: string;
    cpf: string;
    email: string;
    ipNavegador: string;
    rg: string;
    logradouro: string;
    numero: string;
    complemento: string;
    bairro: string;
    cidade: string;
    uf: string;
    pessoa_juridica: boolean;
    razao_social?: string;
    cnpj?: string;
    representante_legal_nome?: string;
    representante_legal_rg?: string;
    representante_legal_cpf?: string;
    representante_legal_endereco?: string;
    representante_legal_numero?: string;
    representante_legal_complemento?: string;
    representante_legal_bairro?: string;
    representante_legal_cidade?: string;
    representante_legal_uf?: string;
    dataContrato?: string;
    horaContrato?: string;
}

interface EmpresaData {
    nome: string;
    cnpj: string;
    endereco: string;
    cep: string;
}

interface PlataformaData {
    nome: string;
    prazo_analise_horas: number;
}

interface TemplateDataPsicologo {
    empresa: EmpresaData;
    plataforma: PlataformaData;
    psicologo: PsicologoTemplateData;
    data_assinatura: string;
}

interface ContratanteData {
    nome: string;
    rg: string;
    cpf: string;
    logradouro: string;
    numero: string;
    bairro: string;
    cidade: string;
    uf: string;
}

interface PacienteTemplateData {
    nome: string;
    cpf: string;
    rg: string;
}

interface PlanoTemplateData {
    nome: string;
    tipo: string;
    valor: string;
}

interface PrivacidadeData {
    prazo_prontuario_anos: number;
}

interface TemplateDataPaciente {
    empresa: EmpresaData;
    plataforma: PlataformaData;
    contratante: ContratanteData;
    paciente: PacienteTemplateData;
    plano: PlanoTemplateData;
    pagamento?: Record<string, unknown>;
    rescisao?: Record<string, unknown>;
    privacidade: PrivacidadeData;
    anexoI?: Record<string, unknown>;
    data_assinatura: string;
    assinatura: string;
}

type TemplateData = TemplateDataPsicologo | TemplateDataPaciente | Record<string, never>;

function isTemplateDataPsicologo(data: TemplateData): data is TemplateDataPsicologo {
    return typeof data === 'object' && data !== null && 'psicologo' in data;
}

/**
 * Determina qual template de contrato usar baseado no Tipo do plano.
 * @param tipoPlano Tipo do plano (mensal, semestral, trimestral)
 * @returns Nome do arquivo de template
 */
export function getTemplateContratoByTipoPlano(tipoPlano: string | null | undefined): string {
    if (!tipoPlano) {
        console.warn('[getTemplateContratoByTipoPlano] Tipo do plano não informado, usando template padrão');
        return 'contrato-paciente.html';
    }

    const tipoNormalizado = tipoPlano.toLowerCase().trim();

    switch (tipoNormalizado) {
        case 'mensal':
            return 'contrato-embarque.html';
        case 'semestral':
            return 'contrato-jornada.html';
        case 'trimestral':
            return 'contrato-viagem.html';
        default:
            console.warn(`[getTemplateContratoByTipoPlano] Tipo de plano desconhecido: ${tipoPlano}, usando template padrão`);
            return 'contrato-paciente.html';
    }
}

export class ContratoService {
    /**
     * Renderiza um template HTML usando Handlebars e os dados fornecidos.
     * @param templatePath Caminho do arquivo de template HTML.
     * @param data Dados para preencher o template.
     * @returns HTML preenchido como string.
     */
    private async renderHtml(templatePath: string, data: TemplateData | Record<string, never>): Promise<string> {
        // Verifica se o arquivo existe antes de tentar ler
        if (!fs.existsSync(templatePath)) {
            console.warn(`[renderHtml] Template não encontrado no caminho original: ${templatePath}`);
            // Tenta encontrar o template em outros locais
            const alternativePaths = [
                path.resolve(process.cwd(), 'src', 'templates', path.basename(templatePath)),
                path.resolve(__dirname, '../../src/templates', path.basename(templatePath)),
                path.resolve(process.cwd(), 'templates', path.basename(templatePath)),
            ];

            for (const altPath of alternativePaths) {
                if (fs.existsSync(altPath)) {
                    console.info(`[renderHtml] Template encontrado em caminho alternativo: ${altPath}`);

                    // Validação crítica: se estamos procurando template de parceria, o arquivo encontrado DEVE ser de parceria
                    if (templatePath.includes('parceria') || templatePath.includes('contrato-parceria-psicologo')) {
                        const content = fs.readFileSync(altPath, 'utf8').substring(0, 500);
                        if (!hasParceriaTitle(content)) {
                            console.error(`[renderHtml] ❌ ERRO: Arquivo encontrado em caminho alternativo não é o template de parceria!`);
                            console.error(`[renderHtml] Caminho: ${altPath}`);
                            console.error(`[renderHtml] Primeiros 500 caracteres:`, content);

                            if (hasPacienteTitle(content)) {
                                console.error(`[renderHtml] ❌ ERRO: Template de PACIENTE encontrado em caminho alternativo!`);
                                throw new Error(`Template incorreto: O arquivo encontrado em ${altPath} contém o template de paciente, não o de parceria.`);
                            }

                            throw new Error(`Template incorreto: O arquivo encontrado em ${altPath} não contém o título de parceria.`);
                        }
                        console.log(`[renderHtml] ✅ Template alternativo validado: Contém título de parceria`);
                    }

                    templatePath = altPath;
                    break;
                }
            }
        }

        // Tenta ler o arquivo e lança erro claro caso não exista
        let html: string;
        try {
            console.log(`[renderHtml] Lendo arquivo template: ${templatePath}`);
            html = fs.readFileSync(templatePath, "utf-8");
            console.log(`[renderHtml] Arquivo lido com sucesso. Tamanho: ${html.length} caracteres`);

            // Validação crítica: se o template path contém 'parceria', o HTML DEVE conter o título de parceria
            if (templatePath.includes('parceria') || templatePath.includes('contrato-parceria-psicologo')) {
                console.log(`[renderHtml] Validando template de parceria...`);
                console.log(`[renderHtml] Primeiros 500 caracteres do HTML lido:`, html.substring(0, 500));

                if (!hasParceriaTitle(html)) {
                    console.error(`[renderHtml] ❌ ERRO CRÍTICO: HTML lido não contém título de PARCERIA!`);
                    console.error(`[renderHtml] Template path: ${templatePath}`);
                    console.error(`[renderHtml] Primeiros 1000 caracteres:`, html.substring(0, 1000));

                    if (hasPacienteTitle(html)) {
                        console.error(`[renderHtml] ❌ ERRO: Template de PACIENTE detectado no arquivo lido!`);
                        console.error(`[renderHtml] O arquivo ${templatePath} contém o template ERRADO!`);
                        throw new Error(`Template incorreto: O arquivo ${templatePath} contém o template de paciente, não o de parceria do psicólogo. Verifique se o arquivo 'contrato-parceria-psicologo.html' existe e está correto.`);
                    }

                    throw new Error(`Template incorreto: O HTML lido de ${templatePath} não contém o título 'CONTRATO DE PARCERIA E INTERMEDIAÇÃO'.`);
                }

                if (hasPacienteTitle(html)) {
                    console.error(`[renderHtml] ❌ ERRO CRÍTICO: Template de PACIENTE detectado no arquivo lido!`);
                    throw new Error(`Template incorreto: O arquivo ${templatePath} contém o template de paciente. Deve usar 'contrato-parceria-psicologo.html'.`);
                }

                console.log(`[renderHtml] ✅ HTML lido validado: Contém título de PARCERIA`);
            }
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
            const msg = `[Contrato] Erro ao ler template: ${templatePath} -> ${errorMessage}`;
            console.error(msg);
            throw new Error(msg);
        }
        // Registra helpers do Handlebars para formatação de data (usa a instância importada)
        // Helper para extrair dia da data
        Handlebars.registerHelper('dia', function (dataStr: unknown): string {
            if (!dataStr || typeof dataStr !== 'string') return '';
            const partes = dataStr.split('/');
            return partes[0] || '';
        });

        // Helper para extrair mês da data e converter para extenso
        Handlebars.registerHelper('mes', function (dataStr: unknown): string {
            if (!dataStr || typeof dataStr !== 'string') return '';
            const meses = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
                'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
            const partes = dataStr.split('/');
            const mesNum = parseInt(partes[1] || '1', 10);
            return meses[mesNum - 1] || '';
        });

        // Helper para extrair ano da data
        Handlebars.registerHelper('ano', function (dataStr: unknown): string {
            if (!dataStr || typeof dataStr !== 'string') return '';
            const partes = dataStr.split('/');
            return partes[2] || '';
        });

        try {
            // Validação adicional: verifica se o HTML lido contém o título correto ANTES de compilar
            if (templatePath.includes('contrato-parceria-psicologo') || templatePath.includes('parceria')) {
                console.log(`[renderHtml] ==========================================`);
                console.log(`[renderHtml] VALIDANDO TEMPLATE DE PARCERIA`);
                console.log(`[renderHtml] Template path: ${templatePath}`);
                console.log(`[renderHtml] Tamanho do HTML: ${html.length} caracteres`);
                console.log(`[renderHtml] Primeiros 500 caracteres:`, html.substring(0, 500));

                if (!hasParceriaTitle(html)) {
                    console.error(`[renderHtml] ❌ ERRO CRÍTICO: HTML lido não contém título de PARCERIA!`);
                    console.error(`[renderHtml] Template path: ${templatePath}`);
                    console.error(`[renderHtml] Primeiros 1000 caracteres do HTML:`, html.substring(0, 1000));

                    if (hasPacienteTitle(html)) {
                        console.error(`[renderHtml] ❌ ERRO: Template de PACIENTE detectado no HTML lido!`);
                        console.error(`[renderHtml] Isso indica que o arquivo ERRADO está sendo usado!`);
                        throw new Error(`Template incorreto: O arquivo ${templatePath} contém o template de paciente, não o de parceria do psicólogo. Verifique se o arquivo 'contrato-parceria-psicologo.html' existe e está correto.`);
                    }

                    throw new Error(`Template incorreto: O HTML lido de ${templatePath} não contém o título 'CONTRATO DE PARCERIA E INTERMEDIAÇÃO'.`);
                }

                // Verifica se NÃO contém o título ERRADO
                if (hasPacienteTitle(html)) {
                    console.error(`[renderHtml] ❌ ERRO CRÍTICO: Template de PACIENTE detectado no HTML lido!`);
                    console.error(`[renderHtml] Template path: ${templatePath}`);
                    throw new Error(`Template incorreto: O arquivo ${templatePath} contém o template de paciente. Deve usar 'contrato-parceria-psicologo.html'.`);
                }

                console.log(`[renderHtml] ✅ HTML lido validado: Contém título de PARCERIA`);
                console.log(`[renderHtml] ✅ HTML lido validado: NÃO contém título de PACIENTE`);
                console.log(`[renderHtml] ==========================================`);
            }

            console.log(`[renderHtml] Compilando template com Handlebars...`);
            console.log(`[renderHtml] Dados fornecidos:`, JSON.stringify(data, null, 2).substring(0, 1000));

            let compile: ReturnType<typeof Handlebars.compile>;
            try {
                compile = Handlebars.compile(html, { noEscape: true });
                console.log(`[renderHtml] Template compilado com sucesso`);
            } catch (compileError: unknown) {
                const errorMessage = compileError instanceof Error ? compileError.message : 'Erro desconhecido ao compilar template';
                console.error(`[renderHtml] ❌ ERRO ao compilar template Handlebars:`, errorMessage);
                console.error(`[renderHtml] Stack:`, compileError instanceof Error ? compileError.stack : 'N/A');
                throw new Error(`Erro ao compilar template Handlebars: ${errorMessage}`);
            }

            let result: string;
            try {
                result = compile(data);
                console.log(`[renderHtml] Template renderizado com sucesso. Tamanho do resultado: ${result.length} caracteres`);
            } catch (renderError: unknown) {
                const errorMessage = renderError instanceof Error ? renderError.message : 'Erro desconhecido ao renderizar template';
                console.error(`[renderHtml] ❌ ERRO ao renderizar template:`, errorMessage);
                console.error(`[renderHtml] Stack:`, renderError instanceof Error ? renderError.stack : 'N/A');
                console.error(`[renderHtml] Dados fornecidos:`, JSON.stringify(data, null, 2));
                throw new Error(`Erro ao renderizar template: ${errorMessage}`);
            }

            // Validação final do resultado compilado
            if (templatePath.includes('contrato-parceria-psicologo')) {
                if (!hasParceriaTitle(result)) {
                    console.error(`[renderHtml] ❌ ERRO: HTML compilado não contém título de PARCERIA!`);
                    throw new Error(`HTML compilado não contém o título esperado do contrato de parceria.`);
                }

                if (hasPacienteTitle(result)) {
                    console.error(`[renderHtml] ❌ ERRO CRÍTICO: Template de PACIENTE detectado no HTML compilado!`);
                    throw new Error(`HTML compilado contém o template de paciente. O template correto não foi usado.`);
                }

                console.log(`[renderHtml] ✅ HTML compilado validado: Contém título de PARCERIA`);
            }

            // Log para debug - verifica se as variáveis foram substituídas
            const variaveisNaoSubstituidas = result.match(/\{\{[^}]+\}\}/g);
            if (variaveisNaoSubstituidas && variaveisNaoSubstituidas.length > 0) {
                console.warn(`[renderHtml] ATENÇÃO: ${variaveisNaoSubstituidas.length} variáveis Handlebars não foram substituídas!`);
                console.warn(`[renderHtml] Primeiras 10 variáveis não substituídas:`, variaveisNaoSubstituidas.slice(0, 10));
            } else {
                console.log(`[renderHtml] Todas as variáveis Handlebars foram substituídas corretamente`);
            }

            // Verifica se o resultado contém dados do psicólogo
            if (isTemplateDataPsicologo(data)) {
                const psicologoNome = data.psicologo?.nome;
                if (psicologoNome) {
                    if (!result.includes(psicologoNome)) {
                        console.warn(`[renderHtml] ATENÇÃO: Nome do psicólogo (${psicologoNome}) não encontrado no HTML gerado!`);
                    } else {
                        console.log(`[renderHtml] Nome do psicólogo encontrado no HTML gerado: ${psicologoNome}`);
                    }
                }
            }

            return result;
        } catch (error: unknown) {
            console.error(`[renderHtml] Erro ao compilar template Handlebars:`, error);
            throw error;
        }
    }

    /**
     * Converte HTML em um buffer PDF usando Puppeteer.
     * @param html HTML a ser convertido.
     * @returns Buffer do PDF gerado.
     */
    private async htmlToPdfBuffer(html: string): Promise<Buffer> {
        let browser;
        let page;

        try {
            console.log(`[htmlToPdfBuffer] Iniciando conversão HTML para PDF com Puppeteer`);
            console.log(`[htmlToPdfBuffer] Tamanho do HTML: ${html.length} caracteres`);

            browser = await puppeteer.launch({
                headless: true,
                args: [
                    "--no-sandbox",
                    "--disable-setuid-sandbox",
                    "--disable-dev-shm-usage",
                    "--disable-accelerated-2d-canvas",
                    "--disable-gpu",
                    "--window-size=1280x1024"
                ],
                timeout: 10000
            });
            console.log(`[htmlToPdfBuffer] Navegador Puppeteer iniciado com sucesso`);

            page = await browser.newPage();
            console.log(`[htmlToPdfBuffer] Nova página criada`);

            // Define viewport para compatibilidade melhor
            await page.setViewport({ width: 1280, height: 1024 });

            // Melhora a compatibilidade com CSS PDF24
            await page.setContent(html, {
                waitUntil: ["domcontentloaded", "networkidle0"],
                timeout: 30000
            });
            console.log(`[htmlToPdfBuffer] HTML carregado na página com sucesso`);

            console.log(`[htmlToPdfBuffer] Gerando PDF...`);
            const pdf = await page.pdf({
                format: "A4",
                printBackground: true,
                margin: {
                    top: "10mm",
                    right: "10mm",
                    bottom: "10mm",
                    left: "10mm"
                },
                preferCSSPageSize: false
            });

            console.log(`[htmlToPdfBuffer] PDF gerado com sucesso. Tamanho: ${pdf.length} bytes`);
            return Buffer.from(pdf);

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error(`[htmlToPdfBuffer] Erro ao converter HTML para PDF:`, errorMessage);
            console.error(`[htmlToPdfBuffer] Stack:`, error instanceof Error ? error.stack : 'N/A');
            throw new Error(`Erro ao gerar PDF com Puppeteer: ${errorMessage}`);

        } finally {
            // Garante que os recursos sejam liberados
            if (page) {
                await page.close().catch(err => console.error(`[htmlToPdfBuffer] Erro ao fechar página:`, err));
            }
            if (browser) {
                await browser.close().catch(err => console.error(`[htmlToPdfBuffer] Erro ao fechar navegador:`, err));
            }
        }
    }

    /**
     * Prepara os dados do psicólogo para o template Handlebars.
     * Esta função é compartilhada entre prévia e geração para garantir consistência.
     */
    private preparePsicologoData(psicologo: ContratoPsicologoData): PsicologoTemplateData {
        console.log(`[preparePsicologoData] Preparando dados do psicólogo: ${psicologo.nome}`);
        console.log(`[preparePsicologoData] Tem pessoaJuridica?: ${!!psicologo.pessoaJuridica}`);
        console.log(`[preparePsicologoData] Dados do contratante:`, JSON.stringify(psicologo.contratante || {}, null, 2).substring(0, 500));

        // Validação segura do objeto contratante
        const contratante: {
            rg?: string;
            logradouro?: string;
            numero?: string;
            complemento?: string;
            bairro?: string;
            cidade?: string;
            uf?: string;
        } = psicologo.contratante || {};

        // Gera data e hora do contrato
        const now = new Date();
        const dataContrato = now.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
        const horaContrato = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

        const psicologoData: PsicologoTemplateData = {
            nome: psicologo.nome || '',
            crp: psicologo.crp || '',
            cpf: psicologo.cpf || '',
            email: psicologo.email || '',
            ipNavegador: psicologo.ipNavegador || '',
            rg: contratante.rg || '',
            logradouro: contratante.logradouro || '',
            numero: contratante.numero || '',
            complemento: contratante.complemento || '',
            bairro: contratante.bairro || '',
            cidade: contratante.cidade || '',
            uf: contratante.uf || '',
            pessoa_juridica: false,
            dataContrato: dataContrato,
            horaContrato: horaContrato
        };

        // Se houver dados de pessoa jurídica (PessoalJuridica), inclui no template
        // A determinação é baseada na existência de PessoalJuridica no banco
        if (psicologo.pessoaJuridica) {
            console.log(`[preparePsicologoData] ✅ Detectado como PESSOA JURÍDICA`);
            console.log(`[preparePsicologoData] Razão Social: ${psicologo.pessoaJuridica.razaoSocial}`);
            console.log(`[preparePsicologoData] CNPJ: ${psicologo.pessoaJuridica.cnpj}`);
            psicologoData.pessoa_juridica = true;
            psicologoData.razao_social = psicologo.pessoaJuridica.razaoSocial || '';
            psicologoData.cnpj = psicologo.pessoaJuridica.cnpj || '';
            // Os dados do representante legal vêm do próprio psicólogo (não há campos separados no banco)
            psicologoData.representante_legal_nome = psicologo.nome || '';
            psicologoData.representante_legal_rg = contratante.rg || '';
            psicologoData.representante_legal_cpf = psicologo.cpf || '';
            psicologoData.representante_legal_endereco = contratante.logradouro || '';
            psicologoData.representante_legal_numero = contratante.numero || '';
            psicologoData.representante_legal_complemento = contratante.complemento || '';
            psicologoData.representante_legal_bairro = contratante.bairro || '';
            psicologoData.representante_legal_cidade = contratante.cidade || '';
            psicologoData.representante_legal_uf = contratante.uf || '';

            // Dados da empresa (prioriza endereço da empresa, senão usa endereço pessoal)
            if (psicologo.pessoaJuridica.enderecoEmpresa) {
                psicologoData.logradouro = psicologo.pessoaJuridica.enderecoEmpresa.rua || contratante.logradouro || '';
                psicologoData.numero = psicologo.pessoaJuridica.enderecoEmpresa.numero || contratante.numero || '';
                psicologoData.complemento = psicologo.pessoaJuridica.enderecoEmpresa.complemento || contratante.complemento || '';
                psicologoData.bairro = psicologo.pessoaJuridica.enderecoEmpresa.bairro || contratante.bairro || '';
                psicologoData.cidade = psicologo.pessoaJuridica.enderecoEmpresa.cidade || contratante.cidade || '';
                psicologoData.uf = psicologo.pessoaJuridica.enderecoEmpresa.estado || contratante.uf || '';
            }
        } else {
            console.log(`[preparePsicologoData] ✅ Detectado como AUTÔNOMO (pessoa física)`);
        }

        console.log(`[preparePsicologoData] Resultado final - pessoa_juridica: ${psicologoData.pessoa_juridica}`);
        return psicologoData;
    }

    /**
     * Renderiza HTML para prévia do contrato do psicólogo (sem gerar PDF).
     * @param psicologo Dados do psicólogo.
     * @param templateName Nome do template.
     * @returns HTML preenchido como string.
     */
    async renderHtmlForPreview(psicologo: ContratoPsicologoData, templateName: string): Promise<string> {
        console.log(`[renderHtmlForPreview] ==========================================`);
        console.log(`[renderHtmlForPreview] INICIANDO RENDERIZAÇÃO DE PRÉVIA`);
        console.log(`[renderHtmlForPreview] Template recebido: ${templateName}`);
        console.log(`[renderHtmlForPreview] Psicólogo: ${psicologo.nome} (ID: ${psicologo.id})`);

        // Valida que o template é o correto ANTES de resolver o caminho
        if (templateName !== 'contrato-parceria-psicologo.html') {
            console.error(`[renderHtmlForPreview] ❌ ERRO CRÍTICO: Template incorreto recebido: ${templateName}`);
            console.error(`[renderHtmlForPreview] Esperado: contrato-parceria-psicologo.html`);
            throw new Error(`Template incorreto: ${templateName}. Para psicólogos, deve ser usado 'contrato-parceria-psicologo.html'`);
        }

        const templatePath = resolveTemplatePath(templateName);
        console.log(`[renderHtmlForPreview] Template resolvido para: ${templatePath}`);

        // Verifica se o template é realmente o de parceria
        if (!templatePath.includes('contrato-parceria-psicologo')) {
            console.error(`[renderHtmlForPreview] ❌ ERRO: Template resolvido não é o de parceria!`);
            console.error(`[renderHtmlForPreview] Caminho resolvido: ${templatePath}`);
            throw new Error(`Template incorreto resolvido: ${templatePath}. Esperado template de parceria.`);
        }

        // Verifica se o arquivo existe
        if (!fs.existsSync(templatePath)) {
            console.error(`[renderHtmlForPreview] ❌ ERRO: Template não encontrado: ${templatePath}`);
            throw new Error(`Template não encontrado: ${templatePath}`);
        }

        // Lê o início do arquivo para validar que é o template correto
        const templateContent = fs.readFileSync(templatePath, 'utf8');
        console.log(`[renderHtmlForPreview] Template carregado. Tamanho: ${templateContent.length} caracteres`);

        // Validações rigorosas do conteúdo do template
        if (!hasParceriaTitle(templateContent)) {
            console.error(`[renderHtmlForPreview] ❌ ERRO CRÍTICO: Template carregado NÃO é o contrato de parceria!`);
            console.error(`[renderHtmlForPreview] Arquivo: ${templatePath}`);
            console.error(`[renderHtmlForPreview] Primeiros 1000 caracteres:`, templateContent.substring(0, 1000));

            // Verifica se é o template ERRADO (de paciente)
            if (hasPacienteTitle(templateContent)) {
                console.error(`[renderHtmlForPreview] ❌ ERRO: Template de PACIENTE detectado no arquivo!`);
                throw new Error(`Template incorreto: O arquivo ${templatePath} contém o template de paciente, não o de parceria do psicólogo.`);
            }

            throw new Error(`Template carregado não é o contrato de parceria. Arquivo: ${templatePath}`);
        }

        // Verifica se NÃO contém o título ERRADO (de paciente)
        if (hasPacienteTitle(templateContent)) {
            console.error(`[renderHtmlForPreview] ❌ ERRO CRÍTICO: Template de PACIENTE detectado no arquivo!`);
            throw new Error(`Template incorreto: O arquivo ${templatePath} contém o template de paciente. Deve usar 'contrato-parceria-psicologo.html'.`);
        }

        console.log(`[renderHtmlForPreview] ✅ Template validado: Contém título de PARCERIA`);
        console.log(`[renderHtmlForPreview] ✅ Template validado: NÃO contém título de PACIENTE`);

        // Prepara os dados usando a função compartilhada
        const psicologoData = this.preparePsicologoData(psicologo);
        console.log(`[renderHtmlForPreview] Dados do psicólogo preparados. Pessoa jurídica: ${psicologoData.pessoa_juridica}`);
        console.log(`[renderHtmlForPreview] Dados completos do psicólogo:`, JSON.stringify(psicologoData, null, 2).substring(0, 1000));

        const data: TemplateDataPsicologo = {
            empresa: {
                nome: "MINDFLUENCE PSICOLOGIA LTDA.",
                cnpj: "54.222.003/0001-07",
                endereco: "Al. Rio Negro, 503 – Sala 2020, Alphaville Industrial – Barueri/SP",
                cep: "06454-000"
            },
            plataforma: { nome: "ESTAÇÃO TERAPIA", prazo_analise_horas: 72 },
            psicologo: psicologoData,
            data_assinatura: new Date().toLocaleDateString("pt-BR")
        };

        console.log(`[renderHtmlForPreview] Renderizando HTML com Handlebars...`);
        console.log(`[renderHtmlForPreview] Dados completos enviados para template:`, JSON.stringify(data, null, 2).substring(0, 2000));

        let html: string;
        try {
            html = await this.renderHtml(templatePath, data);
        } catch (renderError: unknown) {
            const errorMessage = renderError instanceof Error ? renderError.message : 'Erro desconhecido ao renderizar';
            console.error(`[renderHtmlForPreview] ❌ ERRO ao renderizar HTML: ${errorMessage}`);
            console.error(`[renderHtmlForPreview] Stack:`, renderError instanceof Error ? renderError.stack : 'N/A');
            throw renderError;
        }

        // Validação final do HTML renderizado
        console.log(`[renderHtmlForPreview] HTML renderizado. Tamanho: ${html.length} caracteres`);
        console.log(`[renderHtmlForPreview] Primeiros 500 caracteres:`, html.substring(0, 500));

        if (!hasParceriaTitle(html)) {
            console.error(`[renderHtmlForPreview] ❌ ERRO: HTML renderizado não contém título de PARCERIA!`);
            console.error(`[renderHtmlForPreview] Primeiros 1000 caracteres:`, html.substring(0, 1000));

            if (hasPacienteTitle(html)) {
                console.error(`[renderHtmlForPreview] ❌ ERRO CRÍTICO: HTML renderizado contém título de PACIENTE!`);
                console.error(`[renderHtmlForPreview] Isso indica que o template ERRADO foi usado!`);
                throw new Error(`HTML renderizado contém o template de paciente. O template correto não foi usado. Verifique se o arquivo 'contrato-parceria-psicologo.html' existe e está correto.`);
            }

            throw new Error(`HTML renderizado não contém o título esperado do contrato de parceria.`);
        }

        if (hasPacienteTitle(html)) {
            console.error(`[renderHtmlForPreview] ❌ ERRO CRÍTICO: HTML renderizado contém título de PACIENTE!`);
            throw new Error(`HTML renderizado contém o template de paciente. O template correto não foi usado.`);
        }

        console.log(`[renderHtmlForPreview] ✅ HTML renderizado validado corretamente`);
        console.log(`[renderHtmlForPreview] ==========================================`);

        return html;
    }

    /**
     * Preenche o contrato do psicólogo, gera PDF e HTML, salva localmente e retorna a URL.
     * @param psicologo Dados do psicólogo.
     * @param templateName Nome do arquivo de template (ex: 'contrato-parceria-psicologo.html').
     * @returns URL do contrato e buffer do PDF.
     */
    async fillAndStoreContrato(psicologo: ContratoPsicologoData, templateName: string): Promise<ContratoGeradoResult> {
        console.log(`[Contrato Psicólogo] Iniciando geração com template: ${templateName}`);

        // Valida que o template é o correto ANTES de resolver o caminho
        if (templateName !== 'contrato-parceria-psicologo.html') {
            console.error(`[Contrato Psicólogo] ERRO: Template incorreto recebido: ${templateName}. Esperado: contrato-parceria-psicologo.html`);
            throw new Error(`Template incorreto: ${templateName}. Para psicólogos, deve ser usado 'contrato-parceria-psicologo.html'`);
        }

        const templatePath = resolveTemplatePath(templateName);
        console.log(`[Contrato Psicólogo] Template resolvido para: ${templatePath}`);

        // Verifica se o template é realmente o de parceria
        if (!templatePath.includes('contrato-parceria-psicologo')) {
            console.error(`[Contrato Psicólogo] ERRO: Template resolvido não é o de parceria! Caminho: ${templatePath}`);
            throw new Error(`Template incorreto resolvido: ${templatePath}. Esperado template de parceria.`);
        }

        // Verifica se o arquivo existe e contém o título correto
        if (!fs.existsSync(templatePath)) {
            console.error(`[Contrato Psicólogo] ERRO: Template não encontrado: ${templatePath}`);
            throw new Error(`Template não encontrado: ${templatePath}`);
        }

        // Lê o início do arquivo para validar que é o template correto
        const templateContent = fs.readFileSync(templatePath, 'utf8').substring(0, 1000);
        if (!hasParceriaTitle(templateContent)) {
            console.error(`[Contrato Psicólogo] ERRO: Template carregado não é o contrato de parceria!`);
            console.error(`[Contrato Psicólogo] Primeiros 500 caracteres: ${templateContent.substring(0, 500)}`);
            throw new Error(`Template carregado não é o contrato de parceria. Arquivo: ${templatePath}`);
        }

        console.log(`[Contrato Psicólogo] ✅ Template validado corretamente: ${templatePath}`);

        // Prepara os dados do psicólogo usando a função compartilhada
        const psicologoData = this.preparePsicologoData(psicologo);

        const data: TemplateDataPsicologo = {
            empresa: {
                nome: "MINDFLUENCE PSICOLOGIA LTDA.",
                cnpj: "54.222.003/0001-07",
                endereco: "Al. Rio Negro, 503 – Sala 2020, Alphaville Industrial – Barueri/SP",
                cep: "06454-000"
            },
            plataforma: { nome: "ESTAÇÃO TERAPIA", prazo_analise_horas: 72 },
            psicologo: psicologoData,
            data_assinatura: new Date().toLocaleDateString("pt-BR")
        };

        // Log detalhado dos dados para debug
        console.log(`[Contrato Psicólogo] Dados preparados para template:`, JSON.stringify({
            pessoa_juridica: psicologoData.pessoa_juridica,
            nome: psicologoData.nome,
            crp: psicologoData.crp,
            cpf: psicologoData.cpf,
            rg: psicologoData.rg,
            tem_razao_social: !!psicologoData.razao_social,
            tem_cnpj: !!psicologoData.cnpj,
            logradouro: psicologoData.logradouro,
            cidade: psicologoData.cidade,
            uf: psicologoData.uf,
            data_assinatura: data.data_assinatura
        }, null, 2));

        console.log(`[Contrato Psicólogo] Renderizando HTML com template: ${templatePath}`);
        const html = await this.renderHtml(templatePath, data);

        // Validação rigorosa do HTML gerado
        console.log(`[Contrato Psicólogo] HTML renderizado. Tamanho: ${html.length} caracteres`);
        console.log(`[Contrato Psicólogo] Primeiros 500 caracteres:`, html.substring(0, 500));

        // Verifica se o HTML gerado contém o título correto
        if (!hasParceriaTitle(html)) {
            console.error(`[Contrato Psicólogo] ❌ ERRO CRÍTICO: HTML gerado não contém o título esperado do contrato de parceria!`);
            console.error(`[Contrato Psicólogo] Primeiros 1000 caracteres do HTML: ${html.substring(0, 1000)}`);

            // Verifica se contém o título ERRADO (de paciente)
            if (hasPacienteTitle(html)) {
                console.error(`[Contrato Psicólogo] ❌ ERRO: Template de PACIENTE detectado no HTML gerado!`);
                console.error(`[Contrato Psicólogo] Isso indica que o template ERRADO foi usado!`);
                throw new Error(`Template incorreto: O HTML gerado contém o template de paciente, não o de parceria do psicólogo. Verifique se o arquivo 'contrato-parceria-psicologo.html' existe e está correto.`);
            }

            throw new Error(`HTML gerado não contém o título esperado do contrato de parceria.`);
        }

        // Verifica se NÃO contém o título ERRADO (de paciente)
        if (hasPacienteTitle(html)) {
            console.error(`[Contrato Psicólogo] ❌ ERRO CRÍTICO: Template de PACIENTE detectado no HTML gerado!`);
            throw new Error(`Template incorreto: O HTML gerado contém o template de paciente. O template correto não foi usado.`);
        }

        console.log(`[Contrato Psicólogo] ✅ HTML gerado corretamente com título de parceria`);
        console.log(`[Contrato Psicólogo] ✅ HTML NÃO contém título de paciente`);

        // Verifica se as variáveis foram substituídas
        const variaveisNaoSubstituidas = html.match(/\{\{[^}]+\}\}/g);
        if (variaveisNaoSubstituidas && variaveisNaoSubstituidas.length > 0) {
            console.warn(`[Contrato Psicólogo] ATENÇÃO: ${variaveisNaoSubstituidas.length} variáveis Handlebars não foram substituídas!`);
            console.warn(`[Contrato Psicólogo] Primeiras 10 variáveis não substituídas:`, variaveisNaoSubstituidas.slice(0, 10));
        } else {
            console.log(`[Contrato Psicólogo] Todas as variáveis Handlebars foram substituídas corretamente`);
        }

        // Verifica se dados do psicólogo aparecem no HTML
        if (psicologoData.nome && !html.includes(psicologoData.nome)) {
            console.warn(`[Contrato Psicólogo] ATENÇÃO: Nome do psicólogo (${psicologoData.nome}) não encontrado no HTML gerado!`);
        }

        const buffer = await this.htmlToPdfBuffer(html);

        // 👇 Caminho absoluto baseado na raiz do projeto (opcional, mas mais seguro)
        const dirOut = path.resolve(__dirname, '../../documentos');

        // Garante que o diretório exista
        if (!fs.existsSync(dirOut)) {
            fs.mkdirSync(dirOut, { recursive: true });
        }

        const filePdf = path.join(dirOut, `contrato-${psicologo.id}.pdf`);
        fs.writeFileSync(filePdf, buffer);

        const fileHtml = path.join(dirOut, `contrato-${psicologo.id}.html`);
        fs.writeFileSync(fileHtml, html);

        const urlContrato = filePdf;

        return { urlContrato, buffer };
    }

    /**
     * Preenche o contrato do paciente, gera PDF e HTML, salva localmente, envia e-mail e retorna a URL.
     * @param pacienteData Dados do paciente.
     * @param plano Plano(s) do paciente.
     * @param templateName Nome do arquivo de template (ex: 'contrato-paciente.html').
     * @param assinaturaBase64 Assinatura em base64 (opcional).
     * @returns URL do contrato e buffer do PDF.
     */
    async contratoPaciente(
        pacienteData: PacienteData,
        plano: Plano | Plano[],
        templateName: string,
        assinaturaBase64?: string
    ): Promise<ContratoGeradoResult> {
        console.log("Gerando contrato para paciente:", plano);

        const templatePath = resolveTemplatePath(templateName);

        // Processa o plano para extrair tipo e valor
        let planoSelecionado: Plano | null = null;
        if (Array.isArray(plano)) {
            planoSelecionado = plano.length > 0 ? plano[0] : null;
        } else if (typeof plano === 'object' && plano !== null) {
            planoSelecionado = plano;
        }

        const nomePlano = planoSelecionado?.Nome || planoSelecionado?.Tipo || '';
        const tipoPlano = planoSelecionado?.Tipo || '';
        const valorPlano = planoSelecionado?.Preco
            ? planoSelecionado.Preco.toLocaleString('pt-BR', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            })
            : '0,00';

        const data: TemplateDataPaciente = {
            empresa: {
                nome: "MINDFLUENCE PSICOLOGIA LTDA.",
                cnpj: "54.222.003/0001-07",
                endereco: "Av. Brigadeiro Luís Antonio, 1811 – Sala 1119, Jardim Paulistano – São Paulo/SP",
                cep: "01452-001"
            },
            plataforma: { nome: "ESTAÇÃO TERAPIA", prazo_analise_horas: 72 },
            contratante: {
                nome: pacienteData.Nome || '',
                rg: pacienteData.Rg || '',
                cpf: pacienteData.Cpf || '',
                logradouro: pacienteData.Address[0]?.Rua || '',
                numero: pacienteData.Address[0]?.Numero || '',
                bairro: pacienteData.Address[0]?.Bairro || '',
                cidade: pacienteData.Address[0]?.Cidade || '',
                uf: pacienteData.Address[0]?.Estado || '',
            },
            paciente: {
                nome: pacienteData.Nome || '',
                cpf: pacienteData.Cpf || '',
                rg: pacienteData.Rg || ''
            },
            plano: {
                nome: nomePlano,
                tipo: tipoPlano,
                valor: valorPlano
            },
            pagamento: pacienteData.pagamento,
            rescisao: pacienteData.rescisao,
            privacidade: { prazo_prontuario_anos: 5 },
            anexoI: pacienteData.anexoI,
            data_assinatura: new Date().toLocaleDateString("pt-BR"),
            assinatura: assinaturaBase64
                ? `<img src="${assinaturaBase64}" alt="Assinatura do paciente" style="max-height:100px"/>`
                : ""
        };

        const html = await this.renderHtml(templatePath, data);
        const buffer = await this.htmlToPdfBuffer(html);

        const dirOut = path.resolve("documentos");
        if (!fs.existsSync(dirOut)) fs.mkdirSync(dirOut, { recursive: true });

        const nomeSanitizado = (pacienteData.Nome || 'contrato').replace(/[^a-zA-Z0-9]/g, '_');
        const filePdf = path.join(
            dirOut,
            `contrato-temp-${nomeSanitizado}-${pacienteData.Cpf || 'undefined'}.pdf`
        );
        fs.writeFileSync(filePdf, buffer);

        const urlContrato = await this.uploadPdf(
            filePdf,
            `contrato-${nomeSanitizado}-${pacienteData.Cpf || 'undefined'}.pdf`
        );

        fs.unlinkSync(filePdf);

        await prisma.document.create({
            data: {
                UserId: pacienteData.Id,
                Url: urlContrato,
                Type: "ContratoPaciente",
                Description: `Contrato gerado para paciente ${pacienteData.Nome}`,
                DataHoraAceite: new Date(),
                IpNavegador: pacienteData.IpNavegador || '',
                AssinaturaDigital: assinaturaBase64 || ''
            }
        });

        await emailService.sendContratoGeradoEmail({
            to: pacienteData.Email,
            nome: pacienteData.Nome,
            linkContrato: urlContrato
        });

        return { urlContrato, buffer };
    }

    /**
     * Faz upload do PDF e retorna a URL pública.
     */
    private async uploadPdf(localPath: string, fileName: string): Promise<string> {
        const bucketName = STORAGE_BUCKET;
        if (!bucketName) {
            throw new Error('Bucket não configurado. Verifique a variável de ambiente SUPABASE_BUCKET.');
        }

        console.log(`[Contrato] Tentando fazer upload para o bucket: ${bucketName}`);

        const fileBuffer = fs.readFileSync(localPath);
        const filePath = `contracts/${Date.now()}_${fileName}`;
        // Sempre usar supabaseAdmin para uploads em buckets privados
        if (!supabaseAdmin) {
            throw new Error(
                "SUPABASE_SERVICE_ROLE_KEY não definido. " +
                "Uploads para buckets privados requerem service role key para evitar erros de verificação de assinatura."
            );
        }
        const { error: uploadError } = await supabaseAdmin.storage
            .from(bucketName)
            .upload(filePath, fileBuffer, { contentType: 'application/pdf', upsert: true });
        if (uploadError) {
            const errorCode = 'statusCode' in uploadError ? (uploadError.statusCode as number | undefined) : undefined;
            console.error(`[Contrato] Erro ao fazer upload:`, {
                bucket: bucketName,
                filePath,
                error: uploadError.message,
                code: errorCode
            });

            // Mensagem mais clara para erro de bucket não encontrado
            if (uploadError.message?.toLowerCase().includes('bucket not found') ||
                uploadError.message?.toLowerCase().includes('not found')) {
                throw new Error(
                    `Bucket '${bucketName}' não encontrado no Supabase Storage. ` +
                    `Verifique se o bucket existe e se a variável de ambiente SUPABASE_BUCKET está configurada corretamente. ` +
                    `Erro original: ${uploadError.message}`
                );
            }

            // Tratamento específico para erro de verificação de assinatura
            if (uploadError.message?.toLowerCase().includes('signature verification failed') ||
                uploadError.message?.toLowerCase().includes('signature') ||
                errorCode === 403) {
                throw new Error(
                    `Erro de verificação de assinatura no Supabase Storage. ` +
                    `Verifique se a variável de ambiente SUPABASE_SERVICE_ROLE_KEY está definida corretamente. ` +
                    `Erro original: ${uploadError.message}`
                );
            }

            throw new Error('Erro ao fazer upload do contrato: ' + uploadError.message);
        }
        const { data: urlData } = supabaseAdmin.storage.from(bucketName).getPublicUrl(filePath);
        return urlData?.publicUrl || '';
    }

    /**
     * Gera contrato para psicólogo, faz upload para o storage, salva no banco e envia e-mail.
     * @param psicologo Dados do psicólogo.
     * @param templateName Nome do template (ex: 'contrato-parceria-psicologo.html').
     * @returns URL do contrato gerado no storage.
     */
    async gerarContrato(psicologo: ContratoPsicologoData, templateName: string): Promise<{ urlContrato: string }> {
        const { urlContrato: localPath, buffer } = await this.fillAndStoreContrato(psicologo, templateName);

        // Faz upload do contrato para o storage
        const bucketName = STORAGE_BUCKET;
        if (!bucketName) {
            throw new Error('Bucket não configurado. Verifique a variável de ambiente SUPABASE_BUCKET.');
        }
        const nomeSanitizado = (psicologo.nome || 'contrato').replace(/[^a-zA-Z0-9]/g, '_');
        const fileName = `contrato-${nomeSanitizado}-${psicologo.crp || 'undefined'}.pdf`;
        const filePath = `contracts/psychologists/${psicologo.id}/${Date.now()}_${fileName}`;

        try {
            console.log(`[Contrato Psicólogo] Tentando fazer upload para o bucket: ${bucketName}`);

            // Sempre usar supabaseAdmin para uploads em buckets privados
            if (!supabaseAdmin) {
                throw new Error(
                    "SUPABASE_SERVICE_ROLE_KEY não definido. " +
                    "Uploads para buckets privados requerem service role key para evitar erros de verificação de assinatura."
                );
            }

            const { error: uploadError } = await supabaseAdmin.storage
                .from(bucketName)
                .upload(filePath, buffer, {
                    contentType: 'application/pdf',
                    upsert: true
                });

            if (uploadError) {
                const errorCode = 'statusCode' in uploadError ? (uploadError.statusCode as number | undefined) : undefined;
                console.error('[Contrato Psicólogo] Erro ao fazer upload:', {
                    bucket: bucketName,
                    filePath,
                    error: uploadError.message,
                    code: errorCode
                });

                // Mensagem mais clara para erro de bucket não encontrado
                if (uploadError.message?.toLowerCase().includes('bucket not found') ||
                    uploadError.message?.toLowerCase().includes('not found')) {
                    throw new Error(
                        `Bucket '${bucketName}' não encontrado no Supabase Storage. ` +
                        `Verifique se o bucket existe e se a variável de ambiente SUPABASE_BUCKET está configurada corretamente. ` +
                        `Erro original: ${uploadError.message}`
                    );
                }

                // Tratamento específico para erro de verificação de assinatura
                if (uploadError.message?.toLowerCase().includes('signature verification failed') ||
                    uploadError.message?.toLowerCase().includes('signature') ||
                    errorCode === 403) {
                    throw new Error(
                        `Erro de verificação de assinatura no Supabase Storage. ` +
                        `Verifique se a variável de ambiente SUPABASE_SERVICE_ROLE_KEY está definida corretamente. ` +
                        `Erro original: ${uploadError.message}`
                    );
                }

                throw new Error('Erro ao fazer upload do contrato: ' + uploadError.message);
            }

            const { data: urlData } = supabaseAdmin.storage.from(bucketName).getPublicUrl(filePath);
            const urlContrato = urlData?.publicUrl || '';

            if (!urlContrato) {
                throw new Error('Erro ao obter URL pública do contrato');
            }

            console.log('[Contrato Psicólogo] Upload realizado com sucesso:', urlContrato);

            // Busca o ProfessionalProfile do psicólogo para salvar também em PsychologistDocument
            const professionalProfile = await prisma.professionalProfile.findFirst({
                where: { UserId: psicologo.id },
                select: { Id: true }
            });

            // Salva o registro do contrato na tabela Document (histórico geral)
            await prisma.document.create({
                data: {
                    UserId: psicologo.id,
                    Url: urlContrato,
                    Type: "ContratoPsicologo",
                    Description: `Contrato gerado para psicólogo ${psicologo.nome}`,
                    DataHoraAceite: new Date(),
                    IpNavegador: psicologo.ipNavegador || ''
                }
            });

            console.log('[Contrato Psicólogo] Registro salvo na tabela Document');

            // Salva também em PsychologistDocument para aparecer na lista "Documentos Enviados" do admin
            if (professionalProfile) {
                await prisma.psychologistDocument.create({
                    data: {
                        ProfessionalProfileId: professionalProfile.Id,
                        Url: urlContrato,
                        Type: "ContratoPsicologo",
                        Description: `Contrato de Parceria e Intermediação - ${psicologo.nome}`
                    }
                });
                console.log('[Contrato Psicólogo] Registro salvo na tabela PsychologistDocument');
            } else {
                console.warn('[Contrato Psicólogo] ProfessionalProfile não encontrado, contrato não será exibido em "Documentos Enviados"');
            }

            console.log('[Contrato Psicólogo] Registro salvo no banco de dados');

            // Remove o arquivo local temporário
            if (fs.existsSync(localPath)) {
                fs.unlinkSync(localPath);
                console.log('[Contrato Psicólogo] Arquivo temporário removido:', localPath);
            }

            // Envia e-mail com o link do contrato e anexo do PDF
            await emailService.sendContratoGeradoEmail({
                to: psicologo.email,
                nome: psicologo.nome,
                linkContrato: urlContrato,
                pdfBuffer: buffer
            });

            console.log('[Contrato Psicólogo] E-mail enviado com sucesso');

            return { urlContrato };
        } catch (error: unknown) {
            console.error('[Contrato Psicólogo] Erro ao processar contrato:', error);

            // Limpa arquivo temporário em caso de erro
            if (fs.existsSync(localPath)) {
                try {
                    fs.unlinkSync(localPath);
                } catch (cleanupError: unknown) {
                    console.error('[Contrato Psicólogo] Erro ao limpar arquivo temporário:', cleanupError);
                }
            }

            throw error;
        }
    }

    /**
     * Gera contrato para paciente a partir do ID.
     * @param userId ID do paciente.
     * @param plano Plano(s) do paciente.
     * @param templateName Nome do template (ex: 'contrato-paciente.html').
     * @param assinaturaBase64 Assinatura em base64 (opcional).
     * @returns Resultado com URL e status.
     */
    async gerarContratoPaciente(
        userId: string,
        plano: Plano[] | Plano,
        templateName: string,
        assinaturaBase64?: string
    ): Promise<{ urlContrato: string; uploadSuccess: boolean; error?: string }> {
        try {
            const paciente = await prisma.user.findFirst({
                where: { Id: userId, Role: "Patient" },
                include: {
                    Address: true,
                    Images: true,
                    ProfessionalProfiles: true
                }
            });

            if (!paciente) {
                return { urlContrato: '', uploadSuccess: false, error: 'Paciente não encontrado' };
            }

            let urlContrato = '';
            try {
                const result = await this.contratoPaciente(
                    paciente as PacienteData,
                    plano,
                    templateName,
                    assinaturaBase64
                );
                urlContrato = result.urlContrato;
            } catch (err: unknown) {
                const errorMessage = err instanceof Error ? err.message : 'Erro ao gerar contrato';
                return { urlContrato: '', uploadSuccess: false, error: errorMessage };
            }

            if (!urlContrato) {
                return { urlContrato: '', uploadSuccess: false, error: 'URL do contrato não gerada' };
            }

            return { urlContrato, uploadSuccess: true };
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
            return { urlContrato: '', uploadSuccess: false, error: errorMessage };
        }
    }

    /**
     * Gera PDF da política de agendamento do paciente
     * @returns Buffer do PDF
     */
    async gerarPoliticaAgendamentoPaciente(): Promise<Buffer> {
        const templateName = 'politica-agendamento-paciente.html';
        const templatePath = resolveTemplatePath(templateName);

        // O template não precisa de dados dinâmicos, apenas renderiza o HTML estático
        const html = await this.renderHtml(templatePath, {});
        const buffer = await this.htmlToPdfBuffer(html);

        return buffer;
    }
}