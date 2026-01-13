# 🔐 Configuração de Variáveis de Ambiente

## ⚠️ IMPORTANTE

**TODAS as senhas foram removidas dos arquivos docker-compose.yml e docker-stack.yml**

Agora todas as credenciais devem ser configuradas no arquivo `.env`.

## 📋 Configuração Rápida

### 1. Criar arquivo .env

```bash
# Copie o arquivo de exemplo
cp env.example .env
```

### 2. Editar .env com valores reais

Abra `.env` e preencha as senhas:

```env
POSTGRES_PASSWORD=sarFMiA2iasl1g8wWm0q79a1Bw8zsQE
REDIS_PASSWORD=REdnRHkZLnQpK1rcoKsseO3pX4GNIRR
```

### 3. Usar Docker Compose

```bash
# O docker-compose.yml lê automaticamente do .env
docker-compose up -d
```

## 🔒 Segurança

✅ **Arquivos atualizados:**
- `docker-compose.yml` - Usa variáveis do `.env`
- `api/docker-stack.yml` - Removidas senhas hardcoded
- `.gitignore` - `.env` está ignorado
- `env.example` - Template sem senhas reais

✅ **Nenhuma senha está mais exposta nos arquivos versionados!**

## 📝 Variáveis Necessárias

Veja `env.example` para lista completa de variáveis.

## 🚀 Próximos Passos

1. ✅ Criar arquivo `.env` a partir de `env.example`
2. ✅ Preencher senhas reais no `.env`
3. ✅ Testar com `docker-compose config` para verificar variáveis
4. ✅ Iniciar serviços com `docker-compose up -d`
