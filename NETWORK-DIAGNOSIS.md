# 🔍 Diagnóstico de Rede Overlay Docker Swarm

## Visão Geral

O script de diagnóstico `diagnose-network-overlay.sh` foi criado para verificar automaticamente a saúde da rede overlay Docker Swarm durante o deploy. Ele agora é **executado automaticamente** como parte do processo de deploy (`deploy-all.sh`).

## O que o Diagnóstico Faz

### 1. **Verificação de Docker Swarm** 
   - Confirma que Docker Swarm está ativo
   - Mostra informações do nó manager

### 2. **Verificação de Redes Overlay**
   - Valida existência da rede `estacaoterapia_backend`
   - Mostra configuração (driver, subnet, gateway)
   - Lista todas as redes disponíveis

### 3. **Verificação de Drivers de Rede**
   - Lista drivers e plugins de rede disponíveis
   - Confirma suporte a overlay nativo

### 4. **Conectividade Entre Serviços**
   - Testa DNS entre containers (resolução de `redis`)
   - Verifica conectividade TCP (redis:6379)
   - Valida interfaces de rede

### 5. **Health Checks dos Serviços**
   - Mostra status de todas as réplicas
   - Identifica serviços com problemas
   - Detalha erros de inicialização

### 6. **Coleta de Logs**
   - Logs do Docker daemon
   - Logs dos containers da API
   - Configuração de DNS dos containers

### 7. **Relatório Final**
   - Resumo de problemas encontrados
   - Erros críticos vs avisos
   - Localização do arquivo de log completo

## Fluxo de Execução no Deploy

```
deploy-all.sh
├─ check_prerequisites ✓
│  └─ Valida pré-requisitos básicos
│
├─ diagnose_network ← NOVO
│  ├─ Executa diagnose-network-overlay.sh
│  ├─ Verifica saúde da rede overlay
│  ├─ Testa conectividade entre serviços
│  ├─ Gera relatório detalhado
│  └─ Registra avisos/erros
│
├─ update_code
│  └─ Git pull
│
├─ create_backup
│  └─ Backup da configuração
│
├─ deploy_api
│  └─ Build e deploy da API
│
├─ deploy_frontend
│  └─ Deploy do frontend
│
├─ deploy_caddy
│  └─ Deploy do reverse proxy
│
└─ validate_deployment
   └─ Verifica saúde final
```

## Executando Manualmente

Se precisar rodar o diagnóstico fora do deploy:

```bash
# Na raiz do projeto
./diagnose-network-overlay.sh

# Ou especificamente da API
cd api
../diagnose-network-overlay.sh
```

## Interpretando o Resultado

### ✅ Sucesso (Tudo OK)
```
[INFO] Diagnóstico concluído em: 14/01/2026 10:30:45
[✓] Nenhum problema encontrado!
```

### ⚠️ Avisos (Não Bloqueia Deploy)
```
[⚠] Encontrados 2 aviso(s)
[⚠] Serviço 'socket-server' não encontrado
[⚠] Nenhum container rodando para 'socket-server'
```

### ✗ Erro Crítico (Deve Ser Corrigido)
```
[✗] Encontrados 1 problema(s) crítico(s)
[✗] NÃO conseguiu resolver hostname 'redis' do container da API
```

## Saída do Diagnóstico

Dois arquivos são gerados durante o deploy:

1. **`deploy-YYYYMMDD_HHMMSS.log`**
   - Log completo do deploy (inclui output do diagnóstico)
   - Salvo na raiz do projeto

2. **`network-diagnosis-YYYYMMDD_HHMMSS.log`**
   - Log detalhado apenas do diagnóstico de rede
   - Salvo na raiz do projeto
   - Contém informações completas para troubleshooting

## Problemas Comuns Detectados

### ENOTFOUND redis
**Causa**: DNS não consegue resolver hostname 'redis' no container da API

**Diagnóstico Detecta**: 
```
[✗] NÃO conseguiu resolver hostname 'redis' do container da API
    Verificando /etc/resolv.conf no container...
    nameserver 127.0.0.11
    nameserver 8.8.8.8
```

**Solução**:
1. Verificar se rede overlay está criada: `docker network ls | grep estacaoterapia_backend`
2. Verificar se Redis está na rede correta: `docker network inspect estacaoterapia_backend`
3. Reinicializar Docker daemon se necessário

### Serviços não estão em replicas esperadas
**Diagnóstico Detecta**:
```
[⚠] Serviços com possíveis problemas:
  - estacaoterapia_api (replicas: 0/1)
  - estacaoterapia_redis (replicas: 0/1)
```

**Solução**:
1. Verificar logs: `docker service ps <nome_serviço>`
2. Revisar erros de inicialização
3. Verificar resources (CPU/memória) disponível

### Conectividade recusada (ECONNREFUSED)
**Diagnóstico Detecta**:
```
[✗] NÃO conseguiu alcançar redis:6379 do container da API
    Conectividade de rede OK: redis:6379 está acessível ❌
```

**Solução**:
1. Verificar se serviço Redis está rodando
2. Verificar porta 6379 se não está bloqueada
3. Verificar firewall/iptables

## Configuração da Rede Overlay

O diagnóstico verifica se a rede está configurada corretamente no `docker-stack.yml`:

```yaml
networks:
  estacaoterapia_backend:
    external: false
    driver: overlay
    name: estacaoterapia_backend
    driver_opts:
      com.docker.network.driver.mtu: "1450"  # Importante para Docker Swarm
      com.docker.network.driver.overlay.vxlan_list: "4789"
```

**Pontos críticos**:
- ✓ `driver: overlay` (não bridge ou host)
- ✓ `external: false` (criada automaticamente)
- ✓ MTU configurado para 1450 (Docker Swarm padrão)
- ✓ Todos os serviços nas mesmas redes

## Próximas Execuções

O diagnóstico roda automaticamente **cada vez que você executa**:

```bash
./deploy-all.sh
```

Sempre que quiser fazer deploy, o diagnóstico será executado para garantir que a rede está saudável antes de iniciar os deployments dos serviços.

## Troubleshooting Avançado

Se o diagnóstico continuar mostrar problemas, coletar informações:

```bash
# Ver configuração completa da rede
docker network inspect estacaoterapia_backend

# Ver serviços conectados à rede
docker service ls

# Ver containers em cada serviço
docker service ps <nome_serviço>

# Verificar conectividade do container específico
docker exec <container_id> nslookup redis
docker exec <container_id> nc -zv redis 6379

# Ver configuração de DNS do container
docker exec <container_id> cat /etc/resolv.conf
```

## Desabilitando o Diagnóstico

Se por algum motivo precisar desabilitar o diagnóstico automático, comentar a linha no `deploy-all.sh`:

```bash
# Na função main(), comentar:
# diagnose_network
```

**Não recomendado** - o diagnóstico ajuda a identificar problemas antes que afetem o deploy.
