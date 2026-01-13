import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/axios";

export interface PolicyDocument {
  Id: string;
  Titulo: string;
  Descricao?: string;
  Url: string;
  Tipo: "pdf" | "texto";
  PublicoPara: "paciente" | "psicologo" | "todos";
  Ordem: number;
  Ativo: boolean;
  CreatedAt: string;
  UpdatedAt: string;
}

export function usePolicyDocuments(publicoPara?: "paciente" | "psicologo" | "todos") {
  return useQuery({
    queryKey: ["policy-documents", publicoPara],
    queryFn: async (): Promise<PolicyDocument[]> => {
      try {
        const response = await api.get<PolicyDocument[]>("/policy-documents", { 
          params: { ativo: "true", publicoPara } 
        });
        
        if (!response || !response.data) {
          console.warn("[usePolicyDocuments] Resposta vazia da API");
          return [];
        }
        
        if (!Array.isArray(response.data)) {
          console.warn("[usePolicyDocuments] Resposta não é um array:", typeof response.data);
          return [];
        }
        
        // Filtra documentos que são para o público especificado ou "todos"
        const filtered = response.data.filter((doc): doc is PolicyDocument => {
          if (!doc || typeof doc !== 'object') return false;
          if (!doc.Ativo) return false;
          if (!doc.Id || !doc.Titulo) return false;
          if (publicoPara) {
            return doc.PublicoPara === publicoPara || doc.PublicoPara === "todos";
          }
          return true;
        });
        
        // Ordena por ordem e depois por data de criação
        const sorted = filtered.sort((a, b) => {
          if (a.Ordem !== b.Ordem) {
            return a.Ordem - b.Ordem;
          }
          return new Date(b.CreatedAt).getTime() - new Date(a.CreatedAt).getTime();
        });
        
        console.log(`[usePolicyDocuments] Retornando ${sorted.length} documentos para público: ${publicoPara}`);
        return sorted;
      } catch (error) {
        console.error("[usePolicyDocuments] Erro ao buscar documentos:", error);
        return [];
      }
    },
    retry: 1,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
}

