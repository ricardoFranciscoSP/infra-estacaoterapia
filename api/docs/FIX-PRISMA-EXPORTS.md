# 🔧 Fix: Prisma Client - ES Module vs CommonJS Error

## 📋 Erro Identificado

```
ReferenceError: exports is not defined in ES module scope
    at file:///app/dist/generated/prisma/client.js:48:23
```

### Causa Raiz

O **Prisma Client estava sendo gerado com incompatibilidade de módulos**:
- TypeScript compilando para **CommonJS** (`module: "commonjs"`)
- Prisma gerando código que Node.js tenta executar como **ES Module**
- Falta de `allowSyntheticDefaultImports` no tsconfig

---

## ✅ Correções Aplicadas

### 1. **Schema do Prisma - Provider Correto**

❌ **ANTES:**
```prisma
generator client {
  provider        = "prisma-client"
  output          = "../src/generated/prisma"
  previewFeatures = ["driverAdapters"]
}
```

✅ **DEPOIS:**
```prisma
generator client {
  provider        = "prisma-client-js"
  output          = "../src/generated/prisma"
  previewFeatures = ["driverAdapters"]
  engineType      = "library"
}
```

**Mudanças:**
- `"prisma-client"` → `"prisma-client-js"` (provider oficial)
- Adicionado `engineType = "library"` para melhor compatibilidade

---

### 2. **TSConfig - Interoperabilidade**

✅ **Adicionado:**
```json
{
  "compilerOptions": {
    "allowSyntheticDefaultImports": true,
    // ... resto permanece igual
  }
}
```

**Por quê?**
- Permite importações default de módulos CommonJS
- Melhora compatibilidade entre ES e CommonJS
- Essencial para trabalhar com Prisma Client

---

### 3. **Package.json - Ordem de Build**

❌ **ANTES:**
```json
"build": "tsc && prisma generate && npm run copy-templates"
```

✅ **DEPOIS:**
```json
"build": "npm run prisma:generate && tsc && npm run copy-templates",
"prisma:generate": "prisma generate"
```

**Por quê?**
- Gera Prisma **ANTES** de compilar TypeScript
- TypeScript pode validar os tipos do Prisma durante compilação
- Ordem correta previne erros de tipos não encontrados

---

### 4. **Script de Rebuild**

Criado [`rebuild-prisma.sh`](../rebuild-prisma.sh):
```bash
#!/bin/bash
# Limpa completamente
rm -rf src/generated/prisma
rm -rf node_modules/.prisma
rm -rf node_modules/@prisma/client

# Regenera
npx prisma generate --schema=./prisma/schema.prisma

# Recompila
npm run build
```

**Uso:**
```bash
chmod +x rebuild-prisma.sh
./rebuild-prisma.sh
```

---

## 🚀 Passos para Aplicar o Fix

### No Container Docker

```bash
# 1. Entre no container da API
docker exec -it $(docker ps -q -f name=estacaoterapia_api) bash

# 2. Limpe cache do Prisma
rm -rf src/generated/prisma
rm -rf node_modules/.prisma

# 3. Regenere o Prisma Client
npm run prisma:generate

# 4. Recompile
npm run build

# 5. Saia do container
exit

# 6. Redeploye o serviço
docker service update --force estacaoterapia_api
```

### Ou Use o Script

```bash
# No host
docker exec -it $(docker ps -q -f name=estacaoterapia_api) bash -c "cd /app && ./rebuild-prisma.sh"

# Redeploy
docker service update --force estacaoterapia_api
```

---

## 🔍 Verificação

Após rebuild, verifique:

```bash
# Logs da API
docker service logs estacaoterapia_api --tail 50 -f
```

**Deve mostrar:**
```
✅ Redis acessível: estacaoterapia_redis:6379
✅ PgBouncer acessível: estacaoterapia_pgbouncer:6432
🚀 API rodando na porta 3333
```

**Sem erro de `exports is not defined`** ✅

---

## 📊 Comparação

| Aspecto | Antes | Depois |
|---------|-------|--------|
| **Provider** | `prisma-client` ❌ | `prisma-client-js` ✅ |
| **Engine Type** | Não definido ❌ | `library` ✅ |
| **Build Order** | tsc → prisma ❌ | prisma → tsc ✅ |
| **allowSyntheticDefaultImports** | ❌ | ✅ |

---

## 🔗 Arquivos Modificados

1. **[`prisma/schema.prisma`](../prisma/schema.prisma)**
   - Provider corrigido para `prisma-client-js`
   - Adicionado `engineType = "library"`

2. **[`package.json`](../package.json)**
   - Ordem de build corrigida
   - Script `prisma:generate` separado

3. **[`tsconfig.json`](../tsconfig.json)**
   - Adicionado `allowSyntheticDefaultImports: true`

4. **[`rebuild-prisma.sh`](../rebuild-prisma.sh)** (novo)
   - Script de rebuild completo

---

## 📚 Referências

- [Prisma Generators](https://www.prisma.io/docs/concepts/components/prisma-schema/generators)
- [TypeScript Module Interop](https://www.typescriptlang.org/tsconfig#allowSyntheticDefaultImports)
- [Node.js ES Modules vs CommonJS](https://nodejs.org/api/esm.html)

---

**Atualizado:** 16/01/2026  
**Status:** ✅ Pronto para Deploy
