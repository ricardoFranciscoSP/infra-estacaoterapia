# 🚀 Deploy Zero-Downtime

## Deploy Completo (Recomendado)

Para fazer deploy de **tudo** (API + Socket + Frontend) com zero-downtime:

```bash
# No diretório raiz do projeto
chmod +x deploy-all.sh
./deploy-all.sh
```

### O que o script faz automaticamente:

✅ Verifica todos os pré-requisitos (Docker, Swarm, scripts)  
✅ Atualiza código do Git (com confirmação)  
✅ Cria backup das configurações atuais  
✅ **Deploy da API** (Build + Rolling Update)  
✅ **Deploy do Socket Server** (Build + Rolling Update)  
✅ **Deploy do Frontend** (Build + Rolling Update)  
✅ Verifica saúde de todos os serviços  
✅ Gera log completo do deploy  
✅ Mostra resumo com comandos úteis  

### Características do Deploy:

- **Zero Downtime**: Rolling updates garantem disponibilidade contínua
- **Rollback Automático**: Backups criados antes de cada deploy
- **Logs Completos**: Tudo registrado em arquivo timestamped
- **Validação**: Verifica saúde após cada etapa
- **Segurança**: Não executa como root

---

## Deploy Individual

### Deploy apenas da API

```bash
cd api/
./deploy.sh
```

### Deploy apenas do Frontend

```bash
cd estacao/
./deploy-stack.sh
```

---

## Verificar Status

```bash
# Ver todos os serviços
docker service ls

# Ver logs em tempo real
docker service logs -f estacaoterapia_api          # API
docker service logs -f estacaoterapia_socket-server # Socket
docker service logs -f estacao_next_prd             # Frontend

# Ver réplicas e status
docker service ps estacaoterapia_api
docker service ps estacao_next_prd
```

---

## Comandos Úteis

### Escalar Serviços

```bash
# Aumentar réplicas da API
docker service scale estacaoterapia_api=3

# Aumentar réplicas do Frontend
docker service scale estacao_next_prd=2
```

### Forçar Atualização

```bash
# Força restart de um serviço
docker service update --force estacaoterapia_api
```

### Ver Recursos

```bash
# Uso de CPU/Memória
docker stats $(docker ps --format "{{.Names}}" | grep estacao)
```

---

## Rollback

Se algo der errado, use os backups criados automaticamente:

```bash
# Rollback da API
cd api/
cp backups/deploy-TIMESTAMP/api-docker-stack.yml.backup docker-stack.yml
docker stack deploy -c docker-stack.yml estacaoterapia

# Rollback do Frontend
cd estacao/
cp backups/deploy-TIMESTAMP/frontend-docker-stack.yml.backup docker-stack.yml
docker stack deploy -c docker-stack.yml estacao
```

---

## Primeira Vez?

### 1. Inicializar Swarm

```bash
docker swarm init
```

### 2. Criar Redes

```bash
docker network create --driver overlay estacao-network
docker network create --driver overlay estacao-backend-network
```

### 3. Criar Volumes

```bash
docker volume create postgres_data
docker volume create redis_data
docker volume create documentos_data
```

### 4. Criar Secrets

```bash
# Secret da API
nano estacao_api.env
# (preencher com variáveis de ambiente)
docker secret create estacao_api_env estacao_api.env
rm estacao_api.env

# Secret do Frontend
nano nextjs-prd.env
# (preencher com variáveis de ambiente)
mkdir -p /opt/secrets
mv nextjs-prd.env /opt/secrets/
```

### 5. Deploy!

```bash
./deploy-all.sh
```

---

## Troubleshooting

### Serviço não inicia

```bash
# Ver logs de erro
docker service logs estacaoterapia_api

# Ver eventos do Swarm
docker events --filter type=service

# Inspecionar serviço
docker service inspect estacaoterapia_api
```

### Imagens antigas acumulando

```bash
# Limpeza manual
docker image prune -a -f
```

### Problemas de rede

```bash
# Recriar rede
docker network rm estacao-network
docker network create --driver overlay estacao-network

# Atualizar serviço para reconectar
docker service update --force estacaoterapia_api
```

---

## Monitoramento

```bash
# Ver saúde de todos os serviços
watch -n 2 'docker service ls'

# Monitorar logs em tempo real
docker service logs -f estacaoterapia_api

# Ver uso de recursos
docker stats
```

---

## Documentação Completa

- [Guia Completo de Deploy](GUIA-DEPLOY.md)
- [Arquitetura](ESTRUTURA-PROJETO.md)
- [README Principal](README.md)
