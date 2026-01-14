# 🔐 Guia Rápido: Configuração de Secrets

## 📋 Pré-requisitos

- Docker Swarm inicializado (`docker swarm init`)
- Acesso ao manager node

## 🚀 Quick Start

### 1. Criar arquivos de configuração

```bash
cd api/secrets

# Copiar templates
cp postgres.env.example postgres.env
cp estacao_api.env.example estacao_api.env
cp estacao_socket.env.example estacao_socket.env
cp pgbouncer.ini.example pgbouncer.ini
cp userlist.txt.example userlist.txt
```

### 2. Editar com valores reais

Edite cada arquivo `.env` com as credenciais reais:

```bash
# Exemplo: nano postgres.env
POSTGRES_USER=estacaoterapia
POSTGRES_PASSWORD=sua-senha-forte-aqui
POSTGRES_DB=estacaoterapia
```

**Importante:** Use senhas fortes com no mínimo 16 caracteres!

### 3. Validar arquivos

```bash
cd ..  # Voltar para api/
chmod +x validate-secrets.sh
./validate-secrets.sh
```

O script verificará:

- ✅ Todos os arquivos necessários existem
- ✅ Todas as variáveis obrigatórias estão presentes
- ✅ Credenciais são consistentes entre arquivos
- ⚠️ Avisos sobre senhas fracas ou valores placeholder

### 4. Criar secrets no Docker Swarm

```bash
chmod +x create-secrets.sh
./create-secrets.sh
```

### 5. Verificar secrets criados

```bash
docker secret ls
```

Você deve ver:

```
ID              NAME                  CREATED
xxx...          postgres_env          X seconds ago
xxx...          estacao_api_env       X seconds ago
xxx...          estacao_socket_env    X seconds ago
xxx...          pgbouncer.ini         X seconds ago
xxx...          userlist.txt          X seconds ago
```

### 6. Deploy da stack

```bash
./deploy.sh
```

## 📁 Estrutura de Arquivos

```
api/
├── secrets/
│   ├── .gitignore                    # Protege arquivos reais
│   ├── README.md                     # Documentação detalhada
│   ├── postgres.env.example          # Template PostgreSQL
│   ├── estacao_api.env.example       # Template API
│   ├── estacao_socket.env.example    # Template Socket
│   ├── pgbouncer.ini.example         # Template PgBouncer
│   └── userlist.txt.example          # Template users PgBouncer
│
├── docs/
│   └── DOCKER-SECRETS.md             # Documentação completa
│
├── create-secrets.sh                 # Criar secrets no Swarm
├── validate-secrets.sh               # Validar arquivos
└── docker-stack.yml                  # Stack configurada
```

## 🔄 Atualizar Secrets

Para atualizar um secret existente:

```bash
# 1. Editar o arquivo local
nano secrets/estacao_api.env

# 2. Recriar o secret
./create-secrets.sh  # Ele pergunta se deseja recriar

# 3. OU manualmente:
docker secret rm estacao_api_env
docker secret create estacao_api_env secrets/estacao_api.env

# 4. Forçar atualização do serviço
docker service update --force estacaoterapia_api
```

## 🔍 Troubleshooting

### Secret não encontrado

```bash
# Listar secrets
docker secret ls

# Se não existir, criar
./create-secrets.sh
```

### Variável não disponível no container

```bash
# Verificar se secret está montado
docker exec $(docker ps -q -f name=estacaoterapia_api) ls -la /run/secrets/

# Ver logs do entrypoint
docker service logs estacaoterapia_api --tail 50

# Verificar variáveis exportadas
docker exec $(docker ps -q -f name=estacaoterapia_api) env | grep REDIS
```

### Senha do PgBouncer

Para gerar o hash MD5 para `userlist.txt`:

```bash
# Formato: echo -n "senha+usuario" | md5sum
echo -n "mypasswordestacaoterapia" | md5sum | awk '{print "md5"$1}'
```

No `userlist.txt`:

```
"estacaoterapia" "md5xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
```

## 📚 Documentação Completa

Para informações detalhadas, veja:

- [Docker Secrets - Documentação Completa](docs/DOCKER-SECRETS.md)
- [Secrets - README](secrets/README.md)

## ⚠️ Segurança

**NUNCA:**

- ❌ Faça commit de arquivos `.env` sem `.example`
- ❌ Exponha secrets em variáveis de environment no docker-stack.yml
- ❌ Use senhas fracas em produção
- ❌ Compartilhe secrets por canais não seguros

**SEMPRE:**

- ✅ Use Docker Swarm Secrets para dados sensíveis
- ✅ Rotacione credenciais periodicamente (a cada 90 dias)
- ✅ Use senhas de no mínimo 16 caracteres
- ✅ Mantenha backups seguros dos arquivos de secrets

## 🆘 Suporte

Se encontrar problemas:

1. Execute o validador: `./validate-secrets.sh`
2. Verifique os logs: `docker service logs estacaoterapia_api`
3. Consulte a documentação: `docs/DOCKER-SECRETS.md`
