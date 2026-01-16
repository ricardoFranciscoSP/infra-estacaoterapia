# 🔐 Fix: Redis Authentication Error (WRONGPASS)

## 🐛 Problema

```
❌ [IORedis] Erro durante conexão: WRONGPASS invalid username-password pair or user is disabled.
```

O socket-server não consegue se conectar ao Redis devido a senha incorreta.

## 🔍 Causa

Existem 3 locais onde a senha do Redis precisa estar sincronizada:

1. **`api/secrets/estacao_api.env.production`** → `REDIS_PASSWORD`
2. **`api/secrets/estacao_socket.env.production`** → `REDIS_PASSWORD`
3. **Docker Secret `redis_password`** no Swarm

O erro ocorre quando há **dessincronia** entre esses valores.

## ✅ Solução Rápida

### 1. Diagnosticar

Execute no servidor:

```bash
cd /caminho/para/api
bash diagnose-redis-password.sh
```

Ou manualmente:

```bash
# Verificar senha em estacao_api.env
grep "^REDIS_PASSWORD=" secrets/estacao_api.env.production

# Verificar senha em estacao_socket.env
grep "^REDIS_PASSWORD=" secrets/estacao_socket.env.production
```

### 2. Sincronizar Senhas

Se as senhas forem diferentes, use a senha do `estacao_api.env.production` como referência:

```bash
# Extrair senha do API
REDIS_PASS=$(grep "^REDIS_PASSWORD=" secrets/estacao_api.env.production | cut -d= -f2- | tr -d '\r\n ')

# Atualizar senha no socket.env
sed -i "s|^REDIS_PASSWORD=.*|REDIS_PASSWORD=$REDIS_PASS|" secrets/estacao_socket.env.production

# Verificar se atualizou
grep "^REDIS_PASSWORD=" secrets/estacao_socket.env.production
```

### 3. Recriar Docker Secret

```bash
# Remover secret antigo
docker secret rm redis_password

# Criar novo secret com a senha correta
echo -n "$REDIS_PASS" | docker secret create redis_password -

# Verificar criação
docker secret ls | grep redis_password
```

### 4. Reiniciar Serviços

Os serviços precisam ser reiniciados para pegar o novo secret:

```bash
# 1. Redis (primeiro)
docker service update --force estacaoterapia_redis

# Aguardar 10-15 segundos
sleep 15

# 2. API
docker service update --force estacaoterapia_api

# Aguardar 10-15 segundos
sleep 15

# 3. Socket Server
docker service update --force estacaoterapia_socket-server
```

### 5. Verificar Logs

```bash
# Redis
docker service logs estacaoterapia_redis --tail 50

# Socket Server
docker service logs estacaoterapia_socket-server --tail 50

# Deve aparecer:
# ✅ [IORedis] Status: READY
```

## 🔧 Script Automatizado

Para automatizar todo o processo, use:

```bash
cd api
bash fix-redis-password.sh
```

Este script:
- ✅ Compara senhas nos arquivos
- ✅ Sincroniza automaticamente
- ✅ Recria o Docker Secret
- ✅ Reinicia os serviços (com confirmação)

## 📋 Checklist de Verificação

Após aplicar a correção:

- [ ] Senhas idênticas em `estacao_api.env.production` e `estacao_socket.env.production`
- [ ] Secret `redis_password` recriado no Swarm
- [ ] Serviços reiniciados (redis → api → socket)
- [ ] Logs do Redis sem erros de autenticação
- [ ] Logs do Socket Server mostrando `✅ [IORedis] Status: READY`
- [ ] Socket Server conectando com sucesso

## 🚨 Prevenção Futura

Para evitar esse problema:

1. **Sempre sincronizar senhas** ao atualizar secrets
2. **Validar antes do deploy**: Use `validate-secrets.sh` antes de fazer deploy
3. **Documentar mudanças**: Registre alterações de senhas no CHANGELOG

## 📚 Arquivos Relacionados

- [`entrypoint.sh`](entrypoint.sh) - Carrega secrets para API e Socket
- [`redis-entrypoint.sh`](redis-entrypoint.sh) - Configura autenticação do Redis
- [`docker-stack.yml`](docker-stack.yml) - Configuração dos serviços
- [`deploy.sh`](deploy.sh) - Script de deploy que cria secrets

## 🔗 Referências

- [Docker Secrets Documentation](https://docs.docker.com/engine/swarm/secrets/)
- [IORedis Authentication](https://github.com/redis/ioredis#connect-to-redis)
- [Redis AUTH command](https://redis.io/commands/auth/)
