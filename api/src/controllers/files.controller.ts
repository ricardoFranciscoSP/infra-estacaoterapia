import { Request, Response } from "express";
import fs from "fs";
import path from "path";
import { FilesService } from "../services/files.service";
import { normalizeQueryString, normalizeQueryIntWithDefault, normalizeParamString, normalizeParamStringRequired } from "../utils/validation.util";

export class FilesController {
    static async viewPsychologistDocument(req: Request, res: Response) {
        try {
            const result = await FilesService.getPsychologistDocument(normalizeParamStringRequired(req.params.id), req.user as any);
            return res.json(result);
        } catch (error: any) {
            const status = error?.status || 500;
            const message = error?.message || "Erro ao carregar documento";
            if (status >= 500) console.error("Erro ao gerar URL do documento:", error);
            return res.status(status).json({ error: message, details: status >= 500 ? error?.message : undefined });
        }
    }

    static async viewPsychologistDocumentInline(req: Request, res: Response) {
        try {
            const { buffer, contentType, fileName } = await FilesService.getPsychologistDocumentInline(
                normalizeParamStringRequired(req.params.id),
                req.user as any
            );

            res.setHeader("Content-Type", contentType);
            res.setHeader("Content-Disposition", `inline; filename="${fileName}"`);
            res.setHeader("Cache-Control", "no-store");
            return res.status(200).send(buffer);
        } catch (error: any) {
            const status = error?.status || 500;
            const message = error?.message || "Erro ao carregar documento";
            if (status >= 500) console.error("Erro ao carregar documento inline:", error);
            return res.status(status).json({ error: message, details: status >= 500 ? error?.message : undefined });
        }
    }

    static async listPsychologistDocuments(req: Request, res: Response) {
        try {
            const userId = normalizeParamStringRequired(req.params.profileId); // parâmetro tratado como userId por compatibilidade
            const result = await FilesService.listDocumentsByUserId(userId, req.user as any);
            return res.json(result);
        } catch (error: any) {
            const status = error?.status || 500;
            const message = error?.message || "Erro ao carregar lista de documentos";
            if (status >= 500) console.error("Erro ao listar documentos:", error);
            return res.status(status).json({ error: message, details: status >= 500 ? error?.message : undefined });
        }
    }

    static async downloadPsychologistDocument(req: Request, res: Response) {
        try {
            const result = await FilesService.getDownloadUrl(normalizeParamStringRequired(req.params.id), req.user as any);
            return res.json(result);
        } catch (error: any) {
            const status = error?.status || 500;
            const message = error?.message || "Erro ao preparar download";
            if (status >= 500) console.error("Erro ao gerar URL de download:", error);
            return res.status(status).json({ error: message, details: status >= 500 ? error?.message : undefined });
        }
    }

    static async documentThumbnail(req: Request, res: Response) {
        try {
            const size = normalizeQueryIntWithDefault(req.query.size, 200);
            const result = await FilesService.getDocumentThumbnail(normalizeParamStringRequired(req.params.id), size, req.user as any);
            return res.json(result);
        } catch (error: any) {
            const status = error?.status || 500;
            const message = error?.message || "Erro ao gerar thumbnail";
            if (status >= 500) console.error("Erro ao gerar thumbnail:", error);
            return res.status(status).json({ error: message, details: status >= 500 ? error?.message : undefined });
        }
    }

    static async userAvatar(req: Request, res: Response) {
        try {
            const size = normalizeQueryIntWithDefault(req.query.size, 200);
            const result = await FilesService.getUserAvatar(normalizeParamStringRequired(req.params.userId), size);
            return res.json(result);
        } catch (error: any) {
            const status = error?.status || 500;
            const message = error?.message || "Erro ao carregar avatar";
            if (status >= 500) console.error("Erro ao gerar URL do avatar:", error);
            return res.status(status).json({ error: message, details: status >= 500 ? error?.message : undefined });
        }
    }

    static async userAvatarFull(req: Request, res: Response) {
        try {
            const userId = normalizeParamString(req.params.userId);
            if (!userId) {
                return res.status(400).json({ error: "userId é obrigatório" });
            }
            const result = await FilesService.getUserAvatarFull(userId);
            return res.json(result);
        } catch (error: any) {
            const status = error?.status || 500;
            const message = error?.message || "Erro ao carregar avatar";
            return res.status(status).json({ error: message, details: status >= 500 ? error?.message : undefined });
        }
    }

    static async userAvatarSigned(req: Request, res: Response) {
        try {
            const userId = normalizeParamString(req.params.userId);
            if (!userId) {
                return res.status(400).json({ error: "userId é obrigatório" });
            }
            const result = await FilesService.getUserAvatarSigned(userId);
            return res.json(result);
        } catch (error: any) {
            const status = error?.status || 500;
            const message = error?.message || "Erro ao gerar URL do avatar";
            if (status >= 500) console.error("Erro ao gerar URL assinada do avatar (12h):", error);
            return res.status(status).json({ error: message, details: status >= 500 ? error?.message : undefined });
        }
    }

    static async batch(req: Request, res: Response) {
        try {
            const { documentIds } = req.body || {};
            if (!Array.isArray(documentIds) || documentIds.length === 0) {
                return res.status(400).json({ error: "documentIds deve ser um array não vazio" });
            }
            const result = await FilesService.batchDocuments(documentIds);
            return res.json(result);
        } catch (error: any) {
            const status = error?.status || 500;
            const message = error?.message || "Erro ao processar documentos";
            return res.status(status).json({ error: message, details: status >= 500 ? error?.message : undefined });
        }
    }

    static async validate(req: Request, res: Response) {
        try {
            const { documentIds } = req.body || {};
            if (!Array.isArray(documentIds)) {
                return res.status(400).json({ error: "documentIds deve ser um array" });
            }
            const result = await FilesService.validateDocuments(documentIds, req.user as any);
            return res.json(result);
        } catch (error: any) {
            const status = error?.status || 500;
            const message = error?.message || "Erro ao validar documentos";
            return res.status(status).json({ error: message, details: status >= 500 ? error?.message : undefined });
        }
    }

    static async test(req: Request, res: Response) {
        try {
            const filePath = normalizeQueryString(req.query.path as any);
            if (!filePath) {
                return res.status(400).json({ error: "path query parameter required" });
            }
            const result = await FilesService.testSignedUrl(filePath);
            return res.json(result);
        } catch (error: any) {
            return res.status(500).json({ error: error?.message || 'Erro ao testar signed url' });
        }
    }

    /**
     * Visualizar documento da tabela Document (usado em solicitações de saque)
     * GET /api/files/documents/:id
     */
    static async viewDocument(req: Request, res: Response) {
        try {
            const result = await FilesService.getDocument(normalizeParamStringRequired(req.params.id), req.user as any);
            return res.json(result);
        } catch (error: any) {
            const status = error?.status || 500;
            const message = error?.message || "Erro ao carregar documento";
            if (status >= 500) console.error("Erro ao gerar URL do documento:", error);
            return res.status(status).json({ error: message, details: status >= 500 ? error?.message : undefined });
        }
    }

    static async deletePsychologistDocument(req: Request, res: Response) {
        try {
            const result = await FilesService.deletePsychologistDocument(normalizeParamStringRequired(req.params.id), req.user as any);
            return res.json(result);
        } catch (error: any) {
            const status = error?.status || 500;
            const message = error?.message || "Erro ao excluir documento";
            if (status >= 500) console.error("Erro ao excluir documento:", error);
            return res.status(status).json({ error: message, details: status >= 500 ? error?.message : undefined });
        }
    }

    /**
     * Download público do guia do psicólogo
     * GET /api/files/guia-psicologo
     * 
     * Uso: Download do PDF do guia para psicólogos em cadastro
     */
    static async downloadGuiaPsicologo(req: Request, res: Response) {
        try {
            // Tenta encontrar o arquivo em diferentes locais
            const possiblePaths = [
                path.resolve(__dirname, "..", "templates", "assets", "guia_do_ psicologo _onboarding.pdf"),
                path.resolve(__dirname, "..", "..", "src", "templates", "assets", "guia_do_ psicologo _onboarding.pdf"),
                path.resolve(process.cwd(), "dist", "templates", "assets", "guia_do_ psicologo _onboarding.pdf"),
                path.resolve(process.cwd(), "src", "templates", "assets", "guia_do_ psicologo _onboarding.pdf"),
            ];

            let pdfPath: string | null = null;
            for (const filePath of possiblePaths) {
                if (fs.existsSync(filePath)) {
                    pdfPath = filePath;
                    break;
                }
            }

            if (!pdfPath) {
                console.error("[FilesController] PDF do guia não encontrado em nenhum dos caminhos:", possiblePaths);
                return res.status(404).json({ error: "Arquivo não encontrado" });
            }

            // Define headers para download
            res.setHeader("Content-Type", "application/pdf");
            res.setHeader(
                "Content-Disposition",
                'attachment; filename="guia_do_psicologo_onboarding.pdf"'
            );

            // Envia o arquivo
            const fileStream = fs.createReadStream(pdfPath);
            fileStream.pipe(res);

            console.log(`[FilesController] ✅ Guia do psicólogo enviado: ${pdfPath}`);
        } catch (error: unknown) {
            console.error("[FilesController] ❌ Erro ao servir guia do psicólogo:", error);
            const message = error instanceof Error ? error.message : "Erro ao servir arquivo";
            return res.status(500).json({ error: message });
        }
    }
}
