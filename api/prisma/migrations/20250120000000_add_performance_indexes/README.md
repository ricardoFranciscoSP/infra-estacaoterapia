# Migration: Adicionar Índices de Performance

## Objetivo
Esta migration adiciona índices compostos nas tabelas mais consultadas para otimizar o desempenho das queries e reduzir o uso de CPU.

## Índices Criados

### Tabela `Job`
- `Job_Status_RunAt_idx`: Índice composto em `(Status, RunAt)`
  - Otimiza queries que filtram por status e ordenam por RunAt
  - Usado por: `jobWorker`, `verificarEAtualizarStatusPorBillId`
  
- `Job_Type_Status_idx`: Índice composto em `(Type, Status)`
  - Otimiza queries que filtram por tipo e status de job
  - Usado por: `verificarEAtualizarStatusPorBillId`

### Tabela `ReservaSessao`
- `ReservaSessao_ScheduledAt_Status_idx`: Índice composto em `(ScheduledAt, Status)`
  - Otimiza queries que filtram por ScheduledAt e Status
  - Usado por: `cronEncerrarSalasSemPresenca`, `cronEncerrarSalasExpiradas`, `verificarPresencaConsulta`
  
- `ReservaSessao_Status_idx`: Índice simples em `Status`
  - Otimiza queries que filtram apenas por Status
  - Usado por: vários crons e jobs

### Tabela `Fatura`
- `Fatura_CodigoFatura_Status_idx`: Índice composto em `(CodigoFatura, Status)`
  - Otimiza queries que buscam faturas por código e status
  - Usado por: `verificarEAtualizarStatusPorBillId`, webhook processing
  
- `Fatura_Status_idx`: Índice simples em `Status`
  - Otimiza queries que filtram apenas por Status
  - Usado por: relatórios e verificações gerais

### Tabela `Financeiro`
- `Financeiro_FaturaId_Status_idx`: Índice composto em `(FaturaId, Status)`
  - Otimiza queries que buscam financeiro por FaturaId e Status
  - Usado por: `verificarEAtualizarStatusPorBillId`, webhook processing
  
- `Financeiro_Status_idx`: Índice simples em `Status`
  - Otimiza queries que filtram apenas por Status
  - Usado por: relatórios e verificações gerais

## Impacto Esperado
- **Redução de tempo de query**: 50-80% em queries filtradas por esses campos
- **Redução de CPU**: Menos full table scans, mais index scans
- **Melhor performance**: Especialmente em tabelas grandes

## Como Aplicar
```bash
# Aplicar migration
npx prisma migrate deploy

# Ou em desenvolvimento
npx prisma migrate dev
```

## Rollback
Se necessário reverter:
```sql
DROP INDEX IF EXISTS "Job_Status_RunAt_idx";
DROP INDEX IF EXISTS "Job_Type_Status_idx";
DROP INDEX IF EXISTS "ReservaSessao_ScheduledAt_Status_idx";
DROP INDEX IF EXISTS "ReservaSessao_Status_idx";
DROP INDEX IF EXISTS "Fatura_CodigoFatura_Status_idx";
DROP INDEX IF EXISTS "Fatura_Status_idx";
DROP INDEX IF EXISTS "Financeiro_FaturaId_Status_idx";
DROP INDEX IF EXISTS "Financeiro_Status_idx";
```

