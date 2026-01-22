import { Router } from "express";
import authRoutes from "./auth.routes";
import draftSessionRoutes from "./draftSession.routes";
import userRoutes from "./user.routes";
import workScheduleRoutes from "./workSchedule.routes";
import favoriteRoutes from "./favorite.routes";
import planosRoutes from "./planos.routes";
import gerarAgendaRoutes from "./gerarAgenda.routes";
import reservationsRoutes from "./reservations.routes";
import notificationRoutes from "./notifications.routes";
import psicologoRoutes from "./psicologo.routes";
import compraPlanosRoutes from "./planoCompras.routes";
import financeiroRoutes from "./financeiro.routes";
import controleConsultasRoutes from "./controleConsultas.routes";
import compraAvulsaRoutes from "./compraAvulsa.routes";
import webhookRoutes from "./webhook.routes";
import permissions from "./permission.routes";
import reviewRoutes from "./review.routes";
import agoraRoutes from "./agora.routes";
import cronRoutes from "./cron.routes";
import consultasPsicologoRoutes from "./consultasPsicologo.routes";
import controleFaturaRoutes from "./controleFatura.routes";
import AdminRouter from "./adm/admin.routes";
import enumRoutes from "./enumRoutes";
import primeiraCompraRoutes from "./primeraCompra.routes";
import cancelamentoRoutes from "./cancelamento.routes";
import configAgendaRoutes from "./psicologo/configAgendaRoutes";
import reservaSessaoRoutes from "./reservaSessao.routes";
import psicologos from "../routes/psicologo/index.routes";
import solicitacoes from "./solicitacoes.routes";
import auditRoutes from "./audit.routes";
import filesRoutes from "./files.routes";
import proximaConsultaRoutes from "./proximaConsulta.routes";
import contatoRoutes from "./contato.routes";
import addressRoutes from "./address.router";
import trocaCartaoRoutes from "./trocaCartao.routes";
import cicloPlanoRoutes from "./cicloPlano.routes";
import formularioSaqueAutonomoRoutes from "./formularioSaqueAutonomo.routes";
import solicitacaoSaqueRoutes from "./solicitacaoSaque.routes";
import faqRoutes from "./faq.routes";
import infoSimplesRoutes from "./infoSimples.routes";
import bannerRoutes from "./banner.routes";
import reportsRoutes from "./reports.routes";
import estacaoRoutes from "./estacao.routes";
import politicasRoutes from "./politicas.routes";
import policyDocumentsRoutes from "./policyDocuments.routes";
import internalRoutes from "./internal.routes";
import { asyncHandler } from "../middlewares/asyncHandler";
import { ConfiguracoesController } from "../controllers/adm/configuracoes.controller";

const router = Router();

router.use("/planos", planosRoutes);
router.use("/ciclos", cicloPlanoRoutes);
router.use("/draft-session", draftSessionRoutes);
router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/work-schedules", workScheduleRoutes);
router.use("/favorites", favoriteRoutes);
router.use("/agenda", gerarAgendaRoutes);
router.use("/reservas", reservationsRoutes);
router.use("/reservas-psicologo", consultasPsicologoRoutes);
router.use("/notification", notificationRoutes);
router.use("/psicologos", psicologoRoutes);
router.use("/compra-planos", compraPlanosRoutes);
router.use("/compras-avulsas", compraAvulsaRoutes);
router.use("/financeiro", financeiroRoutes);
router.use("/controle-consultas", controleConsultasRoutes);
router.use("/webhook", webhookRoutes);
router.use("/permissions", permissions);
router.use("/reviews", reviewRoutes);
router.use("/room", agoraRoutes);
router.use("/cron", cronRoutes);
router.use("/controle-fatura", controleFaturaRoutes);
router.use("/admin", AdminRouter);
router.use("/enums", enumRoutes);
router.use("/primeira-consulta", primeiraCompraRoutes);
// Rota de cancelamento disponível para usuários autenticados
router.use("/cancelamento", cancelamentoRoutes);
router.use("/config-agenda", configAgendaRoutes);
router.use("/reserva-sessao", reservaSessaoRoutes);
router.use("/adm-psicologos", psicologos);
router.use("/psicologo", psicologos); // Alias para compatibilidade com frontend
router.use("/solicitacoes", solicitacoes);
router.use("/audit", auditRoutes);
router.use("/files", filesRoutes);
router.use("/proxima-consulta", proximaConsultaRoutes);
router.use("/consultas-paciente", require("./paciente/consultas.routes").default);
// Alias legado para manter compatibilidade com frontend antigo
router.use("/paciente/consultas", require("./paciente/consultas.routes").default);
router.use("/contato", contatoRoutes);

router.use("/address", addressRoutes);
router.use("/troca-cartao", trocaCartaoRoutes);
router.use("/formulario-saque-autonomo", formularioSaqueAutonomoRoutes);
router.use("/solicitacao-saque", solicitacaoSaqueRoutes);
router.use("/faqs", faqRoutes);
router.use("/infosimples", infoSimplesRoutes);
router.use("/banners", bannerRoutes);
router.use("/reports", reportsRoutes);
router.use("/estacao", estacaoRoutes);
router.use("/politicas", politicasRoutes);
router.use("/policy-documents", policyDocumentsRoutes);

// Rotas internas para comunicação com socket-server (sem autenticação)
router.use("/internal", internalRoutes);

// Rota pública para verificar status de manutenção (sem autenticação)
const configuracoesControllerPublic = new ConfiguracoesController();
router.get("/api/configuracoes/manutencao", asyncHandler(configuracoesControllerPublic.getMaintenanceStatus.bind(configuracoesControllerPublic)));

export default router;