import { api } from "@/lib/axios";
import { AxiosResponse } from "axios";
import {
    CreateFormularioSaqueAutonomoData,
    UpdateFormularioSaqueAutonomoData,
    FormularioSaqueAutonomoResponse,
    FormularioSaqueAutonomoStatusResponse
} from "@/types/formularioSaqueAutonomoTypes";

export const formularioSaqueAutonomoService = {
    // Criar formulário
    createFormulario: (data: CreateFormularioSaqueAutonomoData): Promise<AxiosResponse<FormularioSaqueAutonomoResponse>> =>
        api.post('/formulario-saque-autonomo', data),

    // Buscar meu formulário
    getMyFormulario: (): Promise<AxiosResponse<FormularioSaqueAutonomoResponse>> =>
        api.get('/formulario-saque-autonomo/me'),

    // Buscar formulário por ID do psicólogo (admin/management/finance)
    getFormularioByPsicologoId: (psicologoAutonomoId: string): Promise<AxiosResponse<FormularioSaqueAutonomoResponse>> =>
        api.get(`/formulario-saque-autonomo/${psicologoAutonomoId}`),

    // Atualizar formulário
    updateFormulario: (data: UpdateFormularioSaqueAutonomoData): Promise<AxiosResponse<FormularioSaqueAutonomoResponse>> =>
        api.put('/formulario-saque-autonomo', data),

    // Buscar status do formulário
    getStatus: (): Promise<AxiosResponse<FormularioSaqueAutonomoStatusResponse>> =>
        api.get('/formulario-saque-autonomo/status'),
};
