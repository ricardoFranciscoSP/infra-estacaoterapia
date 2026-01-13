import fs from "fs";
import path from "path";
import { transactionalEmailApi } from "../lib/brevo";

interface SendEmailProps {
  to: {
    email: string;
    name?: string;
  };
  templateId: number;
  params: Record<string, unknown>;
}

interface BrevoAttachment {
  name: string;
  content: string; // base64
  contentId?: string;
  contentType?: string;
}

interface BrevoEmailData {
  to: Array<{
    email: string;
    name?: string;
  }>;
  templateId: number;
  params: Record<string, unknown>;
  sender: {
    email: string;
    name: string;
  };
  attachments?: BrevoAttachment[];
}

interface BrevoErrorResponse {
  response?: {
    body?: unknown;
  };
  message?: string;
}

/**
 * Encontra o diretório de assets dos templates
 */
const getTemplateAssetsDir = (): string => {
  const possiblePaths = [
    path.resolve(__dirname, "..", "templates", "assets"), // Caminho após compilação (dist/templates/assets)
    path.resolve(__dirname, "..", "..", "src", "templates", "assets"), // Caminho de desenvolvimento
    path.resolve(process.cwd(), "dist", "templates", "assets"), // Caminho absoluto do dist
    path.resolve(process.cwd(), "src", "templates", "assets"), // Caminho absoluto do src (dev)
  ];

  console.log(`[SendTransactionalEmail] Procurando assets em:`);
  for (const dirPath of possiblePaths) {
    console.log(`  - ${dirPath}`);
    try {
      if (fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory()) {
        const files = fs.readdirSync(dirPath);
        if (files.length > 0) {
          console.log(`[SendTransactionalEmail] ✓ Assets encontrados em: ${dirPath} (${files.length} arquivos)`);
          return dirPath;
        } else {
          console.log(`[SendTransactionalEmail] Diretório vazio: ${dirPath}`);
        }
      }
    } catch (e: unknown) {
      console.log(`[SendTransactionalEmail] Erro ao verificar ${dirPath}:`, e instanceof Error ? e.message : String(e));
    }
  }

  const defaultPath = path.resolve(__dirname, "..", "templates", "assets");
  console.warn(`[SendTransactionalEmail] ⚠ Assets não encontrados em nenhum caminho. Usando padrão: ${defaultPath}`);
  return defaultPath;
};

/**
 * Imagens obrigatórias do layout.html que devem estar sempre presentes
 * Todas as imagens são necessárias para garantir que o email seja renderizado corretamente
 */
const LAYOUT_REQUIRED_IMAGES = [
  "logo.svg",
  "facebook.png",
  "instagram.png",
  "linkedin.png",
  "tiktok.png",
  "youtube.png",
];

/**
 * Carrega todas as imagens da pasta de assets e converte para attachments do Brevo
 * Garante que as imagens do layout sejam sempre carregadas
 * Nota: As redes sociais agora usam ícones SVG inline no template, então apenas imagens reais precisam ser carregadas
 */
const loadImageAttachments = (): BrevoAttachment[] => {
  const assetsDir = getTemplateAssetsDir();
  const attachments: BrevoAttachment[] = [];
  const loadedFiles = new Set<string>();

  try {
    if (!fs.existsSync(assetsDir)) {
      console.warn(`[SendTransactionalEmail] ⚠️ Diretório de assets não existe: ${assetsDir}`);
      return attachments;
    }

    const files = fs.readdirSync(assetsDir, { withFileTypes: true });

    // Primeiro, carrega as imagens obrigatórias do layout
    const layoutImagesFound: string[] = [];
    const layoutImagesMissing: string[] = [];

    for (const requiredImage of LAYOUT_REQUIRED_IMAGES) {
      const filePath = path.join(assetsDir, requiredImage);
      if (fs.existsSync(filePath)) {
        layoutImagesFound.push(requiredImage);
      } else {
        layoutImagesMissing.push(requiredImage);
      }
    }

    if (layoutImagesMissing.length > 0) {
      console.warn(
        `[SendTransactionalEmail] ⚠️ Imagens do layout não encontradas: ${layoutImagesMissing.join(", ")}`
      );
    }

    console.log(
      `[SendTransactionalEmail] 📋 Imagens do layout encontradas: ${layoutImagesFound.length}/${LAYOUT_REQUIRED_IMAGES.length}`
    );

    // Carrega todas as imagens da pasta
    for (const file of files) {
      if (!file.isFile()) continue;

      const filePath = path.join(assetsDir, file.name);
      const ext = path.extname(file.name).toLowerCase();

      // Verifica se é uma imagem
      const isImage = [".svg", ".png", ".jpg", ".jpeg", ".gif", ".webp"].includes(ext);
      if (!isImage) continue;

      try {
        // Lê o arquivo e converte para base64
        const fileBuffer = fs.readFileSync(filePath);
        const base64Content = fileBuffer.toString("base64");

        // Determina o content type
        const contentType =
          ext === ".svg" ? "image/svg+xml"
            : ext === ".png" ? "image/png"
              : ext === ".jpg" || ext === ".jpeg" ? "image/jpeg"
                : ext === ".gif" ? "image/gif"
                  : ext === ".webp" ? "image/webp"
                    : undefined;

        // Cria o attachment com contentId para imagens inline
        // Para Brevo SDK, o contentId deve estar no formato RFC padrão <filename>
        // O HTML usa cid:logo.svg, então o contentId deve ser <logo.svg>
        // Nota: A Brevo aceita attachments inline quando usamos sendTransacEmail com templateId
        const attachment: BrevoAttachment = {
          name: file.name,
          content: base64Content,
          contentId: `<${file.name}>`, // Formato RFC: cid:logo.svg -> contentId: <logo.svg>
          contentType,
        };

        attachments.push(attachment);
        loadedFiles.add(file.name);

        // Destaque para imagens do layout
        const isLayoutImage = LAYOUT_REQUIRED_IMAGES.includes(file.name);
        const prefix = isLayoutImage ? "🎨 [LAYOUT]" : "📎";

        console.log(
          `${prefix} Anexo carregado: ${file.name} (CID: <${file.name}>, HTML usa: cid:${file.name}, Content-Type: ${contentType}, ${base64Content.length} bytes base64)`
        );
      } catch (error: unknown) {
        console.error(`[SendTransactionalEmail] ❌ Erro ao ler arquivo ${filePath}:`, error instanceof Error ? error.message : String(error));
      }
    }

    // Valida se todas as imagens do layout foram carregadas
    const missingLayoutImages = LAYOUT_REQUIRED_IMAGES.filter(
      (img) => !loadedFiles.has(img)
    );

    if (missingLayoutImages.length > 0) {
      console.error(
        `[SendTransactionalEmail] ❌ ATENÇÃO: Imagens do layout não foram carregadas: ${missingLayoutImages.join(", ")}`
      );
    } else {
      console.log(
        `[SendTransactionalEmail] ✅ Todas as imagens do layout foram carregadas com sucesso!`
      );
    }

    console.log(
      `[SendTransactionalEmail] ✅ Total: ${attachments.length} imagens carregadas para anexo`
    );
  } catch (error: unknown) {
    console.error("[SendTransactionalEmail] ❌ Erro ao carregar assets:", error instanceof Error ? error.message : String(error));
  }

  return attachments;
};

/**
 * Envia email transacional usando template da Brevo
 * 
 * IMPORTANTE: Quando usando templateId, o template HTML está na plataforma Brevo.
 * Para que as imagens apareçam, o template na Brevo deve usar cid: para referenciar as imagens:
 * - cid:logo.svg para o logo
 * - cid:facebook.png, cid:instagram.png, etc. para os ícones de redes sociais
 * 
 * Este código carrega automaticamente todas as imagens de templates/assets e as envia
 * como attachments inline, garantindo que apareçam no email.
 */
export async function sendTransactionalEmail({
  to,
  templateId,
  params,
}: SendEmailProps) {
  console.log(`[SendTransactionalEmail] 🔄 Iniciando envio de email...`);
  console.log(`[SendTransactionalEmail] Destinatário: ${to.email} (${to.name || 'sem nome'})`);
  console.log(`[SendTransactionalEmail] Template ID: ${templateId}`);
  console.log(`[SendTransactionalEmail] Parâmetros: ${JSON.stringify(params)}`);
  
  // Valida dados obrigatórios
  if (!to.email) {
    throw new Error('Email do destinatário é obrigatório');
  }
  
  if (!templateId) {
    throw new Error('ID do template é obrigatório');
  }
  
  // Carrega todas as imagens da pasta de assets para enviar como attachments inline
  // As imagens devem ser referenciadas no template da Brevo usando cid:nomearquivo
  const attachments = loadImageAttachments();

  // Log detalhado dos attachments
  if (attachments.length > 0) {
    console.log(`[SendTransactionalEmail] 📎 Lista de attachments a serem enviados:`);
    attachments.forEach((att, index) => {
      console.log(`  ${index + 1}. ${att.name} (CID: ${att.contentId}, Content-Type: ${att.contentType || 'não especificado'})`);
    });
  } else {
    console.warn(`[SendTransactionalEmail] ⚠️ Nenhum attachment carregado! As imagens podem não aparecer no email.`);
  }

  const emailData: BrevoEmailData = {
    to: [{ email: to.email, name: to.name }],
    templateId,
    params,
    sender: {
      email: process.env.BREVO_SENDER_EMAIL!,
      name: process.env.BREVO_SENDER_NAME!,
    },
    // Sempre envia attachments se existirem
    ...(attachments.length > 0 && { attachments }),
  };

  console.log(`[SendTransactionalEmail] 📦 Enviando email com template ID ${templateId}, ${attachments.length} anexos`);
  console.log(`[SendTransactionalEmail] Sender: ${process.env.BREVO_SENDER_EMAIL}`);
  console.log(`[SendTransactionalEmail] Email data keys: ${Object.keys(emailData).join(', ')}`);

  try {
    const response = await transactionalEmailApi.sendTransacEmail(emailData);
    console.log("[SendTransactionalEmail] ✅ Email transacional enviado com sucesso");
    console.log("[SendTransactionalEmail] Response ID:", (response as { id?: string }).id || 'ID não retornado');
    return response;
  } catch (error: unknown) {
    let errorMessage: string;

    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (error && typeof error === 'object') {
      const brevoError = error as BrevoErrorResponse;

      if (brevoError.response?.body) {
        errorMessage = JSON.stringify(brevoError.response.body);
      } else if (brevoError.message) {
        errorMessage = brevoError.message;
      } else {
        errorMessage = JSON.stringify(brevoError);
      }
    } else {
      errorMessage = String(error);
    }

    console.error("[SendTransactionalEmail] ❌ Erro ao enviar email Brevo:", errorMessage);
    console.error("[SendTransactionalEmail] Destinatário:", to.email);
    console.error("[SendTransactionalEmail] Template ID:", templateId);
    throw new Error(`Falha ao enviar email transacional: ${errorMessage}`);
  }
}
