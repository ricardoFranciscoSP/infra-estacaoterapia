/**
 * Tipos para CicloPlano - Renovações de assinaturas
 * Cada ciclo representa um período de validade do plano (sprint)
 * com datas de início e fim bem definidas
 */

export interface CicloPlanoBase {
    readonly Id: string;
    readonly AssinaturaPlanoId: string;
    readonly UserId: string;
    readonly CicloInicio: Date;
    readonly CicloFim: Date;
    readonly Status: 'Pendente' | 'Ativo' | 'Cancelado' | 'Expirado';
    readonly ConsultasDisponiveis: number;
    readonly ConsultasUsadas: number;
    readonly CreatedAt: Date;
    readonly UpdatedAt: Date;
}

export interface CicloPlanoComAssinatura extends CicloPlanoBase {
    readonly AssinaturaPlano?: {
        readonly Id: string;
        readonly UserId: string;
        readonly PlanoAssinaturaId: string;
        readonly DataInicio: Date;
        readonly DataFim?: Date | null;
        readonly Status: string;
    };
}

export interface CriarCicloPlanoDTO {
    readonly assinaturaPlanoId: string;
    readonly userId: string;
    readonly cicloInicio: Date;
    readonly cicloFim: Date;
    readonly consultasDisponiveis?: number;
    readonly status?: 'Pendente' | 'Ativo';
}

export interface RenovarCicloPlanoDTO {
    readonly assinaturaPlanoId: string;
    readonly userId: string;
    readonly consultasDisponiveis?: number;
}

export interface CicloPlanoVencimento {
    /** Data de início do ciclo (início da cobrança) */
    readonly cicloInicio: Date;
    /** Data de fim do ciclo (próxima cobrança) */
    readonly cicloFim: Date;
    /** Data de vencimento para pagamento */
    readonly dataVencimento: Date;
    /** Dias para vencer */
    readonly diasParaVencer: number;
}

export interface ValidacaoCicloPlano {
    readonly isValido: boolean;
    readonly erros: string[];
    readonly avisos?: string[];
}
