/**
 * Tipo para erros do Axios
 */
export interface AxiosErrorResponse {
  response?: {
    data?: {
      error?: string;
      message?: string;
      code?: string;
    };
    status?: number;
  };
}

/**
 * Type guard para verificar se um erro é do tipo AxiosErrorResponse
 */
export function isAxiosError(error: unknown): error is AxiosErrorResponse {
  return (
    typeof error === 'object' &&
    error !== null &&
    'response' in error
  );
}

