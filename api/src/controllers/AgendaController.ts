
import { AgendaService } from '../services/AgendaService';
import { Request, Response } from 'express';
export class AgendaController {
    listarHorariosDisponiveisPorPeriodoPsicologo = async (req: Request, res: Response): Promise<void> => {
        const { data, periodo } = req.query;
        console.log('[Controller] Params:', { data, periodo });
        if (!data || !periodo) {
            console.log('[Controller] Parâmetros obrigatórios ausentes');
            res.status(400).json({ error: 'Parâmetros data e periodo são obrigatórios.' });
            return;
        }
        try {
            console.log('[Controller] Chamando service.listarHorariosDisponiveisPorPeriodoTodosPsicologos');
            const result = await this.agendaService.listarHorariosDisponiveisPorPeriodoTodosPsicologos(
                String(data),
                String(periodo) as 'manha' | 'tarde' | 'noite'
            );
            console.log('[Controller] Resultado do service:', result);
            res.json(result);
        } catch (err) {
            console.error('[Controller] Erro ao buscar horários por período:', err);
            res.status(500).json({ error: 'Erro interno ao buscar horários por período.' });
        }
    };



    listarAgendasPorDataHorario = async (req: Request, res: Response): Promise<void> => {
        const { data, horario } = req.query;
        if (!data || !horario) {
            res.status(400).json({ error: 'Parâmetros data e horario são obrigatórios.' });
            return;
        }
        const agendas = await this.agendaService.listarAgendasPorDataHorario(String(data), String(horario));
        res.json(agendas);
    };
    private agendaService: AgendaService;

    constructor(agendaService: AgendaService) {
        this.agendaService = agendaService;
    }

    listarTodasAgendas = async (req: Request, res: Response): Promise<void> => {
        const agendas = await this.agendaService.listarTodasAgendas();
        res.json(agendas);
    };

    listarAgendasPorPsicologo = async (req: Request, res: Response): Promise<void> => {
        const { psicologoId } = req.params;
        console.log('Psicologo ID:', psicologoId);
        const agendas = await this.agendaService.listarAgendasPorPsicologo(psicologoId);
        console.log('Agendas:', agendas);
        res.json(agendas);
    };

    listarHorariosDisponiveisPorDataPsicologo = async (req: Request, res: Response): Promise<void> => {
        console.log('🔵 [AgendaController] ===== RECEBENDO REQUISIÇÃO =====');
        console.log('🔵 [AgendaController] req.params:', req.params);
        console.log('🔵 [AgendaController] req.query:', req.query);
        
        const { psicologoId } = req.params;
        const { data } = req.query;
        
        console.log('🔵 [AgendaController] Psicologo ID extraído:', psicologoId);
        console.log('🔵 [AgendaController] Data extraída:', data);
        
        if (!psicologoId) {
            console.error('❌ [AgendaController] PsicologoId não fornecido');
            res.status(400).json({ error: 'PsicologoId é obrigatório' });
            return;
        }
        
        if (!data) {
            console.error('❌ [AgendaController] Data não fornecida');
            res.status(400).json({ error: 'Data é obrigatória' });
            return;
        }
        
        try {
            console.log('🔵 [AgendaController] Chamando agendaService.listarHorariosDisponiveisPorDataPsicologo...');
            const result = await this.agendaService.listarHorariosDisponiveisPorDataPsicologo(psicologoId, String(data));
            
            // Ordena pelo horário
            result.sort((a, b) => a.horario.localeCompare(b.horario));
            
            console.log('🔵 [AgendaController] Resultado ordenado:', result.length, 'horários');
            console.log('🔵 [AgendaController] Primeiros 3 horários:', result.slice(0, 3));
            
            res.json(result);
        } catch (error: any) {
            console.error('❌ [AgendaController] Erro ao buscar horários:', error);
            console.error('❌ [AgendaController] Erro stack:', error?.stack);
            res.status(500).json({ error: 'Erro ao buscar horários disponíveis', message: error?.message });
        }
    };

    listarAgendasPorData = async (req: Request, res: Response): Promise<void> => {
        const { data } = req.query;
        const agendas = await this.agendaService.listarAgendasPorData(String(data));
        res.json(agendas);
    };

    listarAgendasPorPeriodo = async (req: Request, res: Response): Promise<void> => {
        const { periodo } = req.query;
        const agendas = await this.agendaService.listarAgendasPorPeriodo(periodo as 'manha' | 'tarde' | 'noite');
        res.json(agendas);
    };

    criarHorarioQuebrado = async (req: Request, res: Response): Promise<void> => {
        try {
            const { psicologoId, data, horario, status } = req.body;

            if (!psicologoId) {
                res.status(400).json({ error: 'psicologoId é obrigatório' });
                return;
            }

            if (!data) {
                res.status(400).json({ error: 'data é obrigatória (formato: YYYY-MM-DD)' });
                return;
            }

            if (!horario) {
                res.status(400).json({ error: 'horario é obrigatório (formato: HH:mm)' });
                return;
            }

            const agenda = await this.agendaService.criarHorarioQuebrado(
                psicologoId,
                data,
                horario,
                status
            );

            res.status(201).json({
                id: agenda.Id,
                data: agenda.Data,
                horario: agenda.Horario,
                diaDaSemana: agenda.DiaDaSemana,
                status: agenda.Status,
                psicologoId: agenda.PsicologoId,
                pacienteId: agenda.PacienteId,
                createdAt: agenda.CreatedAt,
                updatedAt: agenda.UpdatedAt
            });
        } catch (error) {
            console.error('Erro ao criar horário quebrado:', error);
            const errorMessage = error instanceof Error ? error.message : 'Erro interno ao criar horário quebrado';
            res.status(500).json({ error: errorMessage });
        }
    };
}
