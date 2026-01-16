// src/config/redis.config.ts
import { createClient, RedisClientType } from "redis";
import IORedis from "ioredis";

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
 * 
 * IMPORTANTE: As configurações são lidas dinamicamente de process.env para permitir
 * que o entrypoint.sh resolva os hostnames antes do Node.js tentar conectar
 * 
 * Em Docker Swarm, o Redis pode ser acessado por:
 * - estacaoterapia_redis: nome do serviço completo (RECOMENDADO)
 * - redis: alias configurado no docker-stack.yml (pode falhar em alguns casos)
 */
const getRedisConfig = () => ({
    host: process.env.REDIS_HOST || "estacaoterapia_redis", // Nome do serviço no Swarm
    port: Number(process.env.REDIS_PORT || 6379),
    db: Number(process.env.REDIS_DB || 0),
    password: process.env.REDIS_PASSWORD || undefined,
    url: process.env.REDIS_URL
});

export const getBullMQConnectionOptions = () => {
    const config = getRedisConfig();
    let host = config.host;
    let port = config.port;
    let db = config.db;
    let password = config.password || undefined;

    if (config.url) {
        try {
            const url = new URL(config.url);
            host = url.hostname || host;
            port = url.port ? Number(url.port) : port;
            db = url.pathname && url.pathname !== '/' ? Number(url.pathname.slice(1)) : db;
            password = url.password || password || undefined;
        } catch (err) {
            console.warn(`⚠️ [BullMQ] REDIS_URL inválida, usando variáveis individuais`);
        }
    }

    return {
        host,
        port,
        db,
        password,
    };
};

// Debug: Log da configuração inicial (reduzido em produção)
const initialConfig = getRedisConfig();
const shouldLogVerbose = process.env.REDIS_DEBUG_LOGS === "true" || process.env.NODE_ENV !== "production";
if (shouldLogVerbose) {
    const authStatus = initialConfig.password ? `SIM (senha definida)` : `NÃO (sem senha)`;
    console.log(`🔍 [Redis Config] Configuração inicial: Host: ${initialConfig.host}, Port: ${initialConfig.port}, DB: ${initialConfig.db}, Autenticação: ${authStatus}`);

    if (initialConfig.url) {
        console.log(`🔍 [Redis Config] Usando REDIS_URL do ambiente`);
    }

    // Debug: Log detalhado das variáveis de ambiente
    console.log(`🔍 [Redis Config] Variáveis de ambiente carregadas:`);
    console.log(`   • REDIS_HOST: ${process.env.REDIS_HOST ? 'definido' : 'não definido'} → "${initialConfig.host}"`);
    console.log(`   • REDIS_PORT: ${process.env.REDIS_PORT ? 'definido' : 'não definido'} → ${initialConfig.port}`);
    console.log(`   • REDIS_DB: ${process.env.REDIS_DB ? 'definido' : 'não definido'} → ${initialConfig.db}`);
    console.log(`   • REDIS_PASSWORD: ${process.env.REDIS_PASSWORD ? `definido (${process.env.REDIS_PASSWORD.length} chars)` : 'não definido'}`);
    console.log(`   • REDIS_URL: ${process.env.REDIS_URL ? 'definido' : 'não definido'}`);
}

const MAX_RETRIES = 20; // Aumentado para dar mais tempo em Swarm com problemas DNS
const RETRY_DELAY_MS = 3000; // Aumentado para 3 segundos (DNS leva tempo em Swarm)

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

    // Lê configuração dinamicamente
    const config = getRedisConfig();
    const SHOULD_AUTH = !!config.password;
    const authStatusNow = SHOULD_AUTH ? `SIM` : `NÃO`;
    console.log(`🔍 [Redis] Configuração: host=${config.host}, port=${config.port}, db=${config.db}, autenticação: ${authStatusNow}`);

    // Usa a senha do ambiente se definida
    const connectionPassword = SHOULD_AUTH ? config.password : undefined;

    // Construir URL com senha se não estiver definida e tiver senha
    let redisUrl = config.url;
    if (!redisUrl && SHOULD_AUTH && config.password) {
        redisUrl = `redis://:${config.password}@${config.host}:${config.port}/${config.db}`;
    } else if (!redisUrl) {
        redisUrl = `redis://${config.host}:${config.port}/${config.db}`;
    }

    redisClient = createClient({
        url: redisUrl,
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
                    console.error(`🛑 [Redis] Host: ${config.host}, Port: ${config.port}, DB: ${config.db}`);
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

    // Lê configuração dinamicamente
    const config = getRedisConfig();
    const SHOULD_AUTH = !!config.password;
    const authStatusNow = SHOULD_AUTH ? `SIM (senha definida)` : `NÃO (sem senha)`;
    console.log(`🔍 [IORedis] Configuração básica: host=${config.host}, port=${config.port}, db=${config.db}, autenticação: ${authStatusNow}`);

    // Log do modo de autenticação
    if (SHOULD_AUTH) {
        console.log("ℹ️ [IORedis] Conectando COM autenticação (Redis com requirepass)");
    } else {
        console.log("ℹ️ [IORedis] Conectando SEM autenticação (Redis sem requirepass)");
    }

    // Usa a senha do ambiente se definida
    const connectionPassword = SHOULD_AUTH ? config.password : undefined;

    // Configurações que serão usadas na conexão
    // Se houver REDIS_URL, parse suas credenciais; caso contrário, usa as variáveis individuais
    let configHost = config.host;
    let configPort = config.port;
    let configDb = config.db;
    let configPassword = connectionPassword;

    // Se REDIS_URL está definida, extrai host/port/db/password dela
    if (config.url) {
        try {
            const url = new URL(config.url);
            configHost = url.hostname || config.host;
            configPort = url.port ? Number(url.port) : config.port;
            configDb = url.pathname && url.pathname !== '/' ? Number(url.pathname.slice(1)) : config.db;
            // Prioriza senha da URL, depois do REDIS_PASSWORD, depois undefined
            configPassword = url.password || configPassword || undefined;
            const urlPassword = url.password ? `${url.password.substring(0, 3)}...${url.password.substring(url.password.length - 3)}` : 'indefinida';
            console.log(`✅ [IORedis] Credenciais extraídas de REDIS_URL: host=${configHost}, port=${configPort}, db=${configDb}, password=${urlPassword}`);
        } catch (err) {
            console.warn(`⚠️ [IORedis] REDIS_URL inválida, usando variáveis individuais`);
        }
    } else if (SHOULD_AUTH && config.password) {
        // Se não tem REDIS_URL mas tem senha, garante que a senha será usada
        configPassword = config.password;
        const maskedPassword = config.password.substring(0, 3) + '...' + config.password.substring(config.password.length - 3);
        console.log(`✅ [IORedis] Usando REDIS_PASSWORD do ambiente (${config.password.length} caracteres: ${maskedPassword})`);
    }

    const redisConfig = {
        host: configHost,
        port: configPort,
        db: configDb,
        password: configPassword,
        maxRetriesPerRequest: null,
        connectTimeout: 60_000, // Aumentado para 60s (DNS pode ser lento em Swarm)
        commandTimeout: 30_000, // Timeout para comandos
        lazyConnect: true, // CRÍTICO: Não bloqueia inicialização da API se Redis não estiver disponível
        keepAlive: 30000,
        enableOfflineQueue: true,
        enableReadyCheck: true,
        autoResubscribe: true,
        autoResendUnfulfilledCommands: true,
        enableAutoPipelining: false,
        connectionName: 'estacao-api',
        showFriendlyErrorStack: true,
        dns: {
            // Usar DNS nativo do Node.js com mais tolerância
            family: 0, // 0 = IPv4 e IPv6
            hints: 0,
        },
        // Usar apenas IPv4 em Docker Swarm (mais confiável)
        preferIPv4: true,
    };

    // Debug detalhado de TODOS os parâmetros de conexão
    if (shouldLogVerbose) {
        console.log("📋 [IORedis] Parâmetros completos de conexão:");
        console.log("   ┌─ Conexão");
        console.log(`   │  • Host: ${redisConfig.host}`);
        console.log(`   │  • Port: ${redisConfig.port}`);
        console.log(`   │  • Database: ${redisConfig.db}`);
        console.log(`   │  • Password: ${redisConfig.password === undefined ? 'undefined (sem auth)' : '***' + (redisConfig.password ? ` (${redisConfig.password.length} caracteres)` : '')}`);
        console.log(`   │  • REDIS_URL: ${process.env.REDIS_URL ? 'definida' : 'não definida'}`);
    }
    console.log(`   │  • Connection Name: ${redisConfig.connectionName}`);
    console.log("   ├─ Timeouts");
    console.log(`   │  • Connect Timeout: ${redisConfig.connectTimeout}ms (${redisConfig.connectTimeout / 1000}s)`);
    console.log(`   │  • Max Retries: ${MAX_RETRIES} tentativas`);
    console.log("   ├─ Comportamento");
    console.log(`   │  • Lazy Connect: ${redisConfig.lazyConnect ? 'SIM (não bloqueia startup)' : 'NÃO (bloqueia até conectar)'}`);
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
    console.log("   ├─ Swarm Docker");
    console.log(`   │  • Nome Serviço Swarm: estacaoterapia_redis`);
    console.log(`   │  • Nome Stack: estacaoterapia`);
    console.log(`   │  • DNS Interno: ${configHost} (resolvido pelo entrypoint.sh)`);
    console.log("   └─ Ambiente");
    console.log(`      • NODE_ENV: ${process.env.NODE_ENV || 'não definido'}`);
    console.log(`      • REDIS_HOST: ${process.env.REDIS_HOST || 'não definido (usando default)'}`);
    console.log(`      • REDIS_PORT: ${process.env.REDIS_PORT || 'não definido (usando default)'}`);
    console.log(`      • REDIS_DB: ${process.env.REDIS_DB || 'não definido (usando default)'}`);

    ioredisClient = new IORedis({
        ...redisConfig,
        retryStrategy: (times: number) => {
            if (times >= MAX_RETRIES) {
                console.error(`🛑 [IORedis] Redis indisponível após ${MAX_RETRIES} tentativas`);
                console.error(`🛑 [IORedis] Host: ${configHost}, Port: ${configPort}, DB: ${configDb}`);
                console.error(`🛑 [IORedis] Verificar se Redis está rodando e acessível`);
                return null; // Stops retrying
            }

            // Backoff exponencial: 500ms * times, máx 10 segundos
            const delay = Math.min(times * 500, 10_000);

            // Log detalhado a cada tentativa, com mais info das primeiras
            if (times === 1) {
                console.log(`⏳ [IORedis] Primeira tentativa de conexão em ${delay}ms...`);
                console.log(`   Host: ${configHost}, Port: ${configPort}, DB: ${configDb}`);
                console.log(`   Status esperado: "ready"`);
            } else if (times % 3 === 0 || times <= 5) {
                console.log(`⏳ [IORedis] Tentativa ${times}/${MAX_RETRIES} - próxima em ${delay}ms`);
                if (times === 5) {
                    console.warn(`⚠️  [IORedis] Ainda aguardando conexão (${times} tentativas)`);
                }
                if (times === 10) {
                    console.warn(`⚠️⚠️  [IORedis] Múltiplas falhas (${times} tentativas) - verificar DNS/conectividade`);
                }
            }

            return delay;
        },
        reconnectOnError: (err) => {
            // Tenta reconectar em mais tipos de erro
            const shouldReconnect = err.message && (
                err.message.includes('READONLY') ||
                err.message.includes('ECONNREFUSED') ||
                err.message.includes('ENOTFOUND') ||
                err.message.includes('ETIMEDOUT') ||
                err.message.includes('EHOSTUNREACH')
            );

            if (shouldReconnect) {
                console.warn(`⚠️  [IORedis] Erro transiente detectado, reconectando: ${err.message}`);
                return true;
            }
            return false;
        },
    });

    // Handlers de eventos - apenas uma vez por cliente
    ioredisClient.on("ready", () => {
        console.log("✅ [IORedis] Status: READY - Conectado e pronto para uso");
        console.log(`   Host: ${configHost}:${configPort}, DB: ${configDb}`);
        ioredisConnectionPromise = null; // Limpa a promise quando conecta
    });

    ioredisClient.on("connect", () => {
        console.log(`🔌 [IORedis] Status: CONNECT - Conectando ao Redis (${configHost}:${configPort})`);
    });

    ioredisClient.on("error", (err) => {
        // Log detalhado de erros, especialmente DNS
        const errorMsg = err?.message || String(err);
        const passwordInfo = configPassword ? `(com senha: ${configPassword.substring(0, 3)}...${configPassword.substring(configPassword.length - 3)})` : '(sem senha)';

        // Erros de DNS/rede específicos
        if (errorMsg.includes('ENOTFOUND')) {
            console.error(`❌ [IORedis] Erro DNS: Não consegue resolver hostname "${configHost}"`);
            console.error(`   Análise:`);
            console.error(`   • Host: ${configHost}`);
            console.error(`   • Port: ${configPort}`);
            console.error(`   • DB: ${configDb}`);
            console.error(`   • Auth: ${passwordInfo}`);
            console.error(`   Causa comum: Problema na rede overlay do Docker Swarm ou container sem DNS configurado`);
            console.error(`   Solução:`);
            console.error(`   1. Verificar DNS: docker exec <container> nslookup ${configHost}`);
            console.error(`   2. Verificar serviço Redis: docker service ls | grep redis`);
            console.error(`   3. Verificar rede Swarm: docker network ls`);
            console.error(`   4. Verificar logs Redis: docker service logs estacaoterapia_redis --tail 20`);
        } else if (errorMsg.includes('ECONNREFUSED')) {
            console.error(`❌ [IORedis] Conexão recusada: Redis não está escutando em ${configHost}:${configPort}`);
            console.error(`   Análise:`);
            console.error(`   • Host: ${configHost}`);
            console.error(`   • Port: ${configPort}`);
            console.error(`   • DB: ${configDb}`);
            console.error(`   • Auth: ${passwordInfo}`);
            console.error(`   Causa: Redis pode não estar rodando ou porta está bloqueada`);
            console.error(`   Solução:`);
            console.error(`   1. Verificar se Redis está rodando: docker service ls`);
            console.error(`   2. Verificar logs: docker service logs estacaoterapia_redis --tail 50`);
            console.error(`   3. Se Redis foi redeployado, aguardar mais tempo para inicializar`);
        } else if (errorMsg.includes('ETIMEDOUT') || errorMsg.includes('EHOSTUNREACH')) {
            console.error(`❌ [IORedis] Timeout/Host não alcançável: Conexão com Redis expirou`);
            console.error(`   Análise:`);
            console.error(`   • Host: ${configHost}`);
            console.error(`   • Port: ${configPort}`);
            console.error(`   • DB: ${configDb}`);
            console.error(`   • Auth: ${passwordInfo}`);
            console.error(`   Causa: Latência alta, firewall bloqueando ou containers em redes diferentes`);
            console.error(`   Solução:`);
            console.error(`   1. Verificar ping: docker exec <container> ping ${configHost}`);
            console.error(`   2. Verificar conectividade: docker exec <container> nc -zv ${configHost} ${configPort}`);
            console.error(`   3. Ambos no Swarm? docker service ls`);
        } else if (errorMsg.includes('WRONGPASS') || errorMsg.includes('invalid password')) {
            console.error(`❌ [IORedis] Erro de autenticação: Senha incorreta`);
            console.error(`   Análise:`);
            console.error(`   • Host: ${configHost}`);
            console.error(`   • Port: ${configPort}`);
            console.error(`   • DB: ${configDb}`);
            console.error(`   • Auth: SIM (senha não confere)`);
            console.error(`   Causa: Senha no REDIS_PASSWORD não bate com a configurada no Redis`);
            console.error(`   Solução:`);
            console.error(`   1. Verificar REDIS_PASSWORD no arquivo de secrets`);
            console.error(`   2. Verificar requirepass no Redis: docker exec <redis-container> redis-cli CONFIG GET requirepass`);
            console.error(`   3. Sincronizar passwords entre os serviços`);
        } else {
            console.error(`❌ [IORedis] Erro: ${errorMsg}`);
            console.error(`   Host: ${configHost}, Port: ${configPort}, DB: ${configDb}, Auth: ${passwordInfo}`);
        }
        // Não mata o processo, apenas loga o erro
        // O retryStrategy cuida das reconexões
    });

    ioredisClient.on("close", () => {
        console.warn("⚠️  [IORedis] Status: CLOSE - Conexão fechada, tentando reconectar...");
    });

    ioredisClient.on("reconnecting", (delay: number) => {
        console.log(`🔄 [IORedis] Status: RECONNECTING - Próxima tentativa em ${delay}ms...`);
    });

    ioredisClient.on("end", () => {
        console.warn("⚠️  [IORedis] Status: END - Conexão encerrada permanentemente");
        ioredisClient = null;
        ioredisConnectionPromise = null;
    });

    // Não criar promise interna para evitar unhandled rejection
    // Aguardas devem ser feitas via waitForIORedisReady()

    // Se estiver usando lazyConnect, iniciar conexão explicitamente sem bloquear
    try {
        if (ioredisClient && (redisConfig as any).lazyConnect) {
            ioredisClient.connect().catch(err => {
                console.error("❌ [IORedis] Erro ao conectar explicitamente:", err);
            });
        }
    } catch (err) {
        console.error("❌ [IORedis] Falha ao iniciar conexão explícita:", (err as Error)?.message || err);
    }

    return ioredisClient;
}

/**
 * Shutdown gracioso
 */
/**
 * Aguarda a conexão IORedis estar pronta E valida com ping
 * Útil quando você precisa garantir que a conexão está realmente pronta antes de usar
 * Timeout aumentado para Docker Swarm (DNS pode ser lento)
 */
export const waitForIORedisReady = async (timeoutMs = 60000): Promise<IORedis> => {
    let client = getIORedisClient();
    const config = getRedisConfig();
    const passwordInfo = config.password ? `(com senha: ${config.password.substring(0, 3)}...${config.password.substring(config.password.length - 3)})` : '(sem senha)';

    // Log diagnóstico inicial
    console.log(`📡 [IORedis] Iniciando aguardar conexão pronta...`);
    console.log(`   Status atual: ${client.status}`);
    console.log(`   Host: ${config.host}:${config.port}`);
    console.log(`   DB: ${config.db}`);
    console.log(`   Auth: ${passwordInfo}`);
    console.log(`   Timeout: ${timeoutMs}ms`);

    // Se já está pronto, retorna imediatamente e limpa qualquer promise antiga
    if (client.status === 'ready' || client.status === 'connect') {
        if (ioredisConnectionPromise) {
            ioredisConnectionPromise = null;
        }
        try {
            await client.ping();
            console.log('✅ [IORedis] Conexão validada com ping');
            return client;
        } catch (err) {
            console.warn('⚠️ [IORedis] Cliente em status ready/connect mas ping falhou, aguardando reconexão...');
            // Reinicia conexão para evitar promessas travadas
            try {
                client.removeAllListeners();
                client.disconnect();
                client.quit().catch(() => { });
            } catch (closeErr) {
                console.warn('⚠️ [IORedis] Falha ao reiniciar conexão:', closeErr);
            }
            ioredisClient = null;
            ioredisConnectionPromise = null;
            client = getIORedisClient();
        }
    }
    // Ignora promessas antigas para evitar TIMEOUT com status ready
    if (ioredisConnectionPromise) {
        console.warn('⚠️ [IORedis] Promise pendente detectada, ignorando e aguardando eventos...');
        ioredisConnectionPromise = null;
    }

    // Se não há promise, aguarda o cliente conectar
    return new Promise<IORedis>((resolve, reject) => {
        const timeout = setTimeout(() => {
            console.error(`⏰ [IORedis] TIMEOUT aguardando conexão (${timeoutMs}ms)`);
            console.error(`   Diagnóstico da rede:`);
            console.error(`   • Host: ${config.host}`);
            console.error(`   • Port: ${config.port}`);
            console.error(`   • DB: ${config.db}`);
            console.error(`   • Auth: ${passwordInfo}`);
            // Limpa listeners para evitar leaks
            if (client.removeAllListeners) client.removeAllListeners('ready');
            if (client.removeAllListeners) client.removeAllListeners('error');
            reject(new Error('Timeout aguardando IORedis conectar'));
        }, timeoutMs);

        const onReady = async () => {
            clearTimeout(timeout);
            if (ioredisClient && ioredisClient.status === 'ready') {
                try {
                    await ioredisClient.ping();
                    console.log('✅ [IORedis] Conexão pronta e validada com ping');
                    // Limpa listeners
                    if (client.removeAllListeners) client.removeAllListeners('ready');
                    if (client.removeAllListeners) client.removeAllListeners('error');
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
            const errorMsg = err?.message || String(err);
            console.error(`❌ [IORedis] Erro durante conexão: ${errorMsg}`);
            console.error(`   Auth: ${passwordInfo}`);
            // Limpa listeners
            if (client.removeAllListeners) client.removeAllListeners('ready');
            if (client.removeAllListeners) client.removeAllListeners('error');
            reject(err);
        };

        if (client.status === 'ready') {
            clearTimeout(timeout);
            client.ping()
                .then(() => {
                    console.log('✅ [IORedis] Cliente pronto e respondendo');
                    if (client.removeAllListeners) client.removeAllListeners('ready');
                    if (client.removeAllListeners) client.removeAllListeners('error');
                    resolve(client);
                })
                .catch((pingErr) => {
                    console.error('❌ [IORedis] Ping falhou:', pingErr);
                    reject(new Error('Cliente pronto mas não responde ao ping'));
                });
        } else {
            console.log(`⏳ [IORedis] Aguardando status ready (atual: ${client.status})...`);
            console.log(`   Host: ${config.host}:${config.port}, DB: ${config.db}`);
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
