'use server';

import { cookies } from 'next/headers';
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';
import { User } from '@/store/authStore';

// Configuração dos cookies (para dados de usuário salvos pelo Next.js)
const COOKIE_OPTIONS = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
};

const USER_COOKIE_NAME = 'user-data';
const ONBOARDING_COOKIE_NAME = 'onboarding-data';
const USER_COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 dias

type UserLike = User | { Id?: string; id?: string } | null;

const COOKIE_ENCRYPTION_PREFIX = 'v1';

function getCookieSecret(): string | null {
    return (
        process.env.USER_COOKIE_SECRET ||
        process.env.NEXTAUTH_SECRET ||
        process.env.AUTH_SECRET ||
        process.env.JWT_SECRET ||
        null
    );
}

function toBase64Url(data: Buffer): string {
    return data
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/g, '');
}

function fromBase64Url(data: string): Buffer {
    const padded = data.replace(/-/g, '+').replace(/_/g, '/').padEnd(data.length + (4 - (data.length % 4 || 4)), '=');
    return Buffer.from(padded, 'base64');
}

function encryptCookieValue(value: string): string | null {
    const secret = getCookieSecret();
    if (!secret) {
        console.warn('[auth] USER_COOKIE_SECRET não configurada; cookie não será salvo.');
        return null;
    }
    const key = createHash('sha256').update(secret).digest();
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', key, iv);
    const ciphertext = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();

    return [
        COOKIE_ENCRYPTION_PREFIX,
        toBase64Url(iv),
        toBase64Url(ciphertext),
        toBase64Url(tag),
    ].join('.');
}

function decryptCookieValue(value: string): string {
    if (!value.startsWith(`${COOKIE_ENCRYPTION_PREFIX}.`)) {
        return value;
    }

    const parts = value.split('.');
    if (parts.length !== 4) {
        throw new Error('[auth] Cookie criptografado inválido.');
    }

    const [, ivPart, cipherPart, tagPart] = parts;
    const secret = getCookieSecret();
    if (!secret) {
        throw new Error('[auth] USER_COOKIE_SECRET não configurada para descriptografar cookies.');
    }
    const key = createHash('sha256').update(secret).digest();
    const iv = fromBase64Url(ivPart);
    const ciphertext = fromBase64Url(cipherPart);
    const tag = fromBase64Url(tagPart);

    const decipher = createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);

    const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return decrypted.toString('utf8');
}

/**
 * Define o cookie do usuário no servidor (apenas dados do usuário, NÃO tokens)
 * Os tokens de autenticação (token, refreshToken, role) são setados pelo BACKEND
 */
export async function setUserCookie(user: UserLike) {
    const userId = user && typeof user === 'object' ? (user as { Id?: string; id?: string }).Id ?? (user as { Id?: string; id?: string }).id : undefined;
    console.log('[setUserCookie] Salvando dados do usuário...', { hasUser: !!user, userId });
    const cookieStore = await cookies();

    if (user) {
        const userJson = JSON.stringify(user);
        const encrypted = encryptCookieValue(userJson);
        if (encrypted) {
            cookieStore.set(USER_COOKIE_NAME, encrypted, {
                ...COOKIE_OPTIONS,
                maxAge: USER_COOKIE_MAX_AGE,
            });
            console.log('[setUserCookie] ✅ Cookie user-data salvo com sucesso');
        } else {
            cookieStore.delete(USER_COOKIE_NAME);
        }
    } else {
        cookieStore.delete(USER_COOKIE_NAME);
    }
}

/**
 * Obtém o cookie do usuário do servidor
 */
export async function getUserCookie(): Promise<User | null> {
    const cookieStore = await cookies();
    const userCookie = cookieStore.get(USER_COOKIE_NAME);

    if (!userCookie?.value) {
        return null;
    }

    try {
        const decrypted = decryptCookieValue(userCookie.value);
        return JSON.parse(decrypted);
    } catch {
        return null;
    }
}

/**
 * Remove o cookie do usuário
 */
export async function removeUserCookie() {
    const cookieStore = await cookies();
    cookieStore.delete(USER_COOKIE_NAME);
}

/**
 * Define o cookie de onboarding no servidor
 */
export async function setOnboardingCookie(onboarding: unknown | null) {
    const cookieStore = await cookies();

    if (onboarding) {
        cookieStore.set(ONBOARDING_COOKIE_NAME, JSON.stringify(onboarding), {
            ...COOKIE_OPTIONS,
            maxAge: USER_COOKIE_MAX_AGE,
        });
    } else {
        cookieStore.delete(ONBOARDING_COOKIE_NAME);
    }
}

/**
 * Obtém o cookie de onboarding do servidor
 */
export async function getOnboardingCookie(): Promise<unknown | null> {
    const cookieStore = await cookies();
    const onboardingCookie = cookieStore.get(ONBOARDING_COOKIE_NAME);

    if (!onboardingCookie?.value) {
        return null;
    }

    try {
        return JSON.parse(onboardingCookie.value);
    } catch {
        return null;
    }
}

/**
 * Remove o cookie de onboarding
 */
export async function removeOnboardingCookie() {
    const cookieStore = await cookies();
    cookieStore.delete(ONBOARDING_COOKIE_NAME);
}

/**
 * Limpa todos os cookies de autenticação
 * Os cookies HttpOnly (token, refreshToken, role) são limpos pelo BACKEND
 * Aqui limpamos apenas os cookies do Next.js (user-data, onboarding-data)
 */
export async function clearAuthCookies() {
    console.log('[clearAuthCookies] Limpando cookies do Next.js...');
    const cookieStore = await cookies();

    // Remove cookies da aplicação Next.js
    cookieStore.delete(USER_COOKIE_NAME);
    cookieStore.delete(ONBOARDING_COOKIE_NAME);

    console.log('[clearAuthCookies] ✅ Cookies do Next.js limpos');
    console.log('[clearAuthCookies] ℹ️ Cookies HttpOnly (token, refreshToken, role) são limpos pelo BACKEND');
}
