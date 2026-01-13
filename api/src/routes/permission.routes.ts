import { Router } from 'express';
import { asyncHandler } from '../middlewares/asyncHandler';
import { protect } from '../middlewares/authMiddleware';
import { PermissionController } from '../controllers/permission.controller';
import { AuthorizationService } from "../services/authorization.service";
import { PermissionService } from "../services/permission.service";
import { PermissionRepository } from "../repositories/permission.repository";

const router = Router();

const authService = new AuthorizationService();
const permissionRepository = new PermissionRepository();
const permissionService = new PermissionService(permissionRepository);
const permissionController = new PermissionController(authService, permissionService);

router.use(protect);

// Role permissions
router.get('/', asyncHandler(permissionController.listPermissions.bind(permissionController)));
router.post('/', asyncHandler(permissionController.createPermission.bind(permissionController)));
router.put('/:id', asyncHandler(permissionController.updatePermission.bind(permissionController)));
router.delete('/:id', asyncHandler(permissionController.deletePermission.bind(permissionController)));
router.get('/role/:role', asyncHandler(permissionController.getPermissionsByRole.bind(permissionController)));
router.post('/role/bulk', asyncHandler(permissionController.bulkCreateRolePermissions.bind(permissionController)));

// User permissions
router.get('/user/:userId', asyncHandler(permissionController.getUserPermissions.bind(permissionController)));
router.get('/user/:userId/all', asyncHandler(permissionController.getPermissionsForUser.bind(permissionController)));
router.post('/user', asyncHandler(permissionController.createUserPermission.bind(permissionController)));
router.post('/user/bulk', asyncHandler(permissionController.bulkCreateUserPermissions.bind(permissionController)));
router.delete('/user/:userId/:module/:action', asyncHandler(permissionController.deleteUserPermission.bind(permissionController)));

export default router;
