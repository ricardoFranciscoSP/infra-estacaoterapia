# 📦 Sistema de Versionamento de Imagens

## Como Funciona

### 1️⃣ Build com Versão Automática

```bash
cd api
bash deploy.sh
```

**O que acontece:**

```
📦 Tag: prd-20260115143022-a1b2c3d
   └─ Timestamp: 20260115143022
   └─ Git Hash: a1b2c3d
```

Cria imagens:

- `estacaoterapia-redis:prd-20260115143022-a1b2c3d`
- `estacaoterapia-api:prd-20260115143022-a1b2c3d`
- `estacaoterapia-socket:prd-20260115143022-a1b2c3d`
- `estacaoterapia-pgbouncer:prd-20260115143022-a1b2c3d`

Também cria:

- `estacaoterapia-redis:latest` (aponta para a nova versão)
- `estacaoterapia-api:latest`
- etc...

### 2️⃣ Limpeza Automática

O deploy automaticamente:
✅ Remove versões antigas (mantém as 3 mais recentes)
✅ Remove imagens órfãs
✅ Mostra todas as versões disponíveis

### 3️⃣ Histórico de Versões

```bash
# Ver todas as versões disponíveis
bash manage-versions.sh list

# Resultado:
▶ estacaoterapia-redis
  - prd-20260115143022-a1b2c3d ✅ [EM USO]
  - prd-20260115130000-x9y8z7w
  - prd-20260115090000-q1w2e3r

▶ estacaoterapia-api
  - prd-20260115143022-a1b2c3d ✅ [EM USO]
  - prd-20260115130000-x9y8z7w
  - prd-20260115090000-q1w2e3r
```

## Comando: manage-versions.sh

Script para gerenciar versões. Use assim:

```bash
cd api
bash manage-versions.sh <ação>
```

### ações Disponíveis

#### 📋 list - Ver todas as versões

```bash
bash manage-versions.sh list
```

Mostra:

- Todas as versões (prd-\*)
- Qual está em uso (✅ [EM USO])
- Data de criação (timestamp)

#### ↩️ rollback - Voltar para versão anterior

```bash
bash manage-versions.sh rollback 20260115130000-x9y8z7w
```

Isso:

1. Volta os 4 serviços para essa versão
2. Executa rolling update (sem downtime)
3. Mostra progresso

**Exemplo real:**

```bash
# Versão atual tem problema
# Ver versões anteriores
$ bash manage-versions.sh list

# Voltar para versão anterior
$ bash manage-versions.sh rollback 20260115130000-x9y8z7w

↩️  ROLLBACK PARA TAG: prd-20260115130000-x9y8z7w

   🔄 estacaoterapia_redis <- estacaoterapia-redis:prd-20260115130000-x9y8z7w
   🔄 estacaoterapia_api <- estacaoterapia-api:prd-20260115130000-x9y8z7w
   🔄 estacaoterapia_socket <- estacaoterapia-socket:prd-20260115130000-x9y8z7w
   🔄 estacaoterapia_pgbouncer <- estacaoterapia-pgbouncer:prd-20260115130000-x9y8z7w

✅ Rollback iniciado!
```

#### 🧹 cleanup - Remover versões antigas

```bash
# Manter últimas 3 versões (padrão)
bash manage-versions.sh cleanup

# Ou manter 5 versões
bash manage-versions.sh cleanup 5
```

#### 🏷️ tag-latest - Marcar versão como latest

```bash
bash manage-versions.sh tag-latest 20260115143022-a1b2c3d
```

Isso permite usar `estacaoterapia-api:latest` em referências

#### 📊 stats - Estatísticas

```bash
bash manage-versions.sh stats
```

Mostra:

- Total de imagens
- Espaço em disco
- Imagens órfãs (dangling)

## Fluxo de Deploy Completo

```
1. Código é modificado
   ↓
2. bash deploy.sh
   ├─ Build novas imagens com tag prd-TIMESTAMP-HASH
   ├─ Tag também como :latest
   ├─ Deploy para Docker Swarm
   ├─ Aguarda healthchecks
   └─ Remove automaticamente versões antigas (mantém 3)
   ↓
3. Deploy bem-sucedido
   ├─ Versão ativa: prd-20260115143022-a1b2c3d
   ├─ Histórico: últimas 3 versões disponíveis para rollback
   └─ Espaço em disco otimizado
```

## Variáveis de Ambiente

### KEEP_VERSIONS

Define quantas versões manter (padrão: 3)

```bash
# Manter apenas 2 versões
KEEP_VERSIONS=2 bash deploy.sh

# Manter 5 versões
KEEP_VERSIONS=5 bash deploy.sh
```

### FORCE_BUILD

Força rebuild sem cache

```bash
FORCE_BUILD=true bash deploy.sh
```

### CLEAN_DEPLOY

Remove stack completamente antes do novo deploy

```bash
CLEAN_DEPLOY=true bash deploy.sh
```

## Exemplos Práticos

### Scenario 1: Deploy Normal

```bash
cd api
bash deploy.sh

# Resultado:
# ✅ Novas imagens criadas
# ✅ Deploy realizado
# ✅ Versões antigas removidas automaticamente
```

### Scenario 2: Deploy com Cache Limpo

```bash
cd api
FORCE_BUILD=true bash deploy.sh

# Força recompilação de todas as imagens
```

### Scenario 3: Rollback para Versão Anterior

```bash
# Ver histórico
bash manage-versions.sh list

# Versão anterior tinha problema?
# Voltar:
bash manage-versions.sh rollback 20260115130000-x9y8z7w

# Serviços agora rodando com versão anterior
# Zero downtime!
```

### Scenario 4: Manter Mais Versões

```bash
# Manter últimas 10 versões para facilitar debug
KEEP_VERSIONS=10 bash deploy.sh
```

## Boas Práticas

### ✅ Faça

- Fazer deploy regularmente com o novo sistema
- Usar `manage-versions.sh list` para auditar versões
- Fazer rollback se algo der errado
- Limpar versões antigas periodicamente

### ❌ Evite

- Buildar imagens manualmente sem versão
- Esquecer de limpar versões antigas (usa espaço)
- Usar tag `latest` em produção sem saber qual commit é

## Debug

### Ver qual imagem está rodando

```bash
docker service ls --format "table {{.Name}}\t{{.Image}}"
```

### Ver histórico de atualizações

```bash
docker service ps estacaoterapia_api
```

### Buscar versão específica

```bash
docker images | grep estacaoterapia-api:prd-202601
```

## Troubleshooting

**P: Não encontro uma versão antiga?**

- Talvez tenha sido removida pela limpeza automática
- Versão foi deletada: `docker rmi -f estacaoterapia-api:prd-TAG`
- Solução: Fazer novo deploy do código dessa época

**P: Imagens estão grandes demais?**

```bash
bash manage-versions.sh cleanup 2  # Manter apenas 2 versões
```

**P: Quero reverter sem fazer deploy novo?**

```bash
bash manage-versions.sh rollback TAG_ANTERIOR
```

---

📅 **Data**: 15 de janeiro de 2026  
🔧 **Versão**: 2.0 - Sistema de Versionamento Completo
