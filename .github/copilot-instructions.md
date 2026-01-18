# Copilot Instructions for Estação Terapia Infrastructure

## Visão Geral da Arquitetura
- O sistema é composto por múltiplos serviços: Frontend (Next.js), API (Node.js/Express), WebSocket (Socket.IO), PostgreSQL, Redis e PgBouncer.
- O Caddy atua como reverse proxy, gerenciando SSL/TLS automaticamente.
- Comunicação entre serviços ocorre via rede Docker interna, com autenticação e segregação de portas.

## Fluxos e Convenções Essenciais
- **Backend**: Código-fonte em `api/src/`, banco de dados Prisma em `api/prisma/`.
- **Frontend**: Código em `estacao/src/`, assets em `estacao/public/`.
- **Deploy**: Scripts de automação e diagnóstico na raiz e em `api/` e `estacao/`.
- **Variáveis de ambiente**: Use sempre `.env` (baseie-se em `env.example`). Nunca versionar `.env`.
- **Secrets**: Em produção, use Docker secrets (veja exemplos em comandos de deploy Swarm).

## Workflows de Desenvolvimento
- Suba todos os serviços com `docker-compose up -d`.
- Logs: `docker-compose logs -f`.
- Acesse containers para debug: `docker-compose exec <serviço> sh`.
- Rebuild rápido: `docker-compose up -d --build`.
- Teste conexões internas usando `nc` dentro dos containers.
- Scripts de diagnóstico e correção estão em `api/` e na raiz (ex: `fix-encoding.sh`, `diagnose-redis.sh`).

## Padrões e Integrações
- **Prisma**: Configuração em `api/prisma.config.ts`.
- **Segurança**: SSL automático, rate limiting, headers seguros, CORS restritivo, validação de input (Zod), logs sem dados sensíveis.
- **Documentação**: Consulte sempre `README.md` (raiz), arquivos em `docs/` e scripts de exemplo.
- **Deploy em produção**: Prefira Docker Compose ou Swarm. Veja exemplos de comandos e stacks nos arquivos `docker-compose.*.yml` e `api/docker-stack.yml`.

## Exemplos de Comandos Úteis
- Subir stack: `docker-compose up -d`
- Parar stack: `docker-compose down`
- Verificar configuração: `docker-compose config`
- Acessar banco: `docker-compose exec postgres psql -U estacaoterapia -d estacaoterapia`
- Deploy Swarm: `docker stack deploy -c api/docker-stack.yml estacao-api`

## Dicas para Agentes AI
- Sempre consulte os scripts de automação antes de propor comandos manuais.
- Priorize padrões já existentes nos diretórios `api/` e `estacao/`.
- Documente decisões e fluxos não triviais em `docs/`.
- Para dúvidas sobre segurança, consulte `SECURITY-AUDIT.md`.

---
Essas instruções são específicas para este repositório. Atualize conforme mudanças na arquitetura ou workflows.
