import { PrimeiraConsultaData, PrimeiraConsultaResponse, VerificarCompraParams } from "../types/primeiraConsulta.type";

export interface IPrimeiraConsultaService {
    verificarSeJaComprouPrimeiraConsulta(params: { email: string; telefone: string; cpf: string; }): Promise<boolean>;
    comprarPrimeiraConsulta?(data: PrimeiraConsultaData): Promise<PrimeiraConsultaResponse>;
    getPrimeiraConsulta?(userId: string): Promise<VerificarCompraParams>;
}
