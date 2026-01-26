import { SIDEBAR_MODULES, getAllowedSidebarModules } from "@/config/sidebarConfig";
import type { Module } from "@/services/permissionsService";

export type RolePerm = { Module: string; Action: string };
export type UserPerm = { Module: string; Action: string; Allowed: boolean };

// Retorna os labels permitidos para o usuário, usando a config centralizada
export function allowedSidebarLabelsFromPermissions(
  rolePermissions: RolePerm[],
  userPermissions: UserPerm[]
): string[] {
  // Converte RolePerm[] para o formato esperado por getAllowedSidebarModules
  const rolePermsFormatted = rolePermissions.map((rp) => ({
    Module: rp.Module as Module,
    Action: rp.Action,
  }));
  const userPermsFormatted = userPermissions.map((up) => ({
    Module: up.Module as Module,
    Action: up.Action,
    Allowed: up.Allowed,
  }));
  return getAllowedSidebarModules(rolePermsFormatted, userPermsFormatted).map((mod) => mod.label);
}

// Exporta todos os labels possíveis do sidebar
export function allSidebarLabels(): string[] {
  return SIDEBAR_MODULES.map((mod) => mod.label);
}
