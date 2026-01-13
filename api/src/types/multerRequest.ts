import { Request } from "express";

declare global {
    namespace Express {
        interface Multer {
            File: {
                fieldname: string;
                originalname: string;
                encoding: string;
                mimetype: string;
                size: number;
                buffer: Buffer;
                stream: import("stream").Readable; // Usar Readable do módulo 'stream'
                destination: string;
                filename: string;
                path: string;
            };
        }
    }
}

import { User } from '../types/user.types';

export interface MulterRequest extends Request {
    user?: User;
    file?: Express.Multer.File;
    files?: {
        [fieldname: string]: Express.Multer.File[];
    } | Express.Multer.File[];
}