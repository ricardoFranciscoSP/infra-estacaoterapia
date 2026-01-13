import { Router } from 'express';
import { ReservationsController } from '../controllers/reservations.controller';
import { ReservationService } from '../services/reservation.service';
import { UserService } from '../services/user.service';
import { EmailService } from '../services/email.service';
import { ScheduleService } from '../services/schedule.service';
import { asyncHandler } from '../middlewares/asyncHandler';
import { protect } from '../middlewares/authMiddleware';

import multer from 'multer';
// Configuração do Multer para upload de arquivos
const upload = multer({ storage: multer.memoryStorage() });

// Instanciação dos serviços e controlador
const emailService = new EmailService();
const reservationService = new ReservationService(emailService);
const userService = new UserService();
const scheduleService = new ScheduleService();
const reservationsController = new ReservationsController(reservationService, userService, scheduleService,);

// Criação do roteador
const router = Router();

router.use(protect); // Middleware to handle async errors
router.get('/consulta-dia-ou-proxima', asyncHandler(reservationsController.consultaDoDiaOuProxima.bind(reservationsController)));
router.get('/proxima-consulta', asyncHandler(reservationsController.proximaConsulta.bind(reservationsController)));
router.get('/consultas-agendadas', asyncHandler(reservationsController.listarConsultasAgendadas.bind(reservationsController)));

router.get('/agenda/:psicologoId', asyncHandler(reservationsController.consultarAgenda.bind(reservationsController)));
router.get('/', asyncHandler(reservationsController.listarReservas.bind(reservationsController)));
router.get('/consultas-realizadas', asyncHandler(reservationsController.consultasRealizadas.bind(reservationsController)));
router.get('/completed', asyncHandler(reservationsController.listarReservasCompletasEFuturas.bind(reservationsController)));
router.get('/token/:channel', asyncHandler(reservationsController.getTokenByChannel.bind(reservationsController)));
router.get('/reservation/:id', asyncHandler(reservationsController.fetchReservasId.bind(reservationsController)));
// Rotas POST específicas devem vir ANTES da rota GET genérica /:id para evitar conflitos
router.post('/cancelar-reserva/:id', upload.single('file'), asyncHandler(reservationsController.cancelarReserva.bind(reservationsController)));
// Reagendamento de consulta pelo paciente: envia { idAntiga, idNova } no body
router.post('/reagendar-reserva', asyncHandler(reservationsController.reagendarReserva.bind(reservationsController)));
router.post('/cancelamento-automatico', asyncHandler(reservationsController.cancelarReservaAutomatico.bind(reservationsController)));
// Reagendamento do psicólogo na sala (problema do psicólogo) - DEVE VIR ANTES DE /:id
router.post('/:id/reagendar-psicologo-sala', upload.single('documento'), asyncHandler(reservationsController.reagendarPsicologoSala.bind(reservationsController)));
// Cancelamento do psicólogo na sala (problema do paciente) - DEVE VIR ANTES DE /:id
router.post('/:id/cancelar-psicologo-sala', upload.single('documento'), asyncHandler(reservationsController.cancelarPsicologoSala.bind(reservationsController)));
// Reserva de horário (front envia POST /reservas/:id) - mantemos GET para compatibilidade
router.post('/:id', asyncHandler(reservationsController.reservarHorario.bind(reservationsController)));
// Rota GET genérica deve vir por último
router.get('/:id', asyncHandler(reservationsController.reservarHorario.bind(reservationsController)));
router.put('/update-status', asyncHandler(reservationsController.updateStatus.bind(reservationsController)));

export default router;