import { GerarAgendaService } from '../services/gerarAgenda.service';
import { prismaAgendaRepository } from '../repositories/prismaAgenda.repository';
import { prismaUserRepository } from '../repositories/prismaUser.repository';

export const gerarAgendaCron = async () => {
    try {
        console.log('⏰ [gerarAgendaCron] Iniciando cron job para gerar agendas automaticamente...');
        
        const gerarAgendaService = new GerarAgendaService(prismaAgendaRepository, prismaUserRepository);
        const result = await gerarAgendaService.generateAgendas();
        
        if ('error' in result && result.error) {
            console.error('❌ [gerarAgendaCron] Erro ao gerar agendas:', result.error);
            throw new Error(result.error);
        }
        
        const totalCriados = result.resultados?.reduce((acc, r) => acc + (r.criados || 0), 0) || 0;
        console.log(`✅ [gerarAgendaCron] Cron job para gerar agendas finalizado. Total de agendas criadas: ${totalCriados}`);
        
        return result;
    } catch (error) {
        console.error('❌ [gerarAgendaCron] Erro no cron job de gerar agendas automaticamente:', error);
        throw error;
    }
};

