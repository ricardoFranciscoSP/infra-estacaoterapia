// Empresa responsável
interface Empresa {
    nome: string;
    cnpj: string;
    endereco: string;
    cep: string;
}

// Plataforma usada
interface Plataforma {
    nome: string;
    prazo_analise_horas: number;
}

// Dados do contratante (paciente ou responsável)
interface Contratante {
    nome: string;
    rg: string;
    cpf: string;
    logradouro: string;
    numero: string;
    bairro: string;
    cidade: string;
    uf: string;
    complemento?: string;
}

// Psicólogo responsável
interface Psicologo {
    nome: string;
    crp: string;
    cpf: string;
}

// Plano contratado
interface Plano {
    nome: string;
    qtd_sessoes_mensais: number;
    duracao_minutos: number;
    vigencia_meses: number;
    vigencia_meses_extenso: string;
    valor_mensal: string;
    valor_mensal_extenso: string;
    expiracao_dias: number;
    aviso_nao_renovacao_dias: number;
}

// Regras de pagamento
interface Pagamento {
    dias_inadimplencia_aviso: number;
    dias_inadimplencia_negativacao: number;
}

// Regras de rescisão
interface Rescisao {
    direito_arrependimento_dias: number;
    multa_percentual: number;
    prazo_utilizacao_restante_dias: number;
}

// Regras de privacidade
interface Privacidade {
    prazo_prontuario_anos: number;
}

// Anexo I – motivos de força maior
interface MotivoForcaMaior {
    motivo: string;
    status: string;
    comprovacao: string;
}

interface DocumentoComprobatorio {
    motivo: string;
    documentos: string;
}

interface AnexoI {
    motivos: MotivoForcaMaior[];
    documentos: DocumentoComprobatorio[];
}

// Estrutura completa do contrato
export interface ContratoData {
    empresa: Empresa;
    plataforma: Plataforma;
    contratante: Contratante;
    psicologo: Psicologo;
    plano: Plano;
    pagamento: Pagamento;
    rescisao: Rescisao;
    privacidade: Privacidade;
    anexoI: AnexoI;
    data_assinatura: string;
}

// Dados de pessoa jurídica para contrato
export interface PessoaJuridicaData {
    razaoSocial: string;
    cnpj: string;
    representanteLegalNome: string;
    representanteLegalRg: string;
    representanteLegalCpf: string;
    representanteLegalEndereco: string;
    representanteLegalNumero: string;
    representanteLegalComplemento: string;
    representanteLegalBairro: string;
    representanteLegalCidade: string;
    representanteLegalUf: string;
    enderecoEmpresa?: {
        rua: string;
        numero: string;
        complemento: string;
        bairro: string;
        cidade: string;
        estado: string;
    };
}

// Dados do psicólogo para geração de contrato
export interface ContratoPsicologoData {
    id: string;
    nome: string;
    crp: string;
    cpf: string;
    email: string;
    ipNavegador: string;
    contratante: Contratante;
    pessoaJuridica?: PessoaJuridicaData;
    plano?: Record<string, unknown>;
    pagamento?: Record<string, unknown>;
    rescisao?: Record<string, unknown>;
    anexoI?: Record<string, unknown>;
}

// Resultado da geração de contrato
export interface ContratoGeradoResult {
    urlContrato: string;
    buffer: Buffer;
}

// Exportar tipos específicos para reutilização
export type { Empresa, Plataforma, Contratante, Psicologo, Plano, Pagamento, Rescisao, Privacidade, AnexoI };
