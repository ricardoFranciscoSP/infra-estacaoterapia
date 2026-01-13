import { NextResponse } from 'next/server';

/**
 * Health check endpoint para monitoramento do Docker
 * Retorna status 200 se a aplicação estiver funcionando
 */
export async function GET() {
    try {
        return NextResponse.json(
            {
                status: 'healthy',
                timestamp: new Date().toISOString(),
                service: 'estacao-nextjs',
                environment: process.env.NODE_ENV || 'unknown',
            },
            { status: 200 }
        );
    } catch (error) {
        return NextResponse.json(
            {
                status: 'unhealthy',
                error: error instanceof Error ? error.message : 'Unknown error',
                timestamp: new Date().toISOString(),
            },
            { status: 503 }
        );
    }
}

