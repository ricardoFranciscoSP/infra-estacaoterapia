import { useQuery } from '@tanstack/react-query';
import { useGetUserPlano } from '@/hooks/user/userHook';
import { useCreditoAvulso, useConsultaAvulsa } from '@/hooks/useHook';
import { useAuthStore } from '@/store/authStore';
import { CreditoAvulso, ConsultaAvulsa } from '@/services/userAvulsoService';

interface SaldoConsulta {
  temSaldo: boolean;
  tipo: 'CicloPlano' | 'ConsultaAvulsa' | null;
  consultasDisponiveis: number;
  mensagem?: string;
}

export function useVerificarSaldoConsulta() {
  const user = useAuthStore((s) => s.user);
  const isUserLoggedIn = !!user && !!user.Id;
  
  const { plano, isLoading: isLoadingPlano } = useGetUserPlano();
  const { creditoAvulso, isCreditoAvulsoLoading } = useCreditoAvulso();
  const { consultaAvulsa, isConsultaAvulsaLoading } = useConsultaAvulsa();

  const isLoadingDependencies = isLoadingPlano || isCreditoAvulsoLoading || isConsultaAvulsaLoading;

  return useQuery<SaldoConsulta>({
    queryKey: ['verificar-saldo-consulta', plano, creditoAvulso, consultaAvulsa, user?.Id],
    queryFn: async () => {
      const agora = new Date();
      
      // Debug: log dos dados recebidos
      console.log('[useVerificarSaldoConsulta] Verificando saldo:', {
        plano: plano ? (Array.isArray(plano) ? plano.length : 'não é array') : 'null',
        creditoAvulso: creditoAvulso ? (Array.isArray(creditoAvulso) ? creditoAvulso.length : 'não é array') : 'null',
        consultaAvulsa: consultaAvulsa ? (Array.isArray(consultaAvulsa) ? consultaAvulsa.length : 'não é array') : 'null',
      });
      
      // 1. Verifica CicloPlano ativo
      // Busca qualquer ciclo com Status = 'Ativo' e ConsultasDisponiveis > 0, válido por 30 dias a partir de CreatedAt
      // IMPORTANTE: Funciona mesmo com plano cancelado, desde que o ciclo esteja válido
      if (plano && Array.isArray(plano)) {
        for (const p of plano) {
          // Não verifica status do plano aqui - permite planos cancelados com ciclos válidos
          if (p.Ciclos && Array.isArray(p.Ciclos)) {
            for (const ciclo of p.Ciclos) {
              // Verifica se o ciclo está ativo e tem consultas disponíveis
              if (ciclo.Status === "Ativo" && ciclo.ConsultasDisponiveis > 0) {
                // Verifica validade: CreatedAt + 30 dias >= agora
                if (ciclo.CreatedAt) {
                  const dataCriacao = new Date(ciclo.CreatedAt);
                  const dataValidade = new Date(dataCriacao);
                  dataValidade.setDate(dataValidade.getDate() + 30);
                  
                  // Verifica se ainda está válido (validade >= agora)
                  if (dataValidade >= agora) {
                    // Usa apenas ConsultasDisponiveis (sem subtrair ConsultasUsadas)
                    const consultasRestantes = Math.max(0, ciclo.ConsultasDisponiveis || 0);
                    
                    if (consultasRestantes > 0) {
                      console.log('[useVerificarSaldoConsulta] Saldo encontrado em CicloPlano (plano pode estar cancelado):', {
                        cicloId: ciclo.Id,
                        planoStatus: p.Status,
                        consultasRestantes,
                        consultasDisponiveis: ciclo.ConsultasDisponiveis,
                        consultasUsadas: ciclo.ConsultasUsadas,
                      });
                      return {
                        temSaldo: true,
                        tipo: 'CicloPlano',
                        consultasDisponiveis: consultasRestantes,
                      };
                    }
                  } else {
                    console.log('[useVerificarSaldoConsulta] CicloPlano expirado:', {
                      cicloId: ciclo.Id,
                      dataValidade: dataValidade.toISOString(),
                      agora: agora.toISOString(),
                    });
                  }
                }
              }
            }
          }
        }
      }

      // 2. Verifica Créditos Avulsos (CreditoAvulso) - tem ValidUntil
      if (creditoAvulso && Array.isArray(creditoAvulso) && creditoAvulso.length > 0) {
        console.log('[useVerificarSaldoConsulta] Verificando CreditoAvulso:', creditoAvulso.map(c => ({
          id: c.Id,
          status: c.Status,
          quantidade: c.Quantidade,
          validUntil: c.ValidUntil,
        })));
        
        const creditoValido = creditoAvulso.find((c: CreditoAvulso) => {
          // Aceita "Ativa" ou "Ativo" (flexível)
          const statusValido = c.Status === 'Ativa' || c.Status === 'Ativo';
          if (!statusValido || c.Quantidade <= 0) {
            console.log('[useVerificarSaldoConsulta] CreditoAvulso inválido:', {
              id: c.Id,
              status: c.Status,
              quantidade: c.Quantidade,
            });
            return false;
          }
          
          if (!c.ValidUntil) {
            console.log('[useVerificarSaldoConsulta] CreditoAvulso sem ValidUntil:', c.Id);
            return false;
          }
          
          const validUntil = new Date(c.ValidUntil);
          const isValid = !isNaN(validUntil.getTime()) && validUntil > agora;
          if (!isValid) {
            console.log('[useVerificarSaldoConsulta] CreditoAvulso expirado:', {
              id: c.Id,
              validUntil: validUntil.toISOString(),
              agora: agora.toISOString(),
            });
          }
          return isValid;
        });

        if (creditoValido && creditoValido.Quantidade > 0) {
          console.log('[useVerificarSaldoConsulta] Saldo encontrado em CreditoAvulso:', {
            creditoId: creditoValido.Id,
            quantidade: creditoValido.Quantidade,
            validUntil: creditoValido.ValidUntil,
          });
          return {
            temSaldo: true,
            tipo: 'ConsultaAvulsa',
            consultasDisponiveis: creditoValido.Quantidade,
          };
        }
      }

      // 3. Verifica ConsultaAvulsa (modelo diferente - tem DataCriacao mapeado como Data, validade de 30 dias)
      if (consultaAvulsa && Array.isArray(consultaAvulsa) && consultaAvulsa.length > 0) {
        console.log('[useVerificarSaldoConsulta] Verificando ConsultaAvulsa:', consultaAvulsa.map(c => ({
          id: c.Id,
          status: c.Status,
          quantidade: c.Quantidade,
          data: c.Data,
          createdAt: c.CreatedAt,
        })));
        
        const dataLimite = new Date(agora);
        dataLimite.setDate(dataLimite.getDate() - 30);
        
        const consultaAvulsaValida = consultaAvulsa.find((c: ConsultaAvulsa) => {
          // Aceita "Ativa" ou "Ativo" (flexível)
          const statusValido = c.Status === 'Ativa' || c.Status === 'Ativo';
          if (!statusValido || c.Quantidade <= 0) {
            console.log('[useVerificarSaldoConsulta] ConsultaAvulsa inválida:', {
              id: c.Id,
              status: c.Status,
              quantidade: c.Quantidade,
            });
            return false;
          }
          
          // Usa Data (mapeado de DataCriacao) ou CreatedAt como fallback
          const dataCriacaoStr = c.Data || c.CreatedAt;
          if (!dataCriacaoStr) {
            console.log('[useVerificarSaldoConsulta] ConsultaAvulsa sem data:', c.Id);
            return false;
          }
          
          const dataCriacao = new Date(dataCriacaoStr);
          const isValid = !isNaN(dataCriacao.getTime()) && dataCriacao >= dataLimite;
          if (!isValid) {
            console.log('[useVerificarSaldoConsulta] ConsultaAvulsa expirada:', {
              id: c.Id,
              dataCriacao: dataCriacao.toISOString(),
              dataLimite: dataLimite.toISOString(),
            });
          }
          return isValid;
        });

        if (consultaAvulsaValida && consultaAvulsaValida.Quantidade > 0) {
          console.log('[useVerificarSaldoConsulta] Saldo encontrado em ConsultaAvulsa:', {
            consultaId: consultaAvulsaValida.Id,
            quantidade: consultaAvulsaValida.Quantidade,
            data: consultaAvulsaValida.Data || consultaAvulsaValida.CreatedAt,
          });
          return {
            temSaldo: true,
            tipo: 'ConsultaAvulsa',
            consultasDisponiveis: consultaAvulsaValida.Quantidade,
          };
        }
      }

      // 4. Sem saldo
      console.log('[useVerificarSaldoConsulta] Nenhum saldo encontrado');
      return {
        temSaldo: false,
        tipo: null,
        consultasDisponiveis: 0,
        mensagem: 'Você não possui consultas disponíveis. É necessário adquirir um plano ou consulta avulsa.',
      };
    },
    enabled: isUserLoggedIn && !isLoadingDependencies, // Só executa se o usuário estiver logado e os dados estiverem carregados
    staleTime: 1 * 60 * 1000, // 1 minuto
  });
}

