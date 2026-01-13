import { asyncHandler } from '../../middlewares/asyncHandler';
import { protect } from '../../middlewares/authMiddleware';
import { AuthorizationService } from '../../services/authorization.service';
import { Router } from 'express';
import { ConsultasPacienteController } from '../../controllers/paciente/consultas.controller';
import { ConsultasPacienteService } from '../../services/paciente/consultas.service';

const router = Router();

const authorizationService = new AuthorizationService();
const consultasService = new ConsultasPacienteService();
const consultasController = new ConsultasPacienteController(authorizationService, consultasService);

router.use(protect);

// Iniciar consulta (atualizar status para 'Andamento')
router.post('/iniciar/:id', asyncHandler(consultasController.iniciarConsulta.bind(consultasController)));
// Finalizar consulta (atualizar status para 'Realizada')
router.post('/finalizar/:id', asyncHandler(consultasController.finalizarConsulta.bind(consultasController)));
// Finalizar consulta com verificação de review (retorna flag requiresReview)
router.post('/finalizar-com-review/:id', asyncHandler(consultasController.finalizarConsultaComReview.bind(consultasController)));
// Consulta em andamento
router.get('/em-andamento', asyncHandler(consultasController.consultaEmAndamento.bind(consultasController)));

// Listar TODAS as consultas realizadas com status fixos (Cancelado, Andamento, Concluido, etc.)
router.get('/todas-realizadas', asyncHandler(consultasController.listarTodasConsultasRealizadas.bind(consultasController)));

// Listar todas as consultas realizadas (com filtro opcional por status via query)
router.get('/realizadas', asyncHandler(consultasController.listarConsultasRealizadas.bind(consultasController)));

// Listar consultas por status e mês
router.get('/por-status-e-mes', asyncHandler(consultasController.listarConsultasPorStatusEMes.bind(consultasController)));

// Listar consultas por status específico
router.get('/por-status/:status', asyncHandler(consultasController.listarConsultasPorStatus.bind(consultasController)));

// Contar total de consultas por status
router.get('/contar', asyncHandler(consultasController.contarConsultasRealizadas.bind(consultasController)));

// Contar consultas por status e mês
router.get('/contar-por-status-e-mes', asyncHandler(consultasController.contarConsultasPorStatusEMes.bind(consultasController)));

export default router;
