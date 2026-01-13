import { useEffect, useState, useCallback, useRef } from 'react';
import { api } from '@/lib/axios';

interface PaymentStatus {
    transactionId: string;
    status: 'PENDING' | 'CONFIRMADO' | 'FALHOU';
    message?: string;
    planoAtivado?: boolean;
    consultasAtualizadas?: number; 
}

interface UsePaymentStatusPollingOptions {
    transactionId?: string;
    onSuccess?: (status: PaymentStatus) => void;
    onError?: (error: Error) => void;
    onStatusChange?: (status: 'PENDING' | 'CONFIRMADO' | 'FALHOU') => void;
    pollInterval?: number; // em ms, padrão 3000
    maxAttempts?: number; // máximo de verificações, padrão 20 (1 minuto)
}

/**
 * Hook para polling de status de pagamento
 * Verifica periodicamente o status de uma transação
 * 
 * @example
 * const { status, isPolling } = usePaymentStatusPolling({
 *   transactionId: 'abc-123',
 *   onSuccess: (status) => console.log('Pagamento confirmado!'),
 *   pollInterval: 3000,
 * });
 */
export function usePaymentStatusPolling(
    options: UsePaymentStatusPollingOptions = {}
) {
    const {
        transactionId,
        onSuccess,
        onError,
        onStatusChange,
        pollInterval = 3000,
        maxAttempts = 20,
    } = options;

    const [status, setStatus] = useState<'PENDING' | 'CONFIRMADO' | 'FALHOU'>('PENDING');
    const [isPolling, setIsPolling] = useState(false);
    const [attempts, setAttempts] = useState(0);
    const [error, setError] = useState<Error | null>(null);
    const [paymentData, setPaymentData] = useState<PaymentStatus | null>(null);
    const intervalRef = useRef<NodeJS.Timeout | undefined>(undefined);
    const mountedRef = useRef(true);

    const checkStatus = useCallback(async () => {
        if (!transactionId) return;

        try {
            const response = await api.get<PaymentStatus>(
                `/transactions/${transactionId}/status`
            );

            if (!mountedRef.current) return;

            const newStatus = response.data.status;
            setPaymentData(response.data);

            // Se status mudou
            if (newStatus !== status) {
                setStatus(newStatus);
                onStatusChange?.(newStatus);

                // Se completou, executar callback e parar polling
                if (newStatus === 'CONFIRMADO') {
                    onSuccess?.(response.data);
                    setIsPolling(false);
                    if (intervalRef.current) clearInterval(intervalRef.current);
                } else if (newStatus === 'FALHOU') {
                    const err = new Error(
                        response.data.message || 'Pagamento falhou'
                    );
                    setError(err);
                    onError?.(err);
                    setIsPolling(false);
                    if (intervalRef.current) clearInterval(intervalRef.current);
                }
            }

            // Incrementar tentativas
            setAttempts((prev) => {
                const next = prev + 1;
                if (next >= maxAttempts) {
                    setIsPolling(false);
                    if (intervalRef.current) clearInterval(intervalRef.current);
                    // Timeout - ainda não finalizou
                    console.warn(
                        `Pagamento não processado após ${maxAttempts} tentativas`
                    );
                }
                return next;
            });
        } catch (err) {
            if (!mountedRef.current) return;

            const error = err instanceof Error ? err : new Error('Erro ao verificar status');
            console.error('Erro ao verificar status de pagamento:', error);
            setError(error);
            onError?.(error);

            // Continuar tentando mesmo com erro
            setAttempts((prev) => {
                const next = prev + 1;
                if (next >= maxAttempts) {
                    setIsPolling(false);
                    if (intervalRef.current) clearInterval(intervalRef.current);
                }
                return next;
            });
        }
    }, [transactionId, status, onSuccess, onError, onStatusChange, maxAttempts]);

    useEffect(() => {
        mountedRef.current = true;

        if (!transactionId || status !== 'PENDING') {
            return;
        }

        setIsPolling(true);
        setAttempts(0);

        // Fazer primeira verificação imediatamente
        checkStatus();

        // Depois fazer polling
        intervalRef.current = setInterval(() => {
            checkStatus();
        }, pollInterval);

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [transactionId, checkStatus, pollInterval, status]);

    useEffect(() => {
        return () => {
            mountedRef.current = false;
        };
    }, []);

    return {
        status,
        isPolling,
        attempts,
        error,
        paymentData,
        // Force check (útil para buttons manuais)
        checkNow: checkStatus,
    };
}
