import axios, {
    AxiosError,
    AxiosResponse,
    AxiosHeaders,
    InternalAxiosRequestConfig,
    RawAxiosRequestHeaders,
} from 'axios';
import { getApiUrl } from '@/config/env';

/**
 * Configuração do cliente HTTP Axios
 * 
 * Ambientes suportados:
 * - Produção: https://api-prd.estacaoterapia.com.br
 * - Homologação: https://api.pre.estacaoterapia.com.br
 * - Desenvolvimento: http://localhost:3333
 */
const getBaseURL = (): string => {
    return getApiUrl();
};

const baseURL = getBaseURL();

// Log detalhado para debug
// if (typeof window !== 'undefined') {
//     console.log('🔌 [Axios] Configuração:', {
//         baseURL,
//         hostname: window.location.hostname,
//         env: process.env.NODE_ENV,
//         hasEnvVar: !!process.env.NEXT_PUBLIC_API_URL,
//         envVarValue: process.env.NEXT_PUBLIC_API_URL || 'não definida'
//     });
// } else {
//     console.log('🔌 [Axios] Configuração (SSR):', {
//         baseURL,
//         env: process.env.NODE_ENV,
//         hasEnvVar: !!process.env.NEXT_PUBLIC_API_URL,
//         envVarValue: process.env.NEXT_PUBLIC_API_URL || 'não definida'
//     });
// }

// Cria instância do axios
export const api = axios.create({
    baseURL,
    withCredentials: true,
    timeout: 30000, // 30 segundos de timeout
});

// Interceptor de REQUEST - debug opcional
api.interceptors.request.use(
    (config: InternalAxiosRequestConfig): InternalAxiosRequestConfig => {
        // Ajusta Content-Type dinamicamente
        const hasFormData = typeof window !== 'undefined' && config.data instanceof FormData;
        if (hasFormData) {
            // Deixe o navegador definir o boundary automaticamente
            const headers = config.headers as RawAxiosRequestHeaders | AxiosHeaders | undefined;
            if (headers instanceof AxiosHeaders) {
                headers.delete('Content-Type');
                headers.delete('content-type');
            } else if (headers) {
                delete headers['Content-Type'];
                delete headers['content-type'];
            }
        } else {
            // Para requisições com corpo JSON, o axios já serializa corretamente
            // Só defina se não existir e se o método suportar corpo
            const method = (config.method || 'get').toLowerCase();
            const hasBody = ['post', 'put', 'patch', 'delete'].includes(method);
            if (hasBody) {
                const headers = config.headers as RawAxiosRequestHeaders | AxiosHeaders | undefined;
                const alreadySet = headers instanceof AxiosHeaders
                    ? (headers.get('Content-Type') || headers.get('content-type'))
                    : headers?.['Content-Type'] || headers?.['content-type'];

                if (!alreadySet) {
                    if (headers instanceof AxiosHeaders) {
                        headers.set('Content-Type', 'application/json');
                    } else if (headers) {
                        headers['Content-Type'] = 'application/json';
                    } else {
                        // cria headers compatíveis se não existir
                        config.headers = new AxiosHeaders({ 'Content-Type': 'application/json' });
                    }
                }
            }
        }
        return config;
    },
    (error: AxiosError<unknown>) => Promise.reject(error)
);

// Interceptor de RESPONSE - tratamento de erros
api.interceptors.response.use(
    (response: AxiosResponse): AxiosResponse => {
        // Log de sucesso para debug
        // console.log(`✅ [Axios] ${response.config.method?.toUpperCase()} ${response.config.url} - ${response.status}`);
        return response;
    },
    (error: AxiosError<unknown>) => {
        // Log detalhado de erro
        const url = error.config?.url || 'unknown';
        const method = error.config?.method?.toUpperCase() || 'UNKNOWN';
        const baseURL = error.config?.baseURL || '';
        const fullUrl = baseURL ? `${baseURL}${url}` : url;
        const statusCode = error.response?.status;

        // Endpoints que podem retornar erro 500 e devem ser logados de forma mais silenciosa
        const endpointsSilenciosos = [
            '/consultas-paciente/todas-realizadas',
            'consultas-paciente/todas-realizadas'
        ];

        const isEndpointSilencioso = endpointsSilenciosos.some(endpoint =>
            url.includes(endpoint) || fullUrl.includes(endpoint)
        );

        // Verifica se é timeout
        const isTimeout = error.code === 'ECONNABORTED' ||
            error.message?.includes('timeout') ||
            error.message?.includes('aborted');

        const shouldLogAsInfo = isTimeout || isEndpointSilencioso;

        if (shouldLogAsInfo) {
            // Log silencioso em dev (timeout ou endpoint silencioso)
        } else {
            // Para outros erros, loga normalmente — usa valores explícitos para evitar {} no console
            const hasResponse = !!error.response;
            const responseData = error.response?.data;
            const responsePreview = typeof responseData === 'string'
                ? responseData.substring(0, 500)
                : (responseData && typeof responseData === 'object' ? JSON.stringify(responseData).substring(0, 500) : responseData);
            
            // Constrói mensagem de erro mais descritiva
            const errorMessage = error?.message || 'Erro desconhecido';
            const errorCode = error?.code || 'sem código';
            const errorStatus = statusCode ? String(statusCode) : 'sem status';
            const errorStatusText = error.response?.statusText || '';
            const responseType = error.response?.headers?.['content-type'] || 'desconhecido';
            
            // Log formatado para evitar objetos vazios
            if (fullUrl.includes('/psicologo/consultas/em-andamento') || fullUrl.includes('/consultas-paciente/em-andamento')) {
                console.error(`❌ [Axios] Erro em consulta em andamento ${method} ${fullUrl}`, {
                    message: errorMessage,
                    code: errorCode,
                    status: errorStatus,
                    statusText: errorStatusText,
                    hasResponse,
                    responseType,
                    response: responsePreview,
                    requestUrl: fullUrl,
                    stack: error instanceof Error ? error.stack : undefined,
                });
            } else {
                // Log mais limpo e informativo - sempre mostra informações úteis
                const logMessage = `❌ [Axios] Erro na requisição ${method} ${fullUrl}`;
                
                // Extrai mensagem de erro da resposta se disponível
                let errorResponseMessage = '';
                if (hasResponse && responseData) {
                    if (typeof responseData === 'object') {
                        errorResponseMessage = (responseData as { message?: string; error?: string })?.message || 
                                             (responseData as { message?: string; error?: string })?.error || 
                                             JSON.stringify(responseData);
                    } else if (typeof responseData === 'string') {
                        errorResponseMessage = responseData;
                    }
                }
                
                // Constrói objeto de log com valores sempre definidos
                const logParts: string[] = [];
                logParts.push(`Mensagem: ${errorMessage}`);
                logParts.push(`Código: ${errorCode}`);
                logParts.push(`Status: ${errorStatus}`);
                
                if (hasResponse) {
                    logParts.push(`Status Text: ${errorStatusText}`);
                    logParts.push(`Content-Type: ${responseType}`);
                    if (errorResponseMessage) {
                        logParts.push(`Erro da API: ${errorResponseMessage.substring(0, 200)}`);
                    }
                } else {
                    logParts.push(`Tipo: Erro de conexão`);
                    logParts.push(`Dica: API pode estar offline ou CORS bloqueando. Verifique se a API está rodando.`);
                }
                
                // Log como string formatada para evitar objetos vazios
                console.error(logMessage);
                console.error(logParts.join(' | '));
                
                // Também loga como objeto estruturado para debug avançado
                const logDetails: Record<string, string | number | boolean> = {
                    message: errorMessage,
                    code: errorCode,
                    status: errorStatus,
                    hasResponse,
                    requestUrl: fullUrl,
                };
                
                if (hasResponse) {
                    logDetails.statusText = errorStatusText;
                    logDetails.responseType = responseType;
                    if (errorResponseMessage) {
                        logDetails.apiError = errorResponseMessage.substring(0, 500);
                    }
                } else {
                    logDetails.connectionError = true;
                    logDetails.hint = 'API pode estar offline ou CORS bloqueando. Verifique se a API está rodando.';
                }
                
                console.error('Detalhes do erro:', logDetails);
            }
        }

        // Verifica se é erro de conexão (network error) - mas não se for timeout (já foi tratado acima)
        if (!error.response && !isTimeout) {
            const isNameNotResolved = error.code === 'ERR_NAME_NOT_RESOLVED' ||
                error.message.includes('ERR_NAME_NOT_RESOLVED') ||
                error.message.includes('getaddrinfo ENOTFOUND') ||
                error.message.includes('net::ERR_NAME_NOT_RESOLVED');

            if (isNameNotResolved) {
                // console.error('❌ [Axios] Erro de DNS - hostname não encontrado:', {
                //     baseURL: error.config?.baseURL,
                //     url: error.config?.url,
                //     message: 'O domínio da API não está resolvendo. Verifique se a URL está correta.',
                // });

                // if (error.config?.baseURL?.includes('api-pre')) {
                //     console.warn('⚠️ [Axios] Tentando usar api-pre que não existe. Use api-prd.estacaoterapia.com.br');
                // }
            } else if (!isTimeout) {
                // Só loga erro de conexão se não for timeout
                // console.error('❌ [Axios] Erro de conexão - API não está acessível:', {
                //     baseURL: error.config?.baseURL,
                //     url: error.config?.url,
                //     message: error.message,
                //     code: error.code,
                // });
            }

            // Cria erro mais descritivo para erros de conexão
            const connectionError = new Error(
                isNameNotResolved
                    ? 'Domínio da API não encontrado. Verifique se a URL está correta.'
                    : 'Não foi possível conectar à API. Verifique sua conexão e se a API está rodando.'
            ) as AxiosError<unknown>;
            connectionError.config = error.config;
            connectionError.request = error.request;
            connectionError.code = error.code;
            connectionError.message = error.message;

            return Promise.reject(connectionError);
        }

        // Se houver uma resposta, verifica se é HTML
        if (error.response) {
            const contentType = error.response.headers['content-type'] || error.response.headers['Content-Type'] || '';
            const isHtml = typeof contentType === 'string' && contentType.includes('text/html');

            if (isHtml && typeof error.response.data === 'string') {
                // Se a resposta for HTML, cria um erro mais descritivo
                // console.error('API retornou HTML em vez de JSON:', {
                //     status: error.response.status,
                //     statusText: error.response.statusText,
                //     url: error.config?.url,
                //     method: error.config?.method,
                //     responsePreview: (error.response.data as string).substring(0, 200),
                // });

                // Tenta extrair uma mensagem de erro mais útil
                let errorMessage = 'Erro ao processar resposta do servidor.';
                if (error.response.status === 404) {
                    errorMessage = 'Endpoint não encontrado. Verifique se a rota está correta.';
                } else if (error.response.status >= 500) {
                    errorMessage = 'Erro interno do servidor. Tente novamente mais tarde.';
                } else if (error.response.status === 401 || error.response.status === 403) {
                    errorMessage = 'Erro de autenticação. Faça login novamente.';
                }

                // Cria um novo erro com informações mais úteis
                const newError = new Error(errorMessage) as AxiosError<unknown>;
                newError.response = {
                    ...error.response,
                    data: {
                        message: errorMessage,
                        error: errorMessage,
                        status: error.response.status,
                    },
                } as AxiosResponse<unknown>;
                newError.config = error.config;
                newError.request = error.request;

                return Promise.reject(newError);
            }
        }

        return Promise.reject(error);
    }
);

// Nota: removido o teste automático de conexão /health no cliente.
