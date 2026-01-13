import { Router } from "express";
import { asyncHandler } from "../middlewares/asyncHandler";
import { InternalController } from "../controllers/internal.controller";

const router = Router();
const internalController = new InternalController();

/**
 * Rotas internas para comunicação com o socket-server
 * Estas rotas NÃO requerem autenticação, pois são chamadas internamente
 */

// Consultas
router.get(
    "/consultas/:consultationId",
    asyncHandler(internalController.getConsulta.bind(internalController))
);

router.post(
    "/consultas/:consultationId/inactivity",
    asyncHandler(internalController.processInactivity.bind(internalController))
);

// Reserva de Sessão
router.patch(
    "/reserva-sessao/:consultationId/join",
    asyncHandler(internalController.updateReservaSessaoJoin.bind(internalController))
);

router.get(
    "/reserva-sessao/:consultationId",
    asyncHandler(internalController.getReservaSessao.bind(internalController))
);

// Notificações
router.get(
    "/notifications/:userId/unread-count",
    asyncHandler(internalController.countUnreadNotifications.bind(internalController))
);

router.patch(
    "/notifications/:notificationId/read",
    asyncHandler(internalController.markNotificationAsRead.bind(internalController))
);

router.patch(
    "/notifications/:userId/read-all",
    asyncHandler(internalController.markAllNotificationsAsRead.bind(internalController))
);

// Configurações
router.get(
    "/configuracoes/:key",
    asyncHandler(internalController.getConfiguracao.bind(internalController))
);

router.get(
    "/configuracoes",
    asyncHandler(internalController.getConfiguracao.bind(internalController))
);

// Usuários
router.get(
    "/users/:userId",
    asyncHandler(internalController.getUser.bind(internalController))
);

// Cancelamento de Sessão
router.post(
    "/cancelamento-sessao",
    asyncHandler(internalController.createCancelamentoSessao.bind(internalController))
);

// Próxima Consulta
router.post(
    "/proxima-consulta/notificar",
    asyncHandler(internalController.notificarAmbosUsuarios.bind(internalController))
);

router.get(
    "/proxima-consulta/psicologo/:psicologoId",
    asyncHandler(internalController.buscarProximaConsulta.bind(internalController))
);

router.get(
    "/proxima-consulta/paciente/:pacienteId",
    asyncHandler(internalController.buscarProximaConsultaPaciente.bind(internalController))
);

export default router;

