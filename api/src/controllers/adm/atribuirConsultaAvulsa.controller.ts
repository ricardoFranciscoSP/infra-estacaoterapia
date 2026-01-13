import { Request, Response } from "express";
import { AtribuirConsultaAvulsaService } from "../../services/adm/atribuirConsultaAvulsa.service";
import { AuthorizationService } from "../../services/authorization.service";

export class AtribuirConsultaAvulsaController {
    private authService: AuthorizationService;
    private service: AtribuirConsultaAvulsaService;

    constructor() {
        this.authService = new AuthorizationService();
        this.service = new AtribuirConsultaAvulsaService();
    }

    async atribuir(req: Request, res: Response): Promise<Response> {
        try {
            const user = req.user;
            if (!user) {
                return res.status(401).json({ error: "Usuário não autorizado." });
            }

            // Verifica permissão (apenas Admin)
            const hasPermission = await this.authService.checkPermission(
                user.Id,
                "Configuracoes" as any,
                "Create" as any
            );

            if (!hasPermission && user.Role !== "Admin") {
                return res.status(403).json({ error: "Acesso negado. Apenas administradores podem atribuir consultas avulsas." });
            }

            const { pacienteId, planoAssinaturaId, quantidade, status } = req.body;

            // Validações
            if (!pacienteId) {
                return res.status(400).json({ error: "ID do paciente é obrigatório." });
            }

            if (!quantidade || quantidade < 1) {
                return res.status(400).json({ error: "A quantidade deve ser maior que zero." });
            }

            const statusValido = status || "Ativa";
            if (!["Ativa", "Pendente", "Concluida"].includes(statusValido)) {
                return res.status(400).json({ error: "Status inválido. Use: Ativa, Pendente ou Concluida." });
            }

            const resultado = await this.service.atribuirConsultaAvulsa({
                pacienteId,
                planoAssinaturaId,
                quantidade,
                status: statusValido,
            });

            return res.status(200).json(resultado);
        } catch (error: unknown) {
            console.error("[AtribuirConsultaAvulsaController] Erro ao atribuir consultas avulsas:", error);
            const errorMessage = error instanceof Error ? error.message : "Erro ao atribuir consultas avulsas.";
            return res.status(400).json({ error: errorMessage });
        }
    }
}

