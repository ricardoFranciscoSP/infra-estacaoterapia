import { Router, Request, Response } from 'express';
import prisma from '../prisma/client';

const router = Router();

/**
 * GET /api/estacao/ultimo-acesso
 * Retorna o último acesso registrado no sistema
 */
router.get('/ultimo-acesso', async (req: Request, res: Response) => {
  try {
    // Busca o usuário com o LastLogin mais recente
    const ultimoAcesso = await prisma.user.findFirst({
      where: {
        LastLogin: {
          not: null,
        },
      },
      select: {
        LastLogin: true,
        Nome: true,
        Email: true,
      },
      orderBy: {
        LastLogin: 'desc',
      },
    });

    if (!ultimoAcesso || !ultimoAcesso.LastLogin) {
      return res.status(200).json({
        success: true,
        ultimoAcesso: null,
        mensagem: 'Nenhum acesso registrado ainda',
      });
    }

    return res.status(200).json({
      success: true,
      ultimoAcesso: ultimoAcesso.LastLogin,
      usuario: ultimoAcesso.Nome,
      email: ultimoAcesso.Email,
    });
  } catch (error) {
    console.error('Erro ao buscar último acesso:', error);
    return res.status(500).json({
      success: false,
      error: 'Erro ao buscar último acesso',
      message: error instanceof Error ? error.message : 'Erro desconhecido',
    });
  }
});

export default router;
