import SibApiV3Sdk from "sib-api-v3-sdk";
import fs from "fs";
import path from "path";
import { renderEmail } from "../templates/emailUtils";

// Diretório de assets dos templates
// Tenta múltiplos caminhos para compatibilidade com desenvolvimento e Docker
const getTemplateAssetsDir = (): string => {
    const possiblePaths = [
        path.resolve(__dirname, "..", "templates", "assets"), // Caminho após compilação (dist/templates/assets)
        path.resolve(__dirname, "..", "..", "src", "templates", "assets"), // Caminho de desenvolvimento
        path.resolve(process.cwd(), "dist", "templates", "assets"), // Caminho absoluto do dist
        path.resolve(process.cwd(), "src", "templates", "assets"), // Caminho absoluto do src (dev)
    ];

    console.log(`[SendEmail] Procurando assets em:`);
    for (const dirPath of possiblePaths) {
        console.log(`  - ${dirPath}`);
        try {
            if (fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory()) {
                // Verifica se há arquivos no diretório
                const files = fs.readdirSync(dirPath);
                if (files.length > 0) {
                    console.log(`[SendEmail] ✓ Assets encontrados em: ${dirPath} (${files.length} arquivos)`);
                    return dirPath;
                } else {
                    console.log(`[SendEmail] Diretório vazio: ${dirPath}`);
                }
            }
        } catch (e: unknown) {
            // Continua tentando outros caminhos
            console.log(`[SendEmail] Erro ao verificar ${dirPath}:`, e instanceof Error ? e.message : String(e));
        }
    }

    // Retorna o caminho padrão mesmo se não existir (será tratado no código)
    const defaultPath = path.resolve(__dirname, "..", "templates", "assets");
    console.warn(`[SendEmail] ⚠ Assets não encontrados em nenhum caminho. Usando padrão: ${defaultPath}`);
    console.warn(`[SendEmail] __dirname: ${__dirname}`);
    console.warn(`[SendEmail] process.cwd(): ${process.cwd()}`);
    return defaultPath;
};

const TEMPLATE_ASSETS_DIR = getTemplateAssetsDir();

// Imagens obrigatórias do layout base (inline via CID)
const LAYOUT_REQUIRED_IMAGES = [
    'logo.svg',
    'facebook.png',
    'instagram.png',
    'linkedin.png',
    'tiktok.png',
    'youtube.png',
];

interface EmailOptions {
    to: string;
    subject: string;
    text?: string;
    htmlTemplate?: string;
    templateData?: Record<string, unknown>;
    attachments?: Array<{
        filename: string;
        path?: string;
        content?: Buffer | string; // Buffer ou string (base64)
        contentType?: string;
        cid?: string; // Content-ID (inline image)
    }>;
}

const brevoClient = new SibApiV3Sdk.TransactionalEmailsApi();
const defaultClient = SibApiV3Sdk.ApiClient.instance;

/**
 * Permite configurar a API Key dinamicamente
 */
export const useBrevo = (apiKey: string) => {
    defaultClient.authentications["api-key"].apiKey = apiKey;
};

/**
 * Configuração padrão via ENV
 */
defaultClient.authentications["api-key"].apiKey =
    process.env.BREVO_API_KEY || "";

/**
 * Carrega e renderiza o template
 */
const loadTemplate = (templateName: string, data: Record<string, unknown>): string => {
    try {
        return renderEmail(templateName, data);
    } catch {
        const templatePath = path.join(
            __dirname,
            "..",
            "templates",
            `${templateName}.html`
        );

        let template = fs.readFileSync(templatePath, "utf8");

        for (const key in data) {
            const regex = new RegExp(`{{${key}}}`, "g");
            template = template.replace(regex, String(data[key] ?? ""));
        }

        return template;
    }
};

/**
 * Converte HTML para texto simples (fallback)
 */
const toPlainText = (html: string): string =>
    html
        .replace(/<style[\s\S]*?<\/style>/gi, "")
        .replace(/<script[\s\S]*?<\/script>/gi, "")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim();

/**
 * Envio de email transacional
 */
export const sendEmail = async (options: EmailOptions): Promise<void> => {
    // ===== Validações =====
    if (!options.to || typeof options.to !== "string" || !options.to.trim()) {
        throw new Error(`Email destinatário inválido: "${options.to}"`);
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(options.to.trim())) {
        throw new Error(`Formato de email inválido: "${options.to}"`);
    }

    const emailTo = options.to.trim();
    console.log("[SendEmail] Enviando para:", emailTo);

    // ===== Ano dinâmico (calculado no envio) =====
    const year = new Date().getFullYear();

    // ===== HTML =====
    let html = "";

    if (options.htmlTemplate) {
        const isRawHtml =
            options.htmlTemplate.trim().startsWith("<!DOCTYPE") ||
            options.htmlTemplate.trim().startsWith("<html") ||
            options.htmlTemplate.trim().startsWith("<div");

        html = isRawHtml
            ? options.htmlTemplate
            : loadTemplate(options.htmlTemplate, {
                year,
                ...(options.templateData || {}),
            });
    } else {
        html = options.text || "";
    }

    const text = options.text || (html ? toPlainText(html) : "");

    // ===== Sender =====
    const sender = {
        email: process.env.EMAIL_FROM || "contact@estacaoterapia.com",
        name: process.env.EMAIL_FROM_NAME || "Estação Terapia",
    };

    const to = [
        {
            email: emailTo,
            name: options.templateData?.nome || emailTo,
        },
    ];

    // ===== Attachments (CID / inline images) =====
    // Carrega automaticamente todas as imagens encontradas em templates/assets
    let autoAssets: Array<{ filename: string; path: string; cid: string; contentType?: string }> = [];

    // Tenta encontrar o diretório de assets (pode ter mudado após compilação)
    const assetsDir = getTemplateAssetsDir();

    try {
        if (!fs.existsSync(assetsDir)) {
            console.warn(`[SendEmail] Diretório de assets não existe: ${assetsDir}`);
            console.warn(`[SendEmail] __dirname atual: ${__dirname}`);
            console.warn(`[SendEmail] process.cwd(): ${process.cwd()}`);
        } else {
            const files = fs.readdirSync(assetsDir, { withFileTypes: true });
            autoAssets = files
                .filter((d) => d.isFile())
                .map((d) => {
                    const abs = path.join(assetsDir, d.name);
                    const ext = path.extname(d.name).toLowerCase();
                    const mime = ext === ".svg" ? "image/svg+xml"
                        : ext === ".png" ? "image/png"
                            : ext === ".jpg" || ext === ".jpeg" ? "image/jpeg"
                                : ext === ".gif" ? "image/gif"
                                    : ext === ".webp" ? "image/webp"
                                        : undefined;

                    // Apenas imagens entram como inline; outros arquivos (pdf, etc) são ignorados aqui
                    const isImage = Boolean(mime);
                    if (!isImage) {
                        console.log(`[SendEmail] Ignorando asset não-imagem para inline: ${d.name}`);
                        return null;
                    }

                    if (!fs.existsSync(abs)) {
                        console.warn(`[SendEmail] Arquivo de asset não encontrado: ${abs}`);
                        return null;
                    }

                    return {
                        filename: d.name,
                        path: abs,
                        cid: d.name, // inline cid
                        contentType: mime,
                    };
                })
                .filter((asset): asset is NonNullable<typeof asset> => asset !== null);

            // Valida imagens obrigatórias do layout
            const loadedNames = new Set(autoAssets.map((a) => a.filename));
            const missingLayout = LAYOUT_REQUIRED_IMAGES.filter((img) => !loadedNames.has(img));
            if (missingLayout.length > 0) {
                console.warn(`[SendEmail] ⚠️ Imagens obrigatórias do layout não encontradas: ${missingLayout.join(', ')}`);
            } else {
                console.log(`[SendEmail] ✅ Todas as imagens obrigatórias do layout foram carregadas (${LAYOUT_REQUIRED_IMAGES.length})`);
            }

            console.log(`[SendEmail] ${autoAssets.length} assets carregados automaticamente`);
        }
    } catch (e: unknown) {
        const errorMessage = e instanceof Error ? e.message : String(e);
        console.error("[SendEmail] Erro ao ler templates/assets:", errorMessage);
        console.error("[SendEmail] Tentando caminho:", assetsDir);
    }

    // Mescla anexos explícitos com os carregados automaticamente, evitando duplicidade por filename
    const explicit = options.attachments ?? [];
    const merged = [...explicit];
    const explicitNames = new Set(explicit.map((a) => a.filename));
    for (const asset of autoAssets) {
        if (!explicitNames.has(asset.filename)) {
            merged.push({ filename: asset.filename, path: asset.path, cid: asset.cid, contentType: asset.contentType });
        }
    }

    type AttachmentData = {
        name: string;
        content: string;
        contentId?: string;
        contentType?: string;
    };

    const attachments: AttachmentData[] =
        merged
            .map((att) => {
                let base64Content: string | null = null;

                // Se já tem content (Buffer ou string), usa diretamente
                if (att.content) {
                    if (Buffer.isBuffer(att.content)) {
                        // Se é Buffer, converte para base64
                        base64Content = att.content.toString("base64");
                    } else if (typeof att.content === "string") {
                        // Se já é string, assume que pode ser base64 ou converte
                        // Se não parece base64, tenta converter
                        if (att.content.match(/^[A-Za-z0-9+/=]+$/)) {
                            // Parece base64, usa direto
                            base64Content = att.content;
                        } else {
                            // Não é base64, converte de string para base64
                            base64Content = Buffer.from(att.content).toString("base64");
                        }
                    }
                } else if (att.path) {
                    // Se tem path, lê o arquivo como Buffer e converte para base64
                    try {
                        const fileBuffer = fs.readFileSync(att.path);
                        base64Content = fileBuffer.toString("base64");
                    } catch (error: unknown) {
                        const errorMessage = error instanceof Error ? error.message : String(error);
                        console.error(`[SendEmail] Erro ao ler arquivo ${att.path}:`, errorMessage);
                        return null;
                    }
                }

                if (!base64Content) return null;

                interface AttachmentData {
                    name: string;
                    content: string;
                    contentId?: string;
                    contentType?: string;
                }

                const attachment: AttachmentData = {
                    name: att.filename,
                    content: base64Content, // Brevo espera base64 string
                };

                if (att.cid) {
                    // Content-ID deve ter o formato <filename> para inline images
                    // O HTML usa cid:filename (sem <>), mas a API espera <filename>
                    attachment.contentId = `<${att.cid}>`; // 👈 INLINE IMAGE
                }

                if (att.contentType) {
                    attachment.contentType = att.contentType;
                }

                console.log(
                    "[SendEmail] 📎 Anexo:",
                    att.filename,
                    att.cid ? `(CID: ${attachment.contentId}, HTML usa: cid:${att.cid})` : "(anexo normal)",
                    att.contentType ? `[${att.contentType}]` : "",
                    `(${base64Content.length} bytes base64)`,
                    att.cid ? `[INLINE - deve aparecer no HTML]` : `[ANEXO - download separado]`,
                    `[Buffer primeiro 20 bytes: ${base64Content.substring(0, 20)}...]`
                );

                return attachment;
            })
            .filter((att): att is AttachmentData => att !== null) || [];

    // ===== Payload =====
    const emailData = {
        sender,
        to,
        subject: options.subject,
        htmlContent: html,
        textContent: text,
        // Envia apenas attachments com imagens inline (cid)
        attachments,
    } as Record<string, unknown>;

    // Log detalhado dos attachments antes de enviar
    if (attachments.length > 0) {
        console.log(`[SendEmail] 📎 Lista de attachments a serem enviados:`);
        attachments.forEach((att, index) => {
            console.log(`  ${index + 1}. ${att.name} (CID: ${att.contentId || 'sem CID'}, Content-Type: ${att.contentType || 'não especificado'})`);
        });
    } else {
        console.warn(`[SendEmail] ⚠️ Nenhum attachment carregado! As imagens podem não aparecer no email.`);
    }

    console.log("[SendEmail] 📦 Payload pronto:", {
        to: emailTo,
        subject: options.subject,
        attachments: attachments.length,
        htmlLength: html.length,
    });

    // ===== Envio =====
    try {
        const response = await brevoClient.sendTransacEmail(emailData);
        console.log("[SendEmail] ✓ Email enviado com sucesso");
        console.log("[SendEmail] Response:", JSON.stringify(response, null, 2));
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error("[SendEmail] ✗ Erro ao enviar email:", errorMessage);
        throw error;
    }
};
