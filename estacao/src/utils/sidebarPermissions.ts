import { SIDEBAR_MODULES, getAllowedSidebarModules } from "@/config/sidebarConfig";

export type RolePerm = { Module: string; Action: string };
export type UserPerm = { Module: string; Action: string; Allowed: boolean };

// Retorna os labels permitidos para o usuário, usando a config centralizada
export function allowedSidebarLabelsFromPermissions(
  rolePermissions: RolePerm[],
  userPermissions: UserPerm[]
): string[] {
  return getAllowedSidebarModules(rolePermissions, userPermissions).map((mod) => mod.label);
}

// Exporta todos os labels possíveis do sidebar
export function allSidebarLabels(): string[] {
  return SIDEBAR_MODULES.map((mod) => mod.label);
}
