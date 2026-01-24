import prisma from "../prisma/client";
import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import { ConsultaStatus } from "../generated/prisma";
import {
  ConsultaStatusHelper,
  ConsultaOrigemStatus,
  ConsultaTelaGatilho,
  ConsultaAcaoSaldo,
} from "../constants/consultaStatus.constants";
import { getEventSyncService } from "../services/eventSync.service";

dayjs.extend(utc);
dayjs.extend(timezone);

export interface AtualizarConsultaStatusDTO {
  consultaId: string;
  novoStatus: ConsultaStatus;
  origem?: ConsultaOrigemStatus;
  telaGatilho?: string;
  usuarioId?: string;
}

/**
 * Serviço para gerenciar o ciclo de vida dos status de consultas
 * Garante que todas as regras de negócio sejam respeitadas
 */
/**
 * Interface para busca de consulta por múltiplos identificadores
 */
interface BuscarConsultaParams {
  consultaId?: string;
  pacienteId?: string;
  psicologoId?: string;
  agendaId?: string;
}

/**
 * Tipo para consulta completa com relacionamentos
 */
type ConsultaCompleta = Awaited<ReturnType<typeof prisma.consulta.findUnique<{
  where: { Id: string };
  include: {
    Paciente: true;
    Psicologo: true;
    CicloPlano: true;
    ReservaSessao: true;
    Agenda: true;
  };
}>>>;

export class ConsultaStatusService {
  /**
   * Busca consulta por múltiplos identificadores
   * Prioriza: ConsultaId > ReservaSessao.ConsultaId > AgendaId > PatientId
   * A ReservaSessao é tratada como fonte principal de vínculo
   */
  private async buscarConsultaPorIdentificadores(
    params: BuscarConsultaParams
  ): Promise<ConsultaCompleta> {
    const { consultaId, pacienteId, psicologoId, agendaId } = params;

    // 1. Tenta buscar diretamente pelo ConsultaId
    if (consultaId) {
      const consulta = await prisma.consulta.findUnique({
        where: { Id: consultaId },
        include: {
          Paciente: true,
          Psicologo: true,
          CicloPlano: true,
          ReservaSessao: true,
          Agenda: true,
        },
      });

      if (consulta) {
        return consulta;
      }
    }

    // 2. Busca via ReservaSessao (fonte principal de vínculo)
    const whereReservaSessao: {
      ConsultaId?: string;
      PatientId?: string;
      PsychologistId?: string;
      AgendaId?: string;
    } = {};

    if (consultaId) {
      whereReservaSessao.ConsultaId = consultaId;
    }
    if (pacienteId) {
      whereReservaSessao.PatientId = pacienteId;
    }
    if (psicologoId) {
      whereReservaSessao.PsychologistId = psicologoId;
    }
    if (agendaId) {
      whereReservaSessao.AgendaId = agendaId;
    }

    if (Object.keys(whereReservaSessao).length > 0) {
      const reservaSessao = await prisma.reservaSessao.findFirst({
        where: whereReservaSessao,
        include: {
          Consulta: {
            include: {
              Paciente: true,
              Psicologo: true,
              CicloPlano: true,
              ReservaSessao: true,
              Agenda: true,
            },
          },
        },
      });

      if (reservaSessao?.Consulta) {
        return reservaSessao.Consulta;
      }
    }

    // 3. Busca via Agenda (Agenda tem relação 1:N com Consulta, então busca a mais recente)
    if (agendaId) {
      const consulta = await prisma.consulta.findFirst({
        where: { AgendaId: agendaId },
        include: {
          Paciente: true,
          Psicologo: true,
          CicloPlano: true,
          ReservaSessao: true,
          Agenda: true,
        },
        orderBy: { CreatedAt: 'desc' },
      });

      if (consulta) {
        return consulta;
      }
    }

    // 4. Busca via PatientId ou PsychologistId na tabela Consulta
    if (pacienteId || psicologoId) {
      const whereConsulta: {
        PacienteId?: string;
        PsicologoId?: string;
      } = {};

      if (pacienteId) {
        whereConsulta.PacienteId = pacienteId;
      }
      if (psicologoId) {
        whereConsulta.PsicologoId = psicologoId;
      }

      const consulta = await prisma.consulta.findFirst({
        where: whereConsulta,
        include: {
          Paciente: true,
          Psicologo: true,
          CicloPlano: true,
          ReservaSessao: true,
          Agenda: true,
        },
        orderBy: { CreatedAt: 'desc' }, // Pega a mais recente
      });

      if (consulta) {
        return consulta;
      }
    }

    throw new Error('Consulta não encontrada pelos identificadores fornecidos');
  }

  /**
   * Atualiza o status de uma consulta aplicando todas as regras de negócio
   */
  async atualizarStatus(data: AtualizarConsultaStatusDTO) {
    const { consultaId, novoStatus, origem, telaGatilho, usuarioId } = data;

    // Busca a consulta atual (campos mínimos necessários, incluindo Date para repasse)
    const consulta = await prisma.consulta.findUnique({
      where: { Id: consultaId },
      select: {
        Id: true,
        Status: true,
        Date: true,
        PacienteId: true,
        PsicologoId: true,
        CicloPlanoId: true,
        Valor: true,
      },
    });

    if (!consulta) {
      throw new Error(`Consulta ${consultaId} não encontrada`);
    }

    if (consulta.Status === novoStatus) {
      return consulta;
    }

    // Define a origem do status
    const origemFinal = origem || this.inferirOrigem(usuarioId);

    // Valida a transição de status
    this.validarTransicao(consulta.Status as ConsultaStatus, novoStatus);

    // Determina se deve ser faturada
    // Nota: Para casos condicionais, usa a lógica de statusConsulta.types.ts
    // Por enquanto, usa a função helper (que retorna false para condicionais)
    // A lógica completa de repasse deve ser feita via processRepasseAsync que usa determinarRepasse
    const faturada = ConsultaStatusHelper.deveSerFaturada(novoStatus);

    // Determina a ação de saldo
    const acaoSaldo = ConsultaStatusHelper.getAcaoSaldo(novoStatus);

    // Para devolução de saldo, usa a lógica completa que considera deferimento
    // Por enquanto, usa a função helper simples (para casos não condicionais)
    // Para casos condicionais, a lógica deve ser feita via determinarDevolucaoSessao
    const devolveSessiono = ConsultaStatusHelper.devolveSessiono(novoStatus);

    // Inicia transação
    const consultaAtualizada = await prisma.$transaction(async (tx) => {
      // VALIDAÇÃO: Garante que apenas 1 consulta esteja "EmAndamento" por vez
      if (novoStatus === "EmAndamento") {
        const outrasConsultasEmAndamento = await tx.consulta.findMany({
          where: {
            Status: "EmAndamento",
            Id: { not: consultaId },
            OR: [
              { PacienteId: consulta.PacienteId },
              { PsicologoId: consulta.PsicologoId },
            ],
          },
          select: {
            Id: true,
            PacienteId: true,
            PsicologoId: true,
            Date: true,
            Time: true,
          },
        });

        if (outrasConsultasEmAndamento.length > 0) {
          const outraConsulta = outrasConsultasEmAndamento[0];
          throw new Error(
            `Já existe uma consulta em andamento. ` +
              `Somente uma consulta pode estar "Em Andamento" por vez. ` +
              `Consulta existente: ${outraConsulta.Id} - ${outraConsulta.Date} ${outraConsulta.Time}`
          );
        }
      }

      // Atualiza a consulta
      const consultaAtualizada = await tx.consulta.update({
        where: { Id: consultaId },
        data: {
          Status: novoStatus,
          Faturada: faturada,
          OrigemStatus: origemFinal as string,
          TelaGatilho: telaGatilho || ConsultaStatusHelper.getTelaGatilho(novoStatus),
          AcaoSaldo: acaoSaldo,
          UpdatedAt: new Date(),
        },
      });

      // Se deve devolver sessão/crédito
      // Validação de idempotência: verifica se já foi devolvido (status atual já é um que devolve sessão)
      const statusAtual = consulta.Status as string;
      const jaDevolveuSessao =
        statusAtual === "PsicologoNaoCompareceu" ||
        statusAtual === "CanceladaPsicologoNoPrazo" ||
        statusAtual === "CanceladaPsicologoForaDoPrazo" ||
        statusAtual === "ReagendadaPsicologoNoPrazo" ||
        statusAtual === "ReagendadaPsicologoForaDoPrazo" ||
        statusAtual === "PsicologoDescredenciado" ||
        statusAtual === "CanceladoAdministrador";

      if (devolveSessiono && consulta.CicloPlanoId && consulta.PacienteId && !jaDevolveuSessao) {
        // Devolve exatamente 1 sessão disponível no ciclo
        await tx.cicloPlano.update({
          where: { Id: consulta.CicloPlanoId },
          data: {
            ConsultasDisponiveis: {
              increment: 1, // Incrementa exatamente 1
            },
            ConsultasUsadas: {
              decrement: 1, // Decrementa exatamente 1
            },
          },
        });
        console.log(`✅ [atualizarStatus] 1 sessão devolvida para paciente ${consulta.PacienteId} na consulta ${consultaId}`);
      } else if (devolveSessiono && jaDevolveuSessao) {
        console.log(`⚠️ [atualizarStatus] Consulta ${consultaId} já teve sessão devolvida (status: ${statusAtual}) - ignorando devolução duplicada`);
      }

      // 🎯 Ajusta repasse baseado no status e regras de cancelamento
      // Verifica se deve fazer repasse baseado no status normalizado
      const { determinarStatusNormalizado, determinarRepasse } = await import('../utils/statusConsulta.util');
      
      // Busca cancelamento mais recente se houver
      const cancelamentoMaisRecente = await tx.cancelamentoSessao.findFirst({
        where: { SessaoId: consultaId },
        orderBy: { Data: 'desc' }
      });
      const cancelamentoDeferido = cancelamentoMaisRecente?.Status === 'Deferido';

      const statusNormalizado = await determinarStatusNormalizado(novoStatus, {
        tipoAutor: cancelamentoMaisRecente?.Tipo,
        dataConsulta: consulta.Date,
        motivo: cancelamentoMaisRecente?.Motivo,
        cancelamentoDeferido,
        pacienteNaoCompareceu: novoStatus === 'PacienteNaoCompareceu',
        psicologoNaoCompareceu: novoStatus === 'PsicologoNaoCompareceu'
      });

      const deveFazerRepasse = determinarRepasse(statusNormalizado, cancelamentoDeferido);

      // Verifica se já existe commission
      const commissionExistente = await tx.commission.findFirst({
        where: { ConsultaId: consultaId },
      });

      if (!deveFazerRepasse) {
        // 🎯 NÃO deve fazer repasse - remove commission se existir
        if (commissionExistente) {
          await tx.commission.delete({
            where: { Id: commissionExistente.Id }
          });
          console.log(`✅ [atualizarStatus] Comissão removida para consulta ${consultaId} (status ${statusNormalizado} não repassável)`);
        }
        
        // Marca consulta como não faturada
        await tx.consulta.update({
          where: { Id: consultaId },
          data: { Faturada: false }
        });
      } else {
        // 🎯 DEVE fazer repasse - cria ou atualiza commission
        if (consulta.PsicologoId && consulta.Valor) {
          // Busca dados do paciente para calcular valor base corretamente
          const pacienteComPlano = await tx.user.findUnique({
            where: { Id: consulta.PacienteId || '' },
            include: {
              AssinaturaPlanos: {
                where: { Status: 'Ativo' },
                include: {
                  PlanoAssinatura: true
                }
              }
            }
          });

          let valorBase = consulta.Valor ?? 0;
          const { CommissionTipoPlano } = await import('../generated/prisma');
          let tipoPlano: typeof CommissionTipoPlano[keyof typeof CommissionTipoPlano] = CommissionTipoPlano.avulsa;

          const planoAssinatura = pacienteComPlano?.AssinaturaPlanos?.[0];
          if (planoAssinatura && planoAssinatura.PlanoAssinatura) {
            const tipo = planoAssinatura.PlanoAssinatura.Tipo?.toLowerCase();
            if (tipo === "mensal") {
              tipoPlano = CommissionTipoPlano.mensal;
              valorBase = (planoAssinatura.PlanoAssinatura.Preco ?? 0) / 4;
            } else if (tipo === "trimestral") {
              tipoPlano = CommissionTipoPlano.trimestral;
              valorBase = (planoAssinatura.PlanoAssinatura.Preco ?? 0) / 12;
            } else if (tipo === "semestral") {
              tipoPlano = CommissionTipoPlano.semestral;
              valorBase = (planoAssinatura.PlanoAssinatura.Preco ?? 0) / 24;
            } else {
              tipoPlano = CommissionTipoPlano.avulsa;
              valorBase = consulta.Valor ?? 0;
            }
          }

          // Se não tem valor base, busca do PlanoAssinatura
          if (valorBase === 0) {
            const planoAvulsa = await tx.planoAssinatura.findFirst({
              where: {
                Tipo: { in: ["Avulsa", "Unica"] },
                Status: "Ativo"
              },
              orderBy: { Preco: 'desc' }
            });
            
            if (planoAvulsa && planoAvulsa.Preco) {
              valorBase = planoAvulsa.Preco;
            }
          }

          if (valorBase > 0) {
            // Obtém o percentual de repasse
            const { getRepassePercentForPsychologist } = await import('../utils/repasse.util');
            const repassePercent = await getRepassePercentForPsychologist(consulta.PsicologoId);
            const valorPsicologo = valorBase * repassePercent;

            // Calcula status de repasse baseado na data de corte
            const { calcularStatusRepassePorDataCorte } = await import('../scripts/processarRepassesConsultas');
            const psicologo = await tx.user.findUnique({
              where: { Id: consulta.PsicologoId },
              select: { Status: true }
            });
            const psicologoStatus = psicologo?.Status || 'Inativo';
            const statusRepasse = calcularStatusRepassePorDataCorte(consulta.Date, psicologoStatus);

            // Calcula período
            const dataConsultaBr = dayjs.tz(consulta.Date, 'America/Sao_Paulo');
            const ano = dataConsultaBr.year();
            const mes = String(dataConsultaBr.month() + 1).padStart(2, '0');
            const periodo = `${ano}-${mes}`;

            if (commissionExistente) {
              // Atualiza commission existente
              await tx.commission.update({
                where: { Id: commissionExistente.Id },
                data: {
                  Valor: valorPsicologo,
                  Status: statusRepasse,
                  Periodo: periodo,
                  TipoPlano: tipoPlano,
                  Type: "repasse"
                }
              });
              console.log(`✅ [atualizarStatus] Comissão atualizada para consulta ${consultaId}: R$ ${valorPsicologo.toFixed(2)} - Status: ${statusRepasse}`);
            } else {
              // Cria nova commission
              await tx.commission.create({
                data: {
                  PsicologoId: consulta.PsicologoId,
                  PacienteId: consulta.PacienteId || null,
                  Valor: valorPsicologo,
                  ConsultaId: consultaId,
                  TipoPlano: tipoPlano,
                  Status: statusRepasse,
                  Periodo: periodo,
                  Type: "repasse"
                },
              });
              console.log(`✅ [atualizarStatus] Comissão criada para consulta ${consultaId}: R$ ${valorPsicologo.toFixed(2)} (${(repassePercent * 100).toFixed(0)}%) - Status: ${statusRepasse}`);

              // Registra criação de comissão na auditoria
              try {
                const { logCommissionCreate } = await import('../utils/auditLogger.util');
                if (consulta.PsicologoId) {
                  await logCommissionCreate(
                    consulta.PsicologoId,
                    consultaId,
                    valorPsicologo,
                    tipoPlano,
                    undefined
                  );
                }
              } catch (auditError) {
                console.error('[ConsultaStatusService] Erro ao registrar auditoria de comissão:', auditError);
              }
            }

            // Marca consulta como faturada
            await tx.consulta.update({
              where: { Id: consultaId },
              data: { Faturada: true }
            });
          }
        }
      }

      // Sincronização de ReservaSessao e Agenda é feita via trigger no banco (Consulta é a fonte de verdade)
      // Isso evita alterações diretas fora do fluxo de status da Consulta.

      // Registra auditoria de atualização de status
      try {
        const { logConsultaStatusUpdate } = await import('../utils/auditLogger.util');
        if (usuarioId) {
          await logConsultaStatusUpdate(
            usuarioId,
            consultaId,
            consulta.Status as string,
            novoStatus,
            origemFinal as string,
            undefined // IP não disponível aqui, pode ser passado via DTO se necessário
          );
        }
      } catch (auditError) {
        console.error('[ConsultaStatusService] Erro ao registrar auditoria:', auditError);
        // Não interrompe o fluxo
      }

      return consultaAtualizada;
    });

    // Notifica alteração de status para atualizar cards em tempo real
    try {
      const eventSync = getEventSyncService();
      await eventSync.notifyConsultationStatusChange(consultaId, novoStatus, {
        status: novoStatus as string,
        origem: origemFinal as string,
        telaGatilho: telaGatilho || ConsultaStatusHelper.getTelaGatilho(novoStatus),
      });
    } catch (notifyError) {
      console.error(
        "❌ [ConsultaStatusService] Falha ao notificar mudança de status:",
        notifyError
      );
    }

    return consultaAtualizada;
  }

  /**
   * Inicia uma consulta (marca como em andamento)
   */
  async iniciarConsulta(consultaId: string) {
    return this.atualizarStatus({
      consultaId,
      novoStatus: "EmAndamento",
      origem: ConsultaOrigemStatus.Sistemico,
    });
  }

  /**
   * Finaliza uma consulta como realizada
   * Verifica se ambos (paciente e psicólogo) estiveram na sala antes de atualizar status e processar repasse
   * @param forceFinalize Se true, força a finalização mesmo se ambos não estiveram na sala (usado quando completa 60 minutos)
   */
  async finalizarConsulta(consultaId: string, forceFinalize: boolean = false) {
    // Verifica se a consulta já está finalizada (idempotência)
    const consultaAtual = await prisma.consulta.findUnique({
      where: { Id: consultaId },
      select: {
        Status: true,
        ReservaSessao: {
          select: {
            Status: true
          }
        }
      }
    });

    // Verifica se já está concluída
    const jaConcluida = consultaAtual?.Status === "Realizada" ||
      consultaAtual?.ReservaSessao?.Status === "Concluido";

    if (jaConcluida) {
      console.log(`ℹ️ [ConsultaStatusService] Consulta ${consultaId} já está finalizada (Status: ${consultaAtual?.Status}) - ignorando atualização`);
      return consultaAtual;
    }

    // Busca a ReservaSessao com os campos de presença
    const reservaSessao = await prisma.reservaSessao.findUnique({
      where: { ConsultaId: consultaId },
      select: {
        Id: true,
        PatientJoinedAt: true,
        PsychologistJoinedAt: true,
      },
    });

    // Verifica se ambos estiveram na sala
    const ambosEstiveramNaSala =
      reservaSessao?.PatientJoinedAt !== null &&
      reservaSessao?.PatientJoinedAt !== undefined &&
      reservaSessao?.PsychologistJoinedAt !== null &&
      reservaSessao?.PsychologistJoinedAt !== undefined;

    if (!ambosEstiveramNaSala && !forceFinalize) {
      console.log(`⚠️ [ConsultaStatusService] Consulta ${consultaId} não pode ser finalizada: ambos não estiveram na sala`, {
        PatientJoinedAt: reservaSessao?.PatientJoinedAt,
        PsychologistJoinedAt: reservaSessao?.PsychologistJoinedAt,
      });
      throw new Error('Não é possível finalizar a consulta: paciente e psicólogo precisam ter entrado na sala');
    }

    if (!ambosEstiveramNaSala && forceFinalize) {
      console.log(`⚠️ [ConsultaStatusService] Consulta ${consultaId} será finalizada forçadamente (forceFinalize=true) - assumindo que houve consulta`);
      console.log(`  - PatientJoinedAt: ${reservaSessao?.PatientJoinedAt}`);
      console.log(`  - PsychologistJoinedAt: ${reservaSessao?.PsychologistJoinedAt}`);
    }

    console.log(`✅ [ConsultaStatusService] Ambos estiveram na sala para consulta ${consultaId} - finalizando e processando repasse`);

    // Busca a consulta completa para ter acesso à ReservaSessao
    const consultaCompleta = await prisma.consulta.findUnique({
      where: { Id: consultaId },
      include: {
        ReservaSessao: true,
        Agenda: true,
      },
    });

    if (!consultaCompleta) {
      throw new Error(`Consulta ${consultaId} não encontrada`);
    }

    // Atualiza status para "Realizada" (que já atualiza Agenda e ReservaSessao para "Concluido" e limpa tokens)
    // Também atualiza Consulta.Status para "Realizada"
    const consultaAtualizada = await this.atualizarStatus({
      consultaId,
      novoStatus: "Realizada",
      origem: ConsultaOrigemStatus.Sistemico,
      telaGatilho: 'SALA_CONSULTA',
    });

    // Processa o repasse para o psicólogo após atualizar o status
    // O repasse usa os valores de percentualRepasseJuridico ou percentualRepasseAutonomo
    // da tabela Configuracao, conforme o tipo do psicólogo (PJ ou autônomo)
    try {
      const { processRepasseAsync } = await import('../controllers/agora.controller');
      await processRepasseAsync(consultaId, 'concluida');
      console.log(`✅ [ConsultaStatusService] Repasse processado para consulta ${consultaId} usando percentuais da tabela Configuracao`);
    } catch (repasseError) {
      console.error(`❌ [ConsultaStatusService] Erro ao processar repasse para consulta ${consultaId}:`, repasseError);
      // Não lança erro para não interromper o fluxo, mas loga o problema
    }

    return consultaAtualizada;
  }

  /**
   * Cancela uma consulta por paciente
   */
  async cancelarPorPaciente(consultaId: string, pacienteId: string, dentroDoPrazo: boolean) {
    const novoStatus = dentroDoPrazo ? "CanceladaPacienteNoPrazo" : "CanceladaPacienteForaDoPrazo";
    return this.atualizarStatus({
      consultaId,
      novoStatus: novoStatus as ConsultaStatus,
      origem: ConsultaOrigemStatus.Paciente,
      usuarioId: pacienteId,
    });
  }

  /**
   * Cancela uma consulta por psicólogo
   */
  async cancelarPorPsicologo(consultaId: string, psicologoId: string, dentroDoPrazo: boolean) {
    const novoStatus = dentroDoPrazo ? "CanceladaPsicologoNoPrazo" : "CanceladaPsicologoForaDoPrazo";
    return this.atualizarStatus({
      consultaId,
      novoStatus: novoStatus as ConsultaStatus,
      origem: ConsultaOrigemStatus.Psicologo,
      usuarioId: psicologoId,
    });
  }

  /**
   * Marca como não comparecimento
   */
  async marcarNaoComparecimento(consultaId: string, tipo: "paciente" | "psicologo") {
    const novoStatus =
      tipo === "paciente" ? "PacienteNaoCompareceu" : "PsicologoNaoCompareceu";
    return this.atualizarStatus({
      consultaId,
      novoStatus: novoStatus as ConsultaStatus,
      origem: ConsultaOrigemStatus.Sistemico,
    });
  }

  /**
   * Processa inatividade com idempotência e regras específicas
   * Garante que cada devolução incremente exatamente +1 sessão
   * Nunca permite múltiplas devoluções para a mesma consulta
   * 
   * Regras:
   * - Cenário 1 (Paciente não entrou): Não devolve saldo, marca Faturada=true (repasse será processado depois)
   * - Cenário 2 (Psicólogo não entrou): Devolve 1 sessão, marca Faturada=false
   * - Cenário 3 (Ambos não entraram): Não devolve saldo, marca Faturada=false
   */
  async processarInatividade(
    consultaId: string,
    missingRole: "Patient" | "Psychologist" | "Both"
  ) {
    // Busca a consulta atual para verificar se já foi processada
    const consulta = await prisma.consulta.findUnique({
      where: { Id: consultaId },
      include: {
        Paciente: true,
        Psicologo: true,
        CicloPlano: true,
        ReservaSessao: true,
        Agenda: true,
      },
    });

    if (!consulta) {
      throw new Error(`Consulta ${consultaId} não encontrada`);
    }

    // 🎯 VALIDAÇÃO CRÍTICA: Só pode cancelar após 10 minutos do ScheduledAt
    // Se a consulta ainda não começou ou não passou 10 minutos, apenas muda para EmAndamento
    if (consulta.ReservaSessao?.ScheduledAt) {
      try {
        const dayjs = (await import('dayjs')).default;
        const timezone = (await import('dayjs/plugin/timezone')).default;
        dayjs.extend(timezone);

        const scheduledAtStr = consulta.ReservaSessao.ScheduledAt;
        const [datePart, timePart] = scheduledAtStr.split(' ');
        if (datePart && timePart) {
          const [year, month, day] = datePart.split('-').map(Number);
          const [hour, minute, second = 0] = timePart.split(':').map(Number);
          const inicioConsulta = dayjs.tz(`${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')} ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')}`, 'America/Sao_Paulo');
          const agoraBr = dayjs().tz('America/Sao_Paulo');

          // 🎯 REGRA 1: Se a consulta ainda não começou (ScheduledAt > agora), NÃO pode cancelar
          if (agoraBr.isBefore(inicioConsulta)) {
            console.log(`⚠️ [processarInatividade] Consulta ${consultaId} ainda não começou (ScheduledAt: ${scheduledAtStr}) - NÃO pode cancelar`);
            // Muda para EmAndamento se já estiver no horário ou próximo
            if (agoraBr.isSameOrAfter(inicioConsulta.subtract(1, 'minute'))) {
              if (consulta.Status !== 'EmAndamento') {
                return await this.atualizarStatus({
                  consultaId,
                  novoStatus: 'EmAndamento',
                  origem: ConsultaOrigemStatus.Sistemico,
                });
              }
            }
            return consulta;
          }

          // 🎯 REGRA 2: Se ainda não passou 10 minutos do ScheduledAt, apenas muda para EmAndamento
          const deadlineCancelamento = inicioConsulta.add(10, 'minute');
          if (agoraBr.isBefore(deadlineCancelamento)) {
            console.log(`ℹ️ [processarInatividade] Consulta ${consultaId} ainda não passou 10 minutos do ScheduledAt (${scheduledAtStr}) - mudando para EmAndamento ao invés de cancelar`);

            // Muda para EmAndamento se ainda não estiver
            if (consulta.Status !== 'EmAndamento') {
              return await this.atualizarStatus({
                consultaId,
                novoStatus: 'EmAndamento',
                origem: ConsultaOrigemStatus.Sistemico,
              });
            }

            return consulta;
          }

          // Se passou 10 minutos, pode processar o cancelamento normalmente
          console.log(`✅ [processarInatividade] Consulta ${consultaId} passou 10 minutos do ScheduledAt - processando cancelamento por inatividade`);
        }
      } catch (error) {
        console.error(`❌ [processarInatividade] Erro ao validar ScheduledAt da consulta ${consultaId}:`, error);
        // Em caso de erro, continua com o processamento normal (não bloqueia)
      }
    }

    // VALIDAÇÃO DE IDEMPOTÊNCIA: Verifica se já foi processada
    const statusAtual = consulta.Status as string;
    const jaProcessada =
      statusAtual === "PacienteNaoCompareceu" ||
      statusAtual === "PsicologoNaoCompareceu" ||
      statusAtual === "AmbosNaoCompareceram" ||
      statusAtual.startsWith("Cancelada");

    if (jaProcessada) {
      console.log(`⚠️ [processarInatividade] Consulta ${consultaId} já foi processada com status ${statusAtual} - ignorando processamento duplicado`);
      return consulta;
    }

    // Determina o status e as regras baseado no missingRole
    let novoStatus: ConsultaStatus;
    let deveDevolverSessao: boolean;
    let deveFazerRepasse: boolean;

    if (missingRole === "Patient") {
      // Cenário 1: Inatividade do Paciente
      novoStatus = "PacienteNaoCompareceu";
      deveDevolverSessao = false; // ❌ Não devolver saldo
      deveFazerRepasse = true; // ✅ Fazer repasse ao psicólogo (marca Faturada=true)
    } else if (missingRole === "Psychologist") {
      // Cenário 2: Inatividade do Psicólogo
      novoStatus = "PsicologoNaoCompareceu";
      deveDevolverSessao = true; // ✅ Devolver 1 sessão
      deveFazerRepasse = false; // ❌ Não fazer repasse (marca Faturada=false)
    } else {
      // Cenário 3: Inatividade de Ambos (Both)
      novoStatus = "AmbosNaoCompareceram"; // Novo status para ambos não compareceram
      deveDevolverSessao = false; // ❌ Não devolver saldo
      deveFazerRepasse = false; // ❌ Não fazer repasse (marca Faturada=false)
    }

    // Processa em transação para garantir atomicidade
    const consultaAtualizada = await prisma.$transaction(async (tx) => {
      // Atualiza o status da consulta
      // Nota: Faturada=true indica que deve processar repasse depois, não significa que já foi faturada
      const consultaAtualizada = await tx.consulta.update({
        where: { Id: consultaId },
        data: {
          Status: novoStatus,
          Faturada: deveFazerRepasse, // true = deve processar repasse, false = não processa
          UpdatedAt: new Date(),
        },
      });

      // Devolve sessão APENAS se necessário e APENAS 1 vez
      if (deveDevolverSessao && consulta.CicloPlanoId && consulta.PacienteId) {
        // Validação adicional: verifica valores atuais para garantir que não vai incrementar indevidamente
        const cicloAtual = await tx.cicloPlano.findUnique({
          where: { Id: consulta.CicloPlanoId },
          select: { ConsultasDisponiveis: true, ConsultasUsadas: true }
        });

        if (cicloAtual) {
          // Incrementa exatamente 1 sessão disponível
          await tx.cicloPlano.update({
            where: { Id: consulta.CicloPlanoId },
            data: {
              ConsultasDisponiveis: {
                increment: 1, // Incrementa exatamente 1
              },
              ConsultasUsadas: {
                decrement: 1, // Decrementa exatamente 1 (garante que não fica negativo)
              },
            },
          });
          console.log(`✅ [processarInatividade] 1 sessão devolvida para paciente ${consulta.PacienteId} na consulta ${consultaId} (de ${cicloAtual.ConsultasDisponiveis} para ${cicloAtual.ConsultasDisponiveis + 1})`);
        }
      }

      // ReservaSessao e Agenda são sincronizadas via trigger após o update da Consulta

      return consultaAtualizada;
    });

    // Fecha a sala e invalida tokens ANTES de notificar
    // Isso garante que os tokens sejam invalidados e os eventos sejam emitidos
    try {
      const { ConsultaRoomService } = await import('./consultaRoom.service');
      const roomService = new ConsultaRoomService();
      const missingRoleForRoom: 'patient' | 'psychologist' | 'both' = 
        missingRole === 'Patient' ? 'patient' :
        missingRole === 'Psychologist' ? 'psychologist' : 'both';
      
      // closeRoom já:
      // 1. Invalida tokens no Redis
      // 2. Atualiza status no banco (via closeRoomInDatabase)
      // 3. Emite eventos room-closed e consultation:status-changed via Socket.IO
      // 4. Notifica ambos os usuários (paciente e psicólogo)
      await roomService.closeRoom(consultaId, 'inactivity', missingRoleForRoom);
      console.log(`✅ [processarInatividade] Sala ${consultaId} fechada por inatividade (${missingRole})`);
    } catch (closeError) {
      console.error(
        "❌ [processarInatividade] Erro ao fechar sala:",
        closeError
      );
      // Continua mesmo se fechar sala falhar - as notificações ainda serão enviadas
    }

    // Notifica via Redis (Event Sync) para atualização imediata no frontend
    try {
      const eventSync = getEventSyncService();
      const motivo = "Cancelamento automático por inatividade";
      await eventSync.notifyInactivityCancellation(
        consultaId,
        motivo,
        missingRole
      );
      await eventSync.notifyConsultationStatusChange(consultaId, "Cancelado", {
        reason: "inactivity",
        missingRole,
        status: "Cancelado",
        autoCancelled: true,
      });
    } catch (notifyError) {
      console.error(
        "❌ [processarInatividade] Falha ao notificar via Event Sync:",
        notifyError
      );
    }

    return consultaAtualizada;
  }

  /**
   * Reagenda uma consulta
   */
  async reagendar(consultaId: string, origem: ConsultaOrigemStatus) {
    const novoStatus =
      origem === ConsultaOrigemStatus.Paciente
        ? "ReagendadaPacienteNoPrazo"
        : "ReagendadaPsicologoNoPrazo";
    return this.atualizarStatus({
      consultaId,
      novoStatus: novoStatus as ConsultaStatus,
      origem,
    });
  }

  /**
   * Infere a origem baseado no usuário (role)
   */
  private async inferirOrigem(
    usuarioId: string | undefined
  ): Promise<ConsultaOrigemStatus> {
    if (!usuarioId) return ConsultaOrigemStatus.Sistemico;

    const user = await prisma.user.findUnique({
      where: { Id: usuarioId },
      select: { Role: true },
    });

    if (user?.Role === "Patient") return ConsultaOrigemStatus.Paciente;
    if (user?.Role === "Psychologist") return ConsultaOrigemStatus.Psicologo;
    if (user?.Role === "Admin") return ConsultaOrigemStatus.Admin;
    if (user?.Role === "Management") return ConsultaOrigemStatus.Management;

    return ConsultaOrigemStatus.Sistemico;
  }

  /**
   * Valida se a transição é permitida
   */
  private validarTransicao(statusAtual: ConsultaStatus, novoStatus: ConsultaStatus) {
    // 🎯 Permite transição de EmAndamento para Realizada (consulta finalizada)
    // Transições não permitidas
    const transicoesForbidden: Partial<Record<ConsultaStatus, ConsultaStatus[]>> = {
      Realizada: [
        "Agendada",
        "Reservado",
        // "EmAndamento" removido - permite transição de EmAndamento para Realizada
        "CanceladaPacienteNoPrazo",
        "CanceladaPsicologoNoPrazo",
        "PacienteNaoCompareceu",
        "PsicologoNaoCompareceu",
      ] as ConsultaStatus[],
      PacienteNaoCompareceu: [
        "Realizada",
        "EmAndamento",
        "CanceladaPacienteNoPrazo",
        "CanceladaPsicologoNoPrazo",
      ] as ConsultaStatus[],
      PsicologoNaoCompareceu: [
        "Realizada",
        "EmAndamento",
        "CanceladaPacienteNoPrazo",
        "CanceladaPsicologoNoPrazo",
      ] as ConsultaStatus[],
    };

    const forbiddenFor = transicoesForbidden[statusAtual];
    if (forbiddenFor?.includes(novoStatus)) {
      throw new Error(
        `Transição de ${statusAtual} para ${novoStatus} não permitida`
      );
    }
  }

  /**
   * Lista todas as consultas por status
   */
  async listarPorStatus(status: ConsultaStatus, filtros?: {
    psicologoId?: string;
    pacienteId?: string;
    dataInicio?: Date;
    dataFim?: Date;
  }) {
    return prisma.consulta.findMany({
      where: {
        Status: status,
        PsicologoId: filtros?.psicologoId,
        PacienteId: filtros?.pacienteId,
        Date: {
          gte: filtros?.dataInicio,
          lte: filtros?.dataFim,
        },
      },
      include: {
        Paciente: { select: { Id: true, Nome: true, Email: true } },
        Psicologo: { select: { Id: true, Nome: true, Email: true } },
        CicloPlano: true,
        ReservaSessao: true,
      },
      orderBy: { Date: "asc" },
    });
  }

  /**
   * Retorna estatísticas de consultas por status
   */
  async obterEstatisticas(psicologoId?: string, pacienteId?: string) {
    const where: {
      PsicologoId?: string;
      PacienteId?: string;
    } = {};
    if (psicologoId) where.PsicologoId = psicologoId;
    if (pacienteId) where.PacienteId = pacienteId;

    const total = await prisma.consulta.count({ where });
    const agendadas = await prisma.consulta.count({
      where: { ...where, Status: "Agendada" },
    });
    const realizadas = await prisma.consulta.count({
      where: { ...where, Status: "Realizada" },
    });
    const faturadas = await prisma.consulta.count({
      where: { ...where, Faturada: true },
    });
    const canceladas = await prisma.consulta.count({
      where: {
        ...where,
        Status: {
          in: [
            "CanceladaPacienteNoPrazo",
            "CanceladaPacienteForaDoPrazo",
            "CanceladaPsicologoNoPrazo",
            "CanceladaPsicologoForaDoPrazo",
            "CanceladaNaoCumprimentoContratualPaciente",
            "CanceladaNaoCumprimentoContratualPsicologo",
            "CanceladaForcaMaior",
            "CanceladoAdministrador"
          ] as ConsultaStatus[]
        }
      },
    });
    const naoCompareceu = await prisma.consulta.count({
      where: {
        ...where,
        Status: {
          in: ["PacienteNaoCompareceu", "PsicologoNaoCompareceu", "AmbosNaoCompareceram"],
        },
      },
    });

    return {
      total,
      agendadas,
      realizadas,
      faturadas,
      canceladas,
      naoCompareceu,
      percentualRealizacao: total > 0 ? ((realizadas / total) * 100).toFixed(2) : "0",
      percentualFaturacao: total > 0 ? ((faturadas / total) * 100).toFixed(2) : "0",
    };
  }
}
