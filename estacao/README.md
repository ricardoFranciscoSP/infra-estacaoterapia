# Frontend - Estação Terapia

Frontend Next.js com TypeScript, Tailwind CSS e componentes modernos.

## 🏗️ Estrutura

```
estacao/
├── src/
│   ├── app/              # App Router (Next.js 13+)
│   ├── components/       # Componentes React
│   ├── hooks/            # Custom hooks
│   ├── lib/              # Bibliotecas e utilitários
│   ├── services/         # Serviços de API
│   ├── store/            # Estado global (Zustand)
│   └── types/            # TypeScript types
├── public/               # Assets estáticos
├── Dockerfile            # Build do Frontend
└── docker-stack.yml      # Configuração Docker Swarm
```

## 🚀 Desenvolvimento

```bash
# Instalar dependências
npm install

# Desenvolvimento
npm run dev

# Build
npm run build

# Produção
npm start
```

## 🔧 Variáveis de Ambiente

Principais variáveis `NEXT_PUBLIC_*`:
- `NEXT_PUBLIC_API_URL` - URL da API
- `NEXT_PUBLIC_SOCKET_URL` - URL do WebSocket
- `NEXT_PUBLIC_WEBSITE_URL` - URL do site
- `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` - Site key do reCAPTCHA

## 🐳 Docker

### Build

```bash
docker build -t estacaoterapia-frontend:latest .
```

### Docker Compose

Use o `docker-compose.yml` na raiz do projeto.

### Docker Swarm

```bash
docker stack deploy -c docker-stack.yml estacao-frontend
```

## 📚 Tecnologias

- Next.js 14+
- TypeScript
- Tailwind CSS
- Zustand (State Management)
- React Query (Data Fetching)
