import { NextResponse } from 'next/server';

interface VindiConfigResponse {
    vindiPublicKey: string;
}

interface VindiErrorResponse {
    error: string;
    message: string;
    debug?: {
        nodeEnv: string | undefined;
        hasVindiPublicKey: boolean;
        hasNextPublicVindiPublicKey: boolean;
        dockerEnabled: boolean;
    };
}

/**
 * API Route para fornecer a chave pública completa da Vindi em runtime
 * 100% Compatível com Docker - lê variáveis de ambiente em tempo de execução
 * 
 * Endpoint específico para obter a chave completa (não apenas preview)
 * 
 * Esta route funciona em runtime do servidor, lendo variáveis de ambiente
 * que podem ser configuradas via:
 * - docker-compose.yml (environment section)
 * - .env files (/opt/secrets/nextjs.env)
 * - Sistema operacional
 * - Variáveis inline do Docker
 */
export async function GET(): Promise<NextResponse<VindiConfigResponse | VindiErrorResponse>> {
    try {
        // Tentar várias fontes de variáveis de ambiente
        // Prioridade: VINDI_PUBLIC_KEY > NEXT_PUBLIC_VINDI_PUBLIC_KEY
        const vindiPublicKey =
            process.env.VINDI_PUBLIC_KEY ||
            process.env.NEXT_PUBLIC_VINDI_PUBLIC_KEY;

        const isDocker = !!process.env.DOCKER_ENABLED || process.env.NODE_ENV === 'production';

        console.log('[VindiConfig API] Verificando chave pública da Vindi:', {
            hasVindiPublicKey: !!process.env.VINDI_PUBLIC_KEY,
            hasNextPublicVindiPublicKey: !!process.env.NEXT_PUBLIC_VINDI_PUBLIC_KEY,
            isPlaceholder: vindiPublicKey?.includes('__PLACEHOLDER_'),
            keyPreview: vindiPublicKey ? `${vindiPublicKey.substring(0, 8)}...${vindiPublicKey.length > 8 ? `(${vindiPublicKey.length} chars)` : ''}` : 'não encontrada',
            nodeEnv: process.env.NODE_ENV,
            dockerEnabled: isDocker,
            timestamp: new Date().toISOString()
        });

        // Valida se a chave pública está configurada
        if (!vindiPublicKey || vindiPublicKey.trim() === '') {
            console.error('[VindiConfig API] ERRO: Chave pública não encontrada', {
                timestamp: new Date().toISOString(),
                nodeEnv: process.env.NODE_ENV,
                dockerEnabled: isDocker
            });

            return NextResponse.json<VindiErrorResponse>(
                {
                    error: 'Chave pública da Vindi não configurada',
                    message: isDocker
                        ? 'A variável VINDI_PUBLIC_KEY não está configurada no Docker. Configure em: docker-compose.yml (environment), /opt/secrets/nextjs.env, ou -e VINDI_PUBLIC_KEY=sua_chave'
                        : 'A variável VINDI_PUBLIC_KEY ou NEXT_PUBLIC_VINDI_PUBLIC_KEY não está configurada. Configure no arquivo .env.local ou variáveis de ambiente.',
                    debug: {
                        nodeEnv: process.env.NODE_ENV,
                        hasVindiPublicKey: !!process.env.VINDI_PUBLIC_KEY,
                        hasNextPublicVindiPublicKey: !!process.env.NEXT_PUBLIC_VINDI_PUBLIC_KEY,
                        dockerEnabled: isDocker
                    }
                },
                { status: 500 }
            );
        }

        if (vindiPublicKey.includes('__PLACEHOLDER_')) {
            console.error('[VindiConfig API] ERRO: Chave pública contém placeholder', {
                timestamp: new Date().toISOString(),
                dockerEnabled: isDocker
            });

            return NextResponse.json<VindiErrorResponse>(
                {
                    error: 'Chave pública da Vindi contém placeholder',
                    message: isDocker
                        ? 'A variável VINDI_PUBLIC_KEY contém um placeholder. Configure o valor real no Docker (docker-compose.yml environment ou /opt/secrets/nextjs.env).'
                        : 'A variável VINDI_PUBLIC_KEY ou NEXT_PUBLIC_VINDI_PUBLIC_KEY contém um placeholder. Configure o valor real no .env.local',
                    debug: {
                        nodeEnv: process.env.NODE_ENV,
                        hasVindiPublicKey: !!process.env.VINDI_PUBLIC_KEY,
                        hasNextPublicVindiPublicKey: !!process.env.NEXT_PUBLIC_VINDI_PUBLIC_KEY,
                        dockerEnabled: isDocker
                    }
                },
                { status: 500 }
            );
        }

        console.log('[VindiConfig API] Chave pública obtida com sucesso', {
            timestamp: new Date().toISOString(),
            keyLength: vindiPublicKey.length,
            dockerEnabled: isDocker
        });

        return NextResponse.json<VindiConfigResponse>({
            vindiPublicKey: vindiPublicKey.trim()
        });
    } catch (error) {
        console.error('[VindiConfig API] Erro ao obter chave pública da Vindi:', {
            error: error instanceof Error ? error.message : String(error),
            timestamp: new Date().toISOString()
        });

        return NextResponse.json<VindiErrorResponse>(
            {
                error: 'Erro interno do servidor',
                message: 'Não foi possível obter a chave pública da Vindi. Verifique os logs do servidor.',
                debug: {
                    nodeEnv: process.env.NODE_ENV,
                    hasVindiPublicKey: !!process.env.VINDI_PUBLIC_KEY,
                    hasNextPublicVindiPublicKey: !!process.env.NEXT_PUBLIC_VINDI_PUBLIC_KEY,
                    dockerEnabled: !!process.env.DOCKER_ENABLED
                }
            },
            { status: 500 }
        );
    }
}

