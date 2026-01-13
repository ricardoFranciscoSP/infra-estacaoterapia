import { NextResponse } from 'next/server';

interface VindiConfigPreviewResponse {
    vindiPublicKey: string;
}

interface VindiErrorResponse {
    error: string;
    message: string;
}

/**
 * API Route para fornecer preview da chave pública da Vindi em runtime
 * Isso resolve o problema de NEXT_PUBLIC_* serem hardcoded no build
 * Para obter a chave completa, use /api/vindi-config/key
 */
export async function GET(): Promise<NextResponse<VindiConfigPreviewResponse | VindiErrorResponse>> {
    try {
        const vindiPublicKey = process.env.NEXT_PUBLIC_VINDI_PUBLIC_KEY || process.env.VINDI_PUBLIC_KEY;

        // Valida se a chave pública está configurada
        if (!vindiPublicKey || vindiPublicKey.includes('__PLACEHOLDER_')) {
            return NextResponse.json<VindiErrorResponse>(
                {
                    error: 'Chave pública da Vindi não configurada',
                    message: 'A variável NEXT_PUBLIC_VINDI_PUBLIC_KEY ou VINDI_PUBLIC_KEY não está configurada corretamente no servidor.'
                },
                { status: 500 }
            );
        }

        // Retorna apenas preview (para validação)
        return NextResponse.json<VindiConfigPreviewResponse>({
            vindiPublicKey: vindiPublicKey.substring(0, 8) + '...' // Apenas preview por segurança
        });
    } catch (error) {
        console.error('Erro ao obter configuração da Vindi:', error);
        return NextResponse.json<VindiErrorResponse>(
            {
                error: 'Erro interno do servidor',
                message: 'Não foi possível obter as configurações da Vindi.'
            },
            { status: 500 }
        );
    }
}

