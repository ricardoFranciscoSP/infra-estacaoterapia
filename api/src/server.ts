// src/server.ts
import "dotenv/config";
import express, { Request, Response, NextFunction } from "express";
import cookieParser from "cookie-parser";
import http from "http";
import router from "./routes";
import { corsMiddleware } from "./middlewares/cors";
import {
    securityHeaders,
    generalRateLimiter,
    validateBodySize,
    forceHttps
} from "./middlewares/security";
import { logInfo, logDebug } from "./utils/logger";

const app = express();

// Debug inicial
logInfo("Iniciando servidor", {
    nodeEnv: process.env.NODE_ENV,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    timestamp: new Date().toISOString(),
});

// ===============================
// 🔹 HTTPS Enforcement
// ===============================
app.use(forceHttps);

// ===============================
// 🔹 Security Headers (Helmet)
// ===============================
app.use(securityHeaders);

// ===============================
// 🔹 CORS — primeiro middleware
// ===============================
app.use(corsMiddleware);

// ===============================
// 🔹 Middlewares globais
// ===============================
app.set("trust proxy", 1);

// ===============================
// 🔹 Body Size Validation
// ===============================
app.use(validateBodySize(10 * 1024 * 1024)); // 10MB

// Evitar parse automático em multipart
app.use((req: Request, res: Response, next: NextFunction): void => {
    const contentType = req.headers["content-type"] ?? "";

    if (contentType.includes("multipart/form-data")) {
        logDebug("Multipart detectado — ignorando body-parser padrão");
        return next();
    }

    express.json({ limit: "10mb" })(req, res, (err: Error | undefined) => {
        if (err) return next(err);
        express.urlencoded({ extended: true, limit: "10mb" })(req, res, next);
    });
});

app.use(cookieParser());

// ===============================
// 🔹 Rate Limiting
// ===============================
app.use("/api/", generalRateLimiter);

// Log requests - especialmente para webhooks
app.use((req: Request, _res: Response, next: NextFunction): void => {
    // Log detalhado para requisições de webhook
    if (req.path.includes('/webhook')) {
        logDebug("Requisição de webhook recebida", {
            method: req.method,
            path: req.path,
            url: req.url,
            contentType: String(req.headers['content-type'] || ''),
            userAgent: String(req.headers['user-agent'] || ''),
            xForwardedFor: typeof req.headers['x-forwarded-for'] === 'string' ? req.headers['x-forwarded-for'] : Array.isArray(req.headers['x-forwarded-for']) ? req.headers['x-forwarded-for'].join(', ') : '',
            hasBody: req.body ? 1 : 0,
            bodyLength: req.body && typeof req.body === 'object' ? JSON.stringify(req.body).substring(0, 500).length : 0,
        });
    }
    next();
});

// ===============================
// 🔹 Rotas
// ===============================
app.use("/", router);

app.get("/health", (_req, res) => {
    res.status(200).json({
        status: "ok",
        time: new Date().toISOString()
    });
});

// 404
app.use((req: Request, res: Response): void => {
    logDebug("404 - Rota não encontrada", {
        method: req.method,
        path: req.path,
    });
    res.status(404).json({
        error: "Rota não encontrada",
        path: req.path,
        method: req.method
    });
});

// ===============================
// 🔹 Servidor HTTP
// ===============================
const PORT = Number(process.env.PORT) || 3000;
const server = http.createServer(app);

// ===============================
// 🔹 Verificar Redis (IORedis) antes de iniciar workers
// ===============================
async function waitForRedisReady(maxRetries = 15, delayMs = 3000): Promise<boolean> {
    const { waitForIORedisReady } = await import("./config/redis.config");
    const redisHost = process.env.REDIS_HOST || "redis";
    const redisPort = process.env.REDIS_PORT || "6379";
    const redisDb = process.env.REDIS_DB || "1";
    let retries = 0;

    console.log(`⏳ [Redis] Aguardando Redis ficar disponível (${redisHost}:${redisPort}, db ${redisDb})`);
    console.log(`⏳ [Redis] Max tentativas: ${maxRetries} | Intervalo: ${delayMs}ms`);

    while (retries < maxRetries) {
        try {
            console.log(`🔍 [Redis] Validando conexão IORedis... tentativa ${retries + 1}/${maxRetries}`);
            await waitForIORedisReady(15000);
            console.log("✅ [Redis] IORedis conectado e validado com ping");
            return true;
        } catch (err) {
            const errorMsg = (err as Error)?.message || String(err);
            console.warn(`⚠️ [Redis] Tentativa ${retries + 1}/${maxRetries} falhou: ${errorMsg}`);
            if (retries < maxRetries - 1) {
                console.log(`⏳ Aguardando ${delayMs}ms antes da próxima tentativa...`);
                await new Promise(r => setTimeout(r, delayMs));
            }
            retries++;
        }
    }

    console.error("🚨 Redis indisponível após múltiplas tentativas");
    return false;
}

// ===============================
// 🔹 Inicialização
// ===============================
server.listen(PORT, "0.0.0.0", async () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
    console.log("🟢 Inicialização concluída");

    // Iniciar workers BullMQ em production, staging, pre e development
    // Redis é obrigatório em todos os ambientes para garantir funcionamento dos jobs
    const shouldStartWorkers = process.env.NODE_ENV === "production" ||
        process.env.NODE_ENV === "staging" ||
        process.env.NODE_ENV === "pre" ||
        process.env.NODE_ENV === "development";

    if (shouldStartWorkers) {
        // NÃO bloqueia a inicialização se Redis não estiver disponível
        // Inicia os workers em background e permite que a API fique pronta
        (async () => {
            try {
                console.log("🚦 Aguardando disponibilidade de Redis para iniciar workers BullMQ...");

                const redisReady = await waitForRedisReady(); // garante que Redis está ok antes de iniciar workers
                if (!redisReady) {
                    console.error("🛑 Workers BullMQ NÃO serão inicializados: Redis não conectado na API");
                    return;
                }

                // Zera filas BullMQ no deploy para evitar jobs travados
                const shouldResetQueues = process.env.RESET_BULLMQ_ON_DEPLOY !== "false";
                if (shouldResetQueues) {
                    try {
                        const { resetAllQueues } = await import("./utils/queueStatus");
                        console.log("🧹 Zerando todas as filas BullMQ no deploy...");
                        await resetAllQueues();
                        console.log("✅ Filas BullMQ zeradas");
                    } catch (resetErr) {
                        console.error("⚠️ Erro ao zerar filas BullMQ no deploy:", resetErr);
                    }
                } else {
                    console.log("ℹ️ RESET_BULLMQ_ON_DEPLOY=false — mantendo jobs existentes");
                }

                // Inicializa workers de Controle de Consulta (inclui webhook, agenda, consulta, email, etc)
                const { startControleConsultaWorkers } = await import("./workers/controleConsultaWorkers");
                // Socket.io é inicializado separadamente, então passa undefined aqui
                await startControleConsultaWorkers(undefined);
                console.log("✅ Workers de Controle de Consulta inicializados (com Session Worker)");

                // ✅ Inicializa worker de delayed jobs (zero polling)
                const { startDelayedJobsWorker } = await import("./workers/delayedJobsWorker");
                startDelayedJobsWorker();
                console.log("✅ Worker de delayed jobs inicializado (zero polling)");

                // ✅ Inicializa worker de jobs do banco de dados (BullMQ - zero polling)
                const { startDatabaseJobsWorker } = await import("./workers/databaseJobsWorker");
                startDatabaseJobsWorker();
                console.log("✅ Worker de jobs do banco de dados inicializado (BullMQ - zero polling)");

                console.log("✅ Todos os Workers BullMQ inicializados!");

                try {
                    const { logAllQueuesStatus, logAllFailedJobs, cleanDelayedJobs } = await import("./utils/queueStatus");
                    const shouldLogQueueStatus = process.env.QUEUE_STATUS_LOG === "true" ||
                        process.env.NODE_ENV !== "production";
                    const shouldCleanDelayedJobs = process.env.CLEAN_DELAYED_JOBS !== "false";

                    if (shouldLogQueueStatus) {
                        await logAllQueuesStatus();
                        await logAllFailedJobs();
                    }

                    if (shouldCleanDelayedJobs) {
                        // Limpa jobs delayed antigos em todas as filas principais
                        const filas = [
                            "agendaQueue",
                            "webhookProcessor",
                            "consultationQueue",
                            "renovacao-controle-consulta",
                            "pagamento-controle-consulta",
                            "notificacao-controle-consulta",
                            "emailQueue"
                        ];
                        for (const fila of filas) {
                            await cleanDelayedJobs(fila, 24 * 60 * 60 * 1000); // 24h
                        }
                    }
                } catch (err) {
                    console.error("⚠️ Erro ao logar status das filas ou limpar delayed:", err);
                }
            } catch (err) {
                console.error("❌ Erro ao iniciar workers BullMQ:", err);
                // Em produção/staging/pre, registra erro mas NÃO bloqueia o servidor
                // Redis conectará automaticamente quando ficar disponível
                if (process.env.NODE_ENV === "production" || process.env.NODE_ENV === "staging" || process.env.NODE_ENV === "pre") {
                    console.warn("⚠️  Servidor iniciado, mas workers BullMQ aguardam disponibilidade de Redis");
                    console.warn("ℹ️  A conexão será estabelecida automaticamente quando Redis ficar disponível");
                }
            }
        })().catch((err) => {
            console.error("🛑 Erro crítico ao iniciar workers:", err);
        });
    } else {
        console.log(`⚠️ Ambiente ${process.env.NODE_ENV} — Workers BullMQ NÃO iniciados`);
    }

    console.log("🔍 Servidor pronto para receber requisições");

    // ===============================
    // 🔹 Encerramento Graceful
    // ===============================
    const shutdown = async () => {
        console.log("\n🛑 Encerrando servidor...");

        try {
            console.log("🛑 Fechando workers BullMQ...");

            try {
                const controleJobs = await import("./jobs/controleConsultaJobs");
                const agendaJobs = await import("./jobs/agendaWorker");
                const webhookJobs = await import("./jobs/webhookWorker");
                const consultationJobs = await import("./jobs/consultationJobs");
                const recurringJobs = await import("./jobs/recurringJobs");

                await Promise.allSettled([
                    recurringJobs.stopRecurringJobs(),
                    controleJobs.renovacaoWorker?.close(),
                    controleJobs.renovacaoEvents?.close(),
                    controleJobs.pagamentoWorker?.close(),
                    controleJobs.pagamentoEvents?.close(),
                    controleJobs.notificacaoWorker?.close(),
                    controleJobs.notificacaoEvents?.close(),
                    agendaJobs.agendaWorker?.close(),
                    webhookJobs.worker?.close(),
                    webhookJobs.events?.close(),
                    consultationJobs.worker?.close(),
                    consultationJobs.events?.close(),
                ]);

                console.log("✅ Workers BullMQ fechados");
            } catch (err) {
                console.error("⚠️ Erro ao fechar workers:", err);
            }

            server.close(() => {
                console.log("✅ Servidor finalizado com sucesso");
                process.exit(0);
            });
        } catch (err) {
            console.error("❌ Erro ao finalizar servidor:", err);
            process.exit(1);
        }
    };

    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
});
