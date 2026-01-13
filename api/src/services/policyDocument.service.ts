import prisma from "../prisma/client";
import { supabaseAdmin, STORAGE_BUCKET_DOCUMENTS_PUBLIC } from "../services/storage.services";

export interface PolicyDocumentData {
  Titulo: string;
  Descricao?: string;
  Url: string;
  Tipo: "pdf" | "texto";
  PublicoPara: "paciente" | "psicologo" | "todos";
  Ordem?: number;
  Ativo?: boolean;
}

export interface PolicyDocumentUpdateData extends Partial<PolicyDocumentData> {
  Id: string;
}

export class PolicyDocumentService {
  /**
   * Lista todos os documentos de políticas
   */
  async listDocuments(filters?: { ativo?: boolean; publicoPara?: string }) {
    const whereConditions: Array<Record<string, unknown>> = [];

    if (filters?.ativo !== undefined) {
      whereConditions.push({ Ativo: filters.ativo });
    }

    // Se publicoPara for especificado, busca documentos para esse público OU "todos"
    if (filters?.publicoPara) {
      whereConditions.push({
        OR: [
          { PublicoPara: filters.publicoPara },
          { PublicoPara: "todos" }
        ]
      });
    }

    const where = whereConditions.length > 0 ? { AND: whereConditions } : {};

    return await prisma.policyDocument.findMany({
      where,
      orderBy: [
        { Ordem: "asc" },
        { CreatedAt: "desc" }
      ],
      include: {
        CreatedBy: {
          select: {
            Id: true,
            Nome: true,
            Email: true
          }
        },
        UpdatedBy: {
          select: {
            Id: true,
            Nome: true,
            Email: true
          }
        }
      }
    });
  }

  /**
   * Busca um documento por ID
   */
  async getDocumentById(id: string) {
    return await prisma.policyDocument.findUnique({
      where: { Id: id },
      include: {
        CreatedBy: {
          select: {
            Id: true,
            Nome: true,
            Email: true
          }
        },
        UpdatedBy: {
          select: {
            Id: true,
            Nome: true,
            Email: true
          }
        }
      }
    });
  }

  /**
   * Cria um novo documento
   */
  async createDocument(data: PolicyDocumentData, userId: string) {
    return await prisma.policyDocument.create({
      data: {
        ...data,
        CreatedById: userId,
        UpdatedById: userId
      },
      include: {
        CreatedBy: {
          select: {
            Id: true,
            Nome: true,
            Email: true
          }
        }
      }
    });
  }

  /**
   * Atualiza um documento
   */
  async updateDocument(data: PolicyDocumentUpdateData, userId: string) {
    const { Id, ...updateData } = data;

    return await prisma.policyDocument.update({
      where: { Id },
      data: {
        ...updateData,
        UpdatedById: userId
      },
      include: {
        UpdatedBy: {
          select: {
            Id: true,
            Nome: true,
            Email: true
          }
        }
      }
    });
  }

  /**
   * Deleta um documento e remove o arquivo do storage
   */
  async deleteDocument(id: string) {
    // Busca o documento para obter a URL
    const document = await prisma.policyDocument.findUnique({
      where: { Id: id }
    });

    if (!document) {
      throw new Error("Documento não encontrado");
    }

    // Remove o arquivo do Supabase Storage
    try {
      // Extrai o caminho do arquivo da URL
      const url = new URL(document.Url);
      const pathParts = url.pathname.split("/");
      const bucketIndex = pathParts.findIndex(part => part === STORAGE_BUCKET_DOCUMENTS_PUBLIC);

      if (bucketIndex !== -1 && bucketIndex < pathParts.length - 1) {
        const filePath = pathParts.slice(bucketIndex + 1).join("/");

        if (supabaseAdmin) {
          const { error } = await supabaseAdmin.storage
            .from(STORAGE_BUCKET_DOCUMENTS_PUBLIC)
            .remove([filePath]);

          if (error) {
            console.error("Erro ao remover arquivo do storage:", error);
            // Continua mesmo se houver erro ao remover do storage
          }
        }
      }
    } catch (error) {
      console.error("Erro ao processar URL do arquivo:", error);
      // Continua mesmo se houver erro
    }

    // Remove o registro do banco
    return await prisma.policyDocument.delete({
      where: { Id: id }
    });
  }

  /**
   * Faz upload de arquivo para o Supabase Storage Público
   * Usa bucket público específico para documentos de políticas e termos
   */
  async uploadFile(file: Express.Multer.File, folder: string = "policy-documents"): Promise<string> {
    if (!supabaseAdmin) {
      throw new Error("Supabase admin não configurado");
    }

    const timestamp = Date.now();
    const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, "_");
    const filePath = `${folder}/${timestamp}_${sanitizedName}`;

    console.log(`[PolicyDocument] Fazendo upload para bucket público: ${STORAGE_BUCKET_DOCUMENTS_PUBLIC}`);

    const { data, error } = await supabaseAdmin.storage
      .from(STORAGE_BUCKET_DOCUMENTS_PUBLIC)
      .upload(filePath, file.buffer, {
        contentType: file.mimetype,
        upsert: false,
        cacheControl: '3600'
      });

    if (error) {
      throw new Error(`Erro ao fazer upload: ${error.message}`);
    }

    // Obtém URL pública
    const { data: urlData } = supabaseAdmin.storage
      .from(STORAGE_BUCKET_DOCUMENTS_PUBLIC)
      .getPublicUrl(filePath);

    if (!urlData?.publicUrl) {
      throw new Error("Erro ao obter URL pública do arquivo");
    }

    console.log(`[PolicyDocument] Upload concluído com sucesso. URL pública: ${urlData.publicUrl}`);
    return urlData.publicUrl;
  }
}

