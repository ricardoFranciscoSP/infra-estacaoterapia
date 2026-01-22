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
    }));
  };

  const listGeneratedTokensFallback = async (limit: number, consultaId?: string) => {
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
    generateManualTokens: (payload: { patientId: string; psychologistId: string }) =>
      api.post<GenerateManualTokensResponse>("/admin/token-system/generate-manual", payload),
    listGeneratedTokens: async (limit: number = 50, consultaId?: string) => {
      try {
        const response = await api.get<TokenAuditListResponse>("/admin/token-system/generated", {
          params: { limit, consultaId },
        });
        return response.data;
      } catch (error) {
        const fallback = await listGeneratedTokensFallback(limit, consultaId);
        return fallback;
      }
    },
  };
};
