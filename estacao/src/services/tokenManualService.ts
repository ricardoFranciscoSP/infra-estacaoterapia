import { api } from "@/lib/axios";
import type { AuditoriaItem } from "@/types/auditoria";

export interface TokenAuditUser {
  id: string;
  nome: string;
  email: string;
  role: string;
}

export interface TokenAuditMetadata {
  consultaId?: string;
  channelName?: string;
  patientId?: string;
  psychologistId?: string;
  patientUid?: number;
  psychologistUid?: number;
  patientToken?: string;
  psychologistToken?: string;
  source?: string;
  actorId?: string | null;
}

export interface TokenAuditItem {
  id: string;
  timestamp: string;
  description: string;
  status: string | null;
  user: TokenAuditUser | null;
  metadata: TokenAuditMetadata | null;
  origin?: "manual" | "system";
}

export interface TokenAuditListResponse {
  count: number;
  items: TokenAuditItem[];
}

export interface GenerateManualTokensResponse {
  success: boolean;
  consultaId: string;
  channelName: string;
  patientToken: string;
  psychologistToken: string;
  patientUid: number;
  psychologistUid: number;
  tokensGenerated: boolean;
}

export const tokenManualService = () => {
  const mapAuditMetadata = (rawMetadata: string | null): TokenAuditMetadata | null => {
    if (!rawMetadata) return null;
    try {
      const parsed = JSON.parse(rawMetadata) as Record<string, unknown>;
      return {
        consultaId: typeof parsed.consultaId === "string" ? parsed.consultaId : undefined,
        channelName: typeof parsed.channelName === "string" ? parsed.channelName : undefined,
        patientId: typeof parsed.patientId === "string" ? parsed.patientId : undefined,
        psychologistId: typeof parsed.psychologistId === "string" ? parsed.psychologistId : undefined,
        patientUid: typeof parsed.patientUid === "number" ? parsed.patientUid : undefined,
        psychologistUid: typeof parsed.psychologistUid === "number" ? parsed.psychologistUid : undefined,
        patientToken: typeof parsed.patientToken === "string" ? parsed.patientToken : undefined,
        psychologistToken: typeof parsed.psychologistToken === "string" ? parsed.psychologistToken : undefined,
        source: typeof parsed.source === "string" ? parsed.source : undefined,
        actorId: typeof parsed.actorId === "string" ? parsed.actorId : null,
      };
    } catch {
      return null;
    }
  };

  const mapAuditItemsToTokenLogs = (audits: AuditoriaItem[]): TokenAuditItem[] => {
    return audits.map((audit) => ({
      id: audit.Id,
      timestamp: String(audit.Timestamp),
      description: audit.Description,
      status: audit.Status ?? null,
      user: audit.User
        ? {
          id: audit.User.Id,
          nome: audit.User.Nome,
          email: audit.User.Email,
          role: audit.User.Role,
        }
        : null,
      metadata: mapAuditMetadata(audit.Metadata),
      origin: audit.Metadata?.includes('"source":"manual"') ? "manual" : "system",
    }));
  };

  const listGeneratedTokensFallback = async (
    limit: number,
    consultaId?: string,
    source?: "manual" | "system" | "all"
  ) => {
    const response = await api.get<{
      success: boolean;
      data: { audits: AuditoriaItem[] };
    }>("/audit", {
      params: {
        limit,
        actionType: "Create",
        search: "Agora tokens gerados",
      },
    });

    const audits = response.data?.data?.audits ?? [];
    let items = mapAuditItemsToTokenLogs(audits);

    if (source === "manual") {
      items = items.filter((item) => item.metadata?.source === "manual");
    } else if (source === "system") {
      items = items.filter((item) => item.metadata?.source !== "manual");
    }

    if (consultaId && consultaId.trim()) {
      const consultaIdTrimmed = consultaId.trim();
      items = items.filter((item) => {
        const metadataConsultaId = item.metadata?.consultaId;
        return metadataConsultaId === consultaIdTrimmed || item.description.includes(consultaIdTrimmed);
      });
    }

    return { count: items.length, items };
  };

  return {
    /**
     * Gera tokens manualmente (rota nova e fallback)
     */
    generateManualTokens: async (payload: { patientId: string; psychologistId: string }) => {
      // Tenta rota nova
      try {
        return await api.post<GenerateManualTokensResponse>("/api/admin/token-system/generate-manual", payload);
      } catch (err) {
        // Fallback para rota antiga, se necessário (exemplo)
        return await api.post<GenerateManualTokensResponse>("/admin/token-system/generate-manual", payload);
      }
    },
    /**
     * Lista tokens gerados (rota nova e fallback)
     */
    listGeneratedTokens: async ({
      page = 1,
      limit = 20,
      consultaId,
      source = "all",
    }: {
      page?: number;
      limit?: number;
      consultaId?: string;
      source?: "manual" | "system" | "all";
    }) => {
      try {
        const response = await api.get<TokenAuditListResponse>("/api/admin/token-system/tokens", {
          params: { limit, page, consultaId, source },
        });
        return response.data;
      } catch {
        // Fallback para rota antiga, se necessário
        try {
          const response = await api.get<TokenAuditListResponse>("/admin/token-system/tokens", {
            params: { limit, page, consultaId, source },
          });
          return response.data;
        } catch {
          const fallback = await listGeneratedTokensFallback(limit, consultaId, source);
          return fallback;
        }
      }
    },
  };
};
