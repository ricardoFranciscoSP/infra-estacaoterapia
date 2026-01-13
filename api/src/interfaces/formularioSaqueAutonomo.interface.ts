import { IFormularioSaqueAutonomo, ICreateFormularioSaqueAutonomoDTO, IUpdateFormularioSaqueAutonomoDTO } from '../types/formularioSaqueAutonomo.types';

export interface IFormularioSaqueAutonomoService {
    create(psicologoAutonomoId: string, data: ICreateFormularioSaqueAutonomoDTO): Promise<{ success: boolean; message: string; formulario?: IFormularioSaqueAutonomo }>;
    getByPsicologoAutonomoId(psicologoAutonomoId: string): Promise<{ success: boolean; formulario?: IFormularioSaqueAutonomo | null; message?: string }>;
    update(psicologoAutonomoId: string, data: IUpdateFormularioSaqueAutonomoDTO): Promise<{ success: boolean; message: string; formulario?: IFormularioSaqueAutonomo }>;
    getStatus(psicologoAutonomoId: string): Promise<{ success: boolean; status?: boolean; message?: string }>;
}
