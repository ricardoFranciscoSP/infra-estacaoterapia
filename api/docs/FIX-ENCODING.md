# Como Corrigir Caracteres Quebrados nos Arquivos .env

## Problema

Os arquivos `.env` na VPS estão exibindo caracteres quebrados como `^`^t` em vez de espaços ou acentuação.

## Causa

- Arquivo salvo com BOM (Byte Order Mark) UTF-8
- Encoding incorreto (Windows-1252, ISO-8859-1, etc.)
- Caracteres especiais não reconhecidos

---

## Solução 1: Script Automático

Execute o script de correção:

```bash
cd /home/deploy/infra-estacaoterapia/api
chmod +x fix-encoding.sh
./fix-encoding.sh
```

O script irá:

- Criar backup dos arquivos originais
- Remover BOM UTF-8 se presente
- Converter para UTF-8 puro
- Preservar os arquivos originais em `.backup`

---

## Solução 2: Correção Manual com VIM

```bash
# Editar arquivo
vim /opt/secrets/estacao_api.env

# Dentro do VIM, executar:
:set fileencoding=utf-8
:set nobomb
:wq
```

---

## Solução 3: Recriar Arquivo do Zero

```bash
# Backup do arquivo antigo
cp /opt/secrets/estacao_api.env /opt/secrets/estacao_api.env.old

# Criar novo arquivo limpo
cat > /opt/secrets/estacao_api.env << 'EOF'
#############################################
# ESTACAO TERAPIA API - PRODUCAO (PRD)
#############################################

# ======================
# Ambiente
# ======================
NODE_ENV=production
PORT=3333
API_BASE_URL=https://api.estacaoterapia.com

# ======================
# Banco de Dados
# ======================
DATABASE_URL=postgresql://estacaoterapia:SUA_SENHA@postgres:5432/estacaoterapia

# ======================
# Redis
# ======================
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_DB=1
REDIS_PASSWORD=SUA_SENHA_REDIS
REDIS_URL=redis://:SUA_SENHA_REDIS@redis:6379/1

EOF

# Definir permissões corretas
chmod 600 /opt/secrets/estacao_api.env
chown deploy:deploy /opt/secrets/estacao_api.env
```

---

## Solução 4: Usar iconv (Conversão de Encoding)

```bash
# Detectar encoding atual
file -i /opt/secrets/estacao_api.env

# Converter de ISO-8859-1 para UTF-8
iconv -f ISO-8859-1 -t UTF-8 /opt/secrets/estacao_api.env > /tmp/estacao_api.env.utf8
mv /tmp/estacao_api.env.utf8 /opt/secrets/estacao_api.env

# OU converter de Windows-1252 para UTF-8
iconv -f WINDOWS-1252 -t UTF-8 /opt/secrets/estacao_api.env > /tmp/estacao_api.env.utf8
mv /tmp/estacao_api.env.utf8 /opt/secrets/estacao_api.env
```

---

## Solução 5: Remover BOM UTF-8

```bash
# Verificar se tem BOM
xxd /opt/secrets/estacao_api.env | head -n 1

# Se mostrar "efbbbf" no início, remover BOM:
tail -c +4 /opt/secrets/estacao_api.env > /tmp/estacao_api.env.nobom
mv /tmp/estacao_api.env.nobom /opt/secrets/estacao_api.env
```

---

## Verificar Correção

```bash
# Ver primeiras linhas do arquivo
cat /opt/secrets/estacao_api.env | head -n 10

# Verificar encoding
file -i /opt/secrets/estacao_api.env
# Deve retornar: charset=utf-8

# Verificar se não tem BOM
xxd /opt/secrets/estacao_api.env | head -n 1
# Não deve começar com "efbbbf"
```

---

## Boas Práticas para Evitar o Problema

1. **Sempre use UTF-8 sem BOM** ao editar arquivos
2. **Use editores Linux** (vim, nano) diretamente na VPS
3. **Se editar no Windows**, use VSCode com:
   - `"files.encoding": "utf8"`
   - `"files.eol": "\n"`
4. **Evite copiar/colar** de Word ou Notepad
5. **Use Git** para versionar os arquivos de exemplo

---

## Após Correção

```bash
# Recriar secrets do Docker Swarm
docker secret rm estacao_api_env 2>/dev/null || true
docker secret create estacao_api_env /opt/secrets/estacao_api.env

# Fazer redeploy
cd /home/deploy/infra-estacaoterapia/api
./deploy.sh
```
