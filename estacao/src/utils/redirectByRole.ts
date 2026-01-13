import { User } from '@/store/authStore';

/**
 * Função utilitária para determinar a rota de redirecionamento baseada no role do usuário
 * Reutilizável em diferentes contextos (login, home, proteção de rotas)
 */
export function getRedirectRouteByRole(user: User | null | undefined): string | null {
  if (!user?.Role) return null;

  // Normaliza o status para comparação
  const normalizeStatus = (status: string | undefined): string => {
    if (!status) return '';
    return status
      .replace(/\s/g, '')
      .replace(/[áàâãéêíóôõúüç]/gi, (match) => {
        const map: Record<string, string> = {
          'á': 'a', 'à': 'a', 'â': 'a', 'ã': 'a',
          'é': 'e', 'ê': 'e',
          'í': 'i',
          'ó': 'o', 'ô': 'o', 'õ': 'o',
          'ú': 'u', 'ü': 'u',
          'ç': 'c'
        };
        return map[match.toLowerCase()] || match;
      })
      .toLowerCase();
  };

  switch (user.Role) {
    case 'Patient':
      if (Array.isArray(user.Onboardings) && user.Onboardings.length > 0) {
        return '/painel';
      }
      return '/boas-vindas';
    case 'Psychologist':
      const statusNormalized = normalizeStatus(user.Status);
      const isAtivo = statusNormalized === "ativo";
      
      // Se estiver ativo, redireciona para o painel principal
      if (isAtivo) {
        return '/painel-psicologo';
      }
      
      // Se estiver em análise ou em análise de contrato, redireciona para cadastro-em-analise
      if (statusNormalized === "emanalise" || 
          statusNormalized.includes("analise") || 
          statusNormalized === "emanalisecontrato" || 
          statusNormalized.includes("contrato")) {
        return '/painel-psicologo/cadastro-em-analise';
      }
      
      // Para outros status (Inativo, Bloqueado, Pendente, etc), não redireciona aqui
      // O ClientPainelLayout vai tratar e redirecionar para login
      return '/painel-psicologo/cadastro-em-analise';
    case 'Admin':
      return '/adm-estacao';
    case 'Management':
      return '/adm-estacao'; // Management também acessa o painel admin
    case 'Finance':
      return '/adm-finance';
    default:
      return '/painel';
  }
}

