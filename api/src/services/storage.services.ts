import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
// Garante que a URL do projeto seja correta (ex.: troca 'storage.supabase.co' por 'supabase.co' se necessário)
const projectUrl = supabaseUrl?.includes('.storage.supabase.co')
    ? supabaseUrl.replace('.storage.supabase.co', '.supabase.co')
    : supabaseUrl;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Bucket de documentos: usa variável de ambiente ou fallback baseado no ambiente
// Em produção, configure SUPABASE_BUCKET=estacao_upload_documents_prd
// Em pré-produção, configure SUPABASE_BUCKET=estacao_upload_documents_pre
export const STORAGE_BUCKET = process.env.SUPABASE_BUCKET || "estacao_upload_documents_pre";

// Bucket público para uploads de imagens/avatares (URLs públicas)
// Em produção, configure SUPABASE_BUCKET_PUBLIC=estacao_upload_img_prd_public
export const STORAGE_BUCKET_PUBLIC = process.env.SUPABASE_BUCKET_PUBLIC || "estacao_public_uploads";

// Bucket público para documentos de políticas e termos (URLs públicas)
// Use estacao_upload_documents_pub para acesso público aos documentos
export const STORAGE_BUCKET_DOCUMENTS_PUBLIC = process.env.SUPABASE_BUCKET_DOCUMENTS_PUBLIC || "estacao_upload_documents_pub";

// Log para debug (mostra qual bucket está sendo usado)
console.log('[Storage] Configuração dos buckets:', {
    STORAGE_BUCKET,
    STORAGE_BUCKET_PUBLIC,
    STORAGE_BUCKET_DOCUMENTS_PUBLIC,
    hasServiceRoleKey: !!supabaseServiceRoleKey,
    supabaseUrl: supabaseUrl?.substring(0, 50) + '...'
});
const shouldCheckBucketOnStartup = process.env.SUPABASE_CHECK_BUCKET_ON_STARTUP === "true";

if (!projectUrl || !supabaseAnonKey) {
    throw new Error("SUPABASE_URL ou SUPABASE_ANON_KEY não definidos");
}

// Client público (RLS aplicado)
export const supabase = createClient(projectUrl, supabaseAnonKey, {
    auth: {
        persistSession: false,
        autoRefreshToken: false,
    }
});

// Client admin (ignora RLS) — usar apenas para operações elevadas no backend
// Configurações adicionais para garantir que funcione corretamente com Storage
export const supabaseAdmin = supabaseServiceRoleKey
    ? createClient(projectUrl, supabaseServiceRoleKey, {
        auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false,
        },
        // Configuração específica para Storage API
        db: {
            schema: 'public'
        }
    })
    : undefined;

// Validação da configuração do Supabase Admin
if (supabaseAdmin && supabaseServiceRoleKey) {
    // Verifica se a chave não está vazia ou com espaços
    const trimmedKey = supabaseServiceRoleKey.trim();
    if (trimmedKey.length === 0) {
        console.error('[Storage] ⚠️ SUPABASE_SERVICE_ROLE_KEY está vazia ou contém apenas espaços!');
    } else if (trimmedKey.length < 100) {
        console.warn('[Storage] ⚠️ SUPABASE_SERVICE_ROLE_KEY parece estar incorreta (muito curta). A service role key geralmente tem mais de 100 caracteres.');
    }

    // Log parcial da chave para debug (apenas primeiros e últimos 4 caracteres)
    const keyPreview = trimmedKey.length > 8
        ? `${trimmedKey.substring(0, 4)}...${trimmedKey.substring(trimmedKey.length - 4)}`
        : '***';
    console.log('[Storage] Service Role Key configurada:', {
        keyLength: trimmedKey.length,
        keyPreview,
        projectUrl: projectUrl?.substring(0, 50) + '...'
    });
} else {
    console.error('[Storage] ❌ SUPABASE_SERVICE_ROLE_KEY não está configurada! Uploads não funcionarão.');
}

/**
 * Verifica se o bucket configurado existe no Supabase Storage (requer service role).
 * @returns Promise<boolean>
 */
export async function bucketDevuploadExists(): Promise<boolean> {
    if (!supabaseAdmin) {
        throw new Error("SUPABASE_SERVICE_ROLE_KEY não definido para operações de Storage administrativas");
    }

    const { data, error } = await supabaseAdmin.storage.listBuckets();

    if (error) {
        console.error("Erro ao listar buckets:", error.message);
        throw error;
    }
    return data?.some((bucket) => bucket.name === STORAGE_BUCKET) ?? false;
}

// Opcional: testa se o bucket existe ao iniciar o serviço (controlado por env)
if (shouldCheckBucketOnStartup) {
    (async () => {
        try {
            const exists = await bucketDevuploadExists();
            console.log(`Bucket '${STORAGE_BUCKET ?? "<não definido>"}' existe?`, exists);
        } catch (err) {
            console.error("Erro ao verificar bucket no startup:", err instanceof Error ? err.message : err);
        }
    })();
}

/**
 * Interface para o resultado da geração de URL assinada
 */
export interface SignedUrlResult {
    signedUrl: string;
    expiresAt: Date;
}

/**
 * Interface para opções de geração de URL assinada
 */
export interface SignedUrlOptions {
    bucket?: string;
    expiresIn?: number; // em segundos
    download?: boolean | string; // true, false, ou nome do arquivo para download
    transform?: {
        width?: number;
        height?: number;
        resize?: 'cover' | 'contain' | 'fill';
        format?: 'origin' | 'webp';
        quality?: number;
    };
}

/**
 * Gera uma URL assinada temporária para acesso a um arquivo privado no Supabase Storage.
 * 
 * @param filePath - Caminho completo do arquivo no bucket (ex: 'uploads/docs/abc.pdf')
 * @param options - Opções para configurar a URL assinada
 * @returns Promise com a URL assinada e data de expiração
 * 
 * @example
 * ```typescript
 * const result = await createSignedUrl('uploads/docs/document.pdf', {
 *   expiresIn: 300,
 *   download: 'meu-documento.pdf'
 * });
 * console.log(result.signedUrl);
 * ```
 */
const resolveStoragePath = (inputPath: string, fallbackBucket: string) => {
    if (!inputPath) {
        return { bucket: fallbackBucket, path: inputPath };
    }
    if (!/^https?:\/\//i.test(inputPath)) {
        return { bucket: fallbackBucket, path: inputPath };
    }
    // Tenta extrair bucket e path do formato padrão do Supabase
    const match = inputPath.match(/storage\/v1\/object\/(public|sign)\/([^\/]+)\/(.+)$/);
    if (match && match[2] && match[3]) {
        return { bucket: match[2], path: match[3].split("?")[0] };
    }
    // Fallback: tenta localizar o bucket esperado na URL
    const idx = inputPath.lastIndexOf(`/${fallbackBucket}/`);
    if (idx !== -1) {
        return {
            bucket: fallbackBucket,
            path: inputPath.substring(idx + fallbackBucket.length + 2).split("?")[0]
        };
    }
    // Último fallback: retorna só o final do caminho
    const parts = inputPath.split("?")[0].split("/");
    return { bucket: fallbackBucket, path: parts.slice(-2).join("/") };
};

export async function createSignedUrl(
    filePath: string,
    options: SignedUrlOptions = {}
): Promise<SignedUrlResult> {
    if (!supabaseAdmin) {
        throw new Error("SUPABASE_SERVICE_ROLE_KEY não definido para operações de Storage administrativas");
    }

    const {
        bucket = STORAGE_BUCKET,
        expiresIn = 120, // padrão: 2 minutos
        download = false,
        transform
    } = options;

    if (!bucket) {
        throw new Error("Bucket não especificado e SUPABASE_BUCKET não definido");
    }

    // Validações
    if (expiresIn < 1 || expiresIn > 31536000) { // máximo 1 ano
        throw new Error("expiresIn deve estar entre 1 segundo e 1 ano (31536000 segundos)");
    }

    if (!filePath || filePath.trim() === '') {
        throw new Error("filePath não pode ser vazio");
    }

    const resolved = resolveStoragePath(filePath, bucket);
    const normalizedFilePath = resolved.path;
    const resolvedBucket = resolved.bucket || bucket;

    // Configurar opções de download
    const signOptions: any = {
        expiresIn
    };

    if (download) {
        signOptions.download = typeof download === 'string' ? download : true;
    }

    if (transform) {
        signOptions.transform = transform;
    }

    const { data, error } = await supabaseAdmin
        .storage
        .from(resolvedBucket)
        .createSignedUrl(normalizedFilePath, expiresIn, signOptions);

    if (error) {
        throw new Error(`Erro ao gerar URL assinada: ${error.message}`);
    }

    if (!data?.signedUrl) {
        throw new Error("URL assinada não foi gerada");
    }

    const expiresAt = new Date(Date.now() + expiresIn * 1000);

    return {
        signedUrl: data.signedUrl,
        expiresAt
    };
}

/**
 * Gera múltiplas URLs assinadas de uma vez.
 * 
 * @param filePaths - Array de caminhos de arquivos
 * @param options - Opções para configurar as URLs assinadas (aplicadas a todos)
 * @returns Promise com array de resultados (pode conter erros individuais)
 * 
 * @example
 * ```typescript
 * const results = await createSignedUrls([
 *   'uploads/docs/doc1.pdf',
 *   'uploads/docs/doc2.pdf'
 * ], { expiresIn: 300 });
 * ```
 */
export async function createSignedUrls(
    filePaths: string[],
    options: SignedUrlOptions = {}
): Promise<Array<SignedUrlResult | { error: string; filePath: string }>> {
    const promises = filePaths.map(async (filePath) => {
        try {
            return await createSignedUrl(filePath, options);
        } catch (err) {
            return {
                error: err instanceof Error ? err.message : 'Erro desconhecido',
                filePath
            };
        }
    });

    return Promise.all(promises);
}

/**
 * Verifica se um arquivo existe no bucket.
 * 
 * @param filePath - Caminho do arquivo no bucket
 * @param bucket - Nome do bucket (opcional, usa STORAGE_BUCKET por padrão)
 * @returns Promise<boolean> - true se o arquivo existe
 * 
 * @example
 * ```typescript
 * const exists = await fileExists('uploads/docs/document.pdf');
 * if (exists) {
 *   // processar arquivo
 * }
 * ```
 */
export async function fileExists(
    filePath: string,
    bucket: string = STORAGE_BUCKET
): Promise<boolean> {
    if (!supabaseAdmin) {
        throw new Error("SUPABASE_SERVICE_ROLE_KEY não definido");
    }

    if (!bucket) {
        throw new Error("Bucket não especificado");
    }

    const resolved = resolveStoragePath(filePath, bucket);
    const normalized = resolved.path;
    const resolvedBucket = resolved.bucket || bucket;

    try {
        const dir = normalized.includes('/') ? normalized.substring(0, normalized.lastIndexOf('/')) : '';
        const filename = normalized.includes('/') ? normalized.substring(normalized.lastIndexOf('/') + 1) : normalized;

        const { data, error } = await supabaseAdmin
            .storage
            .from(resolvedBucket)
            .list(dir, {
                search: filename
            });

        if (error) return false;
        return data && data.length > 0;
    } catch {
        return false;
    }
}

/**
 * Deleta um arquivo do bucket.
 * 
 * @param filePath - Caminho do arquivo no bucket
 * @param bucket - Nome do bucket (opcional, usa STORAGE_BUCKET por padrão)
 * @returns Promise<boolean> - true se deletado com sucesso
 * 
 * @example
 * ```typescript
 * const deleted = await deleteFile('uploads/docs/old-document.pdf');
 * ```
 */
export async function deleteFile(
    filePath: string,
    bucket: string = STORAGE_BUCKET
): Promise<boolean> {
    if (!supabaseAdmin) {
        throw new Error("SUPABASE_SERVICE_ROLE_KEY não definido");
    }

    if (!bucket) {
        throw new Error("Bucket não especificado");
    }

    const resolved = resolveStoragePath(filePath, bucket);
    const normalized = resolved.path;
    const resolvedBucket = resolved.bucket || bucket;

    const { error } = await supabaseAdmin
        .storage
        .from(resolvedBucket)
        .remove([normalized]);

    if (error) {
        throw new Error(`Erro ao deletar arquivo: ${error.message}`);
    }

    return true;
}

/**
 * Faz download de um arquivo do bucket e retorna o buffer e o contentType.
 */
export async function downloadFile(
    filePath: string,
    bucket: string = STORAGE_BUCKET
): Promise<{ buffer: Buffer; contentType: string | null; fileName: string }> {
    if (!supabaseAdmin) {
        throw new Error("SUPABASE_SERVICE_ROLE_KEY não definido");
    }

    if (!bucket) {
        throw new Error("Bucket não especificado");
    }

    const resolved = resolveStoragePath(filePath, bucket);
    const normalized = resolved.path;
    const resolvedBucket = resolved.bucket || bucket;
    const fileName = normalized.includes("/") ? normalized.split("/").pop() || "documento" : normalized;

    const { data, error } = await supabaseAdmin
        .storage
        .from(resolvedBucket)
        .download(normalized);

    if (error || !data) {
        throw new Error(`Erro ao baixar arquivo: ${error?.message || "desconhecido"}`);
    }

    const arrayBuffer = await data.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const contentType = data.type || null;

    return { buffer, contentType, fileName };
}

/**
 * Faz upload de um arquivo para o bucket.
 * 
 * @param filePath - Caminho onde o arquivo será salvo no bucket
 * @param file - Buffer ou File do arquivo
 * @param options - Opções de upload
 * @returns Promise com o caminho do arquivo salvo
 * 
 * @example
 * ```typescript
 * const path = await uploadFile(
 *   'uploads/docs/document.pdf',
 *   fileBuffer,
 *   { contentType: 'application/pdf', upsert: false }
 * );
 * ```
 */
export async function uploadFile(
    filePath: string,
    file: Buffer | File,
    options: {
        bucket?: string;
        contentType?: string;
        cacheControl?: string;
        upsert?: boolean;
    } = {}
): Promise<{ path: string; fullUrl: string }> {
    const {
        bucket = STORAGE_BUCKET,
        contentType = 'application/octet-stream',
        cacheControl = '3600',
        upsert = false
    } = options;

    if (!bucket) {
        throw new Error("Bucket não especificado");
    }

    // Log para debug
    console.log('[uploadFile] Configuração:', {
        bucket,
        filePath,
        contentType,
        fileSize: file instanceof Buffer ? file.length : (file && typeof file === 'object' && 'size' in file ? (file as any).size : 0),
        hasSupabaseAdmin: !!supabaseAdmin,
        hasSupabase: !!supabase,
        projectUrl: projectUrl?.substring(0, 50) + '...', // Log parcial da URL por segurança
        bucketExists: bucket ? 'verificando...' : 'não especificado'
    });

    // Sempre usar supabaseAdmin para uploads, pois buckets privados requerem service role key
    // Usar cliente público pode causar erro de "signature verification failed"
    if (!supabaseAdmin) {
        throw new Error(
            "SUPABASE_SERVICE_ROLE_KEY não definido. " +
            "Uploads para buckets privados requerem service role key para evitar erros de verificação de assinatura. " +
            "Configure a variável de ambiente SUPABASE_SERVICE_ROLE_KEY."
        );
    }

    const clientToUse = supabaseAdmin;

    try {
        const { data, error } = await clientToUse
            .storage
            .from(bucket)
            .upload(filePath, file, {
                contentType,
                cacheControl,
                upsert
            });

        if (error) {
            console.error('[uploadFile] Erro do Supabase:', {
                message: error.message,
                statusCode: (error as any).statusCode,
                error: error
            });

            // Mensagens de erro mais específicas
            if (error.message?.toLowerCase().includes('bucket not found') ||
                error.message?.toLowerCase().includes('not found')) {
                throw new Error(
                    `Bucket '${bucket}' não encontrado no Supabase Storage. ` +
                    `Verifique se o bucket existe e se a variável de ambiente SUPABASE_BUCKET está configurada corretamente. ` +
                    `Erro original: ${error.message}`
                );
            }

            if (error.message?.toLowerCase().includes('fetch failed') ||
                error.message?.toLowerCase().includes('network')) {
                throw new Error(
                    `Erro de conexão com Supabase Storage. ` +
                    `Verifique sua conexão com a internet e as configurações SUPABASE_URL. ` +
                    `Erro original: ${error.message}`
                );
            }

            // Tratamento específico para erro de verificação de assinatura
            if (error.message?.toLowerCase().includes('signature verification failed') ||
                error.message?.toLowerCase().includes('signature') ||
                (error as any).statusCode === '403' || (error as any).status === 403) {
                throw new Error(
                    `Erro de verificação de assinatura no Supabase Storage. ` +
                    `Isso geralmente ocorre quando a SUPABASE_SERVICE_ROLE_KEY não está configurada ou está incorreta. ` +
                    `Verifique se a variável de ambiente SUPABASE_SERVICE_ROLE_KEY está definida corretamente. ` +
                    `Erro original: ${error.message}`
                );
            }

            throw new Error(`Erro ao fazer upload: ${error.message}`);
        }

        if (!data?.path) {
            throw new Error("Upload não retornou o caminho do arquivo");
        }

        console.log('[uploadFile] Upload bem-sucedido:', {
            path: data.path,
            bucket
        });

        // Obter URL pública do arquivo
        const { data: urlData } = clientToUse.storage.from(bucket).getPublicUrl(data.path);
        const publicUrl = urlData?.publicUrl || `${projectUrl}/storage/v1/object/public/${bucket}/${data.path}`;

        return {
            path: data.path,
            fullUrl: publicUrl
        };
    } catch (err) {
        // Log detalhado do erro
        console.error('[uploadFile] Erro capturado:', {
            error: err,
            message: err instanceof Error ? err.message : 'Erro desconhecido',
            stack: err instanceof Error ? err.stack : undefined
        });
        throw err;
    }
}
