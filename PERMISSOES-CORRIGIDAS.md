# 🔧 Correção de Permissões - Scripts de Deploy

## ✅ Problema Resolvido

O erro `Permission denied` ao executar `./deploy.sh` foi corrigido.

## 📋 O que foi feito

### 1. Permissões Corrigidas nos Scripts

Foram adicionadas permissões de execução (`chmod +x`) para todos os scripts necessários:

#### Scripts da Raiz
- ✅ `deploy-all.sh` - Script principal de deploy completo
- ✅ `prepare-deploy.sh` - Preparação para deploy
- ✅ `debug-deploy.sh` - Debug do deploy
- ✅ `start.sh` - Inicialização do sistema

#### Scripts da API
- ✅ `api/deploy.sh` - Deploy da API
- ✅ `api/cleanup-old-replicas.sh` - Limpeza de réplicas antigas
- ✅ `api/entrypoint.sh` - Entrypoint do container

#### Scripts do Frontend
- ✅ `estacao/deploy-stack.sh` - Deploy do frontend (stack)
- ✅ `estacao/deploy.sh` - Deploy alternativo do frontend
- ✅ `estacao/diagnose-service.sh` - Diagnóstico de serviços
- ✅ `estacao/diagnose-traefik.sh` - Diagnóstico do Traefik
- ✅ `estacao/get-latest-tag.sh` - Obtém última tag
- ✅ `estacao/validate-deployment.sh` - Validação do deploy

### 2. Script Auxiliar Criado

Foi criado o script `fix-permissions.sh` que corrige automaticamente todas as permissões necessárias.

## 🚀 Como Usar

### Opção 1: Usar o script de correção de permissões

```bash
./fix-permissions.sh
```

### Opção 2: Deploy completo

Agora você pode executar o deploy completo sem problemas:

```bash
./deploy-all.sh
```

## 🔍 Verificação

Para verificar se as permissões estão corretas:

```bash
ls -la deploy-all.sh api/deploy.sh estacao/deploy-stack.sh
```

Todos devem mostrar `-rwxr-xr-x` no início da linha, indicando permissões de execução.

## 📝 Notas

- O script `fix-permissions.sh` pode ser executado sempre que houver dúvidas sobre as permissões
- Após um `git pull`, as permissões podem ser perdidas dependendo da configuração do Git
- Se encontrar problemas de permissão no futuro, execute `./fix-permissions.sh` novamente

## ✨ Próximos Passos

Agora você pode executar o deploy completo com confiança:

```bash
./deploy-all.sh
```

O sistema irá:
1. ✅ Verificar pré-requisitos
2. ✅ Atualizar código do repositório
3. ✅ Criar backup das configurações
4. ✅ Deploy do Backend (API + Socket)
5. ✅ Deploy do Frontend (Next.js)
6. ✅ Verificar saúde dos serviços
7. ✅ Gerar relatório de deploy
