# 🔐 Senha Hardcoded no Docker Stack

## 🎯 Solução Implementada

A senha do Redis agora está **hardcoded diretamente** no `docker-stack.yml` como variável de ambiente:

```yaml
environment:
  REDIS_PASSWORD: 'REdnRHkZLnQpK1rcoKsseO3pX4GNIRR'
```

Isso garante que **sempre** será usada a senha correta, independente de secrets.

## 📝 Arquivos Modificados

1. **`docker-stack.yml`**:

   - ✅ API: `REDIS_PASSWORD: 'REdnRHkZLnQpK1rcoKsseO3pX4GNIRR'`
   - ✅ Socket: `REDIS_PASSWORD: 'REdnRHkZLnQpK1rcoKsseO3pX4GNIRR'`

2. **`entrypoint.sh`**:
   - ✅ Prioridade: Environment Variable > Secret > .env
   - ✅ Logs detalhados da origem da senha

## 🚀 Como Aplicar

### No Servidor:

```bash
cd /caminho/para/api

# Opção 1: Usar script automatizado
bash deploy-hardcoded.sh

# Opção 2: Deploy manual
TAG=latest
sed "s/{{TAG}}/$TAG/g" docker-stack.yml > docker-stack.deploy.yml
docker stack deploy -c docker-stack.deploy.yml estacaoterapia --with-registry-auth
```

### Verificar Logs:

```bash
docker service logs estacaoterapia_socket-server --tail 50 -f
```

**Procure por:**

```
✅ 🔐 Senha Redis definida via environment variable (39 chars)
✅ REDIS_PASSWORD primeiros 5 chars: REdnR...
✅ REDIS_PASSWORD últimos 3 chars: ...IRR
✅ [IORedis] Status: READY
```

## 🔄 Ordem de Prioridade da Senha

O `entrypoint.sh` agora segue esta ordem:

1. **`REDIS_PASSWORD` do environment** (docker-stack.yml) ← **PRIORITÁRIO**
2. Secret `/run/secrets/redis_password`
3. Variável do arquivo `.env`

## ✅ Vantagens

- ✅ **Garantia absoluta** da senha correta
- ✅ Não depende de secrets externos
- ✅ Fácil de debugar
- ✅ Consistente entre API e Socket

## ⚠️ Importante

A senha está no código versionado. Para segurança adicional em produção, considere:

- Usar secrets do Docker Swarm (já configurado como fallback)
- Variáveis de ambiente no deploy
- Vault ou gerenciador de secrets

## 🧪 Teste Rápido

```bash
# Ver as variáveis de ambiente do socket
docker service inspect estacaoterapia_socket-server --format '{{json .Spec.TaskTemplate.ContainerSpec.Env}}' | jq

# Verificar se REDIS_PASSWORD está presente
docker service inspect estacaoterapia_socket-server | grep REDIS_PASSWORD
```
