# 🔐 Sistema de Secrets no Docker Swarm

## Visão Geral

Este projeto utiliza Docker Swarm Secrets para gerenciar credenciais e configurações sensíveis de forma segura. Os secrets são montados em `/run/secrets/` dentro dos containers e lidos pelos entrypoints dos serviços.

## Arquitetura

```
┌─────────────────┐
│ Docker Swarm    │
│ Secrets Store   │
└────────┬────────┘
         │
         ├──── postgres_env ─────────────┐
         │                               │
         ├──── estacao_api_env ─────┐   │
         │                          │   │
         ├──── estacao_socket_env   │   │
         │                          │   │
         ├──── pgbouncer.ini ───────┤   │
         │                          │   │
         └──── userlist.txt ────────┤   │
                                    │   │
┌───────────────────────────────────┼───┼────┐
│ Container                         │   │    │
│                                   │   │    │
│  /run/secrets/                    │   │    │
│    ├── estacao_api.env ◄──────────┘   │    │
│    ├── estacao_socket.env             │    │
│    ├── postgres.env ◄──────────────────────┘
│    ├── pgbouncer/                     │
│    │   ├── pgbouncer.ini ◄────────────┘
│    │   └── userlist.txt ◄─────────────┘
│                                        │
│  entrypoint.sh ───────────────────┐   │
│    └─ load_secrets() ◄────────────┤   │
│         ├─ Lê arquivos .env       │   │
│         └─ Exporta variáveis      │   │
│                                   │   │
│  Aplicação Node.js ◄──────────────┘   │
│    └─ Usa variáveis de ambiente       │
│                                        │
└────────────────────────────────────────┘
```

## Fluxo de Execução

### 1. Inicialização do Container

1. Docker Swarm monta os secrets em `/run/secrets/`
2. O container inicia executando `entrypoint.sh`
3. `entrypoint.sh` chama `load_secrets()` para cada secret

### 2. Carregamento de Secrets

```bash
load_secrets() {
  local secret_file="$1"
  
  # Lê cada linha do arquivo .env
  while IFS= read -r line; do
    # Ignora linhas vazias e comentários
    case "$line" in
      ""|\#*) continue ;;
    esac
    
    # Separa chave=valor
    key="${line%%=*}"
    value="${line#*=}"
    
    # Exporta a variável de ambiente
    export "$key=$value"
  done < "$secret_file"
}
```

### 3. Uso pelas Aplicações

As aplicações Node.js acessam as variáveis através de `process.env`:

```javascript
const redisPassword = process.env.REDIS_PASSWORD;
const databaseUrl = process.env.DATABASE_URL;
```

## Secrets Configurados

### 🗄️ postgres_env
**Montado em:** `/run/secrets/postgres.env`  
**Usado por:** Serviço `postgres`  
**Conteúdo:**
```env
POSTGRES_USER=estacaoterapia
POSTGRES_PASSWORD=***
POSTGRES_DB=estacaoterapia
```

### 🚀 estacao_api_env
**Montado em:** `/run/secrets/estacao_api.env`  
**Usado por:** Serviço `api`  
**Conteúdo:** Todas as variáveis de ambiente da API
- Credenciais de banco de dados
- Redis password e URL
- JWT secrets
- AWS credentials
- URLs da aplicação

### 🔌 estacao_socket_env
**Montado em:** `/run/secrets/estacao_socket.env`  
**Usado por:** Serviço `socket-server`  
**Conteúdo:** Variáveis específicas do Socket Server
- Credenciais de banco de dados
- Redis password e URL
- JWT secret
- Configurações de CORS

### 🔄 pgbouncer.ini
**Montado em:** `/run/secrets/pgbouncer.ini`  
**Usado por:** Serviço `pgbouncer`  
**Conteúdo:** Configuração do connection pooler

### 👥 userlist.txt
**Montado em:** `/run/secrets/userlist.txt`  
**Usado por:** Serviço `pgbouncer`  
**Conteúdo:** Lista de usuários autorizados no PgBouncer

## Como Gerenciar Secrets

### Criar Secrets

```bash
# Usando o script auxiliar (recomendado)
./create-secrets.sh

# Manualmente
docker secret create postgres_env secrets/postgres.env
docker secret create estacao_api_env secrets/estacao_api.env
docker secret create estacao_socket_env secrets/estacao_socket.env
docker secret create pgbouncer.ini secrets/pgbouncer.ini
docker secret create userlist.txt secrets/userlist.txt
```

### Listar Secrets

```bash
docker secret ls
```

### Inspecionar Secret (sem ver conteúdo)

```bash
docker secret inspect postgres_env
```

### Atualizar Secret

Docker Swarm não permite atualizar secrets diretamente. É necessário:

1. Remover o secret antigo
2. Criar um novo secret
3. Atualizar o serviço

```bash
# Remover
docker secret rm estacao_api_env

# Recriar
docker secret create estacao_api_env secrets/estacao_api.env

# Atualizar serviço (força recriação dos containers)
docker service update --secret-rm estacao_api_env estacaoterapia_api
docker service update --secret-add estacao_api_env estacaoterapia_api
```

Ou use o script auxiliar:
```bash
./create-secrets.sh  # Ele pergunta se deseja recriar
```

### Remover Secret

```bash
# Primeiro, remova o secret dos serviços
docker service update --secret-rm estacao_api_env estacaoterapia_api

# Depois remova o secret
docker secret rm estacao_api_env
```

## Segurança

### ✅ Boas Práticas

1. **Nunca faça commit de secrets reais**
   - Use `.gitignore` para bloquear arquivos `.env`
   - Mantenha apenas os `.example`

2. **Use senhas fortes**
   - Mínimo 32 caracteres
   - Caracteres especiais, números, letras
   - Use geradores de senha

3. **Rotacione credenciais periodicamente**
   - A cada 90 dias para produção
   - Após qualquer incidente de segurança

4. **Princípio do menor privilégio**
   - Cada serviço deve ter acesso apenas aos secrets necessários
   - Use usuários de banco separados por serviço quando possível

5. **Monitore acesso aos secrets**
   - Registre quando secrets são lidos
   - Alerte sobre falhas de acesso

### 🔒 Benefícios dos Docker Secrets

- **Criptografia em trânsito:** Secrets são criptografados durante transmissão
- **Criptografia em repouso:** Secrets são criptografados no Raft log do Swarm
- **Acesso controlado:** Apenas containers autorizados podem acessar
- **Auditoria:** Docker mantém logs de criação/remoção
- **Imutabilidade:** Secrets não podem ser modificados, apenas recriados
- **Namespace isolado:** Secrets de diferentes stacks não interferem

## Debugging

### Verificar se secret foi montado

```bash
docker exec <container_id> ls -la /run/secrets/
```

### Ver conteúdo do secret (apenas para debug)

```bash
docker exec <container_id> cat /run/secrets/estacao_api.env
```

### Verificar variáveis exportadas

```bash
docker exec <container_id> env | grep REDIS
```

### Logs do entrypoint

Os logs do `entrypoint.sh` mostram:
- Quais secrets foram carregados
- Quais variáveis foram exportadas (sem mostrar valores sensíveis)
- Conexões estabelecidas

```bash
docker service logs estacaoterapia_api
```

## Troubleshooting

### Problema: Container não inicia

**Possível causa:** Secret não foi criado

**Solução:**
```bash
docker secret ls
./create-secrets.sh
```

### Problema: Variável não está disponível na aplicação

**Possível causa:** Secret não foi carregado ou nome errado

**Verificação:**
1. Confirme que o secret está montado: `docker exec <container> ls /run/secrets/`
2. Verifique logs do entrypoint: `docker service logs <service>`
3. Confirme variável exportada: `docker exec <container> env`

### Problema: Senha incorreta no banco

**Possível causa:** Secret desatualizado

**Solução:**
1. Atualize o arquivo em `secrets/`
2. Recrie o secret com `./create-secrets.sh`
3. Force atualização do serviço

## Referências

- [Docker Secrets Documentation](https://docs.docker.com/engine/swarm/secrets/)
- [Docker Secret Management Best Practices](https://docs.docker.com/engine/swarm/secrets/#advanced-example-use-secrets-with-a-wordpress-service)
- [Twelve-Factor App - Config](https://12factor.net/config)
