# 🔧 Correções para Deploy - Caddy e API

## ✅ Problema 1: Caddyfile - Diretiva `policy` inválida

**Erro:**
```
Error: adapting config using caddyfile: parsing caddyfile tokens for 'reverse_proxy': unrecognized subdirective policy
```

**Causa:** A diretiva `policy` não é uma subdirectiva válida do `reverse_proxy` no Caddy.

**Solução:** ✅ APLICADA
- Removido: `policy random_selection`, `try_duration`, `try_interval`
- Mantido: `health_uri`, `health_interval`, `health_timeout`, `health_status`, `transport`

**Arquivo corrigido:** [Caddyfile](Caddyfile)

---

## ❌ Problema 2: api/deploy.sh - Script com erros de sintaxe

**Erros encontrados:**
1. Caracteres corrompidos: `[CRIANDO]NDO]` → `[CRIANDO]`
2. Função `return` em contexto errado (fora de função)
3. Problemas com escape de variáveis no sed
4. Lógica de verificação de saúde fraca

**Solução:** Criar script corrigido

---

## 🚀 Como Usar

### Opção A: Usar script corrigido (RECOMENDADO)

```bash
# 1. Fazer backup do deploy.sh original
cp api/deploy.sh api/deploy.sh.backup

# 2. Substituir pelo script corrigido
cp api/deploy-fixed.sh api/deploy.sh

# 3. Garantir permissões
chmod +x api/deploy.sh

# 4. Executar deploy
bash api/deploy.sh
```

### Opção B: Corrigir manualmente

Se preferir manter o script original, você pode:

```bash
# Remover caracteres corrompidos
sed -i 's/\[CRIANDO\]NDO\]/[CRIANDO]/g' api/deploy.sh

# Testar syntax
bash -n api/deploy.sh
```

---

## 📋 Checklist de Deployment

Antes de executar o deploy:

- [ ] Verificar que `docker swarm init` foi executado
- [ ] Verificar que `/opt/secrets/` contém todos os arquivos necessários
- [ ] Verificar que volumes foram criados: `docker volume ls`
- [ ] Corrigir [Caddyfile](Caddyfile) (já feito ✅)
- [ ] Executar deploy: `bash api/deploy.sh`
- [ ] Aguardar healthchecks passarem (60+ segundos)
- [ ] Verificar logs: `docker service logs estacaoterapia_api`

---

## 🔗 Arquivos Corrigidos

1. **[Caddyfile](Caddyfile)** ✅ 
   - Removidas diretivas inválidas
   - Mantidas configurações essenciais de healthcheck

2. **[api/deploy-fixed.sh](api/deploy-fixed.sh)** 🆕
   - Script limpo e corrigido
   - Sintaxe válida
   - Lógica simplificada mas funcional
   - Comentários explicativos

3. **[deploy-all.sh](deploy-all.sh)** 
   - Já estava OK, mas agora pode usar o deploy.sh corrigido

---

## 🎯 Próximas Ações

1. **Substituir deploy.sh:**
   ```bash
   cd /opt/projetos/infra-estacaoterapia/api
   cp deploy.sh deploy.sh.backup-$(date +%s)
   cp deploy-fixed.sh deploy.sh
   chmod +x deploy.sh
   ```

2. **Testar syntax:**
   ```bash
   bash -n api/deploy.sh
   ```

3. **Executar deploy completo:**
   ```bash
   bash deploy-all.sh
   ```

4. **Monitorar:**
   ```bash
   # Terminal 1: API
   docker service logs estacaoterapia_api -f
   
   # Terminal 2: Status
   watch 'docker service ls'
   ```

---

## 📊 Alterações Principais no deploy.sh

| Item | Antes | Depois |
|------|-------|--------|
| Caracteres corrompidos | Sim ❌ | Não ✅ |
| Função `return` errada | Sim ❌ | Não ✅ |
| Healthcheck Redis | Fraco | Melhorado |
| Monitoramento | Complexo | Simplificado |
| Retry logic | N/A | Adicionado |
| Logs | Confusos | Claros |

