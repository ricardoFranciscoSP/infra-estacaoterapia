import { Request, Response } from 'express';
import { DraftSessionService } from '../services/draftSession.service';
import { CreateDraftSessionPayload, ConfirmDraftSessionPayload } from '../types/draftSession.types';

export class DraftSessionController {
    static async createDraftSession(req: Request, res: Response) {
        console.log('Chegou na createDraftSession controller', req.body);
        try {
            const payload: CreateDraftSessionPayload = req.body;
            const draftId = await DraftSessionService.createDraftSession(payload);
            return res.status(201).json({ draftId });
        } catch (error: any) {
            return res.status(400).json({ error: error.message });
        }
    }

    static async confirmDraftSession(req: Request, res: Response) {
        try {
            const payload: ConfirmDraftSessionPayload = req.body;
            const sessionId = await DraftSessionService.confirmDraftSession(payload);
            return res.status(200).json({ sessionId });
        } catch (error: any) {
            return res.status(400).json({ error: error.message });
        }
    }
}
