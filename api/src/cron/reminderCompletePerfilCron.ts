import prisma from '../prisma/client';
import { EmailService } from '../services/email.service';

export const reminderCompletePerfilCron = async () => {
    try {
        console.log('⏰ [reminderCompletePerfilCron] Iniciando cron job para lembrar psicólogos de completar perfil...');
        
        const emailService = new EmailService();
        
        // Busca psicólogos com perfil incompleto
        // Status = "Incompleto" e que tenham sido aprovados (Status do User = "Ativo")
        const psicologosIncompletos = await prisma.user.findMany({
            where: {
                Role: 'Psychologist',
                Status: 'Ativo', // Apenas psicólogos aprovados
                ProfessionalProfiles: {
                    some: {
                        Status: 'Incompleto'
                    }
                }
            },
            select: {
                Id: true,
                Email: true,
                Nome: true,
                ProfessionalProfiles: {
                    where: {
                        Status: 'Incompleto'
                    },
                    select: {
                        Status: true
                    },
                    take: 1
                }
            }
        });
        
        console.log(`[reminderCompletePerfilCron] Encontrados ${psicologosIncompletos.length} psicólogos com perfil incompleto`);
        
        let emailsEnviados = 0;
        let erros = 0;
        
        // Envia email para cada psicólogo
        for (const psicologo of psicologosIncompletos) {
            if (!psicologo.Email || !psicologo.Nome) {
                console.warn(`[reminderCompletePerfilCron] ⚠️ Psicólogo ${psicologo.Id} sem email ou nome, pulando...`);
                continue;
            }
            
            try {
                await emailService.sendCompletePerfilPsicologoEmail(psicologo.Email, psicologo.Nome);
                emailsEnviados++;
                console.log(`[reminderCompletePerfilCron] ✅ Email enviado para ${psicologo.Email}`);
            } catch (error) {
                erros++;
                console.error(`[reminderCompletePerfilCron] ❌ Erro ao enviar email para ${psicologo.Email}:`, error);
                // Continua com os próximos mesmo se um falhar
            }
        }
        
        console.log(`✅ [reminderCompletePerfilCron] Cron job finalizado. Emails enviados: ${emailsEnviados}, Erros: ${erros}`);
        
        return {
            total: psicologosIncompletos.length,
            enviados: emailsEnviados,
            erros: erros
        };
    } catch (error) {
        console.error('❌ [reminderCompletePerfilCron] Erro no cron job de lembrete para completar perfil:', error);
        throw error;
    }
};

