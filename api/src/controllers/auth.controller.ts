import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';
import { ITokenService } from '../interfaces/token.interface';

/**
 * Controller responsável pelas operações de autenticação, registro,
 * recuperação de senha e manipulação de tokens.
 */
export class AuthController {
  constructor(
    private authService: AuthService,
    private tokenService: ITokenService
  ) { }

  // ===================== AUTENTICAÇÃO =====================

  /**
   * Realiza login do usuário e gera tokens.
   * @param req Request do Express contendo dados de login.
   * @param res Response do Express.
   * @returns Response com resultado do login e tokens.
   */
  async login(req: Request, res: Response): Promise<Response> {
    try {
      const { email, telefone, crp, password } = req.body;

      let identifier = email || telefone || crp;
      // Remove hífen apenas se o identifier for telefone no formato antigo "00-000000" (apenas números)
      // Não remove nada de CRP alfanumérico
      if (identifier && typeof identifier === 'string' && /^\d{2}-\d{6}$/.test(identifier)) {
        identifier = identifier.replace(/[^0-9]/g, '');
      }

      // Logging para debug de dados recebidos
      console.log(`[LOGIN] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`[LOGIN] NODE_ENV: ${process.env.NODE_ENV}`);
      console.log(`[LOGIN] identifier recebido: ${identifier}`);
      console.log(`[LOGIN] password recebido: ${password ? '(...existe...)' : 'undefined ou vazio'}`);
      console.log(`[LOGIN] Body completo:`, { email, telefone, crp, hasPassword: !!password });

      // Captura IP e User-Agent
      const ip = req.headers['x-forwarded-for']?.toString() || req.socket.remoteAddress || '';
      const userAgent = req.headers['user-agent'] || '';
      console.log(`[LOGIN] IP: ${ip}, User-Agent: ${userAgent.substring(0, 50)}...`);


      // Passa ip e userAgent para o service
      const result = await this.authService.login(identifier, password, ip, userAgent);

      // Registrar auditoria de login (sucesso ou falha)
      try {
        const { logLogin } = await import('../utils/auditLogger.util');
        const auditUserId = result.user?.Id || result.userId;
        await logLogin(
          auditUserId,
          identifier || 'unknown',
          result.success,
          ip,
          result.success ? undefined : result.message
        );
      } catch (auditError) {
        console.error('[AuthController] Erro ao registrar auditoria de login:', auditError);
        // Não falha o login se a auditoria falhar
      }

      // Logging para debug do resultado do AuthService
      console.log(`[LOGIN] Result success: ${result.success}`);
      console.log(`[LOGIN] Result message: ${result.message}`);

      if (!result.success) {
        // Importante: Status correto para erro de autenticação!
        console.log(`[LOGIN] ❌ Autenticação falhou - retornando 401`);
        console.log(`[LOGIN] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        return res.status(401).json({
          success: false,
          message: result.message || 'Usuário ou senha inválidos.',
        });
      } const { token, refreshToken } = await this.tokenService.generateTokens(result.user!.Id);

      const isProduction = process.env.NODE_ENV === 'production';
      console.log(`[LOGIN] isProduction: ${isProduction}`);
      const cookieOptions = {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? 'none' as const : 'lax' as const,
        path: '/',
      };
      console.log(`[LOGIN] Cookie options:`, cookieOptions);
      console.log(`[LOGIN] ✅ Login bem-sucedido para: ${result.user!.Email}`);
      console.log(`[LOGIN] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

      return res
        .cookie('token', token, {
          ...cookieOptions,
          maxAge: 7 * 24 * 60 * 60 * 1000,
        })
        .cookie('refreshToken', refreshToken, {
          ...cookieOptions,
          maxAge: 30 * 24 * 60 * 60 * 1000,
        })
        .cookie('role', result.user!.Role, {
          ...cookieOptions,
          maxAge: 30 * 24 * 60 * 60 * 1000,
        })
        .status(200)
        .json({
          success: true,
          message: 'Login realizado com sucesso.',
          user: result.user,
          role: result.user!.Role,
        });
    } catch (error) {
      console.error('[LOGIN] ❌ Erro de API:', error);
      console.log(`[LOGIN] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      return res.status(500).json({
        success: false,
        message: 'Ocorreu um erro ao processar sua solicitação.',
        code: 'INTERNAL_ERROR',
      });
    }
  }


  /**
   * Realiza logout do usuário, revogando tokens e limpando cookies.
   * @param req Request do Express.
   * @param res Response do Express.
   * @returns Response de sucesso ou erro.
   */
  async logout(req: Request, res: Response): Promise<Response> {
    try {
      const refreshToken = req.cookies.refreshToken;
      const user = (req as any).user;

      if (refreshToken) {
        await this.tokenService.revokeRefreshToken(refreshToken);
      }

      // Registrar auditoria de logout
      if (user) {
        try {
          const { logLogout } = await import('../utils/auditLogger.util');
          const ip = req.headers['x-forwarded-for']?.toString() || req.socket.remoteAddress || '';
          await logLogout(
            user.Id,
            user.Email || 'unknown',
            ip
          );
        } catch (auditError) {
          console.error('[AuthController] Erro ao registrar auditoria de logout:', auditError);
          // Não falha o logout se a auditoria falhar
        }
      }

      const isProduction = process.env.NODE_ENV === "production";
      const clearCookieOptions = {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? "none" as const : "lax" as const,
        path: "/",
        expires: new Date(0),
        maxAge: 0,
      };

      // Força remoção dos cookies com expires e maxAge
      res.cookie("token", "", clearCookieOptions);
      res.cookie("refreshToken", "", clearCookieOptions);
      res.cookie("role", "", clearCookieOptions);

      return res.status(200).json({ success: true, message: "Logout realizado com sucesso." });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Ocorreu um erro ao processar sua solicitação.",
      });
    }
  }
  // ===================== REGISTRO =====================

  /**
   * Realiza registro de novo usuário.
   * @param req Request do Express contendo dados e arquivos.
   * @param res Response do Express.
   * @returns Response com resultado do registro.
   */
  async register(req: Request, res: Response): Promise<Response> {
    try {
      // Observação: aceita tanto multipart/form-data (Multer) quanto fallback JSON/base64 (service)

      // Aceita ambos formatos do Multer:
      // - upload.any(): req.files é Array<Express.Multer.File>
      // - upload.fields(): req.files é Record<string, Express.Multer.File[]>
      let files: { [key: string]: Express.Multer.File[] } | undefined = undefined;
      const rawFiles: any = req.files as any;
      if (Array.isArray(rawFiles)) {
        const filesArray = rawFiles as Express.Multer.File[];
        if (filesArray.length > 0) {
          files = {};
          filesArray.forEach(file => {
            if (!files![file.fieldname]) files![file.fieldname] = [];
            files![file.fieldname].push(file);
          });
        }
      } else if (rawFiles && typeof rawFiles === 'object') {
        files = rawFiles as { [key: string]: Express.Multer.File[] };
      } else {
        // Nenhum arquivo recebido em req.files (pode ser JSON/base64)
      }

      const result = await this.authService.register(req.body, files);
      if (!result.success) {
        // Erros semânticos: define status conforme o tipo de falha
        const msg = (result.message || '').toLowerCase();
        let status = 400;
        // Upload/Documentos inválidos ou não salvos
        if (/(upload|documento|documentos|arquivo|arquivos)/.test(msg)) {
          status = 422;
        }
        return res.status(status).json(result);
      }
      return res.status(201).json({
        success: true,
        message: 'Usuário registrado com sucesso.',
        user: result.user,
      });
    } catch (error) {
      console.error('Error in register:', error);
      return res.status(500).json({
        success: false,
        message: 'Erro interno do servidor.',
        error: error instanceof Error ? error.message : 'Erro desconhecido.',
      });
    }
  }

  // ===================== RECUPERAÇÃO DE SENHA =====================

  /**
   * Inicia processo de recuperação de senha.
   * @param req Request do Express contendo email.
   * @param res Response do Express.
   * @returns Response com resultado da solicitação.
   */
  async forgotPassword(req: Request, res: Response): Promise<Response> {
    try {
      const { email } = req.body;
      const result = await this.authService.forgotPassword(email);
      return res.status(200).json(result);
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Erro interno do servidor.',
        error: error instanceof Error ? error.message : 'Erro desconhecido.',
      });
    }
  }

  /**
   * Realiza redefinição de senha usando token.
   * @param req Request do Express contendo token e nova senha.
   * @param res Response do Express.
   * @returns Response com resultado da redefinição.
   */
  async resetPassword(req: Request, res: Response): Promise<Response> {
    try {
      const { token, newPassword } = req.body;
      const result = await this.authService.resetPassword(token, newPassword);
      return res.status(200).json(result);
    } catch (error) {
      return res.status(200).json({
        success: false,
        message: 'Ocorreu um erro ao processar sua solicitação.',
      });
    }
  }

  // ===================== TOKEN =====================

  /**
   * Atualiza o token de acesso usando refresh token.
   * @param req Request do Express contendo refresh token.
   * @param res Response do Express.
   * @returns Response com novo token ou erro.
   */
  async refreshToken(req: Request, res: Response): Promise<Response> {
    try {
      const refreshToken = req.cookies.refreshToken;
      const result = await this.tokenService.refreshAccessToken(refreshToken);
      return res.status(200).json(result);
    } catch (error) {
      const status = error instanceof Error && error.message.includes('expirado') ? 403 : 500;
      return res.status(status).json({
        success: false,
        message: error instanceof Error ? error.message : 'Erro desconhecido.',
      });
    }
  }

  // ===================== USUÁRIO AUTENTICADO =====================

  /**
   * Retorna dados do usuário autenticado.
   * @param req Request do Express.
   * @param res Response do Express.
   * @returns Response com dados do usuário ou erro.
   */
  async getAuthenticatedUser(req: Request, res: Response) {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ message: 'Usuário não autenticado' });
    }
    return res.status(200).json({ user });
  }
}