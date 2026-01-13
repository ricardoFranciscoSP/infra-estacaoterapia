// middleware.ts
import { NextRequest, NextResponse } from 'next/server';
import { 
  isMaintenanceMode, 
  isAllowedRoute,
  ALWAYS_ALLOWED_PATTERNS 
} from '@/lib/maintenance';

console.error('MIDDLEWARE: Arquivo middleware.ts foi carregado'); // debug global

/**
 * Verifica se o usuário é Admin baseado no cookie
 * Admin tem acesso total mesmo durante manutenção
 */
function isAdminFromCookie(req: NextRequest): boolean {
  const userRole = req.cookies.get('userRole')?.value || req.cookies.get('role')?.value;
  return userRole === 'Admin' || userRole === 'ADMIN';
}

/**
 * Middleware principal do Next.js
 * Controla acesso em modo manutenção e proteção de ambiente PRE
 */
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  console.log(`[MIDDLEWARE] Processando: ${pathname}`);

  // 1. Verifica se é arquivo estático ou rota sempre permitida
  const isStaticOrAllowed = ALWAYS_ALLOWED_PATTERNS.some(pattern => 
    pathname.startsWith(pattern)
  );

  if (isStaticOrAllowed) {
    return NextResponse.next();
  }

  // 2. Verifica modo de manutenção
  try {
    const maintenanceActive = await isMaintenanceMode();
    
    if (maintenanceActive) {
      console.log(`[MIDDLEWARE] Modo manutenção ativo para: ${pathname}`);
      
      // Verifica se é rota permitida durante manutenção
      if (isAllowedRoute(pathname)) {
        console.log(`[MIDDLEWARE] Rota permitida: ${pathname}`);
        return NextResponse.next();
      }

      // Verifica se usuário é Admin
      if (isAdminFromCookie(req)) {
        console.log(`[MIDDLEWARE] Admin detectado, acesso permitido`);
        return NextResponse.next();
      }

      // Bloqueia e redireciona para página de manutenção
      console.log(`[MIDDLEWARE] Redirecionando para /manutencao`);
      return NextResponse.redirect(new URL('/manutencao', req.url));
    }
  } catch (error) {
    console.error('[MIDDLEWARE] Erro ao verificar manutenção:', error);
    // Em caso de erro, deixa passar para não bloquear o sistema
  }

  // 3. Proteção de rotas por Role
  // Bloqueia Finance de acessar rotas que não sejam /adm-finance
  const userRole = req.cookies.get('userRole')?.value || req.cookies.get('role')?.value;
  
  if (userRole === 'Finance' || userRole === 'FINANCE') {
    // Finance só pode acessar /adm-finance e rotas públicas
    const isFinanceRoute = pathname.startsWith('/adm-finance');
    const isPublicRoute = pathname === '/adm-login' || 
                        pathname === '/login' || 
                        pathname === '/no-permission' ||
                        pathname.startsWith('/_next') ||
                        pathname.startsWith('/api') ||
                        pathname.startsWith('/assets') ||
                        pathname.startsWith('/icons') ||
                        pathname === '/favicon.ico';
    
    if (!isFinanceRoute && !isPublicRoute) {
      console.log(`[MIDDLEWARE] Finance tentando acessar rota não autorizada: ${pathname}`);
      return NextResponse.redirect(new URL('/no-permission', req.url));
    }
  }
  
  // Bloqueia Admin de acessar /adm-finance (se necessário)
  if ((userRole === 'Admin' || userRole === 'ADMIN') && pathname.startsWith('/adm-finance')) {
    // Admin não deve acessar área financeira, redireciona para adm-estacao
    console.log(`[MIDDLEWARE] Admin tentando acessar área financeira, redirecionando`);
    return NextResponse.redirect(new URL('/adm-estacao', req.url));
  }

  // 4. Adiciona headers de no-cache para rotas logadas
  const isLoggedInRoute = pathname.startsWith('/painel') || 
                          pathname.startsWith('/painel-psicologo') || 
                          pathname.startsWith('/adm-estacao') || 
                          pathname.startsWith('/adm-finance') ||
                          pathname.startsWith('/boas-vindas') ||
                          pathname.startsWith('/objetivos');
  
  if (isLoggedInRoute) {
    const response = NextResponse.next();
    // Headers para desabilitar cache completamente
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    return response;
  }

  // 5. Proteção adicional: ambiente PRE com autenticação básica
  // (Opcional - descomente se quiser forçar autenticação básica no PRE)
  /*
  if (process.env.APP_ENV === 'pre') {
    const basicAuth = req.headers.get('authorization');
    
    if (!basicAuth || !isValidBasicAuth(basicAuth)) {
      return new NextResponse('Authentication required', {
        status: 401,
        headers: {
          'WWW-Authenticate': 'Basic realm="Ambiente Restrito"'
        },
      });
    }
  }
  */

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public directory)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
