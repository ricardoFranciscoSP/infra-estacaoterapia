import * as fs from "fs";
import * as path from "path";
import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import { v4 as uuidv4 } from "uuid";
import { supabase, supabaseAdmin } from "../services/storage.services";

export class ContratoService {
    async gerarContratoPdf(psicologo: any, templatePath: string): Promise<{ pdfPath: string, buffer: Buffer }> {
        // Preenche o template docx
        const content = fs.readFileSync(path.resolve(templatePath), "binary");
        const zip = new PizZip(content);
        const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });
        doc.render(psicologo);

        // Salva temporariamente o docx preenchido
        const tempDocxPath = path.resolve("output", `contrato_${uuidv4()}.docx`);
        fs.writeFileSync(tempDocxPath, doc.getZip().generate({ type: "nodebuffer" }));

        // Converte docx para PDF usando libreoffice (precisa estar instalado no servidor)
        const tempPdfPath = tempDocxPath.replace(".docx", ".pdf");
        const libre = require("libreoffice-convert");
        const docxBuf = fs.readFileSync(tempDocxPath);
        const pdfBuf = await new Promise<Buffer>((resolve, reject) => {
            libre.convert(docxBuf, ".pdf", undefined, (err: any, done: Buffer) => {
                if (err) reject(err);
                else resolve(done);
            });
        });
        fs.writeFileSync(tempPdfPath, pdfBuf);

        // Remove o docx temporário
        fs.unlinkSync(tempDocxPath);

        return { pdfPath: tempPdfPath, buffer: pdfBuf };
    }

    async uploadContrato(pdfBuffer: Buffer, psicologoId: string): Promise<string> {
        const bucketName = 'devupload';
        const fileName = `contratos/${psicologoId}/${Date.now()}_contrato.pdf`;
        let publicUrl = '';
        let uploadStatus = 'success';

        try {
            // Sempre usar supabaseAdmin para uploads em buckets privados
            if (!supabaseAdmin) {
                throw new Error(
                    "SUPABASE_SERVICE_ROLE_KEY não definido. " +
                    "Uploads para buckets privados requerem service role key para evitar erros de verificação de assinatura."
                );
            }
            const { error: uploadError } = await supabaseAdmin.storage
                .from(bucketName)
                .upload(fileName, pdfBuffer, { contentType: "application/pdf", upsert: true });

            if (uploadError) {
                uploadStatus = 'error';
                // Tratamento específico para erro de verificação de assinatura
                if (uploadError.message?.toLowerCase().includes('signature verification failed') ||
                    uploadError.message?.toLowerCase().includes('signature') ||
                    (uploadError as any).statusCode === '403' || (uploadError as any).status === 403) {
                    throw new Error(
                        "Erro de verificação de assinatura. Verifique se SUPABASE_SERVICE_ROLE_KEY está configurada corretamente."
                    );
                }
                console.error('Erro ao fazer upload do contrato:', uploadError);
            } else {
                const { data: urlData } = supabaseAdmin.storage.from(bucketName).getPublicUrl(fileName);
                publicUrl = urlData?.publicUrl || '';
            }
        } catch (err) {
            uploadStatus = 'exception';
            console.error('Erro ao processar upload do contrato:', err);
            // Re-lançar erro se for de configuração
            if (err instanceof Error && err.message.includes('SUPABASE_SERVICE_ROLE_KEY')) {
                throw err;
            }
        }

        return publicUrl;
    }
}
