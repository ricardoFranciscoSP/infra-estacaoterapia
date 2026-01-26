# Como Resolver a Migração que Falhou

## ✅ Erro Corrigido

O erro de sintaxe na função `atualizar_reservasessao_status_direto` foi corrigido. O problema estava nas aspas simples dentro do comentário que não estavam escapadas corretamente.

## 🔧 Passos para Resolver

### Opção 1: Marcar a migração como aplicada (se nada foi executado)

Se a migração falhou antes de executar qualquer comando SQL, você pode marcar como aplicada e depois aplicar manualmente:

```bash
# No diretório api/
npx prisma migrate resolve --applied 20260125000000_fix_inatividade_status_mapping
```

Depois, execute o SQL manualmente no banco:

```bash
# Conecte ao banco e execute o arquivo de migração
psql -h seu_host -U seu_usuario -d seu_banco -f prisma/migrations/20260125000000_fix_inatividade_status_mapping/migration.sql
```

### Opção 2: Reverter e tentar novamente (recomendado)

Se a migração foi parcialmente aplicada, você precisa:

1. **Verificar o que foi aplicado:**
   ```sql
   -- Conecte ao banco e verifique se as funções existem
   SELECT proname FROM pg_proc WHERE proname IN (
     'trg_sync_status_consulta',
     'trg_check_inatividade_joined_at',
     'atualizar_reservasessao_status_direto'
   );
   ```

2. **Se as funções existem, drope-as:**
   ```sql
   DROP FUNCTION IF EXISTS atualizar_reservasessao_status_direto(TEXT, "AgendaStatus");
   DROP FUNCTION IF EXISTS trg_check_inatividade_joined_at();
   DROP FUNCTION IF EXISTS trg_sync_status_consulta();
   ```

3. **Remover o registro da migração:**
   ```sql
   DELETE FROM "_prisma_migrations" 
   WHERE migration_name = '20260125000000_fix_inatividade_status_mapping';
   ```

4. **Tentar aplicar novamente:**
   ```bash
   npx prisma migrate deploy
   ```

### Opção 3: Aplicar manualmente no banco (mais rápido)

Se você tem acesso direto ao banco, pode simplesmente:

1. **Conectar ao banco:**
   ```bash
   psql -h seu_host -U seu_usuario -d seu_banco
   ```

2. **Executar o SQL corrigido:**
   ```sql
   -- Copie e cole o conteúdo do arquivo migration.sql corrigido
   -- Ou use:
   \i prisma/migrations/20260125000000_fix_inatividade_status_mapping/migration.sql
   ```

3. **Marcar como aplicada:**
   ```sql
   INSERT INTO "_prisma_migrations" (migration_name, finished_at, applied_steps_count)
   VALUES ('20260125000000_fix_inatividade_status_mapping', NOW(), 1)
   ON CONFLICT (migration_name) DO UPDATE 
   SET finished_at = NOW(), applied_steps_count = 1;
   ```

## 📝 Verificação

Após resolver, verifique se tudo está funcionando:

```sql
-- Verifica se as funções foram criadas
SELECT proname, prosrc 
FROM pg_proc 
WHERE proname IN (
  'trg_sync_status_consulta',
  'trg_check_inatividade_joined_at',
  'atualizar_reservasessao_status_direto'
);

-- Verifica se o enum foi atualizado
SELECT enumlabel 
FROM pg_enum 
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'ConsultaStatus')
ORDER BY enumsortorder;
```

## ⚠️ Importante

- Sempre faça backup do banco antes de executar migrações manualmente
- Teste em ambiente de desenvolvimento primeiro
- Se estiver em produção, considere usar `prisma migrate deploy` após resolver o problema
