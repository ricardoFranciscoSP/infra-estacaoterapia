import { asyncHandler } from '../../middlewares/asyncHandler';
import { protect } from '../../middlewares/authMiddleware';
import { AuthorizationService } from '../../services/authorization.service';
import { Router } from 'express';
import { prismaAgendaRepository } from '../../repositories/prismaAgenda.repository';
import { ConsultasPsicologoController } from '../../controllers/psicologo/consultas.controller';
import { ConsultasService } from '../../services/psicologo/consultas.service';

const router = Router();

const authorizationService = new AuthorizationService();
const consultasService = new ConsultasService(prismaAgendaRepository);
const consultasController = new ConsultasPsicologoController(authorizationService, consultasService);

router.use(protect);
// Iniciar consulta (atualizar status para 'Andamento')
router.post('/iniciar/:id', asyncHandler(consultasController.iniciarConsulta.bind(consultasController)));
router.get('/consultas-realizadas', asyncHandler(consultasController.consultasRealizadas.bind(consultasController)));
// Consulta em andamento
router.get('/em-andamento', asyncHandler(consultasController.consultaEmAndamento.bind(consultasController)));
router.get('/taxa-ocupacao-agenda', asyncHandler(consultasController.taxaOcupacaoAgenda.bind(consultasController)));
router.get('/consultas-pendentes', asyncHandler(consultasController.consultasPendentes.bind(consultasController)));
router.get('/proximas-consultas', asyncHandler(consultasController.proximasConsultas.bind(consultasController)));
router.get('/proxima-consulta', asyncHandler(consultasController.proximaConsulta.bind(consultasController)));
router.get('/todas-realizadas', asyncHandler(consultasController.listarTodasConsultasRealizadas.bind(consultasController)));
router.get('/realizadas-por-status', asyncHandler(consultasController.listarConsultasRealizadasPorStatus.bind(consultasController)));
router.get('/por-status-e-mes', asyncHandler(consultasController.listarConsultasPorStatusEMes.bind(consultasController)));
router.get('/por-status/:status', asyncHandler(consultasController.listarConsultasPorStatus.bind(consultasController)));
router.get('/contar-por-status', asyncHandler(consultasController.contarConsultasPorStatus.bind(consultasController)));
router.get('/contar-por-status-e-mes', asyncHandler(consultasController.contarConsultasPorStatusEMes.bind(consultasController)));
router.get('/historico', asyncHandler(consultasController.listarHistoricoConsultas.bind(consultasController)));

export default router;