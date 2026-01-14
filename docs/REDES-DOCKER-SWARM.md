# 🌐 Redes Docker Swarm - Estação Terapia

Este documento descreve as redes Docker necessárias para a infraestrutura e como gerenciá-las.

## 📋 Redes Necessárias

### 1. **estacao-backend-network** (EXTERNA - Criar manualmente)
- **Tipo**: Overlay
- **Driver**: overlay
- **Uso**: Comunicação entre Caddy, API e Socket Server
- **Serviços conectados**:
  - Caddy (proxy reverso)
  - API
  - Socket Server
  - PgBouncer

### 2. **estacao-network** (EXTERNA - Criar manualmente)
- **Tipo**: Overlay
- **Driver**: overlay
- **Uso**: Comunicação entre Caddy e Frontend
- **Serviços conectados**:
  - Caddy (proxy reverso)
  - Frontend (Next.js)

### 3. **estacaoterapia_backend** (INTERNA - Criada automaticamente)
- **Tipo**: Overlay
- **Driver**: overlay
- **Uso**: Rede isolada para backend (Postgres, Redis, PgBouncer, API, Socket)
- **Criada por**: `api/docker-stack.yml` (external: false)
- **Serviços conectados**:
  - Postgres
  - Redis
  - PgBouncer
  - API
  - Socket Server

---

## 🚀 Como Criar as Redes Necessárias

### Pré-requisitos
- Docker Swarm inicializado
- Acesso de root ou usuário com permissões Docker

### Comandos para Criar as Redes

```bash
# 1. Criar rede estacao-backend-network (para Caddy, API, Socket)
docker network create \
  --driver overlay \
  --attachable \
  estacao-backend-network

# 2. Criar rede estacao-network (para Caddy e Frontend)
docker network create \
  --driver overlay \
  --attachable \
  estacao-network
```

### Verificar Redes Criadas

```bash
# Listar todas as redes overlay
docker network ls --filter driver=overlay

# Ver detalhes de uma rede específica
docker network inspect estacao-backend-network
docker network inspect estacao-network
```

---

## 🗑️ Como Remover Redes Desnecessárias

### ⚠️ ATENÇÃO: Só remova redes que não estão em uso!

### 1. Verificar Redes em Uso

```bash
# Listar todas as redes
docker network ls

# Ver quais serviços estão usando cada rede
docker network inspect estacao-backend-network | grep -A 10 "Containers"
docker network inspect estacao-network | grep -A 10 "Containers"
```

### 2. Parar Serviços que Usam a Rede

Antes de remover uma rede, você precisa parar todos os serviços que a utilizam:

```bash
# Parar stack da API (remove estacaoterapia_backend automaticamente)
docker stack rm estacaoterapia

# Parar stack do Frontend
docker stack rm estacao

# Parar stack do Caddy
docker stack rm estacao-caddy
```

### 3. Remover Redes Desnecessárias

```bash
# Remover rede estacao-backend-network (se não estiver em uso)
docker network rm estacao-backend-network

# Remover rede estacao-network (se não estiver em uso)
docker network rm estacao-network

# Remover rede estacaoterapia_backend (se criada manualmente por engano)
docker network rm estacaoterapia_backend
```

### 4. Limpar Redes Órfãs

```bash
# Remover todas as redes não utilizadas
docker network prune -f

# Remover apenas redes overlay não utilizadas
docker network prune -f --filter driver=overlay
```

---

## 📊 Mapa de Redes e Serviços

```
┌─────────────────────────────────────────────────────────────┐
│                    estacao-network                          │
│  (External - Criar manualmente)                            │
│                                                             │
│  ┌─────────────┐         ┌──────────────┐                  │
│  │   Caddy     │────────▶│   Frontend   │                  │
│  │  (Proxy)    │         │  (Next.js)   │                  │
│  └─────────────┘         └──────────────┘                  │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│              estacao-backend-network                        │
│  (External - Criar manualmente)                            │
│                                                             │
│  ┌─────────────┐         ┌──────────────┐                  │
│  │   Caddy     │────────▶│     API      │                  │
│  │  (Proxy)    │         │  (Node.js)   │                  │
│  └─────────────┘         └──────────────┘                  │
│         │                  ┌──────────────┐                  │
│         └─────────────────▶│    Socket    │                  │
│                            │   Server     │                  │
│                            └──────────────┘                  │
│                                     │                        │
│                            ┌──────────────┐                  │
│                            │  PgBouncer   │                  │
│                            └──────────────┘                  │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│              estacaoterapia_backend                         │
│  (Internal - Criada automaticamente pelo stack)            │
│                                                             │
│  ┌─────────────┐         ┌──────────────┐                  │
│  │  Postgres   │         │    Redis     │                  │
│  └─────────────┘         └──────────────┘                  │
│         │                        │                          │
│         └──────────┬─────────────┘                          │
│                    │                                        │
│            ┌──────────────┐                                 │
│            │  PgBouncer   │                                 │
│            └──────────────┘                                 │
│                    │                                        │
│         ┌──────────┴──────────┐                            │
│         │                     │                            │
│  ┌──────────────┐     ┌──────────────┐                     │
│  │     API      │     │    Socket    │                     │
│  └──────────────┘     └──────────────┘                     │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔍 Verificação e Diagnóstico

### Verificar Status das Redes

```bash
# Ver todas as redes overlay
docker network ls --filter driver=overlay

# Ver detalhes completos de uma rede
docker network inspect estacao-backend-network --format '{{json .}}' | jq

# Ver quais serviços estão conectados
docker network inspect estacao-backend-network --format '{{range .Containers}}{{.Name}} {{end}}'
```

### Verificar Conectividade entre Serviços

```bash
# Testar conectividade do Caddy para API
docker exec $(docker ps -q -f name=caddy) ping -c 3 estacaoterapia_api

# Testar conectividade do Caddy para Frontend
docker exec $(docker ps -q -f name=caddy) ping -c 3 estacao_estacao_next_prd

# Testar conectividade da API para Redis
docker exec $(docker ps -q -f name=estacaoterapia_api) ping -c 3 redis
```

### Verificar Redes de um Serviço Específico

```bash
# Ver redes do serviço API
docker service inspect estacaoterapia_api --format '{{json .Spec.TaskTemplate.Networks}}' | jq

# Ver redes do serviço Caddy
docker service inspect estacao-caddy_caddy --format '{{json .Spec.TaskTemplate.Networks}}' | jq
```

---

## 🛠️ Script de Setup Completo

Crie um script `setup-networks.sh`:

```bash
#!/bin/bash
set -e

echo "🌐 Criando redes Docker Swarm..."

# Verificar se está em modo Swarm
if ! docker info | grep -q "Swarm: active"; then
    echo "❌ Docker Swarm não está ativo. Execute: docker swarm init"
    exit 1
fi

# Criar estacao-backend-network
if docker network ls | grep -q "estacao-backend-network"; then
    echo "ℹ️  Rede estacao-backend-network já existe"
else
    echo "📦 Criando rede estacao-backend-network..."
    docker network create \
        --driver overlay \
        --attachable \
        estacao-backend-network
    echo "✅ Rede estacao-backend-network criada"
fi

# Criar estacao-network
if docker network ls | grep -q "estacao-network"; then
    echo "ℹ️  Rede estacao-network já existe"
else
    echo "📦 Criando rede estacao-network..."
    docker network create \
        --driver overlay \
        --attachable \
        estacao-network
    echo "✅ Rede estacao-network criada"
fi

echo ""
echo "✅ Setup de redes concluído!"
echo ""
echo "Redes criadas:"
docker network ls --filter driver=overlay | grep -E "estacao|estacaoterapia"
```

Tornar executável:
```bash
chmod +x setup-networks.sh
```

---

## 📝 Checklist de Redes

Use este checklist ao fazer deploy:

- [ ] Docker Swarm inicializado
- [ ] Rede `estacao-backend-network` criada
- [ ] Rede `estacao-network` criada
- [ ] Stack da API deployado (cria `estacaoterapia_backend` automaticamente)
- [ ] Stack do Frontend deployado
- [ ] Stack do Caddy deployado
- [ ] Verificar conectividade entre serviços
- [ ] Verificar logs dos serviços

---

## ⚠️ Problemas Comuns

### Erro: "network estacao-backend-network not found"
**Solução**: Criar a rede manualmente antes de fazer deploy:
```bash
docker network create --driver overlay --attachable estacao-backend-network
```

### Erro: "network estacao-network not found"
**Solução**: Criar a rede manualmente antes de fazer deploy:
```bash
docker network create --driver overlay --attachable estacao-network
```

### Rede não pode ser removida (ainda em uso)
**Solução**: Verificar e parar todos os serviços que usam a rede:
```bash
# Ver serviços usando a rede
docker network inspect <nome-rede> | grep -A 10 "Containers"

# Parar serviços
docker stack rm <nome-stack>
```

### Conectividade entre serviços falhando
**Solução**: Verificar se os serviços estão na mesma rede:
```bash
# Ver redes de cada serviço
docker service inspect <nome-servico> --format '{{json .Spec.TaskTemplate.Networks}}' | jq
```

---

## 📚 Referências

- [Docker Swarm Networking](https://docs.docker.com/engine/swarm/networking/)
- [Docker Overlay Networks](https://docs.docker.com/network/overlay/)
- Documentação do projeto: `api/docker-stack.yml`, `docker-stack.caddy.yml`, `estacao/docker-stack.yml`

---

**Última atualização**: 2024  
**Versão**: 1.0
