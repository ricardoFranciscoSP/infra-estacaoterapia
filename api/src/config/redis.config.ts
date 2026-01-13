// src/config/redis.config.ts
import { createClient, RedisClientType } from "redis";
import IORedis from "ioredis";
import fs from "fs";

/**
 * ========================================================================================
 * ARQUITETURA DE CONEXÕES - SINGLETON PATTERN
 * ========================================================================================
 * 
 * Este módulo implementa o padrão Singleton para conexões Redis, similar ao que o 
 * Prisma já faz com o pool de conexões PostgreSQL (ver src/prisma/client.ts).
 * 
 * OBJETIVO:
 * - Garantir que apenas UMA conexão Redis seja criada e reutilizada em toda aplicação
 * - Evitar múltiplas conexões desnecessárias que consomem recursos
 * - Prevenir erros EPIPE, timeouts e problemas de conexão
 * - Seguir o mesmo padrão de conexão singleton do Prisma
 * 
 * COMO FUNCIONA:
 * 1. getIORedisClient() retorna sempre a MESMA instância do cliente Redis
 * 2. A conexão é validada com ping antes de ser retornada
 * 3. Se a conexão falhar, reconecta automaticamente (retry logic)
 * 4. BullMQ e outros serviços reutilizam esta conexão singleton
 * 
 * COMPARAÇÃO COM PRISMA:
 * - Prisma: Pool singleton de conexões PostgreSQL (src/prisma/client.ts)
 * - Redis: Cliente singleton IORedis (este arquivo)
 * 
 * IMPORTANTE:
 * - SEMPRE use getIORedisClient() para obter o cliente Redis
 * - NUNCA crie novas instâncias IORedis diretamente
 * - Para BullMQ, use as filas de src/queues/bullmqCentral.ts que já usam o singleton
 * 
 * ========================================================================================
 */

let redisClient: RedisClientType | null = null;
let ioredisClient: IORedis | null = null;
let ioredisConnectionPromise: Promise<IORedis> | null = null;

/**
 * Configuração centralizada
 * Redis é obrigatório em production, staging, pre e development para garantir funcionamento dos jobs
 */
const REDIS_HOST = process.env.REDIS_HOST || "estacao_redis_prd";
const REDIS_PORT = Number(process.env.REDIS_PORT || 6379);
const REDIS_DB = Number(process.env.REDIS_DB || 0);
const REDIS_PASSWORD = process.env.REDIS_PASSWORD || ""; // Vazio se não definido
const REDIS_URL = process.env.REDIS_URL; // Prioriza a URL completa do .env

// Define se devemos autenticar
const SHOULD_AUTH = !!REDIS_PASSWORD; // Autentica se houver senha

// Debug: Log da configuração
const authStatus = SHOULD_AUTH ? `SIM (senha definida)` : `NÃO (sem senha)`;
console.log(`🔍 [Redis Config] Host: ${REDIS_HOST}, Port: ${REDIS_PORT}, DB: ${REDIS_DB}, Autenticação: ${authStatus}`);

if (REDIS_URL) {
    console.log(`🔍 [Redis Config] Usando REDIS_URL do ambiente`);
}

// Debug: Log detalhado das variáveis de ambiente
console.log(`🔍 [Redis Config] Variáveis de ambiente carregadas:`);
console.log(`   • REDIS_HOST: ${process.env.REDIS_HOST ? 'definido' : 'não definido'} → "${REDIS_HOST}"`);
console.log(`   • REDIS_PORT: ${process.env.REDIS_PORT ? 'definido' : 'não definido'} → ${REDIS_PORT}`);
console.log(`   • REDIS_DB: ${process.env.REDIS_DB ? 'definido' : 'não definido'} → ${REDIS_DB}`);
console.log(`   • REDIS_PASSWORD: ${process.env.REDIS_PASSWORD ? `definido (${process.env.REDIS_PASSWORD.length} chars)` : 'não definido'}`);
console.log(`   • REDIS_URL: ${process.env.REDIS_URL ? 'definido' : 'não definido'}`);

const MAX_RETRIES = 15;
const RETRY_DELAY_MS = 2000; // Aumentado para 2 segundos

// Verifica se estamos em ambiente que requer Redis
const REQUIRES_REDIS = process.env.NODE_ENV === "production" ||
    process.env.NODE_ENV === "staging" ||
    process.env.NODE_ENV === "pre" ||
    process.env.NODE_ENV === "development";

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Redis Client (node-redis)
 * Usado para cache, rate limit, etc
 */
export const getRedisClient = async (): Promise<RedisClientType> => {
    // Se já existe um cliente e está aberto/pronto, retorna ele
    if (redisClient && redisClient.isOpen) {
        try {
            // Verifica se realmente está pronto fazendo um ping
            await redisClient.ping();
            return redisClient;
        } catch (err) {
            // Se o ping falhar, o cliente está fechado ou não está pronto
            console.warn("⚠️ [Redis] Cliente existente não está pronto, recriando...");
            redisClient = null;
        }
    }

    // Se o cliente estava fechado ou não existe, cria um novo
    if (redisClient) {
        try {
            await redisClient.quit().catch(() => { });
        } catch (err) {
            // Ignora erros ao fechar cliente antigo
        }
        redisClient = null;
    }

    console.log("🔌 [Redis] Conectando...");
    const authStatus = SHOULD_AUTH ? `SIM` : `NÃO`;
    console.log(`🔍 [Redis] Configuração: host=${REDIS_HOST}, port=${REDIS_PORT}, db=${REDIS_DB}, autenticação: ${authStatus}`);

    // Usa a senha do ambiente se definida
    const connectionPassword = SHOULD_AUTH ? REDIS_PASSWORD : undefined;

    redisClient = createClient({
        url: REDIS_URL || `redis://${REDIS_HOST}:${REDIS_PORT}/${REDIS_DB}`,
        password: connectionPassword,
        socket: {
            connectTimeout: 10_000,
            reconnectStrategy: (retries) => {
                if (retries >= MAX_RETRIES) {
                    console.error("❌ [Redis] Falha ao reconectar após múltiplas tentativas");
                    return new Error("Redis indisponível");
                }
                return Math.min(retries * 500, 5_000);
            }
        }
    });

    redisClient.on("ready", () => {
        console.log("✅ [Redis] Conectado e pronto");
    });

    redisClient.on("error", (err) => {
        console.error("❌ [Redis] Erro:", err.message);
    });

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            console.log(`[Redis] Tentando conectar... tentativa ${attempt}`);
            await redisClient.connect();
            console.log(`✅ [Redis] Conectado na tentativa ${attempt}`);
            return redisClient;
        } catch (err) {
            const errorMsg = (err as Error)?.message || String(err);
            console.error(`⚠️ [Redis] Tentativa ${attempt}/${MAX_RETRIES} falhou: ${errorMsg}`);
            if (attempt === MAX_RETRIES) {
                if (REQUIRES_REDIS) {
                    console.error(`🛑 [Redis] Abortando inicialização (${process.env.NODE_ENV} exige Redis)`);
                    console.error(`🛑 [Redis] Host: ${REDIS_HOST}, Port: ${REDIS_PORT}, DB: ${REDIS_DB}`);
                    // Limpa o cliente falho
                    redisClient = null;
                    throw err;
                } else {
                    console.warn(`⚠️ [Redis] Redis não disponível em ${process.env.NODE_ENV}, mas não é obrigatório`);
                    redisClient = null;
                    throw new Error("Redis não inicializado");
                }
            }
            console.log(`⏳ Redis retry ${attempt}/${MAX_RETRIES} ${errorMsg}`);
            await sleep(RETRY_DELAY_MS);
        }
    }

    redisClient = null;
    throw new Error("Redis não inicializado");
};

/**
 * IORedis - Conexão singleton reutilizável
 * Usado para Pub/Sub, Socket.IO, filas, etc
 * Garante que apenas uma conexão seja criada e reutilizada por toda a aplicação
 */
export const getIORedisClient = (): IORedis => {
    // Se já existe um cliente conectado e pronto, retorna imediatamente
    if (ioredisClient && (ioredisClient.status === 'ready' || ioredisClient.status === 'connect')) {
        return ioredisClient;
    }

    // Se já existe uma promise de conexão em andamento, aguarda ela
    if (ioredisConnectionPromise) {
        // Retorna o cliente existente que será conectado pela promise
        // Se a promise ainda não terminou, o cliente pode não estar pronto ainda
        // mas vamos retorná-lo mesmo assim para evitar múltiplas conexões
        return ioredisClient || createIORedisClient();
    }

    // Se existe cliente mas não está pronto, aguarda ou recria
    if (ioredisClient && (ioredisClient.status === 'connecting' || ioredisClient.status === 'reconnecting')) {
        // Cliente está tentando conectar, retorna ele e deixa a conexão seguir
        return ioredisClient;
    }

    // Se cliente existe mas não está em nenhum estado válido, limpa e recria
    // Estados válidos do IORedis: 'wait' | 'connect' | 'connecting' | 'ready' | 'reconnecting'
    // Se não está em nenhum desses estados, considera inválido e recria
    if (ioredisClient) {
        const currentStatus = ioredisClient.status;
        const isValidStatus = currentStatus === 'wait' ||
            currentStatus === 'connect' ||
            currentStatus === 'connecting' ||
            currentStatus === 'ready' ||
            currentStatus === 'reconnecting';

        if (!isValidStatus) {
            // Status inválido (não é um dos estados válidos), limpa e recria
            try {
                ioredisClient.removeAllListeners();
                ioredisClient.disconnect();
                ioredisClient.quit().catch(() => { });
            } catch (err) {
                // Ignora erros ao fechar cliente antigo
            }
            ioredisClient = null;
            ioredisConnectionPromise = null;
        }
    }

    // Cria nova conexão
    return createIORedisClient();
};

/**
 * Cria e configura uma nova conexão IORedis
 * Internal function - não deve ser chamada diretamente
 */
function createIORedisClient(): IORedis {
    // Se já está criando, retorna o existente
    if (ioredisClient) {
        return ioredisClient;
    }

    console.log("🔌 [IORedis] Criando nova conexão singleton...");
    const authStatus = SHOULD_AUTH ? `SIM (senha definida)` : `NÃO (sem senha)`;
    console.log(`🔍 [IORedis] Configuração básica: host=${REDIS_HOST}, port=${REDIS_PORT}, db=${REDIS_DB}, autenticação: ${authStatus}`);

    // Log do modo de autenticação
    if (SHOULD_AUTH) {
        console.log("ℹ️ [IORedis] Conectando COM autenticação (Redis com requirepass)");
    } else {
        console.log("ℹ️ [IORedis] Conectando SEM autenticação (Redis sem requirepass)");
    }

    // Usa a senha do ambiente se definida
    const connectionPassword = SHOULD_AUTH ? REDIS_PASSWORD : undefined;

    // Configurações que serão usadas na conexão
    // Se houver REDIS_URL, parse suas credenciais; caso contrário, usa as variáveis individuais
    let configHost = REDIS_HOST;
    let configPort = REDIS_PORT;
    let configDb = REDIS_DB;
    let configPassword = connectionPassword;

    // Se REDIS_URL está definida, extrai host/port/db/password dela
    if (REDIS_URL) {
        try {
            const url = new URL(REDIS_URL);
            configHost = url.hostname || REDIS_HOST;
            configPort = url.port ? Number(url.port) : REDIS_PORT;
            configDb = url.pathname && url.pathname !== '/' ? Number(url.pathname.slice(1)) : REDIS_DB;
            configPassword = url.password || configPassword;
            console.log(`✅ [IORedis] Credenciais extraídas de REDIS_URL: host=${configHost}, port=${configPort}, db=${configDb}`);
        } catch (err) {
            console.warn(`⚠️ [IORedis] REDIS_URL inválida, usando variáveis individuais`);
        }
    }

    const redisConfig = {
        host: configHost,
        port: configPort,
        db: configDb,
        password: configPassword,
        maxRetriesPerRequest: null,
        connectTimeout: 30_000,
        lazyConnect: false,
        keepAlive: 30000,
        enableOfflineQueue: true,
        enableReadyCheck: true,
        autoResubscribe: true,
        autoResendUnfulfilledCommands: true,
        enableAutoPipelining: false,
        commandTimeout: 30000,
        connectionName: 'estacao-api',
        showFriendlyErrorStack: true,
    };

    // Debug detalhado de TODOS os parâmetros de conexão
    console.log("📋 [IORedis] Parâmetros completos de conexão:");
    console.log("   ┌─ Conexão");
    console.log(`   │  • Host: ${redisConfig.host}`);
    console.log(`   │  • Port: ${redisConfig.port}`);
    console.log(`   │  • Database: ${redisConfig.db}`);
    console.log(`   │  • Password: ${redisConfig.password === undefined ? 'undefined (sem auth)' : '***' + (redisConfig.password ? ` (${redisConfig.password.length} caracteres)` : '')}`);
    console.log(`   │  • REDIS_URL: ${REDIS_URL ? 'definida' : 'não definida'}`);
    console.log(`   │  • Connection Name: ${redisConfig.connectionName}`);
    console.log("   ├─ Timeouts");
    console.log(`   │  • Connect Timeout: ${redisConfig.connectTimeout}ms (${redisConfig.connectTimeout / 1000}s)`);
    console.log(`   │  • Command Timeout: ${redisConfig.commandTimeout}ms (${redisConfig.commandTimeout / 1000}s)`);
    console.log(`   │  • Max Retries: ${MAX_RETRIES} tentativas`);
    console.log("   ├─ Comportamento");
    console.log(`   │  • Lazy Connect: ${redisConfig.lazyConnect ? 'SIM (aguarda primeiro comando)' : 'NÃO (conecta imediatamente)'}`);
    console.log(`   │  • Keep Alive: ${redisConfig.keepAlive}ms (${redisConfig.keepAlive / 1000}s)`);
    console.log(`   │  • Enable Ready Check: ${redisConfig.enableReadyCheck ? 'SIM (valida conexão)' : 'NÃO'}`);
    console.log(`   │  • Enable Offline Queue: ${redisConfig.enableOfflineQueue ? 'SIM (guarda comandos se offline)' : 'NÃO'}`);
    console.log("   ├─ Autenticação");
    console.log(`   │  • Modo: ${SHOULD_AUTH ? 'COM autenticação' : 'SEM autenticação'}`);
    console.log(`   │  • Password definida: ${SHOULD_AUTH ? 'SIM' : 'NÃO'}`);
    console.log("   ├─ Reconexão");
    console.log(`   │  • Auto Resubscribe: ${redisConfig.autoResubscribe ? 'SIM' : 'NÃO'}`);
    console.log(`   │  • Auto Resend Commands: ${redisConfig.autoResendUnfulfilledCommands ? 'SIM' : 'NÃO'}`);
    console.log(`   │  • Max Retries Per Request: ${redisConfig.maxRetriesPerRequest === null ? 'null (sem limite)' : redisConfig.maxRetriesPerRequest}`);
    console.log("   ├─ Performance");
    console.log(`   │  • Auto Pipelining: ${redisConfig.enableAutoPipelining ? 'HABILITADO' : 'DESABILITADO (previne EPIPE)'}`);
    console.log(`   │  • Show Friendly Errors: ${redisConfig.showFriendlyErrorStack ? 'SIM' : 'NÃO'}`);
    console.log("   └─ Ambiente");
    console.log(`      • NODE_ENV: ${process.env.NODE_ENV || 'não definido'}`);
    console.log(`      • REDIS_HOST: ${process.env.REDIS_HOST || 'não definido (usando default)'}`);
    console.log(`      • REDIS_PORT: ${process.env.REDIS_PORT || 'não definido (usando default)'}`);
    console.log(`      • REDIS_DB: ${process.env.REDIS_DB || 'não definido (usando default)'}`);

    ioredisClient = new IORedis({
        ...redisConfig,
        retryStrategy: (times: number) => {
            if (times >= MAX_RETRIES) {
                console.error("🛑 [IORedis] Redis indisponível após múltiplas tentativas");
                return null;
            }
            const delay = Math.min(times * 500, 5_000); // Delay progressivo até 5 segundos
            if (times === 1 || times % 5 === 0) { // Log apenas a cada 5 tentativas para evitar spam
                console.log(`⏳ [IORedis] Tentativa ${times}/${MAX_RETRIES} - reconectando em ${delay}ms`);
            }
            return delay;
        },
        reconnectOnError: (err) => {
            const targetError = 'READONLY';
            if (err.message.includes(targetError)) {
                // Apenas reconecta em erros específicos
                return true;
            }
            return false;
        },
    });

    // Handlers de eventos - apenas uma vez por cliente
    ioredisClient.on("ready", () => {
        console.log("✅ [IORedis] Conectado e pronto para uso");
        ioredisConnectionPromise = null; // Limpa a promise quando conecta
    });

    ioredisClient.on("connect", () => {
        console.log("🔌 [IORedis] Conectando ao Redis...");
    });

    ioredisClient.on("error", (err) => {
        // Ignora erros EPIPE comuns durante reconexão
        if (err.message && (err.message.includes('EPIPE') || err.message.includes('ECONNRESET'))) {
            console.warn("⚠️ [IORedis] Erro de conexão detectado (EPIPE/ECONNRESET) - reconectando automaticamente...");
            return;
        }

        console.error("❌ [IORedis] Erro:", err.message);
        // Não mata o processo, apenas loga o erro
        // O retryStrategy cuida das reconexões
    });

    ioredisClient.on("close", () => {
        console.warn("⚠️ [IORedis] Conexão fechada - tentando reconectar...");
    });

    ioredisClient.on("reconnecting", (delay: number) => {
        console.log(`🔄 [IORedis] Reconectando em ${delay}ms...`);
    });

    ioredisClient.on("end", () => {
        console.warn("⚠️ [IORedis] Conexão encerrada");
        ioredisClient = null;
        ioredisConnectionPromise = null;
    });

    // Cria promise para aguardar conexão inicial (apenas se não existe e cliente não está pronto)
    if (!ioredisConnectionPromise && ioredisClient && ioredisClient.status !== 'ready') {
        ioredisConnectionPromise = new Promise<IORedis>((resolve, reject) => {
            const timeout = setTimeout(() => {
                ioredisConnectionPromise = null; // Limpa a promise em caso de timeout
                reject(new Error('Timeout aguardando conexão IORedis'));
            }, 30000);

            const onReady = () => {
                clearTimeout(timeout);
                ioredisConnectionPromise = null; // Limpa a promise após conectar
                if (ioredisClient && ioredisClient.status === 'ready') {
                    resolve(ioredisClient);
                } else {
                    reject(new Error('Cliente IORedis foi limpo antes de conectar'));
                }
            };

            const onError = (err: Error) => {
                clearTimeout(timeout);
                ioredisConnectionPromise = null; // Limpa a promise em caso de erro
                reject(err);
            };

            if (ioredisClient) {
                if (ioredisClient.status === 'ready') {
                    clearTimeout(timeout);
                    ioredisConnectionPromise = null;
                    resolve(ioredisClient);
                } else {
                    ioredisClient.once('ready', onReady);
                    ioredisClient.once('error', onError);
                }
            } else {
                clearTimeout(timeout);
                ioredisConnectionPromise = null;
                reject(new Error('Cliente IORedis não foi criado'));
            }
        });
    }

    return ioredisClient;
}

/**
 * Shutdown gracioso
 */
/**
 * Aguarda a conexão IORedis estar pronta E valida com ping
 * Útil quando você precisa garantir que a conexão está realmente pronta antes de usar
 */
export const waitForIORedisReady = async (timeoutMs = 30000): Promise<IORedis> => {
    const client = getIORedisClient();

    // Verifica se cliente está pronto E testa com ping
    if (client.status === 'ready') {
        try {
            await client.ping();
            console.log('✅ [IORedis] Conexão validada com ping');
            return client;
        } catch (err) {
            console.warn('⚠️ [IORedis] Cliente em status ready mas ping falhou, aguardando reconexão...');
            // Continua para aguardar ready novamente
        }
    }

    // Aguarda a promise de conexão existente
    if (ioredisConnectionPromise) {
        try {
            const connectedClient = await Promise.race([
                ioredisConnectionPromise,
                new Promise<IORedis>((_, reject) =>
                    setTimeout(() => reject(new Error('Timeout aguardando IORedis')), timeoutMs)
                )
            ]);

            // Valida com ping após conexão
            await connectedClient.ping();
            console.log('✅ [IORedis] Conexão estabelecida e validada');
            return connectedClient;
        } catch (err) {
            console.error('❌ [IORedis] Erro ao conectar ou validar:', err);
            // Se a promise falhou, tenta novamente
            ioredisConnectionPromise = null;
            const newClient = getIORedisClient();
            if (newClient.status === 'ready') {
                try {
                    await newClient.ping();
                    return newClient;
                } catch (pingErr) {
                    console.error('❌ [IORedis] Ping falhou após reconexão');
                }
            }
            throw err;
        }
    }

    // Se não há promise, aguarda o cliente conectar
    return new Promise<IORedis>((resolve, reject) => {
        const timeout = setTimeout(() => {
            reject(new Error('Timeout aguardando IORedis conectar'));
        }, timeoutMs);

        const onReady = async () => {
            clearTimeout(timeout);
            if (ioredisClient && ioredisClient.status === 'ready') {
                try {
                    // Valida com ping antes de resolver
                    await ioredisClient.ping();
                    console.log('✅ [IORedis] Conexão pronta e validada com ping');
                    resolve(ioredisClient);
                } catch (pingErr) {
                    console.error('❌ [IORedis] Ping falhou após ready:', pingErr);
                    reject(new Error('Cliente pronto mas ping falhou'));
                }
            } else {
                reject(new Error('Cliente não está pronto após evento ready'));
            }
        };

        const onError = (err: Error) => {
            clearTimeout(timeout);
            reject(err);
        };

        if (client.status === 'ready') {
            clearTimeout(timeout);
            // Testa com ping antes de resolver
            client.ping()
                .then(() => {
                    console.log('✅ [IORedis] Cliente pronto e respondendo');
                    resolve(client);
                })
                .catch((pingErr) => {
                    console.error('❌ [IORedis] Ping falhou:', pingErr);
                    reject(new Error('Cliente pronto mas não responde ao ping'));
                });
        } else {
            console.log(`⏳ [IORedis] Aguardando status ready (atual: ${client.status})...`);
            client.once('ready', onReady);
            client.once('error', onError);
        }
    });
};

/**
 * Shutdown gracioso
 */
export const closeRedisConnection = async () => {
    // Limpa promises pendentes
    ioredisConnectionPromise = null;

    if (redisClient) {
        await redisClient.quit().catch((err) => {
            console.error('[Redis] Erro ao fechar conexão redisClient:', err);
        });
        redisClient = null;
    }
    if (ioredisClient) {
        await ioredisClient.quit().catch((err) => {
            console.error('[Redis] Erro ao fechar conexão ioredisClient:', err);
        });
        ioredisClient = null;
    }
};
