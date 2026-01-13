import { Router } from 'express';
import { GerarAgendaController } from '../controllers/gerarAgenda.controller';
import { GerarAgendaService } from '../services/gerarAgenda.service';
import { prismaAgendaRepository } from '../repositories/prismaAgenda.repository';
import { prismaUserRepository } from '../repositories/prismaUser.repository';
import { asyncHandler } from '../middlewares/asyncHandler';
import { AgendaController } from '../controllers/AgendaController';
import { AgendaService } from '../services/AgendaService';

const gerarAgendaService = new GerarAgendaService(prismaAgendaRepository, prismaUserRepository);
const gerarAgendaController = new GerarAgendaController(gerarAgendaService);

const agendaService = new AgendaService();
const agendaController = new AgendaController(agendaService);

const router = Router();

// Rotas de geração de agenda
router.post('/gerar-automatica', asyncHandler(gerarAgendaController.gerarAutomatica));
router.post('/gerar-manual', asyncHandler(gerarAgendaController.gerarManual));
router.post('/deletar-agendas-anteriores', asyncHandler(gerarAgendaController.deletarAgendasAnteriores));


// Rotas de listagem de agenda
router.get('/todas', asyncHandler(agendaController.listarTodasAgendas));
router.get('/psicologo/:psicologoId', asyncHandler(agendaController.listarAgendasPorPsicologo));
router.get('/psicologo/:psicologoId/data', asyncHandler(agendaController.listarHorariosDisponiveisPorDataPsicologo));
router.get('/data', asyncHandler(agendaController.listarAgendasPorData));
router.get('/data-horario', asyncHandler(agendaController.listarAgendasPorDataHorario));
router.get('/periodo', asyncHandler(agendaController.listarHorariosDisponiveisPorPeriodoPsicologo));

// Rota para criar horário quebrado
router.post('/horario-quebrado', asyncHandler(agendaController.criarHorarioQuebrado));

export default router;
