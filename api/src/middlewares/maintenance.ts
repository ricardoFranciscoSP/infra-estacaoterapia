/**
 * Middleware de Manutenção para API Node.js
 * 
 * Protege endpoints da API durante modo de manutenção
 * Permite acesso apenas para administradores
 */

/**
 * Verifica se o sistema está em modo de manutenção
 */
export async function checkMaintenanceMode() {
  // 1. Verifica variável de ambiente (prioridade máxima)
  if (process.env.MAINTENANCE_MODE === 'true') {
    return true;
  }

  // 2. Você pode adicionar verificação no banco de dados aqui
  // Exemplo:
  // const config = await prisma.configuracao.findFirst({
  //   where: { chave: 'manutencao' }
  // });
  // return config?.valor === 'true';

  return false;
}

/**
 * Verifica se o usuário é administrador baseado no token ou role
 */
export function isAdminUser(req: any): boolean {
  // Verifica role no objeto de usuário autenticado
  if (req.user?.role === 'Admin' || req.user?.role === 'ADMIN') {
    return true;
  }

  // Verifica role diretamente no request (setado por outro middleware)
  if (req.userRole === 'Admin' || req.userRole === 'ADMIN') {
    return true;
  }

  return false;
}

/**
 * Lista de rotas que permanecem acessíveis durante manutenção
 */
const ALLOWED_ROUTES = [
  '/api/auth/admin',
  '/api/auth/login',
  '/api/configuracoes/manutencao',
  '/health',
  '/status',
];

/**
 * Verifica se a rota está na lista de permitidas
 */
function isAllowedRoute(path: string): boolean {
  return ALLOWED_ROUTES.some(route => path.startsWith(route));
}

/**
 * Middleware Express/Fastify para bloquear acesso durante manutenção
 * 
 * USO (Express):
 * import { maintenanceMiddleware } from './middlewares/maintenance';
 * app.use(maintenanceMiddleware);
 * 
 * USO (Fastify):
 * import { maintenanceMiddlewareFastify } from './middlewares/maintenance';
 * fastify.addHook('preHandler', maintenanceMiddlewareFastify);
 */
export async function maintenanceMiddleware(req: any, res: any, next: any) {
  try {
    // Verifica se está em modo de manutenção
    const isMaintenanceActive = await checkMaintenanceMode();

    if (!isMaintenanceActive) {
      // Sistema funcionando normalmente
      return next();
    }

    // Verifica se é rota permitida
    if (isAllowedRoute(req.path)) {
      return next();
    }

    // Verifica se usuário é Admin
    if (isAdminUser(req)) {
      return next();
    }

    // Bloqueia acesso
    return res.status(503).json({
      error: 'Sistema em Manutenção',
      message: 'O sistema está temporariamente indisponível para manutenção. Por favor, tente novamente mais tarde.',
      code: 'MAINTENANCE_MODE',
    });
  } catch (error) {
    console.error('Erro no middleware de manutenção:', error);
    // Em caso de erro, permite acesso para não bloquear o sistema
    return next();
  }
}

/**
 * Versão do middleware para Fastify
 */
export async function maintenanceMiddlewareFastify(request: any, reply: any) {
  try {
    const isMaintenanceActive = await checkMaintenanceMode();

    if (!isMaintenanceActive) {
      return;
    }

    if (isAllowedRoute(request.url)) {
      return;
    }

    if (isAdminUser(request)) {
      return;
    }

    reply.code(503).send({
      error: 'Sistema em Manutenção',
      message: 'O sistema está temporariamente indisponível para manutenção. Por favor, tente novamente mais tarde.',
      code: 'MAINTENANCE_MODE',
    });
  } catch (error) {
    console.error('Erro no middleware de manutenção:', error);
    // Em caso de erro, permite acesso
  }
}

/**
 * Decorator para rotas específicas (Express)
 * 
 * USO:
 * router.get('/endpoint', requireNotInMaintenance, handler);
 */
export async function requireNotInMaintenance(req: any, res: any, next: any) {
  const isMaintenanceActive = await checkMaintenanceMode();

  if (isMaintenanceActive && !isAdminUser(req)) {
    return res.status(503).json({
      error: 'Sistema em Manutenção',
      message: 'Este endpoint não está disponível durante manutenção.',
      code: 'MAINTENANCE_MODE',
    });
  }

  next();
}

/**
 * Helper para verificar manutenção em controllers
 * 
 * USO:
 * if (await isSystemInMaintenance(req)) {
 *   return res.status(503).json({ error: 'Manutenção' });
 * }
 */
export async function isSystemInMaintenance(req: any): Promise<boolean> {
  const isMaintenanceActive = await checkMaintenanceMode();
  const isAdmin = isAdminUser(req);
  
  return isMaintenanceActive && !isAdmin;
}
