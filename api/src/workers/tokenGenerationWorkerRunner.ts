import { waitForIORedisReady } from '../config/redis.config';
import { startTokenGenerationWorker } from './tokenGeneration.worker';

async function bootstrap(): Promise<void> {
    try {
        await waitForIORedisReady(60000);
        await startTokenGenerationWorker();
    } catch (error) {
        console.error('❌ [TokenWorker] Falha ao iniciar worker de tokens:', error);
        process.exit(1);
    }
}

bootstrap();
