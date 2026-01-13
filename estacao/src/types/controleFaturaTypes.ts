export type FaturaStatus = "PAID" | "PENDING" | "FAILED" | "CANCELED";
export type TipoFatura = "PLANO" | "CONSULTA_AVULSA";

export interface ControleFaturaCreateDTO {
    userId: string;
    dataReferencia: Date;
    status: FaturaStatus;
    vindiBillId?: string;
    tipoFatura: TipoFatura;
}

export interface ControleFatura extends ControleFaturaCreateDTO {
    id: string;
    createdAt: Date;
}
