/**
 * ⚠️ DEPRECADO: Este arquivo foi substituído por delayed jobs
 * 
 * REFATORADO: A verificação de consultas em andamento pode ser feita via delayed jobs
 * quando consultas são criadas, ou mantida como job recorrente se necessário para
 * notificações em tempo real.
 * 
 * Este arquivo ainda pode ser usado se necessário para notificações periódicas,
 * mas considere usar delayed jobs quando possível.
 */

import { ConsultaEmAndamentoService } from "../services/consultaEmAndamento.service";

/**
 * Verifica e notifica consultas em andamento
 * Pode ser mantido como job recorrente se necessário para notificações em tempo real
 */
export const verificarConsultasEmAndamento = async () => {
    try {
        console.log('⏰ [verificarConsultasEmAndamento] Iniciando verificação de consultas em andamento...');
        
        const service = new ConsultaEmAndamentoService();
        await service.verificarENotificarConsultasEmAndamento();
        
        console.log('✅ [verificarConsultasEmAndamento] Verificação concluída.');
    } catch (error) {
        console.error('❌ [verificarConsultasEmAndamento] Erro ao verificar consultas em andamento:', error);
    }
};
