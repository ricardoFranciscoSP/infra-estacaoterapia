import nodemailer, { Transporter } from "nodemailer";
import fs from "fs";
import path from "path";
import { renderEmail } from "../templates/emailUtils";

// Diretório de assets dos templates
const getTemplateAssetsDir = (): string => {
    const possiblePaths = [
        path.resolve(__dirname, "..", "templates", "assets"), // Caminho após compilação (dist/templates/assets)
        path.resolve(__dirname, "..", "..", "src", "templates", "assets"), // Caminho de desenvolvimento
        path.resolve(process.cwd(), "dist", "templates", "assets"), // Caminho absoluto do dist
        path.resolve(process.cwd(), "src", "templates", "assets"), // Caminho absoluto do src (dev)
    ];

    console.log(`[SendEmailGmail] Procurando assets em:`);
    for (const dirPath of possiblePaths) {
        console.log(`  - ${dirPath}`);
        try {
            if (fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory()) {
                const files = fs.readdirSync(dirPath);
                if (files.length > 0) {
                    console.log(`[SendEmailGmail] ✓ Assets encontrados em: ${dirPath} (${files.length} arquivos)`);
                    return dirPath;
                } else {
                    console.log(`[SendEmailGmail] Diretório vazio: ${dirPath}`);
                }
            }
        } catch (e: unknown) {
            console.log(`[SendEmailGmail] Erro ao verificar ${dirPath}:`, e instanceof Error ? e.message : String(e));
        }
    }

    const defaultPath = path.resolve(__dirname, "..", "templates", "assets");
    console.warn(`[SendEmailGmail] ⚠ Assets não encontrados em nenhum caminho. Usando padrão: ${defaultPath}`);
    return defaultPath;
};

// Imagens obrigatórias do layout base (inline via CID)
// Nota: Todas as imagens do diretório assets serão carregadas automaticamente
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
        content?: Buffer | string;
        contentType?: string;
        cid?: string; // Content-ID (inline image)
    }>;
}

// Configuração do transportador Nodemailer para Gmail
const createTransporter = (): Transporter => {
    // Verifica se está usando OAuth2 ou App Password
    const useOAuth2 = process.env.GMAIL_OAUTH2_CLIENT_ID && process.env.GMAIL_OAUTH2_CLIENT_SECRET;

    if (useOAuth2) {
        // Configuração com OAuth2 (recomendado para produção)
        console.log("[SendEmailGmail] 🔐 Configurando com OAuth2");
        console.log("[SendEmailGmail] User:", process.env.GMAIL_USER);
        console.log("[SendEmailGmail] Client ID:", process.env.GMAIL_OAUTH2_CLIENT_ID ? "✅ Definido" : "❌ Não definido");
        console.log("[SendEmailGmail] Client Secret:", process.env.GMAIL_OAUTH2_CLIENT_SECRET ? "✅ Definido" : "❌ Não definido");

        return nodemailer.createTransport({
            service: 'gmail',
            auth: {
                type: 'OAuth2',
                user: process.env.GMAIL_USER,
                clientId: process.env.GMAIL_OAUTH2_CLIENT_ID,
                clientSecret: process.env.GMAIL_OAUTH2_CLIENT_SECRET,
                refreshToken: process.env.GMAIL_OAUTH2_REFRESH_TOKEN,
                accessToken: process.env.GMAIL_OAUTH2_ACCESS_TOKEN,
            },
        });
    } else {
        // Configuração com App Password
        const gmailUser = process.env.GMAIL_USER || process.env.EMAIL_FROM;
        let gmailPass = process.env.GMAIL_APP_PASSWORD;

        // Validação e logs
        if (!gmailUser) {
            throw new Error("GMAIL_USER ou EMAIL_FROM não está definido nas variáveis de ambiente");
        }

        if (!gmailPass) {
            console.error("[SendEmailGmail] ❌ GMAIL_APP_PASSWORD não está definido!");
            console.error("[SendEmailGmail] ⚠️ IMPORTANTE: Você precisa gerar uma senha de app do Gmail.");
            console.error("[SendEmailGmail] ⚠️ A senha normal da conta NÃO funciona com SMTP.");
            console.error("[SendEmailGmail] 💡 Para gerar uma senha de app:");
            console.error("[SendEmailGmail]    1. Acesse: https://myaccount.google.com/security");
            console.error("[SendEmailGmail]    2. Ative 'Verificação em duas etapas' (obrigatório)");
            console.error("[SendEmailGmail]    3. Vá em 'Senhas de app' > 'Email' > 'Outro'");
            console.error("[SendEmailGmail]    4. Digite 'Estação Terapia' e gere a senha de 16 caracteres");
            throw new Error("GMAIL_APP_PASSWORD não está definido nas variáveis de ambiente. Você precisa gerar uma senha de app do Gmail.");
        }

        // Remove espaços e caracteres especiais da senha (Gmail gera com espaços: "abcd efgh ijkl mnop")
        const originalLength = gmailPass.length;
        gmailPass = gmailPass.trim().replace(/\s+/g, '');

        if (originalLength !== gmailPass.length) {
            console.log("[SendEmailGmail] ℹ️ Espaços removidos da senha de app (Gmail gera com espaços)");
        }

        // Logs de debug (sem mostrar a senha completa)
        console.log("[SendEmailGmail] 🔐 Configurando com App Password");
        console.log("[SendEmailGmail] User:", gmailUser);
        console.log("[SendEmailGmail] App Password:", gmailPass ? `${gmailPass.substring(0, 4)}**** (${gmailPass.length} caracteres após remoção de espaços)` : "❌ Não definido");

        // Verifica se a senha parece ser uma senha de app (16 caracteres após remover espaços)
        if (gmailPass.length !== 16) {
            console.warn("[SendEmailGmail] ⚠️ AVISO: A senha de app deve ter exatamente 16 caracteres (após remover espaços).");
            console.warn("[SendEmailGmail] ⚠️ Tamanho atual:", gmailPass.length, "caracteres");
            console.warn("[SendEmailGmail] ⚠️ Certifique-se de estar usando uma senha de app do Gmail, não a senha normal da conta.");
        }

        return nodemailer.createTransport({
            service: 'gmail',
            host: 'smtp.gmail.com',
            port: 587,
            secure: false, // true para 465, false para outras portas
            auth: {
                user: gmailUser,
                pass: gmailPass,
            },
            tls: {
                // Não rejeitar certificados não autorizados
                rejectUnauthorized: false,
            },
        });
    }
};

let transporter: Transporter | null = null;

const getTransporter = (): Transporter => {
    if (!transporter) {
        transporter = createTransporter();
    }
    return transporter;
};

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
 * Envio de email usando Gmail via Nodemailer
 */
export const sendEmailGmail = async (options: EmailOptions): Promise<void> => {
    // ===== Validações =====
    if (!options.to || typeof options.to !== "string" || !options.to.trim()) {
        throw new Error(`Email destinatário inválido: "${options.to}"`);
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(options.to.trim())) {
        throw new Error(`Formato de email inválido: "${options.to}"`);
    }

    const emailTo = options.to.trim();
    console.log("[SendEmailGmail] Enviando para:", emailTo);

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

    // ===== Validação de imagens referenciadas no HTML =====
    // Extrai todos os CIDs referenciados no HTML (src="cid:nome")
    const cidRegex = /src="cid:([^"]+)"/g;
    const referencedCids = new Set<string>();
    let match;
    while ((match = cidRegex.exec(html)) !== null) {
        referencedCids.add(match[1]);
    }
    if (referencedCids.size > 0) {
        console.log(`[SendEmailGmail] 🔍 Imagens referenciadas no HTML: ${Array.from(referencedCids).join(', ')}`);
    }

    // ===== Sender =====
    const fromEmail = process.env.GMAIL_USER || process.env.EMAIL_FROM || "contact@estacaoterapia.com";
    const fromName = process.env.EMAIL_FROM_NAME || "Estação Terapia";
    const from = `${fromName} <${fromEmail}>`;

    // ===== Attachments (CID / inline images) =====
    // Carrega automaticamente todas as imagens encontradas em templates/assets
    let autoAssets: Array<{ filename: string; path: string; cid: string; contentType?: string }> = [];

    const assetsDir = getTemplateAssetsDir();

    try {
        if (!fs.existsSync(assetsDir)) {
            console.warn(`[SendEmailGmail] Diretório de assets não existe: ${assetsDir}`);
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

                    const isImage = Boolean(mime);
                    if (!isImage) {
                        console.log(`[SendEmailGmail] ⏭️  Ignorando arquivo não-imagem: ${d.name}`);
                        return null;
                    }

                    if (!fs.existsSync(abs)) {
                        console.warn(`[SendEmailGmail] ⚠️  Arquivo de asset não encontrado: ${abs}`);
                        return null;
                    }

                    console.log(`[SendEmailGmail] ✓ Imagem carregada: ${d.name} (CID: cid:${d.name})`);

                    return {
                        filename: d.name,
                        path: abs,
                        cid: d.name, // Para Nodemailer, o CID é apenas o nome do arquivo (sem < >)
                        contentType: mime,
                    };
                })
                .filter((asset): asset is NonNullable<typeof asset> => asset !== null);

            // Valida imagens obrigatórias do layout
            const loadedNames = new Set(autoAssets.map((a) => a.filename));
            const missingLayout = LAYOUT_REQUIRED_IMAGES.filter((img) => !loadedNames.has(img));
            if (missingLayout.length > 0) {
                console.warn(`[SendEmailGmail] ⚠️  Imagens obrigatórias do layout não encontradas: ${missingLayout.join(', ')}`);
            } else {
                console.log(`[SendEmailGmail] ✅ Todas as imagens obrigatórias do layout foram carregadas (${LAYOUT_REQUIRED_IMAGES.length})`);
            }

            console.log(`[SendEmailGmail] 📦 Total de ${autoAssets.length} imagens carregadas automaticamente`);
            console.log(`[SendEmailGmail] Imagens: ${autoAssets.map(a => a.filename).join(', ')}`);

            // Valida imagens referenciadas no HTML
            if (referencedCids.size > 0) {
                const missingInAssets = Array.from(referencedCids).filter(cid => !loadedNames.has(cid));
                if (missingInAssets.length > 0) {
                    console.error(`[SendEmailGmail] ❌ CRÍTICO: Imagens referenciadas no HTML NÃO ENCONTRADAS nos assets!`);
                    console.error(`[SendEmailGmail]    Faltando: ${missingInAssets.join(', ')}`);
                    console.error(`[SendEmailGmail]    Verifique o diretório: ${assetsDir}`);
                } else {
                    console.log(`[SendEmailGmail] ✅ Todas as ${referencedCids.size} imagens referenciadas no HTML foram carregadas`);
                }
            }
        }
    } catch (e: unknown) {
        const errorMessage = e instanceof Error ? e.message : String(e);
        console.error("[SendEmailGmail] ❌ Erro ao ler templates/assets:", errorMessage);
    }

    // Mescla anexos explícitos com os carregados automaticamente
    const explicit = options.attachments ?? [];
    const merged = [...explicit];
    const explicitNames = new Set(explicit.map((a) => a.filename));
    for (const asset of autoAssets) {
        if (!explicitNames.has(asset.filename)) {
            merged.push({ filename: asset.filename, path: asset.path, cid: asset.cid, contentType: asset.contentType });
        }
    }

    // Prepara attachments para Nodemailer
    // Nodemailer usa formato diferente: cid é apenas o nome (sem < >)
    const attachments = merged
        .map((att) => {
            let fileContent: Buffer | null = null;

            // Se já tem content (Buffer ou string), usa diretamente
            if (att.content) {
                if (Buffer.isBuffer(att.content)) {
                    fileContent = att.content;
                } else if (typeof att.content === "string") {
                    // Tenta decodificar se for base64, senão usa como string
                    try {
                        fileContent = Buffer.from(att.content, "base64");
                    } catch {
                        fileContent = Buffer.from(att.content, "utf8");
                    }
                }
            } else if (att.path) {
                // Se tem path, lê o arquivo
                try {
                    fileContent = fs.readFileSync(att.path);
                } catch (error: unknown) {
                    const errorMessage = error instanceof Error ? error.message : String(error);
                    console.error(`[SendEmailGmail] Erro ao ler arquivo ${att.path}:`, errorMessage);
                    return null;
                }
            }

            if (!fileContent) return null;

            // Para Nodemailer, attachments inline usam a propriedade cid diretamente (sem < >)
            const attachment: {
                filename: string;
                content: Buffer;
                contentType?: string;
                cid?: string;
            } = {
                filename: att.filename,
                content: fileContent,
                contentType: att.contentType,
            };

            // Se tem CID, adiciona como attachment inline
            // No HTML usa cid:filename, então aqui também usa apenas o filename como CID
            if (att.cid) {
                attachment.cid = att.cid; // Nodemailer aceita apenas o nome, não precisa de < >
            }

            console.log(
                "[SendEmailGmail] 📎 Anexo:",
                att.filename,
                att.cid ? `(CID: ${att.cid}, HTML usa: cid:${att.cid})` : "(anexo normal)",
                att.contentType ? `[${att.contentType}]` : "",
                `(${fileContent.length} bytes)`,
                att.cid ? `[INLINE - deve aparecer no HTML]` : `[ANEXO - download separado]`
            );

            return attachment;
        })
        .filter((att) => att !== null);

    // ===== Mail Options =====
    const mailOptions: nodemailer.SendMailOptions = {
        from,
        to: emailTo,
        subject: options.subject,
        text: text,
        html: html,
        attachments: attachments.length > 0 ? attachments : undefined,
    };

    console.log("[SendEmailGmail] 📦 Opções de email prontas:", {
        from,
        to: emailTo,
        subject: options.subject,
        attachments: attachments.length,
    });

    // ===== Envio =====
    try {
        const mailTransporter = getTransporter();

        // Verifica conexão antes de enviar
        console.log("[SendEmailGmail] 🔍 Verificando conexão SMTP...");
        await mailTransporter.verify();
        console.log("[SendEmailGmail] ✓ Servidor SMTP verificado com sucesso");

        console.log("[SendEmailGmail] 📤 Enviando email...");
        const info = await mailTransporter.sendMail(mailOptions);
        console.log("[SendEmailGmail] ✓ Email enviado com sucesso");
        console.log("[SendEmailGmail] Message ID:", info.messageId);
        console.log("[SendEmailGmail] Response:", info.response);
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error("[SendEmailGmail] ✗ Erro ao enviar email:", errorMessage);

        // Log detalhado do erro
        if (error instanceof Error) {
            const errorAny = error as any;
            if (errorAny.code) {
                console.error("[SendEmailGmail] Erro código:", errorAny.code);
            }
            if (errorAny.response) {
                console.error("[SendEmailGmail] Resposta do servidor:", errorAny.response);
            }
            if (errorAny.responseCode) {
                console.error("[SendEmailGmail] Código de resposta:", errorAny.responseCode);
            }
        }

        // Mensagens de ajuda específicas para erros comuns
        if (errorMessage.includes("Invalid login") || errorMessage.includes("535") || errorMessage.includes("BadCredentials")) {
            console.error("\n❌ [SendEmailGmail] ERRO DE AUTENTICAÇÃO:");
            console.error("   O Gmail rejeitou as credenciais fornecidas.");
            console.error("\n💡 SOLUÇÕES:");
            console.error("   1. Verifique se GMAIL_USER está correto (deve ser o email completo)");
            console.error("   2. Certifique-se de estar usando uma SENHA DE APP, não a senha normal");
            console.error("   3. Para gerar uma senha de app:");
            console.error("      - Acesse: https://myaccount.google.com/security");
            console.error("      - Ative 'Verificação em duas etapas' (se não estiver ativada)");
            console.error("      - Vá em 'Senhas de app' > 'Email' > 'Outro'");
            console.error("      - Digite 'Estação Terapia' e gere a senha");
            console.error("      - Use os 16 caracteres gerados como GMAIL_APP_PASSWORD");
            console.error("   4. Verifique se não há espaços extras no início/fim das variáveis");
            console.error("   5. Certifique-se de que a conta tem 'Acesso a apps menos seguros' desabilitado");
            console.error("      (Gmail moderno não usa mais isso, apenas senhas de app)\n");
        }

        throw error;
    }
};
