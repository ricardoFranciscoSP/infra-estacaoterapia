# Como Executar a Atualização de Status Diretamente no Banco

## ⚠️ IMPORTANTE: Backup Primeiro!

Antes de executar qualquer script, **faça backup do banco de dados**:

```bash
# Exemplo de backup
pg_dump -h seu_host -U seu_usuario -d seu_banco > backup_antes_atualizacao.sql
```

## 📋 Opções de Scripts

### Opção 1: Script Completo (Recomendado se precisar atualizar todos os status)

Atualiza **TODOS** os status conforme o mapeamento completo:
- Status de inatividade
- Status de cancelamento
- Status de reagendamento
- Todos os outros mapeamentos

**Arquivo:** `ATUALIZAR_STATUS_DIRETO.sql`

### Opção 2: Script Simples (Recomendado se só precisa corrigir inatividade)

Atualiza **APENAS** os status de inatividade:
- `PacienteNaoCompareceu` → `Cancelled_by_patient`
- `PsicologoNaoCompareceu` → `Cancelled_by_psychologist`
- `AmbosNaoCompareceram` → `Cancelled_no_show`

**Arquivo:** `ATUALIZAR_APENAS_INATIVIDADE.sql` ⭐ **RECOMENDADO**

## 🚀 Como Executar

### Passo 1: Conecte ao banco

```bash
psql -h seu_host -U seu_usuario -d seu_banco
```

Ou se estiver usando variáveis de ambiente:
```bash
psql $DATABASE_URL
```

### Passo 2: Execute o script

**Opção A: Copiar e colar no psql**
```bash
# Abra o arquivo e copie todo o conteúdo
# Cole no terminal do psql
```

**Opção B: Executar arquivo diretamente**
```bash
\i api/prisma/migrations/20260125000000_fix_inatividade_status_mapping/ATUALIZAR_APENAS_INATIVIDADE.sql
```

**Opção C: Via linha de comando**
```bash
psql -h seu_host -U seu_usuario -d seu_banco -f api/prisma/migrations/20260125000000_fix_inatividade_status_mapping/ATUALIZAR_APENAS_INATIVIDADE.sql
```

### Passo 3: Verifique os resultados

O script mostrará:
- Quantas consultas têm cada status de inatividade
- Quantos registros serão atualizados
- Resumo final após a atualização

### Passo 4: Confirme ou reverta

**Se estiver tudo OK:**
```sql
COMMIT;
```

**Se houver problemas:**
```sql
ROLLBACK;
```

## ✅ Verificação Pós-Execução

Após executar e fazer COMMIT, verifique se está tudo correto:

```sql
-- Verifica se os status foram atualizados corretamente
SELECT 
  c."Status" as consulta_status,
  rs."Status" as reservasessao_status,
  a."Status" as agenda_status,
  COUNT(*) as total
FROM "Consulta" c
LEFT JOIN "ReservaSessao" rs ON rs."ConsultaId" = c."Id"
LEFT JOIN "Agenda" a ON a."Id" = c."AgendaId"
WHERE c."Status" IN ('PacienteNaoCompareceu', 'PsicologoNaoCompareceu', 'AmbosNaoCompareceram')
GROUP BY c."Status", rs."Status", a."Status"
ORDER BY c."Status";
```

**Resultado esperado:**
- `PacienteNaoCompareceu` → `Cancelled_by_patient` em ReservaSessao e Agenda
- `PsicologoNaoCompareceu` → `Cancelled_by_psychologist` em ReservaSessao e Agenda
- `AmbosNaoCompareceram` → `Cancelled_no_show` em ReservaSessao e Agenda

## 🔧 Resolver a Migração do Prisma

Após executar o script SQL e verificar que está tudo OK:

```bash
# Marca a migração como aplicada (sem executar o SQL novamente)
npx prisma migrate resolve --applied 20260125000000_fix_inatividade_status_mapping
```

Ou se preferir, remova o registro da migração falha e deixe o Prisma tentar novamente:

```sql
-- Remove o registro da migração falha
DELETE FROM "_prisma_migrations" 
WHERE migration_name = '20260125000000_fix_inatividade_status_mapping';
```

Depois execute:
```bash
npx prisma migrate deploy
```

## ❓ Dúvidas Frequentes

**P: Vou perder dados?**
R: Não! O script apenas atualiza os campos `Status` e `updatedAt`. Não deleta nem modifica outros dados.

**P: Posso executar mais de uma vez?**
R: Sim! O script é idempotente - só atualiza o que precisa ser atualizado.

**P: E se der erro?**
R: O script está dentro de uma transação (BEGIN). Se der erro, execute `ROLLBACK;` e nada será alterado.

**P: Preciso parar a aplicação?**
R: Recomendado, mas não obrigatório. O script é rápido e só atualiza status.

## 📞 Suporte

Se tiver problemas, verifique:
1. Se o enum `AmbosNaoCompareceram` existe no `ConsultaStatus`
2. Se os valores do enum `AgendaStatus` estão corretos
3. Se há constraints ou triggers bloqueando as atualizações
