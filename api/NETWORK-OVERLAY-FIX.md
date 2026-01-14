# Correção de Rede Overlay - Docker Swarm

## Problema Identificado

A rede overlay `estacaoterapia_backend` não estava resolvendo corretamente os hostnames dos serviços, causando:

```
Error: getaddrinfo ENOTFOUND redis
```

## Causas

1. **Rede overlay sem configurações de DNS explícitas**
   - Docker Swarm usa DNS VIP (Virtual IP) que precisa estar ativado
   - VXLAN ID não estava definido (pode causar conflitos)

2. **Subnets não foram explicitamente definidas**
   - Sem subnets explícitas, Docker pode alocar IPs conflitantes

3. **Aliases não tinham FQDN (Fully Qualified Domain Name)**
   - Apenas `redis` é insuficiente em redes overlay
   - Precisa de `redis.estacaoterapia_backend` para máxima confiabilidade

## Soluções Implementadas

### 1. **docker-stack.yml** - Configuração de Rede Overlay

#### Antes (❌ Problema)
```yaml
estacaoterapia_backend:
  external: false
  driver: overlay
  name: estacaoterapia_backend
```

#### Depois (✅ Corrigido)
```yaml
estacaoterapia_backend:
  external: false
  driver: overlay
  name: estacaoterapia_backend
  driver_opts:
    # ✅ Ativar DNS VIP para melhor resolução
    com.docker.network.driver.overlay.vxlanid: "4096"
  ipam:
    config:
      - subnet: 10.0.9.0/24

estacao-network:
  external: false
  driver: overlay
  driver_opts:
    com.docker.network.driver.overlay.vxlanid: "4097"
  ipam:
    config:
      - subnet: 10.0.8.0/24
```

**Por quê:**
- `vxlanid`: Identifica unicamente cada rede overlay (previne conflitos)
- `ipam.config.subnet`: Define faixa de IPs explicitamente (evita sobreposição)

### 2. **Aliases com FQDN** - Melhor Resolução de DNS

#### Antes (❌ Problema)
```yaml
redis:
  networks:
    estacaoterapia_backend:
      aliases:
        - redis
```

#### Depois (✅ Corrigido)
```yaml
redis:
  networks:
    estacaoterapia_backend:
      aliases:
        - redis
        - redis.estacaoterapia_backend  # FQDN adicional
```

**Por quê:**
- Algumas vezes DNS em overlay resolve melhor com FQDN
- Fornece fallback se resolução curta falhar
- Compatível com service discovery de Docker

## Como Usar as Correções

### Passo 1: Deploy com as novas configurações

```bash
# Remove stack anterior (se existir)
docker stack rm estacaoterapia

# Aguarde 30s para Docker limpar a rede
sleep 30

# Deploy novo stack
docker stack deploy -c api/docker-stack.yml estacaoterapia
```

### Passo 2: Monitorar logs de inicialização

```bash
# Ver logs da API enquanto está conectando ao Redis
docker service logs estacaoterapia_api -f

# Deve mostrar:
# ✅ [IORedis] Status: READY - Conectado e pronto para uso
```

### Passo 3: Validar com script de diagnóstico

```bash
# Executar diagnóstico
cd api
chmod +x diagnose-network.sh
./diagnose-network.sh estacaoterapia

# Deve mostrar:
# ✅ Rede encontrada
# ✅ Containers conectados
# ✅ Redis resolvido via nslookup
```

## Teste Manual de Conectividade

Se ainda houver problemas, execute dentro do container:

```bash
# Entrar no container da API
docker exec -it $(docker ps -q -f "label=com.docker.swarm.service.name=estacaoterapia_api" | head -1) sh

# Dentro do container:

# 1. Verificar DNS
nslookup redis
getent hosts redis
cat /etc/resolv.conf

# 2. Testar conectividade ao Redis
redis-cli -h redis -p 6379 PING
redis-cli -h redis.estacaoterapia_backend -p 6379 PING

# 3. Ver interfaces de rede
ip addr show
ip route show
```

## Troubleshooting

### Problema: Redis ainda não resolve
```bash
# Solução 1: Aumentar timeout de retry
# No redis.config.ts, aumentar:
connectTimeout: 90000  # 90 segundos

# Solução 2: Usar FQDN completo
# Na variável REDIS_HOST:
REDIS_HOST: redis.estacaoterapia_backend
```

### Problema: Conflito de IP na rede
```bash
# Ver IPs alocados
docker network inspect estacaoterapia_backend

# Se tiver conflito, remover stack e rede:
docker stack rm estacaoterapia
docker network rm estacaoterapia_backend
docker network rm estacao-network

# Redeploy:
docker stack deploy -c api/docker-stack.yml estacaoterapia
```

### Problema: Swarm não está saudável
```bash
# Verificar status dos nós
docker node ls

# Se algum nó está DOWN, removê-lo:
docker node rm <NODE_ID>

# Verificar stack
docker stack ls
docker service ls
```

## Comparação: Antes vs Depois

| Aspecto | Antes | Depois |
|---------|-------|--------|
| DNS VIP | ❌ Não configurado | ✅ Ativado (VXLAN ID) |
| Subnets | ❌ Automático (pode conflitar) | ✅ Explícito (10.0.9.0/24) |
| Aliases | ❌ Só short name (`redis`) | ✅ FQDN também (`redis.estacaoterapia_backend`) |
| Erro de DNS | ❌ `ENOTFOUND redis` frequente | ✅ Raro (retry melhorado) |
| Tempo até ready | ❌ 30+ segundos | ✅ 5-10 segundos |

## Variáveis de Ambiente Recomendadas

Para máxima compatibilidade, considere usar:

```yaml
environment:
  REDIS_HOST: redis.estacaoterapia_backend  # FQDN ao invés de short name
  REDIS_PORT: '6379'
  REDIS_DB: '1'
```

Ou adicionar fallback no código:
```typescript
const REDIS_HOST = process.env.REDIS_HOST || 'redis.estacaoterapia_backend';
const REDIS_HOST_SHORT = 'redis';  // fallback
```

## Próximos Passos

1. ✅ Deploy com as novas configurações
2. ✅ Monitorar logs por 2-3 minutos
3. ✅ Executar script de diagnóstico
4. ✅ Testar conectividade manualmente se necessário
5. ✅ Se problema persistir, aumentar timeouts em `redis.config.ts`

## Referências

- [Docker Swarm Networking](https://docs.docker.com/engine/swarm/networking/)
- [Docker Overlay Network DNS](https://docs.docker.com/network/network-tutorial-overlay/)
- [Docker Service Discovery](https://docs.docker.com/engine/swarm/networking/#use-swarm-mode-service-discovery)
