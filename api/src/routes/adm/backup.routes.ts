import { Router } from "express";
import asyncHandler from "express-async-handler";
import { BackupService } from "../../services/adm/backup.service";

const router = Router();

// Gera backup, faz upload para Supabase e registra no banco
router.post("/generate", asyncHandler(async (req, res) => {
    // Se tiver autenticação, pegue o ID do usuário autenticado
    const createdById = req.user?.Id || null;
    const backup = await BackupService.generateAndUploadBackup(createdById);
    res.status(201).json(backup);
}));

// Lista backups
router.get("/", asyncHandler(async (req, res) => {
    const backups = await BackupService.listBackups();
    res.json(backups);
}));

// Gera URL temporária para download
router.get("/:fileName/download-url", asyncHandler(async (req, res) => {
    const rawFileName = req.params.fileName;
    const fileName = Array.isArray(rawFileName) ? rawFileName[0] : rawFileName;
    if (!fileName) {
        res.status(400).json({ message: "Nome do arquivo é obrigatório." });
        return;
    }

    const rawExpiresIn = req.query.expiresIn;
    const expiresIn = typeof rawExpiresIn === "string"
        ? Number(rawExpiresIn)
        : Array.isArray(rawExpiresIn)
            ? Number(rawExpiresIn[0])
            : 600;
    const result = await BackupService.createSignedDownloadUrl(fileName, expiresIn);
    res.json(result);
}));

// Deleta backup
router.delete("/:fileName", asyncHandler(async (req, res) => {
    const rawFileName = req.params.fileName;
    const fileName = Array.isArray(rawFileName) ? rawFileName[0] : rawFileName;
    if (!fileName) {
        res.status(400).json({ message: "Nome do arquivo é obrigatório." });
        return;
    }
    const deleted = await BackupService.deleteBackup(fileName);
    res.json(deleted);
}));

export default router;
