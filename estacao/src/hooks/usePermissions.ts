import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
    permissionsService, 
    Permission, 
    PermissionData, 
    UserPermissionData, 
    BulkRolePermissionData,
    BulkUserPermissionData,
    Role,
    Module,
    ActionType,
} from '@/services/permissionsService';
import toast from 'react-hot-toast';

// ===================== ROLE PERMISSIONS =====================

export function useRolePermissions() {
    return useQuery<Permission[]>({
        queryKey: ['rolePermissions'],
        queryFn: async () => {
            const response = await permissionsService.listRolePermissions();
            return response.data;
        },
        staleTime: 30 * 1000,
        gcTime: 5 * 60 * 1000,
        refetchOnWindowFocus: false,
    });
}

export function usePermissionsByRole(role: Role) {
    return useQuery({
        queryKey: ['permissionsByRole', role],
        queryFn: async () => {
            const response = await permissionsService.getPermissionsByRole(role);
            return response.data.data;
        },
        enabled: !!role,
        staleTime: 30 * 1000,
        gcTime: 5 * 60 * 1000,
        refetchOnWindowFocus: false,
    });
}

export function useCreateRolePermission() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: PermissionData) => permissionsService.createRolePermission(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['rolePermissions'] });
            queryClient.invalidateQueries({ queryKey: ['permissionsByRole'] });
            toast.success('Permissão criada com sucesso');
        },
        onError: () => {
            toast.error('Erro ao criar permissão');
        },
    });
}

export function useBulkCreateRolePermissions() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: BulkRolePermissionData) => permissionsService.bulkCreateRolePermissions(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['rolePermissions'] });
            queryClient.invalidateQueries({ queryKey: ['permissionsByRole'] });
            toast.success('Permissões atualizadas com sucesso');
        },
        onError: () => {
            toast.error('Erro ao atualizar permissões');
        },
    });
}

export function useDeleteRolePermission() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => permissionsService.deleteRolePermission(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['rolePermissions'] });
            queryClient.invalidateQueries({ queryKey: ['permissionsByRole'] });
            toast.success('Permissão removida com sucesso');
        },
        onError: () => {
            toast.error('Erro ao remover permissão');
        },
    });
}

// ===================== USER PERMISSIONS =====================

export function useUserPermissions(userId: string) {
    return useQuery({
        queryKey: ['userPermissions', userId],
        queryFn: async () => {
            const response = await permissionsService.getUserPermissions(userId);
            return response.data.data;
        },
        enabled: !!userId,
        staleTime: 30 * 1000,
        gcTime: 5 * 60 * 1000,
        refetchOnWindowFocus: false,
    });
}

export function usePermissionsForUser(userId: string) {
    return useQuery({
        queryKey: ['permissionsForUser', userId],
        queryFn: async () => {
            const response = await permissionsService.getPermissionsForUser(userId);
            return response.data.data;
        },
        enabled: !!userId,
        staleTime: 30 * 1000,
        gcTime: 5 * 60 * 1000,
        refetchOnWindowFocus: false,
    });
}

export function useCreateUserPermission() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: UserPermissionData) => permissionsService.createUserPermission(data),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['userPermissions', variables.userId] });
            queryClient.invalidateQueries({ queryKey: ['permissionsForUser', variables.userId] });
            toast.success('Permissão do usuário atualizada com sucesso');
        },
        onError: () => {
            toast.error('Erro ao atualizar permissão do usuário');
        },
    });
}

export function useBulkCreateUserPermissions() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: BulkUserPermissionData) => permissionsService.bulkCreateUserPermissions(data),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['userPermissions', variables.userId] });
            queryClient.invalidateQueries({ queryKey: ['permissionsForUser', variables.userId] });
            toast.success('Permissões do usuário atualizadas com sucesso');
        },
        onError: () => {
            toast.error('Erro ao atualizar permissões do usuário');
        },
    });
}

export function useDeleteUserPermission() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ userId, module, action }: { userId: string; module: Module; action: ActionType }) =>
            permissionsService.deleteUserPermission(userId, module, action),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['userPermissions', variables.userId] });
            queryClient.invalidateQueries({ queryKey: ['permissionsForUser', variables.userId] });
            toast.success('Permissão removida com sucesso');
        },
        onError: () => {
            toast.error('Erro ao remover permissão');
        },
    });
}

