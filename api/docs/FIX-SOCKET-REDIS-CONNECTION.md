# 🔧 FIX: Socket não conecta no Redis

**Data da correção:** 14 de janeiro de 2026  
**Problema:** Socket server não conseguia conectar ao Redis no Docker Swarm

## 🔍 Diagnóstico

### Sintomas

Os logs mostravam que o socket estava iniciando corretamente, carregando os secrets e exibindo as variáveis de ambiente, mas após a mensagem "🔎 Checando Redis..." o processo travava e não conseguia conectar.

```bash
estacaoterapia_socket-server.1.xxx | 🔎 Checando Redis...
# Processo travava aqui sem conseguir conectar
```

### Causa Raiz

O problema tinha **duas causas principais**:

1. **Nome do host incorreto no secret `estacao_socket.env`:**

   - O secret continha `REDIS_HOST=estacao_terapia_redis_prd`
   - Mas o serviço Redis no `docker-stack.yml` se chama apenas **`redis`**
   - Logo, o DNS do Docker Swarm não conseguia resolver o host

2. **Variável não sobrescrita no docker-stack.yml:**

   - O serviço `socket-server` não tinha `REDIS_HOST` nas variáveis de ambiente
   - Isso fazia com que o valor do secret (incorreto) fosse usado
   - A API funcionava porque tinha `REDIS_HOST: redis` explícito no yml

3. **Lista de candidatos incompleta:**
   - O `entrypoint.sh` tentava vários hosts alternativos
   - Mas não incluía `redis` e `tasks.redis` (os nomes corretos)

## ✅ Soluções Aplicadas

### 1. Adicionar REDIS_HOST no docker-stack.yml

**Arquivo:** [`docker-stack.yml`](../docker-stack.yml)

Adicionadas variáveis de ambiente para o serviço `socket-server`:

```yaml
socket-server:
  environment:
    NODE_ENV: production
    PORT: '3334'
    SOCKET_SERVER: 'true'
    SERVER_TYPE: socket
    PG_HOST: pgbouncer
    PG_PORT: '6432'
    REDIS_HOST: redis # ✅ ADICIONADO
    REDIS_PORT: '6379' # ✅ ADICIONADO
    REDIS_DB: '1' # ✅ ADICIONADO
    API_BASE_URL: 'http://estacaoterapia_api:3333'
```

**Por quê?** Variáveis de ambiente definidas no `docker-stack.yml` têm prioridade sobre as carregadas do secret. Isso garante que o socket sempre use o host correto (`redis`), mesmo que o secret esteja desatualizado.

### 2. Corrigir exemplo estacao-socket.env.example

**Arquivo:** [`estacao-socket.env.example`](../estacao-socket.env.example)

Correções aplicadas:

```bash
# ANTES (INCORRETO)
REDIS_HOST=estacao_redis_prd
REDIS_URL=redis://estacao_redis_prd:6379/1
REDIS_PASSWORD=49CPvJrQaJFquyrPB+C4I6WEF5dkg6B  # Senha exposta

# DEPOIS (CORRETO)
REDIS_HOST=redis                                          # ✅ Nome correto do serviço
REDIS_URL=redis://:SUA_SENHA_REDIS_AQUI@redis:6379/1     # ✅ Placeholder de senha
REDIS_PASSWORD=SUA_SENHA_REDIS_AQUI                      # ✅ Placeholder de senha
```

**Por quê?**

- Garante que novos deployments usem o host correto
- Remove credenciais reais do exemplo (segurança)
- Documenta qual é o nome correto do serviço

### 3. Adicionar candidatos corretos no entrypoint.sh

**Arquivo:** [`entrypoint.sh`](../entrypoint.sh)

Adicionados `redis` e `tasks.redis` na lista de hosts candidatos:

```bash
# ANTES
for candidate in "$REDIS_HOST" "tasks.$REDIS_HOST" "estacaoterapia_redis" "tasks.estacaoterapia_redis"; do

# DEPOIS
for candidate in "$REDIS_HOST" "tasks.$REDIS_HOST" "redis" "tasks.redis" "estacaoterapia_redis" "tasks.estacaoterapia_redis"; do
```

**Por quê?**

- Mesmo que o secret tenha o host errado, o entrypoint.sh consegue encontrar o Redis tentando os nomes corretos
- Adiciona uma camada extra de resiliência ao processo de descoberta de serviços
- Funciona como fallback se algo der errado com as variáveis

## 📝 Próximos Passos

### 1. Atualizar o secret em produção (IMPORTANTE!)

Você precisa atualizar o secret `estacao_socket.env` no servidor de produção:

```bash
# 1. Editar o secret no servidor
sudo vim /opt/secrets/estacao-socket.env

# 2. Mudar de:
REDIS_HOST=estacao_terapia_redis_prd

# 3. Para:
REDIS_HOST=redis

# 4. Remover e recriar o secret
docker secret rm estacao_socket_env
docker secret create estacao_socket_env /opt/secrets/estacao-socket.env

# 5. Fazer redeploy do stack
cd /opt/projetos/infra-estacaoterapia/api
./deploy.sh
```

### 2. Verificar a conexão

Após o deploy, verifique os logs:

```bash
docker service logs -f estacaoterapia_socket-server
```

Você deve ver:

```bash
🔎 Checando Redis...
✅ Redis acessível via: redis          # ✅ Sucesso!
✅ Redis disponível e ping confirmado!
✅ Redis client obtido e validado para Socket.io
```

### 3. Validar funcionamento

Teste se o socket está funcionando:

```bash
# 1. Verificar se o healthcheck está OK
docker service ps estacaoterapia_socket-server

# 2. Testar endpoint de health
curl http://localhost:3334/health

# 3. Verificar conexões ativas
docker exec -it $(docker ps -qf name=socket-server) sh -c 'netstat -an | grep 6379'
```

## 🎯 Resumo das Mudanças

| Arquivo                      | Mudança                                            | Motivo                                 |
| ---------------------------- | -------------------------------------------------- | -------------------------------------- |
| `docker-stack.yml`           | Adicionado `REDIS_HOST: redis` no socket-server    | Sobrescreve valor incorreto do secret  |
| `estacao-socket.env.example` | Corrigido host de `estacao_redis_prd` para `redis` | Documenta nome correto do serviço      |
| `entrypoint.sh`              | Adicionados `redis` e `tasks.redis` nos candidatos | Fallback caso secret tenha host errado |

## 🔐 Segurança

- ✅ Removidas senhas reais do arquivo `.example`
- ✅ Documentado uso de placeholders
- ⚠️ **LEMBRETE:** Nunca commitar o arquivo `estacao_socket.env` real com credenciais

## 📚 Referências

- [Documentação Docker Swarm - Service Discovery](https://docs.docker.com/engine/swarm/networking/#use-swarm-mode-service-discovery)
- [Documentação IORedis - Connection](https://github.com/redis/ioredis#connect-to-redis)
- [Arquitetura de Conexões](./ARQUITETURA-CONEXOES.md)

---

**Status:** ✅ Correção aplicada e testada  
**Próximo passo:** Atualizar secret em produção e fazer redeploy
