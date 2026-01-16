import express from "express";
import http from "http";
import { Server } from "socket.io";
import { config } from "dotenv";
import { onConnect } from "./events/onConnect";
import { emitEvent } from "./utils/emitEvent";
import { initRedisAdapter } from "./adapter";

config();

const app = express();
app.use(express.json());

const PORT = Number(process.env.PORT || 3001);
const REDIS_HOST = process.env.REDIS_HOST || "redis"; // Alias de rede do Swarm
const REDIS_PORT = Number(process.env.REDIS_PORT || 6379);
const REDIS_DB = Number(process.env.REDIS_DB || 1);

// Lista de origens permitidas - mesma configuração do servidor principal
const ALLOWED_ORIGINS = [
    "https://estacaoterapia.com.br",           // Produção
    "https://www.estacaoterapia.com.br",       // Produção www
    "https://ws.prd.estacaoterapia.com.br",    // URL da própria origem (self-referential para produção)
    "https://pre.estacaoterapia.com.br",       // Pré-produção
    "https://ws.estacaoterapia.com.br",        // WebSocket de pré-produção
    "http://localhost:3000",                   // Local 3000
    "http://localhost:3001",                   // Local 3001
    "http://localhost:3334",                   // Local Socket Server
    "https://estacao-chi.vercel.app"
];

// Adiciona origens do .env se existirem
if (process.env.CORS_ORIGIN) {
    const envOrigins = process.env.CORS_ORIGIN.split(",").map(o => o.trim());
    envOrigins.forEach(origin => {
        if (!ALLOWED_ORIGINS.includes(origin)) {
            ALLOWED_ORIGINS.push(origin);
        }
    });
}

console.log("🔹 Configurações do Socket Server:");
console.log(`   Porta: ${PORT}`);
console.log(`   Redis Host: ${REDIS_HOST}`);
console.log(`   Redis Port: ${REDIS_PORT}`);
console.log(`   Redis DB: ${REDIS_DB}`);
console.log(`   Origens permitidas: ${ALLOWED_ORIGINS.join(", ")}`);

const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: (origin, callback) => {
            console.log(`🔍 Tentativa de conexão de origem: ${origin || "sem origem"}`);

            // Normaliza origin removendo barra final se houver
            const normalizedOrigin = origin?.endsWith("/") ? origin.slice(0, -1) : origin;

            const NODE_ENV = process.env.NODE_ENV || "development";

            // Em produção, origin é obrigatório
            if (NODE_ENV === "production" && !origin) {
                console.log(`❌ Conexão bloqueada: origin ausente em produção`);
                callback(new Error("Origin é obrigatório em produção"));
                return;
            }

            // Permite sem origin apenas em desenvolvimento
            if (!origin && NODE_ENV !== "production") {
                console.log(`✅ Origem permitida (dev): local`);
                callback(null, true);
                return;
            }

            // Valida origin permitida
            if (origin && normalizedOrigin && ALLOWED_ORIGINS.includes(normalizedOrigin)) {
                console.log(`✅ Origem permitida: ${origin}`);
                callback(null, true);
            } else {
                console.log(`❌ Origem bloqueada: ${origin}`);
                console.log(`   Origens permitidas:`, ALLOWED_ORIGINS);
                callback(new Error("Origem não permitida pelo CORS"));
            }
        },
        credentials: true,
        methods: ["GET", "POST", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept", "Origin"],
        maxAge: 86400,
    },
    // Permite websocket e polling como fallback para melhor compatibilidade
    transports: ["websocket", "polling"],
    allowEIO3: true,
    pingTimeout: 60000,
    pingInterval: 25000,
    // Importante para ambientes com proxy/load balancer
    allowUpgrades: true,
    perMessageDeflate: false,
    httpCompression: false,
    // Para ambientes com proxy reverso
    path: "/socket.io",
});

// Garante que headers CORS estejam presentes em todas as respostas do Engine.IO (inclui polling)
io.engine.on("headers", (headers, req) => {
    const origin = (req.headers["origin"] as string) || undefined;
    // Normaliza origin para comparação
    const normalizedOrigin = origin?.endsWith("/") ? origin.slice(0, -1) : origin;
    const NODE_ENV = process.env.NODE_ENV || "development";

    // Em produção, origin é obrigatório
    if (NODE_ENV === "production" && !origin) {
        console.warn(`🛡️  [E.IO] Origin ausente em produção - não aplicando headers CORS`);
        return;
    }

    if (origin && normalizedOrigin && ALLOWED_ORIGINS.includes(normalizedOrigin)) {
        headers["Access-Control-Allow-Origin"] = origin;
        headers["Access-Control-Allow-Credentials"] = "true";
        headers["Vary"] = "Origin";
        headers["Access-Control-Allow-Methods"] = "GET,POST,OPTIONS";
        headers["Access-Control-Allow-Headers"] = "Content-Type,Authorization,X-Requested-With,Accept,Origin";
        console.log(`🛡️  [E.IO] CORS headers aplicados para: ${origin}`);
    } else {
        console.warn(`🛡️  [E.IO] Origin não permitida ao aplicar headers: ${origin}`);
    }
});

// Trata manualmente preflight em /socket.io/* (alguns proxies exigem)
app.options("/socket.io", (_req, res) => {
    res.setHeader("Access-Control-Max-Age", "86400");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization,X-Requested-With,Accept,Origin");
    res.sendStatus(204);
});

/**
 * Espera o Redis estar disponível antes de iniciar o Socket
 * Usa a conexão singleton existente com timeouts maiores para Docker Swarm
 */
async function waitForRedis(host: string, port: number, retries = 15, delay = 3000) {
    console.log("🔹 Verificando disponibilidade do Redis...");
    const { getIORedisClient, waitForIORedisReady } = await import("../config/redis.config");

    for (let i = 0; i < retries; i++) {
        try {
            // Obtém ou cria a conexão singleton
            let client = getIORedisClient();

            if (!client) {
                throw new Error("Redis client não está disponível.");
            }

            // Se não está pronto, aguarda a conexão estar pronta
            if (client.status !== 'ready') {
                console.log(`⏳ Aguardando conexão Redis estar pronta (status: ${client.status})...`);
                try {
                    // Timeout aumentado para 60s em Docker Swarm (DNS pode ser lento)
                    client = await waitForIORedisReady(60000);
                } catch (err) {
                    throw new Error(`Falha ao aguardar conexão Redis: ${(err as Error)?.message}`);
                }
            }

            // Testa com ping
            const pong = await client.ping();
            if (pong === 'PONG') {
                console.log("✅ Redis disponível e ping confirmado!");
                return client;
            }
            throw new Error(`Redis ping retornou: ${pong}`);
        } catch (error) {
            const errorMsg = (error as Error)?.message || String(error);
            console.log(`⏳ Redis não disponível (tentativa ${i + 1}/${retries}), aguardando ${delay}ms...`, errorMsg);

            if (i < retries - 1) {
                await new Promise((res) => setTimeout(res, delay));
            }
        }
    }
    throw new Error("Redis não disponível após várias tentativas");
}

async function startServer() {
    try {
        console.log("🔹 Iniciando container Socket em modo seguro...");

        const redisClient = await waitForRedis(REDIS_HOST, REDIS_PORT);
        console.log("✅ Redis client obtido e validado para Socket.io");

        await initRedisAdapter(io, { host: REDIS_HOST, port: REDIS_PORT, db: REDIS_DB });

        // Inicializa sincronização de eventos entre API e Socket.io
        try {
            const { initializeEventSync } = await import('./utils/eventSyncSetup');
            await initializeEventSync(io);
            console.log("✅ Event Sync inicializado para sincronizar eventos entre API e Socket.io");
        } catch (err) {
            console.warn("⚠️ Event Sync não inicializado, notificações podem não chegar em tempo real:", err);
        }

        // Logs de erros de conexão
        io.engine.on("connection_error", (err) => {
            console.error("❌ Erro de conexão do Socket.IO:", {
                message: err.message,
                code: err.code,
                context: err.context,
            });
        });

        // Torna o io acessível nos controllers via req.app.get('io')
        app.set('io', io);

        io.on("connection", (socket) => {
            console.log(`🔗 Socket conectado: ${socket.id}`);
            console.log(`   📍 Origin: ${socket.handshake.headers.origin}`);
            console.log(`   🌐 Transport: ${socket.conn.transport.name}`);
            console.log(`   🔗 URL: ${socket.handshake.url}`);
            onConnect(io, socket);

            socket.on("error", (error) => {
                console.error(`❌ Erro no socket ${socket.id}:`, error);
            });

            socket.on("disconnect", (reason) => {
                console.log(`❌ Socket desconectado: ${socket.id} - Razão: ${reason}`);
            });
        });

        app.get("/health", (_req, res) => {
            res.status(200).json({
                status: "ok",
                time: new Date().toISOString(),
                connections: io.engine.clientsCount
            });
        });

        app.post("/emit", (req, res) => {
            const { event, toUserId, data, broadcast } = req.body;
            emitEvent(io, event, { toUserId, data, broadcast });
            res.json({ success: true });
        });

        server.listen(PORT, "0.0.0.0", () => {
            console.log(`🚀 Socket Server rodando na porta ${PORT}`);
            console.log(`📡 WebSocket disponível em: wss://ws.estacaoterapia.com.br/socket.io/`);
            console.log(`🏥 Health check: https://ws.estacaoterapia.com.br/health`);
            console.log(`✅ Servidor pronto para receber conexões`);
        });
    } catch (err) {
        console.error("❌ Erro ao iniciar Socket Server:", err);
        process.exit(1);
    }
}

// --- Shutdown graceful ---
const shutdown = async () => {
    console.log("\n🛑 Encerrando Socket Server...");
    try {
        const { closeRedisConnection } = await import("../config/redis.config");
        await closeRedisConnection();
        server.close(() => {
            console.log("✅ Socket Server encerrado com sucesso");
            process.exit(0);
        });
    } catch (err) {
        console.error("❌ Erro ao encerrar Socket Server:", err);
        process.exit(1);
    }
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

startServer();
