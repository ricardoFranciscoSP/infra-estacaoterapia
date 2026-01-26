import { Router } from 'express';
import { protect } from '../middlewares/authMiddleware';
import { asyncHandler } from '../middlewares/asyncHandler';
import { SIDEBAR_MODULES, getAllowedSidebarModules } from '../config/sidebarConfig';
import { PermissionService } from '../services/permission.service';
import { PermissionRepository } from '../repositories/permission.repository';
import { AuthorizationService } from '../services/authorization.service';
import { Module } from '../types/permissions.types';

const router = Router();
const permissionRepository = new PermissionRepository();
const permissionService = new PermissionService(permissionRepository);
const authService = new AuthorizationService();

// Retorna todos os módulos do sidebar (útil para frontend/configuração)
router.get('/all', protect, asyncHandler(async (req, res) => {
    res.json({ success: true, data: SIDEBAR_MODULES });
}));

// Retorna os módulos do sidebar permitidos para o usuário logado
router.get('/allowed', protect, asyncHandler(async (req, res) => {
    const userId = authService.getLoggedUserId(req);
    if (!userId) {
        return res.status(401).json({ success: false, message: 'Usuário não autenticado' });
    }
    const perms = await permissionService.getPermissionsForUser(userId);
    // Mapear os tipos do Prisma para os tipos esperados pela função
    const rolePerms = perms.rolePermissions.map(p => ({
        Module: p.Module as Module,
        Action: p.Action
    }));
    const userPerms = perms.userPermissions.map(p => ({
        Module: p.Module as Module,
        Action: p.Action,
        Allowed: p.Allowed
    }));
    const allowed = getAllowedSidebarModules(rolePerms, userPerms);
    res.json({ success: true, data: allowed });
}));

export default router;
