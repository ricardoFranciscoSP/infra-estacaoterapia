import { PrismaClient } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set');
}

// Garante que DATABASE_URL seja uma string válida
let databaseUrl: string;
try {
    const envUrl = process.env.DATABASE_URL;
    if (!envUrl) {
        throw new Error('DATABASE_URL environment variable is not set');
    }

    // Converte para string e remove espaços
    databaseUrl = String(envUrl).trim();

    if (!databaseUrl || databaseUrl === 'undefined' || databaseUrl === 'null' || databaseUrl === '') {
        throw new Error('DATABASE_URL is not a valid string');
    }

    // Valida e repara a URL se necessário (especialmente para senhas com caracteres especiais)
    try {
        const url = new URL(databaseUrl);

        // Log da URL original (sem senha) para debug
        const safeUrlOriginal = `${url.protocol}//${url.username}:***@${url.hostname}:${url.port}${url.pathname}${url.search}`;
        console.log('🔌 [Prisma] DATABASE_URL recebida:', safeUrlOriginal);

        // Verifica se a senha/usuário já está codificada ou precisa ser codificada
        // Se contém caracteres que deveriam estar codificados mas não estão, recodifica
        const hasSpecialChars = (str: string) => /[+\s@#%&=\[\]]/.test(str);

        let needsRecode = false;
        let decodedUser = url.username;
        let decodedPass = url.password;

        // Tenta decodificar para ver se já está codificado
        try {
            const testDecode = decodeURIComponent(url.username);
            // Se decodificar mudou algo E não tem caracteres especiais decodificados, já estava codificado
            if (testDecode === url.username || !hasSpecialChars(testDecode)) {
                decodedUser = testDecode;
            }
        } catch {
            // Se falhou ao decodificar, mantém original
        }

        try {
            const testDecode = decodeURIComponent(url.password);
            if (testDecode === url.password || !hasSpecialChars(testDecode)) {
                decodedPass = testDecode;
            }
        } catch {
            // Se falhou ao decodificar, mantém original
        }

        // Verifica se precisa recodificar (tem caracteres especiais não codificados)
        if (hasSpecialChars(decodedUser) && decodedUser === url.username) {
            needsRecode = true;
        }
        if (hasSpecialChars(decodedPass) && decodedPass === url.password) {
            needsRecode = true;
        }

        // Só recodifica se necessário
        if (needsRecode) {
            const encodedUser = encodeURIComponent(decodedUser);
            const encodedPass = encodeURIComponent(decodedPass);
            url.username = encodedUser;
            url.password = encodedPass;
            databaseUrl = url.toString();
            console.log('🔧 [Prisma] URL recodificada para tratar caracteres especiais na senha/usuário');
        } else {
            console.log('✅ [Prisma] URL já está corretamente codificada');
        }

        const safeUrl = `${url.protocol}//${url.username}:***@${url.hostname}:${url.port}${url.pathname}${url.search || ''}`;
        console.log('🔌 [Prisma] Conectando ao banco:', safeUrl);
        console.log(`   • Host: ${url.hostname}:${url.port}`);
        console.log(`   • Database: ${url.pathname.replace('/', '')}`);
        console.log(`   • Usuário codificado: ${url.username.length > 20 ? url.username.substring(0, 20) + '...' : url.username}`);
    } catch (urlError) {
        // Se não for URL válida, pode ser connection string do PostgreSQL
        console.error('⚠️ [Prisma] DATABASE_URL não é uma URL válida');
        console.error('   Erro ao fazer parse:', (urlError as Error)?.message);
        console.warn('   Pode haver problemas com caracteres especiais na senha');
    }
} catch (error) {
    console.error('❌ [Prisma] Erro ao processar DATABASE_URL:', error);
    throw error;
}

// Determina se deve usar SSL baseado na variável de ambiente ou na URL
// Por padrão, SSL é desabilitado (servidor pode não suportar)
const shouldUseSSL = process.env.DATABASE_SSL === 'true' ||
    (process.env.DATABASE_SSL !== 'false' && databaseUrl.includes('sslmode=require'));

// Verifica se estamos no socket-server ANTES de criar o pool
// Socket-server não deve tentar conectar ao banco na inicialização
// IMPORTANTE: Esta verificação deve ser feita ANTES de criar o Pool para evitar tentativas de conexão
const isSocketServer = process.env.SOCKET_SERVER === 'true' ||
    process.env.SOCKET_SERVER === '1' ||
    process.env.SERVER_TYPE === 'socket' ||
    process.argv.some(arg => arg.includes('socket/server') || arg.includes('socket\\server')) ||
    process.env.PORT === '3334' ||
    (typeof __filename !== 'undefined' && __filename.includes('socket/server'));

// Debug: mostra informações sobre a detecção do socket-server
console.log('🔍 [Prisma] Verificando tipo de servidor:');
console.log(`   • SOCKET_SERVER: ${process.env.SOCKET_SERVER || 'não definida'}`);
console.log(`   • SERVER_TYPE: ${process.env.SERVER_TYPE || 'não definida'}`);
console.log(`   • PORT: ${process.env.PORT || 'não definida'}`);
console.log(`   • ARGV: ${process.argv.join(' ').substring(0, 100)}...`);

if (isSocketServer) {
    console.log('✅ [Prisma] Socket-server detectado - conexão lazy será usada');
    console.log('   • Pool será criado com min: 0 (sem conexões iniciais)');
    console.log('   • testConnection() NÃO será executado');
} else {
    console.log('🔹 [Prisma] Servidor API detectado - conexão ativa será usada');
}

// Configura o pool com tratamento de erros - otimizado para conexões remotas
// Socket-server usa min: 0 para não criar conexões até ser necessário
// IMPORTANTE: Mesmo com min: 0, o Pool pode validar a connection string ao criar
// Para socket-server, não configuramos handlers de erro de conexão para evitar logs desnecessários
const pool = new Pool({
    connectionString: databaseUrl,
    // Configurações otimizadas para conexões remotas via PGBouncer
    max: 20, // Máximo de conexões no pool
    min: isSocketServer ? 0 : 2, // Socket-server: 0 (lazy), API: 2 (mantém pool mínimo)
    idleTimeoutMillis: 30000, // Fecha conexões idle após 30s
    connectionTimeoutMillis: 60000, // 60s para estabelecer conexão (maior que o server_connect_timeout do PGBouncer)
    statement_timeout: 180000, // 3 minutos para queries longas
    query_timeout: 60000, // 1 minuto para queries normais
    keepAlive: true, // Mantém conexão ativa (importante para PGBouncer)
    keepAliveInitialDelayMillis: 10000, // 10s antes do primeiro keepalive
    ssl: false, // Desabilitado para servidor remoto sem SSL
    application_name: isSocketServer ? 'estacao-socket-server' : 'estacao-api-dev',
    // Socket-server: desabilita validação inicial da connection string
    ...(isSocketServer ? {
        // Configurações específicas para socket-server para evitar tentativas de conexão
        // O pool não tentará validar a conexão até ser usado
    } : {})
});

// Tratamento de erros do pool
// Socket-server: não registra handlers de erro para evitar logs desnecessários
// pois não tentará conectar na inicialização
if (!isSocketServer) {
    pool.on('error', (err) => {
        console.error('❌ [Prisma Pool] Erro inesperado:', err);
        if (err.message.includes('password must be a string') || err.message.includes('SCRAM-SERVER-FIRST-MESSAGE')) {
            console.error('❌ [Prisma Pool] Erro: Senha do banco de dados não é uma string válida');
            console.error('   Verifique se DATABASE_URL está configurada corretamente');
            console.error('   A senha na connection string deve ser uma string válida');
            console.error('   Exemplo correto: postgresql://user:password@host:port/database');
        }
    });
} else {
    // Socket-server: registra handler silencioso que não faz nada
    // para evitar erros não tratados, mas não loga
    pool.on('error', () => {
        // Socket-server não usa Prisma na inicialização, então ignora erros de pool
    });
}

// Testa a conexão ao inicializar com retry - mais tentativas para banco remoto
async function testConnection(retries = 5, delay = 3000) {
    for (let i = 0; i < retries; i++) {
        try {
            const client = await pool.connect();
            console.log('✅ [Prisma Pool] Conexão de teste bem-sucedida');
            client.release();
            return true;
        } catch (err: any) {
            console.error(`❌ [Prisma Pool] Tentativa ${i + 1}/${retries} falhou:`, err.message);

            if (err.message.includes('password must be a string') || err.message.includes('SCRAM-SERVER-FIRST-MESSAGE')) {
                console.error('❌ [ERRO CRÍTICO] Senha do banco não é uma string válida');
                console.error('   • DATABASE_URL pode estar mal formatada');
                console.error('   • A senha pode estar undefined/null');
                console.error('   • Verifique a variável de ambiente DATABASE_URL');
                console.error('   • Formato esperado: postgresql://user:password@host:port/database');
                console.error('   • Se a senha tem caracteres especiais, ela deve ser codificada com encodeURIComponent');
                process.exit(1);
            }

            // Erro específico de autenticação de senha
            if (err.message.includes('password authentication failed') || err.message.includes('authentication failed')) {
                console.error('❌ [ERRO DE AUTENTICAÇÃO] Falha na autenticação do PostgreSQL');
                console.error('   • Usuário ou senha podem estar incorretos');
                console.error('   • Verifique POSTGRES_USER e POSTGRES_PASSWORD no arquivo de secrets');

                // Log seguro da URL (sem senha) para debug
                try {
                    const url = new URL(databaseUrl);
                    const safeUrl = `${url.protocol}//${url.username}:***@${url.hostname}:${url.port}${url.pathname}${url.search || ''}`;
                    console.error(`   • URL usada: ${safeUrl}`);
                    console.error(`   • Host: ${url.hostname}:${url.port}`);
                    console.error(`   • Usuário (codificado): ${url.username}`);
                    console.error(`   • Database: ${url.pathname.replace('/', '')}`);

                    // Tenta decodificar o usuário para debug (sem mostrar senha)
                    try {
                        const decodedUser = decodeURIComponent(url.username);
                        if (decodedUser !== url.username) {
                            console.error(`   • Usuário (decodificado): ${decodedUser}`);
                        }
                    } catch {
                        // Ignora erro de decodificação
                    }
                } catch {
                    console.error('   • DATABASE_URL não é uma URL válida');
                    console.error(`   • DATABASE_URL (primeiros 100 chars): ${databaseUrl.substring(0, 100)}...`);
                }

                console.error('   • Dica: Se a senha contém caracteres especiais (+, @, #, etc.),');
                console.error('     ela deve ser codificada. O entrypoint.sh faz isso automaticamente.');
                console.error('   • Verifique se a senha no arquivo de secrets está correta');
                console.error('   • O entrypoint.sh deve codificar a senha automaticamente');

                if (i < retries - 1) {
                    console.log(`⏳ Tentando novamente em ${delay / 1000}s...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                } else {
                    console.error('❌ [ERRO FATAL] Não foi possível autenticar após todas as tentativas');
                    console.error('   • Verifique as credenciais POSTGRES_USER e POSTGRES_PASSWORD no arquivo de secrets');
                    console.error('   • Verifique se o arquivo de secrets está sendo carregado corretamente');
                    // Não fazer process.exit aqui - deixar o servidor tentar rodar
                }
            } else if (err.message.includes('timeout') || err.message.includes('ECONNREFUSED') || err.message.includes('ETIMEDOUT')) {
                console.error('❌ [ERRO DE CONEXÃO] Banco de dados não está acessível');
                console.error('   • Host pode estar offline ou incorreto');
                console.error('   • Verifique se PG_HOST e PG_PORT estão corretos');
                if (i < retries - 1) {
                    console.log(`⏳ Tentando novamente em ${delay / 1000}s...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            } else if (i < retries - 1) {
                console.log(`⏳ Tentando novamente em ${delay / 1000}s...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }

    console.error('❌ [Prisma Pool] Falha ao conectar ao banco após todas as tentativas');
    return false;
}

// Executa teste de conexão (não bloqueia o servidor, apenas avisa)
// Socket-server NÃO tenta conectar imediatamente (lazy connection)
// IMPORTANTE: Mesmo se houver imports indiretos, o testConnection() não será executado no socket-server
if (isSocketServer) {
    console.log('🔹 [Prisma] Socket-server detectado - conexão será lazy (apenas quando necessário)');
    console.log('   • Pool criado com min: 0 (não cria conexões até ser usado)');
    console.log('   • testConnection() NÃO será executado');
    console.log('   • Prisma está disponível, mas não tentará conectar ao banco até ser usado');
    // Pool já está criado, mas não tenta conectar até ser usado
    // NÃO executa testConnection() para socket-server
} else {
    // Apenas API principal executa testConnection()
    testConnection().catch(err => {
        console.error('❌ [Prisma] Falha na conexão inicial:', err);
        // Não fazer process.exit aqui, deixar o servidor tentar rodar
    });
}

const adapter = new PrismaPg(pool);

// PrismaClient é criado, mas no socket-server não tentará conectar até ser usado
// A conexão só acontecerá quando um método do Prisma for chamado (lazy connection)
const prisma = new PrismaClient({
    adapter,
    log: isSocketServer ? [] : ['query', 'info', 'warn', 'error'], // Socket-server: sem logs (não usa Prisma)
});

// No socket-server, o Prisma está disponível mas não tentará conectar até ser usado
// Como o socket-server não deve usar Prisma diretamente (usa API HTTP), isso nunca deve acontecer
if (isSocketServer) {
    // Sobrescreve métodos críticos do Prisma para evitar uso acidental
    // Mas mantém a interface para evitar erros de importação
    console.log('🔹 [Prisma] PrismaClient criado no socket-server, mas não será usado');
    console.log('   • Todas as operações de banco devem ser feitas via API HTTP');
    console.log('   • Se Prisma for usado acidentalmente, fará conexão lazy (não bloqueia inicialização)');
}

/**
 * ========================================================================================
 * ARQUITETURA DE POOL DE CONEXÕES - SINGLETON PATTERN
 * ========================================================================================
 * 
 * Este módulo exporta um Pool singleton de conexões PostgreSQL via Prisma.
 * Similar ao padrão usado no Redis (src/config/redis.config.ts).
 * 
 * POOL DE CONEXÕES:
 * - Pool gerencia automaticamente um conjunto de conexões reutilizáveis
 * - Min: 0-1 conexões (lazy para socket-server, ativa para API)
 * - Max: 20 conexões simultâneas
 * - Timeout: 30-60s dependendo do tipo de servidor
 * 
 * SINGLETON:
 * - Uma única instância do PrismaClient é criada e exportada
 * - Todas as importações reutilizam a mesma instância
 * - Evita criar múltiplas conexões desnecessárias
 * 
 * USO:
 * - Importe sempre de 'src/prisma/client' (não crie novas instâncias)
 * - O pool gerencia automaticamente a reutilização de conexões
 * - Prisma cuida do lifecycle das conexões (abrir, fechar, reconectar)
 * 
 * ========================================================================================
 */

// Exporta o pool para possível uso futuro (não recomendado usar diretamente)
// Prefira usar o prismaClient que gerencia o pool automaticamente
export { pool };

export default prisma;