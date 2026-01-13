# 📂 Mapeamento de Estrutura - Deploy

## 📊 Visão Geral

```
infra-estacaoterapia/
├── api/                    # Backend (Node.js API + Socket)
│   ├── deploy.sh          ✅ Script principal de deploy
│   ├── docker-stack.yml   ✅ Configuração Docker Swarm
│   ├── entrypoint.sh      ✅ Script de entrada dos containers
│   └── cleanup-old-replicas.sh  ✅ Limpeza de réplicas antigas
│
├── estacao/               # Frontend (Next.js)
│   ├── deploy-stack.sh    ✅ Script principal de deploy
│   ├── deploy.sh          ✅ Script wrapper
│   ├── docker-stack.yml   ✅ Configuração Docker Swarm
│   ├── diagnose-service.sh       🔧 Diagnóstico de serviços
│   ├── diagnose-traefik.sh       🔧 Diagnóstico do Traefik
│   ├── get-latest-tag.sh         🔧 Obtém última tag
│   └── validate-deployment.sh    🔧 Validação pós-deploy
│
├── deploy-all.sh          ✅ Deploy completo (API + Frontend)
├── prepare-deploy.sh      ✅ Prepara permissões dos scripts
└── start.sh              ✅ Inicia ambiente local
```

---

## 🔧 API (Backend)

### Localização: `./api/`

#### Arquivos de Deploy:

1. **deploy.sh** ⭐ Principal
   - Tipo: Script de deploy Docker Swarm
   - Função: Build e deploy da API + Socket Server
   - Stack: `estacaoterapia`
   - Serviços deployados:
     - `estacaoterapia_api`
     - `estacaoterapia_socket-server`
     - `estacaoterapia_postgres`
     - `estacaoterapia_redis`
     - `estacaoterapia_pgbouncer`
   - Processo:
     1. Gera tag única (timestamp + git hash)
     2. Build de imagens Docker
     3. Atualiza docker-stack.yml
     4. Deploy no Swarm (zero-downtime)
     5. Cleanup de imagens antigas

2. **docker-stack.yml**
   - Tipo: Configuração Docker Swarm
   - Stack name: `estacaoterapia`
   - Tag template: `{{TAG}}` (substituída no deploy)
   - Imagens:
     - `estacaoterapia-api:prd-{{TAG}}`
     - `estacaoterapia-socket-server:prd-{{TAG}}`

3. **entrypoint.sh**
   - Tipo: Script de inicialização do container
   - Função: Carrega variáveis de ambiente dos secrets
   - Usado por: API e Socket containers

4. **cleanup-old-replicas.sh**
   - Tipo: Script de manutenção
   - Função: Remove réplicas antigas/órfãs

#### Dockerfiles:

- **Dockerfile.api** - Build da API
- **Dockerfile.socket** - Build do Socket Server
- **Dockerfile.pgbouncer** - Build do PgBouncer

#### Como fazer deploy:

```bash
cd api/
./deploy.sh
```

---

## 🎨 ESTACAO (Frontend)

### Localização: `./estacao/`

#### Arquivos de Deploy:

1. **deploy-stack.sh** ⭐ Principal
   - Tipo: Script de deploy Docker Swarm
   - Função: Build e deploy do Next.js
   - Stack: `estacao`
   - Serviço deployado:
     - `estacao_next_prd`
   - Processo:
     1. Verifica pré-requisitos
     2. Gera tag única
     3. Build da imagem Next.js
     4. Deploy no Swarm
     5. Health check
     6. Validação
     7. Cleanup de imagens antigas

2. **deploy.sh**
   - Tipo: Script wrapper
   - Função: Orquestra o deploy-stack.sh
   - Features:
     - Git pull automático
     - Verificação de permissões
     - Wrapper para deploy-stack.sh

3. **docker-stack.yml**
   - Tipo: Configuração Docker Swarm
   - Stack name: `estacao`
   - Service name: `next_prd`
   - Imagem: `estacaoterapia-next-prd:{{TAG}}`

4. **diagnose-service.sh** 🔧
   - Tipo: Ferramenta de diagnóstico
   - Função: Diagnostica problemas no serviço

5. **diagnose-traefik.sh** 🔧
   - Tipo: Ferramenta de diagnóstico
   - Função: Diagnostica problemas no Traefik

6. **get-latest-tag.sh** 🔧
   - Tipo: Utilitário
   - Função: Obtém a última tag de deploy

7. **validate-deployment.sh** 🔧
   - Tipo: Validação pós-deploy
   - Função: Verifica se o deploy foi bem-sucedido

#### Dockerfile:

- **Dockerfile** - Build do Next.js

#### Como fazer deploy:

```bash
cd estacao/
./deploy-stack.sh
```

Ou usando o wrapper:
```bash
cd estacao/
./deploy.sh
```

---

## 🚀 Deploy Completo (Raiz)

### Localização: `./`

1. **deploy-all.sh** ⭐ Orquestrador completo
   - Função: Deploy de tudo (API + Frontend)
   - Processo:
     1. Verifica pré-requisitos
     2. Atualiza código Git
     3. Cria backups
     4. Deploy da API (`cd api/ && ./deploy.sh`)
     5. Deploy do Frontend (`cd estacao/ && ./deploy-stack.sh`)
     6. Validação final
   - Zero-downtime garantido
   - Log completo em arquivo

2. **prepare-deploy.sh**
   - Função: Prepara ambiente antes do deploy
   - Detecta estrutura do projeto
   - Dá permissão em todos os scripts .sh
   - Valida que tudo está pronto

3. **start.sh**
   - Função: Inicia ambiente local com Docker Compose
   - Uso: Desenvolvimento local apenas
   - Não é para produção

---

## 📋 Resumo de Comandos

### Deploy em Produção (Recomendado)

```bash
# Deploy completo (API + Frontend)
./deploy-all.sh

# Deploy apenas da API
cd api/ && ./deploy.sh

# Deploy apenas do Frontend
cd estacao/ && ./deploy-stack.sh
```

### Preparação

```bash
# Preparar ambiente (dar permissões)
./prepare-deploy.sh

# Verificar status
docker service ls
```

### Desenvolvimento Local

```bash
# Iniciar ambiente local
./start.sh

# Parar ambiente local
docker compose down
```

---

## 🔍 Estrutura de Stacks no Swarm

### Stack: `estacaoterapia` (Backend)

Serviços:
- `estacaoterapia_api`
- `estacaoterapia_socket-server`
- `estacaoterapia_postgres`
- `estacaoterapia_redis`
- `estacaoterapia_pgbouncer`

### Stack: `estacao` (Frontend)

Serviços:
- `estacao_next_prd`

---

## 📝 Notas Importantes

1. **Scripts da API**:
   - Todos em `./api/`
   - Principal: `deploy.sh`
   - Stack name: `estacaoterapia`

2. **Scripts do Frontend**:
   - Todos em `./estacao/`
   - Principal: `deploy-stack.sh`
   - Wrapper: `deploy.sh`
   - Stack name: `estacao`

3. **Script Orquestrador**:
   - Localização: `./deploy-all.sh`
   - Usa ambos os scripts acima
   - Recomendado para deploy completo

4. **Permissões**:
   - Sempre execute `./prepare-deploy.sh` primeiro
   - Ou manualmente: `chmod +x api/deploy.sh estacao/deploy-stack.sh`

5. **Zero-Downtime**:
   - Todos os deploys usam Docker Swarm rolling updates
   - Garante disponibilidade contínua
   - Rollback automático em caso de falha

---

## 🆘 Troubleshooting

### Script não encontrado

```bash
# Verificar existência
ls -la api/deploy.sh
ls -la estacao/deploy-stack.sh

# Dar permissão
chmod +x api/deploy.sh
chmod +x estacao/deploy-stack.sh

# Ou usar o prepare
./prepare-deploy.sh
```

### Erro de permissão

```bash
# Verificar usuário
whoami  # Deve ser 'deploy'

# Verificar grupo docker
groups deploy | grep docker

# Se não estiver no grupo
sudo usermod -aG docker deploy
```

### Stack não encontrada

```bash
# Listar stacks
docker stack ls

# Listar serviços
docker service ls

# Deploy manual se necessário
cd api/ && docker stack deploy -c docker-stack.yml estacaoterapia
cd estacao/ && docker stack deploy -c docker-stack.yml estacao
```
