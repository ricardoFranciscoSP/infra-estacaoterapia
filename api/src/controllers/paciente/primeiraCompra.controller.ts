import { Request, Response } from "express";
import { AuthorizationService } from "../../services/authorization.service";
import { IPrimeiraConsultaService } from "../../interfaces/primeiraConsulta.interface";
import { GetUserBasicService } from "../../services/getUserBasic.Service";


export class PrimeiraConsultaController {
    constructor(
        private authService: AuthorizationService,
        private primeiraConsultaService: IPrimeiraConsultaService,
        private userService: GetUserBasicService
    ) { }

    async verificarSeJaComprouPrimeiraConsulta(req: Request, res: Response): Promise<Response> {
        try {

            const userId = this.authService.getLoggedUserId(req);

            if (!userId) {
                return res.status(401).json({ error: "Usuário não autorizado." });
            }

            // Buscar dados do usuário usando GetUserBasicService
            const usuario = await this.userService.execute(userId);

            // Ajuste para considerar campos opcionais
            const email = usuario?.Email ?? "";
            const telefone = usuario?.Telefone ?? "";
            const cpf = usuario?.Cpf ?? "";

            const jaComprou = await this.primeiraConsultaService.verificarSeJaComprouPrimeiraConsulta({
                email,
                telefone,
                cpf
            });
            return res.json({ jaComprou });
        } catch (error) {
            console.error("Erro ao verificar compra da primeira consulta:", error);
            return res.status(500).json({ error: "Erro interno do servidor" });
        }
    }

    async comprarPrimeiraConsulta(req: Request, res: Response): Promise<Response> {
        try {
            const data = req.body;
            const userId = this.authService.getLoggedUserId(req);

            if (!userId) {
                return res.status(401).json({ error: "Usuário não autorizado." });
            }

            // Buscar dados do usuário usando GetUserBasicService
            const usuario = await this.userService.execute(userId);

            if (!this.primeiraConsultaService || !this.primeiraConsultaService.comprarPrimeiraConsulta) {
                return res.status(500).json({ error: "Serviço de primeira consulta não está disponível." });
            }

            const resultado = await this.primeiraConsultaService.comprarPrimeiraConsulta({
                ...data,
                userId,
                usuario
            });
            return res.json(resultado); // resultado é PrimeiraConsultaResponse
        } catch (error) {
            console.error("Erro ao comprar a primeira consulta:", error);
            return res.status(500).json({ error: "Erro interno do servidor" });
        }
    }

    async getPrimeiraConsulta(req: Request, res: Response): Promise<Response> {
        try {
            const userId = this.authService.getLoggedUserId(req);
            if (!userId) {
                return res.status(401).json({ error: "Usuário não autorizado." });
            }
            if (!this.primeiraConsultaService || !this.primeiraConsultaService.getPrimeiraConsulta) {
                return res.status(500).json({ error: "Serviço de primeira consulta não está disponível." });
            }
            const resultado = await this.primeiraConsultaService.getPrimeiraConsulta(userId);
            return res.json(resultado); // resultado é PrimeiraConsultaResponse
        } catch (error) {
            console.error("Erro ao obter a primeira consulta:", error);
            return res.status(500).json({ error: "Erro interno do servidor" });
        }
    }
}