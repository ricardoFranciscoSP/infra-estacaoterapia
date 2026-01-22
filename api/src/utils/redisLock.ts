import { randomUUID } from 'crypto';
import { getIORedisClient } from '../config/redis.config';

export interface RedisLock {
    key: string;
    value: string;
    ttlSeconds: number;
}

const RELEASE_LOCK_SCRIPT =
    'if redis.call("get", KEYS[1]) == ARGV[1] then return redis.call("del", KEYS[1]) else return 0 end';

export async function acquireRedisLock(
    key: string,
    ttlSeconds: number
): Promise<RedisLock | null> {
    const client = getIORedisClient();
    const value = randomUUID();
    const result = await client.set(key, value, 'EX', ttlSeconds, 'NX');
    if (result !== 'OK') {
        return null;
    }
    return { key, value, ttlSeconds };
}

export async function releaseRedisLock(lock: RedisLock): Promise<void> {
    const client = getIORedisClient();
    try {
        await client.eval(RELEASE_LOCK_SCRIPT, 1, lock.key, lock.value);
    } catch (error) {
        console.warn(`⚠️ [RedisLock] Falha ao liberar lock ${lock.key}:`, error);
    }
}
