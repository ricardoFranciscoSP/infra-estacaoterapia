import { Request, Response } from 'express';
import { AdmFinanceiroService } from '../../services/adm/financeiro.service';
import { AuthorizationService } from '../../services/authorization.service';
import { FinanceiroPsicologoStatus, ControleFinanceiroStatus } from '../../generated/prisma';
import { logAuditFromRequest } from '../../utils/auditLogger.util';
import { ActionType, Module } from '../../types/permissions.types';
import { getClientIp } from '../../utils/getClientIp.util';
import prisma from '../../prisma/client';
import { normalizeQueryString, normalizeQueryIntWithDefault, normalizeParamStringRequired } from '../../utils/validation.util';

export class AdmFinanceiroController {
  private financeiroService: AdmFinanceiroService;
  private authService: AuthorizationService;

  constructor() {
    this.financeiroService = new AdmFinanceiroService();
    this.authService = new AuthorizationService();
  }

  /**
   * Lista pagamentos de psicólogos
   * GET /admin/financeiro/psicologos
   */
  async listarPagamentosPsicologos(req: Request, res: Response): Promise<Response> {
    try {
      const userId = this.authService.getLoggedUserId(req);
      if (!userId) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      const rawStatus = normalizeQueryString(req.query.status);
      const parsedStatus: FinanceiroPsicologoStatus | ControleFinanceiroStatus | undefined = (() => {
        if (!rawStatus) return undefined;
        if (Object.values(FinanceiroPsicologoStatus).includes(rawStatus as FinanceiroPsicologoStatus)) {
          return rawStatus as FinanceiroPsicologoStatus;
        }
        if (Object.values(ControleFinanceiroStatus).includes(rawStatus as ControleFinanceiroStatus)) {
          return rawStatus as ControleFinanceiroStatus;
        }
        return undefined;
      })();

      const filtros = {
        dataInicio: normalizeQueryString(req.query.dataInicio),
        dataFim: normalizeQueryString(req.query.dataFim),
        psicologoId: normalizeQueryString(req.query.psicologoId),
        status: parsedStatus,
        tipo: normalizeQueryString(req.query.tipo),
        page: normalizeQueryIntWithDefault(req.query.page, 1),
        pageSize: normalizeQueryIntWithDefault(req.query.pageSize, 50),
      };

      const resultado = await this.financeiroService.listarPagamentosPsicologos(filtros);

      return res.status(200).json({
        success: true,
        data: resultado,
      });
    } catch (error) {
      console.error('Erro ao listar pagamentos de psicólogos:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro interno ao listar pagamentos';
      return res.status(500).json({ success: false, error: errorMessage });
    }
  }

  /**
   * Lista pagamentos de pacientes (entradas)
   * GET /admin/financeiro/pacientes
   */
  async listarPagamentosPacientes(req: Request, res: Response): Promise<Response> {
    try {
      const userId = this.authService.getLoggedUserId(req);
      if (!userId) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      const rawStatus = normalizeQueryString(req.query.status);
      const parsedStatus: FinanceiroPsicologoStatus | ControleFinanceiroStatus | undefined = (() => {
        if (!rawStatus) return undefined;
        if (Object.values(FinanceiroPsicologoStatus).includes(rawStatus as FinanceiroPsicologoStatus)) {
          return rawStatus as FinanceiroPsicologoStatus;
        }
        if (Object.values(ControleFinanceiroStatus).includes(rawStatus as ControleFinanceiroStatus)) {
          return rawStatus as ControleFinanceiroStatus;
        }
        return undefined;
      })();

      const filtros = {
        dataInicio: normalizeQueryString(req.query.dataInicio),
        dataFim: normalizeQueryString(req.query.dataFim),
        status: parsedStatus,
        tipo: normalizeQueryString(req.query.tipo),
        page: normalizeQueryIntWithDefault(req.query.page, 1),
        pageSize: normalizeQueryIntWithDefault(req.query.pageSize, 50),
      };

      const resultado = await this.financeiroService.listarPagamentosPacientes(filtros);

      return res.status(200).json({
        success: true,
        data: resultado,
      });
    } catch (error) {
      console.error('Erro ao listar pagamentos de pacientes:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro interno ao listar pagamentos';
      return res.status(500).json({ success: false, error: errorMessage });
    }
  }

  /**
   * Lista psicólogos com informações financeiras
   * GET /admin/financeiro/psicologos-lista
   */
  async listarPsicologosComFinanceiro(req: Request, res: Response): Promise<Response> {
    try {
      const userId = this.authService.getLoggedUserId(req);
      if (!userId) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      const filtros = {
        status: normalizeQueryString(req.query.status),
        page: normalizeQueryIntWithDefault(req.query.page, 1),
        pageSize: normalizeQueryIntWithDefault(req.query.pageSize, 50),
      };

      console.log('[AdmFinanceiroController] Listando psicólogos com financeiro, filtros:', filtros);

      const resultado = await this.financeiroService.listarPsicologosComFinanceiro(filtros);

      console.log('[AdmFinanceiroController] Resultado:', { total: resultado.paginacao.total, items: resultado.items.length });

      return res.status(200).json({
        success: true,
        data: resultado,
      });
    } catch (error) {
      console.error('Erro ao listar psicólogos com financeiro:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro interno ao listar psicólogos';
      const errorStack = error instanceof Error ? error.stack : undefined;
      console.error('Stack trace:', errorStack);
      return res.status(500).json({ success: false, error: errorMessage, details: errorStack });
    }
  }

  /**
   * Aprova um pagamento de psicólogo
   * POST /admin/financeiro/aprovar-pagamento
   */
  async aprovarPagamento(req: Request, res: Response): Promise<Response> {
    try {
      const userId = this.authService.getLoggedUserId(req);
      if (!userId) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      const { financeiroPsicologoId, observacoes, dataPagamento } = req.body;

      if (!financeiroPsicologoId) {
        return res.status(400).json({ success: false, error: 'financeiroPsicologoId é obrigatório' });
      }

      const resultado = await this.financeiroService.aprovarPagamento(
        financeiroPsicologoId,
        observacoes,
        dataPagamento
      );

      // Registrar auditoria
      if (resultado) {
        try {
          const financeiro = await prisma.financeiroPsicologo.findUnique({
            where: { Id: financeiroPsicologoId },
            include: { User: { select: { Nome: true, Crp: true } } }
          });

          if (financeiro) {
            await logAuditFromRequest(
              req,
              userId,
              ActionType.Approve,
              Module.Finance,
              `Pagamento aprovado: Psicólogo ${financeiro.User?.Nome || 'N/A'} (CRP: ${financeiro.User?.Crp || 'N/A'}) - Valor: R$ ${financeiro.Valor?.toFixed(2) || '0.00'}`,
              'Sucesso',
              {
                financeiroPsicologoId,
                psicologoId: financeiro.UserId,
                valor: financeiro.Valor,
                observacoes,
                dataPagamento,
              }
            );
          }
        } catch (auditError) {
          console.error('[AdmFinanceiroController] Erro ao registrar auditoria:', auditError);
        }
      }

      return res.status(200).json({
        success: true,
        data: resultado,
        message: 'Pagamento aprovado com sucesso',
      });
    } catch (error) {
      console.error('Erro ao aprovar pagamento:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro interno ao aprovar pagamento';
      return res.status(500).json({ success: false, error: errorMessage });
    }
  }

  /**
   * Reprova um pagamento de psicólogo
   * POST /admin/financeiro/reprovar-pagamento
   */
  async reprovarPagamento(req: Request, res: Response): Promise<Response> {
    try {
      const userId = this.authService.getLoggedUserId(req);
      if (!userId) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      const { financeiroPsicologoId, motivo } = req.body;

      if (!financeiroPsicologoId || !motivo) {
        return res.status(400).json({ 
          success: false, 
          error: 'financeiroPsicologoId e motivo são obrigatórios' 
        });
      }

      const resultado = await this.financeiroService.reprovarPagamento(financeiroPsicologoId, motivo);

      // Registrar auditoria
      if (resultado) {
        try {
          const financeiro = await prisma.financeiroPsicologo.findUnique({
            where: { Id: financeiroPsicologoId },
            include: { User: { select: { Nome: true, Crp: true } } }
          });

          if (financeiro) {
            await logAuditFromRequest(
              req,
              userId,
              ActionType.Update,
              Module.Finance,
              `Pagamento reprovado: Psicólogo ${financeiro.User?.Nome || 'N/A'} (CRP: ${financeiro.User?.Crp || 'N/A'}) - Valor: R$ ${financeiro.Valor?.toFixed(2) || '0.00'} - Motivo: ${motivo}`,
              'Sucesso',
              {
                financeiroPsicologoId,
                psicologoId: financeiro.UserId,
                valor: financeiro.Valor,
                motivo,
              }
            );
          }
        } catch (auditError) {
          console.error('[AdmFinanceiroController] Erro ao registrar auditoria:', auditError);
        }
      }

      return res.status(200).json({
        success: true,
        data: resultado,
        message: 'Pagamento reprovado com sucesso',
      });
    } catch (error) {
      console.error('Erro ao reprovar pagamento:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro interno ao reprovar pagamento';
      return res.status(500).json({ success: false, error: errorMessage });
    }
  }

  /**
   * Baixa um pagamento (marca como pago)
   * POST /admin/financeiro/baixar-pagamento
   */
  async baixarPagamento(req: Request, res: Response): Promise<Response> {
    try {
      const userId = this.authService.getLoggedUserId(req);
      if (!userId) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      const { financeiroPsicologoId, comprovanteUrl } = req.body;

      if (!financeiroPsicologoId) {
        return res.status(400).json({ success: false, error: 'financeiroPsicologoId é obrigatório' });
      }

      const resultado = await this.financeiroService.baixarPagamento(financeiroPsicologoId, comprovanteUrl);

      return res.status(200).json({
        success: true,
        data: resultado,
        message: 'Pagamento baixado com sucesso',
      });
    } catch (error) {
      console.error('Erro ao baixar pagamento:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro interno ao baixar pagamento';
      return res.status(500).json({ success: false, error: errorMessage });
    }
  }

  /**
   * Obtém estatísticas financeiras
   * GET /admin/financeiro/estatisticas
   */
  async obterEstatisticas(req: Request, res: Response): Promise<Response> {
    try {
      const userId = this.authService.getLoggedUserId(req);
      if (!userId) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      const estatisticas = await this.financeiroService.obterEstatisticas();

      return res.status(200).json({
        success: true,
        data: estatisticas,
      });
    } catch (error) {
      console.error('Erro ao obter estatísticas:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro interno ao obter estatísticas';
      return res.status(500).json({ success: false, error: errorMessage });
    }
  }

  /**
   * Gera relatório financeiro
   * GET /admin/financeiro/relatorio
   */
  async gerarRelatorio(req: Request, res: Response): Promise<Response> {
    try {
      const userId = this.authService.getLoggedUserId(req);
      if (!userId) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      const filtros = {
        dataInicio: normalizeQueryString(req.query.dataInicio),
        dataFim: normalizeQueryString(req.query.dataFim),
        psicologoId: normalizeQueryString(req.query.psicologoId),
      };

      const relatorio = await this.financeiroService.gerarRelatorio(filtros);

      return res.status(200).json({
        success: true,
        data: relatorio,
      });
    } catch (error) {
      console.error('Erro ao gerar relatório:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro interno ao gerar relatório';
      return res.status(500).json({ success: false, error: errorMessage });
    }
  }

  /**
   * Obtém detalhes completos de um psicólogo (somente leitura)
   * GET /admin/financeiro/psicologos/:id
   */
  async obterDetalhesPsicologo(req: Request, res: Response): Promise<Response> {
    try {
      const userId = this.authService.getLoggedUserId(req);
      if (!userId) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      const id = normalizeParamStringRequired(req.params.id);
      
      if (!id) {
        return res.status(400).json({ success: false, error: 'ID do psicólogo é obrigatório' });
      }

      console.log('[AdmFinanceiroController] Buscando detalhes do psicólogo:', id);

      const psicologo = await this.financeiroService.obterDetalhesPsicologo(id);

      if (!psicologo) {
        return res.status(404).json({ 
          success: false, 
          error: 'Psicólogo não encontrado' 
        });
      }

      return res.status(200).json({
        success: true,
        data: psicologo,
      });
    } catch (error) {
      console.error('Erro ao buscar detalhes do psicólogo:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro interno ao buscar detalhes do psicólogo';
      const errorStack = error instanceof Error ? error.stack : undefined;
      console.error('Stack trace:', errorStack);
      return res.status(500).json({ success: false, error: errorMessage, details: errorStack });
    }
  }
}

