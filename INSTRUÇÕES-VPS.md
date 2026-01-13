# 🚀 Instruções para Corrigir Permissões na VPS

## ⚠️ Problema
```
./deploy-all.sh: line 212: ./deploy.sh: Permission denied
```

## ✅ Solução

Execute os seguintes comandos **na VPS**:

### 1. Atualizar o repositório
```bash
cd /opt/projetos/infra-estacaoterapia
git pull origin master
```

### 2. Dar permissão ao script de correção
```bash
chmod +x fix-permissions.sh
```

### 3. Executar o script de correção de permissões
```bash
./fix-permissions.sh
```

### 4. Executar o deploy
```bash
./deploy-all.sh
```

## 📋 Comandos em uma linha (copie e cole na VPS)

```bash
cd /opt/projetos/infra-estacaoterapia && git pull origin master && chmod +x fix-permissions.sh && ./fix-permissions.sh && ./deploy-all.sh
```

## 🔍 Verificação

Se quiser verificar as permissões antes de executar o deploy:

```bash
ls -la deploy-all.sh api/deploy.sh estacao/deploy-stack.sh
```

Todos devem mostrar `-rwxr-xr-x` no início.

## 📝 O que o script fix-permissions.sh faz?

- ✅ Corrige permissões de todos os scripts de deploy
- ✅ Verifica e exibe o status das permissões
- ✅ É seguro executar várias vezes

## 🆘 Se ainda der erro

Se ainda assim der erro de permissão, execute manualmente na VPS:

```bash
cd /opt/projetos/infra-estacaoterapia

# Scripts da raiz
chmod +x deploy-all.sh prepare-deploy.sh debug-deploy.sh start.sh

# Scripts da API
chmod +x api/deploy.sh api/cleanup-old-replicas.sh api/entrypoint.sh

# Scripts do Frontend
chmod +x estacao/deploy-stack.sh estacao/deploy.sh
chmod +x estacao/diagnose-service.sh estacao/diagnose-traefik.sh
chmod +x estacao/get-latest-tag.sh estacao/validate-deployment.sh

# Executar deploy
./deploy-all.sh
```
