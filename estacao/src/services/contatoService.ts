// src/services/contatoService.ts
export interface ContatoPayload {
    nome: string;
    email: string;
    telefone: string;
    assunto: string;
    mensagem: string;
}


import { api } from "@/lib/axios";
import { AxiosResponse } from "axios";

export interface ContatoPayload {
    nome: string;
    email: string;
    telefone: string;
    assunto: string;
    mensagem: string;
}

export const contatoService = () => {
    return {
        enviarContato: (payload: ContatoPayload): Promise<AxiosResponse<ContatoPayload>> =>
            api.post<ContatoPayload>('/contato', payload),
    };
};

