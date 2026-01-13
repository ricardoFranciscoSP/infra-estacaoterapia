import { Router } from "express";
import { ConfigAgendaController } from "../../controllers/psicologo/configAgenda.controller";
import { protect } from '../../middlewares/authMiddleware';
import { AuthorizationService } from '../../services/authorization.service';
import { ConfigAgendaService } from '../../services/psicologo/configAgenda.service';

const router = Router();
const authorizationService = new AuthorizationService();
const configAgendaService = new ConfigAgendaService();
const controller = new ConfigAgendaController(authorizationService, configAgendaService);

router.use(protect);
// Rota para listar agendas com filtros
router.get("/agenda", controller.listarConfigAgenda.bind(controller));
// Rota para listar todas as agendas do mês de um psicólogo
router.get("/agenda/mes/:psicologoId/:ano/:mes", controller.listAllAgendaByMonth.bind(controller));
// Rota para listar horários por dia (agora recebe data como parâmetro de rota)
router.get("/agenda/horarios/:data", controller.listarHorariosPorDia.bind(controller));
// Rota para atualizar o status das agendas
router.post("/agenda/update-status-disponivel", controller.updateAgendaStatusDisponivel.bind(controller));

export default router;