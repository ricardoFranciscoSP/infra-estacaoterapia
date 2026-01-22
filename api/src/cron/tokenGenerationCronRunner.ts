import { waitForIORedisReady } from '../config/redis.config';
import { startTokenGenerationCron } from './tokenGenerationCron';

async function bootstrap(): Promise<void> {
    try {
        await waitForIORedisReady(60000);
        startTokenGenerationCron();
    } catch (error) {
        console.error('❌ [TokenCron] Falha ao iniciar cron de tokens:', error);
        process.exit(1);
    }
}

bootstrap();
