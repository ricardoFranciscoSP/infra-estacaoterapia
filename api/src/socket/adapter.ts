import { Server } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import { getIORedisClient } from "../config/redis.config";
import IORedis from "ioredis";

let adapterInitialized = false;

/**
 * Inicializa Redis Adapter para Socket.IO
 * Usa IORedis que suporta .duplicate() para criar clientes separados para pub/sub
 */
export async function initRedisAdapter(
    io: Server,
    options: { host: string; port: number; db: number }
) {
    if (adapterInitialized) {
        console.log("🔹 Redis Adapter já inicializado, pulando...");
        return;
    }

    const { host, port, db } = options;
    console.log(`🔹 Conectando Redis Adapter em ${host}:${port}, DB=${db}...`);

    try {
        // Usa a conexão singleton existente do IORedis
        let pubClient = getIORedisClient();
        if (!pubClient) {
            console.error('❌ [Socket.IO] Redis Adapter não inicializado: IORedis indisponível.');
            throw new Error('IORedis cliente não disponível');
        }

        // Aguarda conexão estar pronta se necessário
        const { waitForIORedisReady } = await import("../config/redis.config");
        if (pubClient.status !== 'ready' && pubClient.status !== 'connect') {
            console.log(`⏳ [Socket.IO] Aguardando conexão Redis estar pronta (status: ${pubClient.status})...`);
            try {
                pubClient = await waitForIORedisReady(15000);
            } catch (err) {
                console.error(`❌ [Socket.IO] Falha ao aguardar conexão Redis: ${(err as Error)?.message}`);
                throw new Error(`Redis não está pronto: ${(err as Error)?.message}`);
            }
        }

        // Verifica se está conectado
        const pubIsReady = pubClient.status === 'ready' || pubClient.status === 'connect';
        if (!pubIsReady) {
            console.warn(`⚠️ [Socket.IO] Redis pubClient não está pronto. Status: ${pubClient.status}`);
        }

        // Cria cliente separado para subscribe usando duplicate
        const subClient = pubClient.duplicate();

        // Adiciona handlers de erro ao subClient (duplicate() não herda listeners)
        subClient.on('error', (err) => {
            console.error('❌ [Socket.IO Redis Adapter] Erro no subClient:', err.message);
        });

        subClient.on('ready', () => {
            console.log('✅ [Socket.IO Redis Adapter] subClient pronto');
        });

        subClient.on('connect', () => {
            console.log('🔌 [Socket.IO Redis Adapter] subClient conectado');
        });

        subClient.on('close', () => {
            console.warn('⚠️ [Socket.IO Redis Adapter] subClient fechado');
        });

        subClient.on('reconnecting', (delay: number) => {
            console.log(`🔄 [Socket.IO Redis Adapter] subClient reconectando em ${delay}ms...`);
        });

        // Verifica se subClient está pronto
        const subIsReady = subClient.status === 'ready' || subClient.status === 'connect';

        // Espera pela conexão de ambos os clientes se necessário
        if (!pubIsReady || !subIsReady) {
            console.log(`🔹 Aguardando conexão do Redis para Adapter (pub: ${pubClient.status}, sub: ${subClient.status})...`);
            await Promise.all([
                new Promise<void>((resolve, reject) => {
                    if (pubClient.status === 'ready' || pubClient.status === 'connect') {
                        resolve();
                        return;
                    }
                    let resolved = false;
                    const timeout = setTimeout(() => {
                        if (!resolved) {
                            resolved = true;
                            reject(new Error('Timeout aguardando pubClient'));
                        }
                    }, 15000);
                    const onReady = () => { 
                        if (!resolved) { 
                            resolved = true; 
                            clearTimeout(timeout); 
                            resolve(); 
                        } 
                    };
                    const onError = (err: Error) => { 
                        if (!resolved) { 
                            resolved = true; 
                            clearTimeout(timeout); 
                            reject(err); 
                        } 
                    };
                    pubClient.once('ready', onReady);
                    pubClient.once('error', onError);
                }),
                new Promise<void>((resolve, reject) => {
                    if (subClient.status === 'ready' || subClient.status === 'connect') {
                        resolve();
                        return;
                    }
                    let resolved = false;
                    const timeout = setTimeout(() => {
                        if (!resolved) {
                            resolved = true;
                            reject(new Error('Timeout aguardando subClient'));
                        }
                    }, 15000);
                    const onReady = () => { 
                        if (!resolved) { 
                            resolved = true; 
                            clearTimeout(timeout); 
                            resolve(); 
                        } 
                    };
                    const onError = (err: Error) => { 
                        if (!resolved) { 
                            resolved = true; 
                            clearTimeout(timeout); 
                            reject(err); 
                        } 
                    };
                    subClient.once('ready', onReady);
                    subClient.once('error', onError);
                })
            ]);
            console.log('✅ Ambos os clientes Redis estão prontos');
        }

        // Configura o adapter
        io.adapter(createAdapter(pubClient, subClient));
        adapterInitialized = true;
        console.log("✅ Redis Adapter Socket.IO inicializado com sucesso");
        console.log("   Pub client status:", pubClient.status);
        console.log("   Sub client status:", subClient.status);
        console.log("   ✅ Socket.IO está pronto para múltiplas instâncias com Redis Adapter");
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.error("❌ Erro Redis Adapter Socket.IO:", message);
        throw new Error(`Falha crítica ao inicializar Redis Adapter: ${message}`);
    }
}
