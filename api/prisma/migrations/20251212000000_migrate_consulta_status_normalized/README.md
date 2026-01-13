# Migration: Normalizar Status de Consultas

## Descrição

Esta migration atualiza os status de consultas em todas as tabelas relacionadas para usar os novos valores normalizados conforme a tabela de especificação do sistema.

## O que esta migration faz:

### 1. Adiciona novos valores ao enum `ConsultaStatus`
   - Adiciona todos os 17 status normalizados ao enum
   - Verifica se cada valor já existe antes de adicionar (idempotente)

### 2. Migra dados da tabela `Consulta`
   - Mapeia status legados para novos status:
     - `Agendado` → `Agendada`
     - `Andamento` → `EmAndamento`
     - `Concluido`/`Concluído` → `Realizada`
     - `Reservado` → `Agendada` (se consulta ainda não aconteceu)
     - `Cancelado` → mantém ou atualiza baseado em `CancelamentoSessao`

### 3. Atualiza status baseado em `CancelamentoSessao`
   - Usa informações de cancelamento para determinar o status correto:
     - `CanceladaPacienteNoPrazo` ou `CanceladaPacienteForaDoPrazo`
     - `CanceladaPsicologoNoPrazo` ou `CanceladaPsicologoForaDoPrazo`
     - `CanceladaForcaMaior` (para cancelamentos do sistema)

## Tabelas afetadas:

- ✅ `Consulta` (campo `Status`)
- ⚠️ `ReservaSessao` (usa `AgendaStatus`, não precisa migrar)
- ⚠️ `Agenda` (usa `AgendaStatus`, não precisa migrar)
- ⚠️ `CancelamentoSessao` (usa `CancelamentoSessaoStatus`, não precisa migrar)

## Como aplicar:

```bash
cd api
npx prisma migrate deploy
```

Ou em desenvolvimento:

```bash
cd api
npx prisma migrate dev
```

## Status normalizados:

1. **Agendada** - Agenda criada, Psicólogo disponível, Paciente marcado
2. **EmAndamento** - Consulta iniciada, ambos conectados
3. **Realizada** - Consulta completada normalmente
4. **PacienteNaoCompareceu** - Falta do paciente
5. **PsicologoNaoCompareceu** - Falta do psicólogo
6. **CanceladaPacienteNoPrazo** - Paciente cancela com tempo
7. **CanceladaPsicologoNoPrazo** - Psicólogo cancela com tempo
8. **ReagendadaPacienteNoPrazo** - Paciente reagenda com antecedência
9. **ReagendadaPsicologoNoPrazo** - Psicólogo reagenda com antecedência
10. **CanceladaPacienteForaDoPrazo** - Paciente cancela fora da janela
11. **CanceladaPsicologoForaDoPrazo** - Psicólogo cancela fora da janela
12. **CanceladaForcaMaior** - Cancelamento do sistema
13. **CanceladaNaoCumprimentoContratualPaciente** - Paciente não cumpriu contrato
14. **ReagendadaPsicologoForaDoPrazo** - Psicólogo reagenda fora da janela
15. **CanceladaNaoCumprimentoContratualPsicologo** - Psicólogo não cumpriu contrato
16. **PsicologoDescredenciado** - Psicólogo foi descredenciado
17. **CanceladoAdministrador** - Cancelado por administrador

## Status legados mantidos (compatibilidade):

- **Reservado** - Mantido para compatibilidade (preferir usar `Agendada`)
- **Cancelado** - Mantido para compatibilidade (preferir usar status específicos)

## Notas importantes:

- ⚠️ Esta migration é **idempotente** - pode ser executada múltiplas vezes sem problemas
- ⚠️ A migration **não remove** dados existentes
- ⚠️ Status legados (`Reservado`, `Cancelado`) são mantidos para compatibilidade
- ⚠️ A lógica de determinação de prazo (24h) é aplicada baseada na data/hora da consulta
- ⚠️ Consultas com `CancelamentoSessao` deferido têm prioridade na atualização de status

## Rollback:

Se precisar reverter esta migration, você precisará criar uma migration manual que:
1. Reverta os status atualizados para os valores legados
2. Remova os novos valores do enum (se necessário)

**ATENÇÃO**: Rollback pode ser complexo e requer cuidado com dados existentes.

