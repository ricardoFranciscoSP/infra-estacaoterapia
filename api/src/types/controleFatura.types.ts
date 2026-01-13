export type FaturaStatus = "Paid" | "Pending" | "Failed" | "Canceled";
export type TipoFatura = "Plano" | "ConsultaAvulsa" | "PrimeiraConsulta";

export interface ControleFaturaCreateDTO {
    CodigoFatura: string;
    Valor: number;
    Status: FaturaStatus;
    DataEmissao: Date;
    DataVencimento: Date;
    Tipo: TipoFatura;
}

export interface ControleFatura extends ControleFaturaCreateDTO {
    Id: string;
    CreatedAt: Date;
    UpdatedAt: Date;
}
