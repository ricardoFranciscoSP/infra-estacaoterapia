import { api } from "@/lib/axios";

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
  return {
    generateManualTokens: (payload: { patientId: string; psychologistId: string }) =>
      api.post<GenerateManualTokensResponse>("/admin/token-system/generate-manual", payload),
    listGeneratedTokens: (limit: number = 50, consultaId?: string) =>
      api.get<TokenAuditListResponse>("/admin/token-system/generated", {
        params: { limit, consultaId },
      }),
  };
};
