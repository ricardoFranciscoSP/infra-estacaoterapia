"use client";

import { useMemo } from "react";
import { useUserBasic } from "@/hooks/user/userHook";
import { usePermissionsForUser } from "@/hooks/usePermissions";
import { allowedSidebarLabelsFromPermissions, allSidebarLabels } from "@/utils/sidebarPermissions";

/**
 * Retorna os labels do sidebar que o usuário pode ver, com base em
 * permissões do perfil (role) + overrides do usuário.
 * Usado para filtrar links do sidebar em adm-estacao (e adm-finance se aplicar).
 *
 * - Enquanto carrega: retorna null (evitar flash).
 * - Se não houver usuário ou não for Admin/Management/Finance: retorna [].
 * - Se der erro ao buscar permissões: retorna undefined (frontend pode mostrar todos).
 */
export function useAllowedSidebarLabels(): string[] | null | undefined {
  const { user } = useUserBasic();
  const userId = user?.Id ?? "";
  const isAdminRole = user?.Role && ["Admin", "Management", "Finance"].includes(user.Role);
  const { data, isLoading, isError } = usePermissionsForUser(userId);

  return useMemo(() => {
    if (!user || !isAdminRole) return [];
    if (isLoading) return null;
    if (isError || !data) return undefined;

    const rolePerms = (data as { rolePermissions?: Array<{ Module: string; Action: string }> }).rolePermissions ?? [];
    const userPerms = (data as { userPermissions?: Array<{ Module: string; Action: string; Allowed: boolean }> }).userPermissions ?? [];
    const allowed = allowedSidebarLabelsFromPermissions(rolePerms, userPerms);
    return allowed.length > 0 ? allowed : allSidebarLabels();
  }, [user, isAdminRole, isLoading, isError, data]);
}

