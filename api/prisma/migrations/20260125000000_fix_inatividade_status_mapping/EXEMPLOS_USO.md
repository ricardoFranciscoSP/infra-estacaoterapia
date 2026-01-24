# Exemplos de Uso da Função atualizar_reservasessao_status_direto

## ⚠️ IMPORTANTE
Esta função deve ser usada **APENAS para correções de dados**. O fluxo normal deve sempre atualizar via `Consulta.Status`.

## Exemplos de Uso

### 1. Atualizar para Cancelled_no_show
```sql
SELECT atualizar_reservasessao_status_direto(
    '123e4567-e89b-12d3-a456-426614174000',  -- ID da consulta
    'Cancelled_no_show'::"AgendaStatus"
);
```

### 2. Atualizar para Cancelled_by_patient
```sql
SELECT atualizar_reservasessao_status_direto(
    '123e4567-e89b-12d3-a456-426614174000',
    'Cancelled_by_patient'::"AgendaStatus"
);
```

### 3. Atualizar para Cancelled_by_psychologist
```sql
SELECT atualizar_reservasessao_status_direto(
    '123e4567-e89b-12d3-a456-426614174000',
    'Cancelled_by_psychologist'::"AgendaStatus"
);
```

### 4. Atualizar múltiplas consultas (usando subquery)
```sql
-- Atualiza todas as consultas que estão com status incorreto
SELECT atualizar_reservasessao_status_direto(
    c."Id",
    'Cancelled_no_show'::"AgendaStatus"
)
FROM "Consulta" c
WHERE c."Status" = 'AmbosNaoCompareceram'
  AND EXISTS (
    SELECT 1 FROM "ReservaSessao" rs 
    WHERE rs."ConsultaId" = c."Id" 
    AND rs."Status" != 'Cancelled_no_show'
  );
```

## ⚠️ FLUXO RECOMENDADO (Atualizar via Consulta)

**SEMPRE prefira atualizar via Consulta (fonte de verdade):**

```sql
-- 1. Atualiza a Consulta
UPDATE "Consulta"
SET "Status" = 'AmbosNaoCompareceram'::"ConsultaStatus",
    "UpdatedAt" = now()
WHERE "Id" = '123e4567-e89b-12d3-a456-426614174000';

-- 2. O trigger trg_sync_status_consulta vai automaticamente:
--    - Mapear AmbosNaoCompareceram → Cancelled_no_show
--    - Atualizar ReservaSessao.Status = 'Cancelled_no_show'
--    - Atualizar Agenda.Status = 'Cancelled_no_show' (se houver AgendaId)
```

## Valores Válidos do Enum AgendaStatus

Você pode usar qualquer um destes valores:
- `'Reservado'`
- `'Andamento'`
- `'Concluido'`
- `'Reagendada'`
- `'Fora_plataforma'`
- `'Cancelled_by_patient'`
- `'Cancelled_by_psychologist'`
- `'Cancelled_no_show'`
- `'Cancelado'`
- `'Disponivel'` (apenas para Agenda)
- `'Indisponivel'` (apenas para Agenda)
- `'Bloqueado'` (apenas para Agenda)

## Verificar o Status Atual

```sql
-- Ver status da Consulta
SELECT "Id", "Status" FROM "Consulta" WHERE "Id" = 'consulta-id';

-- Ver status da ReservaSessao
SELECT rs."ConsultaId", rs."Status" 
FROM "ReservaSessao" rs 
WHERE rs."ConsultaId" = 'consulta-id';

-- Ver status da Agenda
SELECT a."Id", a."Status" 
FROM "Agenda" a
INNER JOIN "Consulta" c ON c."AgendaId" = a."Id"
WHERE c."Id" = 'consulta-id';
```
