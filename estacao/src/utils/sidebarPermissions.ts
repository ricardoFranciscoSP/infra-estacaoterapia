import type { Module } from "@/services/permissionsService";

/**
 * Mapeamento: label do link do sidebar (adm-estacao) → módulo de permissão.
 * null = sempre exibir (ex.: Dashboard) ou sem módulo específico.
 */
export const SIDEBAR_LABEL_TO_MODULE: Record<string, Module | null> = {
  Dashboard: null,
  Psicólogos: "Psychologists",
  Pacientes: "Patients",
  Depoimentos: "Reviews",
  Faq: "Faq",
  "Gestão de Consultas": "WorkSchedule",
  "Gerar Agenda Manual": "Agenda",
  Relatórios: "Reports",
  Financeiro: "Finance",
  Notificações: "Notifications",
  Solicitações: null,
  Configurações: "Configuracoes",
};

/** Labels que sempre aparecem, independente de permissão. */
export const ALWAYS_VISIBLE_LABELS = new Set<string>(["Dashboard", "Solicitações"]);

export type RolePerm = { Module: Module; Action: string };
export type UserPerm = { Module: Module; Action: string; Allowed: boolean };

/**
 * Verifica se o usuário tem permissão efectiva para um módulo (pelo menos Read ou Manage).
 * User overrides role: se existir UserPermission, usa Allowed; senão, usa role.
 */
function canAccessModule(
  module: Module,
  rolePerms: RolePerm[],
  userPerms: UserPerm[]
): boolean {
  const actions = ["Read", "Manage", "Create", "Update", "Delete"] as const;
  for (const action of actions) {
    const up = userPerms.find((p) => p.Module === module && p.Action === action);
    const rp = rolePerms.find((p) => p.Module === module && p.Action === action);
    const allowed = up ? up.Allowed : !!rp;
    if (allowed) return true;
  }
  return false;
}

/**
 * Dado rolePermissions e userPermissions (de getPermissionsForUser),
 * retorna array de labels do sidebar que o usuário pode ver.
 */
export function allowedSidebarLabelsFromPermissions(
  rolePermissions: RolePerm[],
  userPermissions: UserPerm[]
): string[] {
  const allowed: string[] = [];
  for (const [label, module] of Object.entries(SIDEBAR_LABEL_TO_MODULE)) {
    if (ALWAYS_VISIBLE_LABELS.has(label)) {
      allowed.push(label);
      continue;
    }
    if (module === null) continue; // sem módulo → não incluir (a não ser always visible)
    if (canAccessModule(module, rolePermissions, userPermissions)) allowed.push(label);
  }
  return allowed;
}
