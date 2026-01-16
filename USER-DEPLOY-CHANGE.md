# 👤 Mudança: Usar Usuário Deploy

## Problema Anterior
O script usava `user: 1001:1001` que causava erros de permissão:
```
chmod: /tmp: Operation not permitted
chmod: /run: Operation not permitted
```

## Solução
Agora usa o usuário `deploy` que já existe na VPS e tem as permissões corretas.

## Arquivos Modificados

### 1. `docker-stack.yml`
```yaml
# ANTES
api:
  user: '1001:1001'

socket-server:
  user: '1001:1001'

# DEPOIS
api:
  user: 'deploy'

socket-server:
  user: 'deploy'
```

### 2. `Dockerfile.api`
- Mudou de `adduser -u 1001 -S app` para `adduser -u 1000 -S deploy`
- Todas as permissões de arquivo mudam de `1001:1001` para `deploy:deploy`
- USER muda de `app` para `deploy`

### 3. `Dockerfile.socket`
- Mesmas mudanças do Dockerfile.api
- Compatível com a VPS existente

## Benefícios
✅ Sem erros de permissão  
✅ Compatível com VPS  
✅ Usuário já existe no grupo correto  
✅ Sem necessidade de chmod em /tmp e /run

## Como Usar
```bash
cd api
bash deploy.sh
```

Deploy normal agora vai funcionar com o usuário `deploy`!

---
📅 15 de janeiro de 2026
