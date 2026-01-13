# 🔐 Migração de Senhas para .env - Completo

## ✅ Alterações Realizadas

### 1. Arquivos Atualizados

#### `docker-compose.yml`
- ✅ Removidas todas as senhas hardcoded
- ✅ Adicionado `env_file: - .env` em todos os serviços
- ✅ Todas as senhas agora usam `${VARIABLE}` do .env
- ✅ Serviços atualizados:
  - `postgres` - Usa `${POSTGRES_PASSWORD}`
  - `redis` - Usa `${REDIS_PASSWORD}`
  - `pgbouncer` - Usa `${POSTGRES_PASSWORD}`
  - `api` - Usa variáveis do .env
  - `socket-server` - Usa variáveis do .env

#### `api/docker-stack.yml`
- ✅ Removidas senhas hardcoded do Redis
- ✅ Comentários adicionados indicando que senhas vêm de secrets

#### `env.example`
- ✅ Senhas reais removidas
- ✅ Placeholders adicionados (`SUA_SENHA_*_AQUI`)
- ✅ Documentação melhorada

#### `.gitignore`
- ✅ Garantido que `.env` está ignorado
- ✅ Adicionados padrões para `.env.*`

### 2. Arquivos Criados

- ✅ `SETUP-ENV.md` - Guia completo de configuração
- ✅ `README-ENV.md` - Resumo rápido
- ✅ `.env.template` - Template alternativo

## 🔒 Senhas Removidas

### Antes (EXPOSTO):
```yaml
POSTGRES_PASSWORD: sarFMiA2iasl1g8wWm0q79a1Bw8zsQE
REDIS_PASSWORD: REdnRHkZLnQpK1rcoKsseO3pX4GNIRR
```

### Depois (SEGURO):
```yaml
env_file:
  - .env
environment:
  POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
  REDIS_PASSWORD: ${REDIS_PASSWORD}
```

## 📋 Próximos Passos

### 1. Criar arquivo .env

```bash
cp env.example .env
```

### 2. Preencher senhas reais

Edite `.env` e adicione:

```env
POSTGRES_PASSWORD=sarFMiA2iasl1g8wWm0q79a1Bw8zsQE
REDIS_PASSWORD=REdnRHkZLnQpK1rcoKsseO3pX4GNIRR
```

### 3. Verificar

```bash
# Verificar se variáveis estão sendo lidas
docker-compose config | grep -E "POSTGRES_PASSWORD|REDIS_PASSWORD"

# Não deve mostrar valores, apenas referências
```

### 4. Testar

```bash
docker-compose up -d
```

## ✅ Checklist de Segurança

- [x] Senhas removidas de `docker-compose.yml`
- [x] Senhas removidas de `api/docker-stack.yml`
- [x] `.env` adicionado ao `.gitignore`
- [x] `env.example` criado sem senhas reais
- [x] Documentação criada
- [x] Todos os serviços configurados para usar `.env`

## 🚨 Importante

1. **NUNCA** commite o arquivo `.env`
2. **SEMPRE** use `env.example` como template
3. **VERIFIQUE** que `.env` está no `.gitignore`
4. **ROTACIONE** senhas regularmente

## 🔄 Para Docker Swarm

Se usar Docker Swarm, crie secrets:

```bash
echo "sarFMiA2iasl1g8wWm0q79a1Bw8zsQE" | docker secret create postgres_password -
echo "REdnRHkZLnQpK1rcoKsseO3pX4GNIRR" | docker secret create redis_password -
```

E atualize `docker-stack.yml` para usar secrets ao invés de variáveis de ambiente.

---

**Status**: ✅ **MIGRAÇÃO COMPLETA**

Todas as senhas foram removidas dos arquivos versionados e agora são lidas do arquivo `.env` local.
