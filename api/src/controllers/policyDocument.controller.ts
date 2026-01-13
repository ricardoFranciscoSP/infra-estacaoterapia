import { Request, Response } from 'express';
import { PolicyDocumentService } from '../services/policyDocument.service';

export class PolicyDocumentController {
  private service: PolicyDocumentService;

  constructor() {
    this.service = new PolicyDocumentService();
  }

  /**
   * Lista todos os documentos
   * GET /api/policy-documents
   */
  async listDocuments(req: Request, res: Response): Promise<Response> {
    try {
      const { ativo, publicoPara } = req.query;
      
      const filters: { ativo?: boolean; publicoPara?: string } = {};
      if (ativo !== undefined) {
        filters.ativo = ativo === 'true';
      }
      if (publicoPara) {
        filters.publicoPara = publicoPara as string;
      }

      const documents = await this.service.listDocuments(filters);
      return res.json(documents);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      console.error('Erro ao listar documentos:', error);
      return res.status(500).json({ 
        error: 'Erro ao listar documentos',
        details: errorMessage 
      });
    }
  }

  /**
   * Busca um documento por ID
   * GET /api/policy-documents/:id
   */
  async getDocumentById(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const document = await this.service.getDocumentById(id);
      
      if (!document) {
        return res.status(404).json({ error: 'Documento não encontrado' });
      }

      return res.json(document);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      console.error('Erro ao buscar documento:', error);
      return res.status(500).json({ 
        error: 'Erro ao buscar documento',
        details: errorMessage 
      });
    }
  }

  /**
   * Cria um novo documento
   * POST /api/policy-documents
   * Apenas Admin pode criar documentos
   */
  async createDocument(req: Request, res: Response): Promise<Response> {
    try {
      const user = req.user as { Id?: string; Role?: string } | undefined;
      if (!user?.Id) {
        return res.status(401).json({ error: 'Não autenticado' });
      }

      // Verifica se o usuário é Admin
      if (user.Role !== 'Admin') {
        return res.status(403).json({ error: 'Apenas administradores podem criar documentos' });
      }

      const { Titulo, Descricao, Tipo, PublicoPara, Ordem, Ativo } = req.body;
      const file = req.file;

      if (!Titulo || !Tipo || !PublicoPara) {
        return res.status(400).json({ 
          error: 'Campos obrigatórios: Titulo, Tipo, PublicoPara' 
        });
      }

      let url = '';
      
      // Se for PDF, faz upload do arquivo
      if (Tipo === 'pdf' && file) {
        url = await this.service.uploadFile(file);
      } else if (Tipo === 'texto') {
        // Para texto, a URL pode ser vazia ou um endpoint
        url = req.body.Url || '';
      } else {
        return res.status(400).json({ 
          error: 'Para tipo PDF, é necessário enviar um arquivo' 
        });
      }

      // Converte Ativo de string para boolean
      const ativoBoolean = typeof Ativo === 'string' 
        ? Ativo === 'true' || Ativo === '1' 
        : Boolean(Ativo);

      const document = await this.service.createDocument({
        Titulo,
        Descricao,
        Url: url,
        Tipo: Tipo as "pdf" | "texto",
        PublicoPara: PublicoPara as "paciente" | "psicologo" | "todos",
        Ordem: Ordem ? parseInt(Ordem.toString()) : 0,
        Ativo: ativoBoolean
      }, user.Id);

      return res.status(201).json(document);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      console.error('Erro ao criar documento:', error);
      return res.status(500).json({ 
        error: 'Erro ao criar documento',
        details: errorMessage 
      });
    }
  }

  /**
   * Atualiza um documento
   * PUT /api/policy-documents/:id
   * Apenas Admin pode atualizar documentos
   */
  async updateDocument(req: Request, res: Response): Promise<Response> {
    try {
      const user = req.user as { Id?: string; Role?: string } | undefined;
      if (!user?.Id) {
        return res.status(401).json({ error: 'Não autenticado' });
      }

      // Verifica se o usuário é Admin
      if (user.Role !== 'Admin') {
        return res.status(403).json({ error: 'Apenas administradores podem atualizar documentos' });
      }

      const { id } = req.params;
      const { Titulo, Descricao, Tipo, PublicoPara, Ordem, Ativo, Url } = req.body;
      const file = req.file;

      const updateData: { Id: string; [key: string]: unknown } = { Id: id };

      if (Titulo !== undefined) updateData.Titulo = Titulo;
      if (Descricao !== undefined) updateData.Descricao = Descricao;
      if (Tipo !== undefined) updateData.Tipo = Tipo;
      if (PublicoPara !== undefined) updateData.PublicoPara = PublicoPara;
      if (Ordem !== undefined) updateData.Ordem = parseInt(Ordem.toString());
      
      // Converte Ativo de string para boolean
      if (Ativo !== undefined) {
        updateData.Ativo = typeof Ativo === 'string' 
          ? Ativo === 'true' || Ativo === '1' 
          : Boolean(Ativo);
      }

      // Se enviou novo arquivo, faz upload
      if (file && Tipo === 'pdf') {
        updateData.Url = await this.service.uploadFile(file);
      } else if (Url !== undefined) {
        updateData.Url = Url;
      }

      const document = await this.service.updateDocument(updateData, user.Id);
      return res.json(document);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      console.error('Erro ao atualizar documento:', error);
      return res.status(500).json({ 
        error: 'Erro ao atualizar documento',
        details: errorMessage 
      });
    }
  }

  /**
   * Deleta um documento
   * DELETE /api/policy-documents/:id
   * Apenas Admin pode deletar documentos
   */
  async deleteDocument(req: Request, res: Response): Promise<Response> {
    try {
      const user = req.user as { Id?: string; Role?: string } | undefined;
      if (!user?.Id) {
        return res.status(401).json({ error: 'Não autenticado' });
      }

      // Verifica se o usuário é Admin
      if (user.Role !== 'Admin') {
        return res.status(403).json({ error: 'Apenas administradores podem deletar documentos' });
      }

      const { id } = req.params;
      await this.service.deleteDocument(id);
      return res.json({ message: 'Documento deletado com sucesso' });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      console.error('Erro ao deletar documento:', error);
      return res.status(500).json({ 
        error: 'Erro ao deletar documento',
        details: errorMessage 
      });
    }
  }
}

