# 🔧 Correção para Deploy - Ajuste de Permissões

## ⚠️ Problema
```
./deploy-all.sh: line 212: ./deploy.sh: Permission denied
```

## ✅ Solução

O script `deploy-all.sh` precisa garantir permissões de execução **antes** de tentar executar os scripts de deploy, mesmo após entrar no diretório.

### ✅ Correção Simples (Comando Único - Aplicar na VPS)

Execute este comando único **na VPS** para corrigir o script:

```bash
cd /opt/projetos/infra-estacaoterapia && cp deploy-all.sh deploy-all.sh.backup && sed -i 's|log_info "Iniciando deploy da API\.\.\."|chmod +x ./deploy.sh 2>/dev/null || true\n    &|' deploy-all.sh && sed -i 's|log_info "Iniciando deploy do Frontend\.\.\."|chmod +x ./deploy-stack.sh 2>/dev/null || true\n    &|' deploy-all.sh && echo "✅ Correção aplicada!" && bash -n deploy-all.sh && echo "✅ Script validado!"
```

### Correção Manual (Passo a Passo - Alternativa)

Se preferir executar passo a passo:

```bash
cd /opt/projetos/infra-estacaoterapia

# Criar backup
cp deploy-all.sh deploy-all.sh.backup

# Adicionar chmod antes de executar deploy.sh na função deploy_api()
sed -i 's|log_info "Iniciando deploy da API\.\.\."|chmod +x ./deploy.sh 2>/dev/null || true\n    &|' deploy-all.sh

# Adicionar chmod antes de executar deploy-stack.sh na função deploy_frontend()
sed -i 's|log_info "Iniciando deploy do Frontend\.\.\."|chmod +x ./deploy-stack.sh 2>/dev/null || true\n    &|' deploy-all.sh

# Testar o script
bash -n deploy-all.sh
```

### Correção usando patch

Ou aplique este patch diretamente:

```bash
cd /opt/projetos/infra-estacaoterapia

# Aplicar correção
sed -i.bak '
/deploy_api()/,/^}/ {
    /cd "$API_DIR"/ {
        n
        n
        n
        /log_info "Iniciando deploy da API\.\.\."/ a\
    chmod +x ./deploy.sh 2>/dev/null || true
    }
}
/deploy_frontend()/,/^}/ {
    /cd "$FRONTEND_DIR"/ {
        n
        n
        n
        /log_info "Iniciando deploy do Frontend\.\.\."/ a\
    chmod +x ./deploy-stack.sh 2>/dev/null || true
    }
}
' deploy-all.sh
```

### Verificar a correção

Após aplicar a correção, verifique se as funções estão corretas:

```bash
# Ver função deploy_api()
sed -n '/deploy_api()/,/^}/p' deploy-all.sh | grep -A 5 "cd \"\$API_DIR\""

# Deve mostrar algo como:
# cd "$API_DIR"
#
# log_info "Iniciando deploy da API..."
# chmod +x ./deploy.sh 2>/dev/null || true
# if ./deploy.sh 2>&1 | tee -a "../$LOG_FILE"; then

# Ver função deploy_frontend()
sed -n '/deploy_frontend()/,/^}/p' deploy-all.sh | grep -A 5 "cd \"\$FRONTEND_DIR\""

# Deve mostrar algo como:
# cd "$FRONTEND_DIR"
#
# log_info "Iniciando deploy do Frontend..."
# chmod +x ./deploy-stack.sh 2>/dev/null || true
# if ./deploy-stack.sh 2>&1 | tee -a "../$LOG_FILE"; then
```

### Executar o deploy

Após aplicar a correção:

```bash
chmod +x deploy-all.sh
./deploy-all.sh
```

## 📝 O que foi corrigido

1. **Função `deploy_api()`**: Adicionado `chmod +x ./deploy.sh` logo antes de executar `./deploy.sh`
2. **Função `deploy_frontend()`**: Adicionado `chmod +x ./deploy-stack.sh` logo antes de executar `./deploy-stack.sh`

Isso garante que as permissões sejam aplicadas **no momento da execução**, mesmo que tenham sido perdidas após o `git pull` ou outras operações.
