import prisma from '../prisma/client';
import { IFormularioSaqueAutonomoService } from '../interfaces/formularioSaqueAutonomo.interface';
import { IFormularioSaqueAutonomo, ICreateFormularioSaqueAutonomoDTO, IUpdateFormularioSaqueAutonomoDTO } from '../types/formularioSaqueAutonomo.types';

export class FormularioSaqueAutonomoService implements IFormularioSaqueAutonomoService {
    async create(
        psicologoAutonomoId: string,
        data: ICreateFormularioSaqueAutonomoDTO
    ): Promise<{ success: boolean; message: string; formulario?: IFormularioSaqueAutonomo }> {
        try {
            // Verificar se o usuário é psicólogo autônomo (Role = Psychologist e não tem PessoalJuridica)
            const user = await prisma.user.findUnique({
                where: { Id: psicologoAutonomoId },
                include: { PessoalJuridica: true }
            });

            if (!user) {
                return { success: false, message: 'Usuário não encontrado' };
            }

            if (user.Role !== 'Psychologist') {
                return { success: false, message: 'Usuário não é um psicólogo' };
            }

            if (user.PessoalJuridica) {
                return { success: false, message: 'Este psicólogo possui pessoa jurídica cadastrada' };
            }

            // Verificar se já existe um formulário para este psicólogo
            const formularioExistente = await prisma.formularioSaqueAutonomo.findUnique({
                where: { PsicologoAutonomoId: psicologoAutonomoId }
            });

            if (formularioExistente) {
                return { success: false, message: 'Formulário já existe para este psicólogo. Use a rota de atualização.' };
            }

            // Criar o formulário
            const formulario = await prisma.formularioSaqueAutonomo.create({
                data: {
                    PsicologoAutonomoId: psicologoAutonomoId,
                    NumeroRg: data.NumeroRg || null,
                    DataEmissaoRg: data.DataEmissaoRg || null,
                    OrgaoEmissor: data.OrgaoEmissor || null,
                    UfOrgaoEmissor: data.UfOrgaoEmissor || null,
                    DataNascimento: data.DataNascimento || null,
                    Nacionalidade: data.Nacionalidade || null,
                    CidadeNascimentoPessoa: data.CidadeNascimentoPessoa || null,
                    EstadoNascimentoPessoa: data.EstadoNascimentoPessoa || null,
                    Sexo: data.Sexo || null,
                    Raca: data.Raca || null,
                    EstadoCivil: data.EstadoCivil || null,
                    NomeConjuge: data.NomeConjuge || null,
                    RegimeBens: data.RegimeBens || null,
                    PossuiDependente: data.PossuiDependente || null,
                    TipoDependente: data.TipoDependente || null,
                    NomeDependente: data.NomeDependente || null,
                    CpfDependente: data.CpfDependente || null,
                    DataNascimentoDependente: data.DataNascimentoDependente || null,
                    CidadeNascimento: data.CidadeNascimento || null,
                    EstadoNascimento: data.EstadoNascimento || null,
                    PossuiDeficiencia: data.PossuiDeficiencia || null,
                    ChavePix: data.ChavePix || null,
                    Status: false // Inicialmente não preenchido
                }
            });

            return {
                success: true,
                message: 'Formulário criado com sucesso',
                formulario: formulario as IFormularioSaqueAutonomo
            };
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido ao criar formulário';
            return { success: false, message: `Erro ao criar formulário: ${errorMessage}` };
        }
    }

    async getByPsicologoAutonomoId(
        psicologoAutonomoId: string
    ): Promise<{ success: boolean; formulario?: IFormularioSaqueAutonomo | null; message?: string }> {
        try {
            const formulario = await prisma.formularioSaqueAutonomo.findUnique({
                where: { PsicologoAutonomoId: psicologoAutonomoId }
            });

            if (!formulario) {
                return { success: true, formulario: null, message: 'Formulário não encontrado' };
            }

            return {
                success: true,
                formulario: formulario as IFormularioSaqueAutonomo
            };
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido ao buscar formulário';
            return { success: false, message: `Erro ao buscar formulário: ${errorMessage}` };
        }
    }

    async update(
        psicologoAutonomoId: string,
        data: IUpdateFormularioSaqueAutonomoDTO
    ): Promise<{ success: boolean; message: string; formulario?: IFormularioSaqueAutonomo }> {
        try {
            // Verificar se o formulário existe
            const formularioExistente = await prisma.formularioSaqueAutonomo.findUnique({
                where: { PsicologoAutonomoId: psicologoAutonomoId }
            });

            if (!formularioExistente) {
                return { success: false, message: 'Formulário não encontrado. Crie o formulário primeiro.' };
            }

            // Preparar dados para atualização (remover undefined)
            const updateData: Record<string, string | boolean | null> = {};
            if (data.NumeroRg !== undefined) updateData.NumeroRg = data.NumeroRg || null;
            if (data.DataEmissaoRg !== undefined) updateData.DataEmissaoRg = data.DataEmissaoRg || null;
            if (data.OrgaoEmissor !== undefined) updateData.OrgaoEmissor = data.OrgaoEmissor || null;
            if (data.UfOrgaoEmissor !== undefined) updateData.UfOrgaoEmissor = data.UfOrgaoEmissor || null;
            if (data.DataNascimento !== undefined) updateData.DataNascimento = data.DataNascimento || null;
            if (data.Nacionalidade !== undefined) updateData.Nacionalidade = data.Nacionalidade || null;
            if (data.CidadeNascimentoPessoa !== undefined) updateData.CidadeNascimentoPessoa = data.CidadeNascimentoPessoa || null;
            if (data.EstadoNascimentoPessoa !== undefined) updateData.EstadoNascimentoPessoa = data.EstadoNascimentoPessoa || null;
            if (data.Sexo !== undefined) updateData.Sexo = data.Sexo || null;
            if (data.Raca !== undefined) updateData.Raca = data.Raca || null;
            if (data.EstadoCivil !== undefined) updateData.EstadoCivil = data.EstadoCivil || null;
            if (data.NomeConjuge !== undefined) updateData.NomeConjuge = data.NomeConjuge || null;
            if (data.RegimeBens !== undefined) updateData.RegimeBens = data.RegimeBens || null;
            if (data.PossuiDependente !== undefined) updateData.PossuiDependente = data.PossuiDependente || null;
            if (data.TipoDependente !== undefined) updateData.TipoDependente = data.TipoDependente || null;
            if (data.NomeDependente !== undefined) updateData.NomeDependente = data.NomeDependente || null;
            if (data.CpfDependente !== undefined) updateData.CpfDependente = data.CpfDependente || null;
            if (data.DataNascimentoDependente !== undefined) updateData.DataNascimentoDependente = data.DataNascimentoDependente || null;
            if (data.CidadeNascimento !== undefined) updateData.CidadeNascimento = data.CidadeNascimento || null;
            if (data.EstadoNascimento !== undefined) updateData.EstadoNascimento = data.EstadoNascimento || null;
            if (data.PossuiDeficiencia !== undefined) updateData.PossuiDeficiencia = data.PossuiDeficiencia || null;
            if (data.ChavePix !== undefined) updateData.ChavePix = data.ChavePix || null;
            if (data.Status !== undefined) {
                updateData.Status = data.Status;
            } else {
                // Se o status não foi explicitamente definido, marcar como true quando há dados
                const hasData = Object.keys(updateData).length > 0;
                if (hasData && !formularioExistente.Status) {
                    updateData.Status = true;
                }
            }

            // Atualizar o formulário
            const formulario = await prisma.formularioSaqueAutonomo.update({
                where: { PsicologoAutonomoId: psicologoAutonomoId },
                data: updateData
            });

            return {
                success: true,
                message: 'Formulário atualizado com sucesso',
                formulario: formulario as IFormularioSaqueAutonomo
            };
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido ao atualizar formulário';
            return { success: false, message: `Erro ao atualizar formulário: ${errorMessage}` };
        }
    }

    async getStatus(psicologoAutonomoId: string): Promise<{ success: boolean; status?: boolean; message?: string }> {
        try {
            const formulario = await prisma.formularioSaqueAutonomo.findUnique({
                where: { PsicologoAutonomoId: psicologoAutonomoId },
                select: { Status: true }
            });

            // Se não encontrar formulário, retorna status false (não preenchido)
            if (!formulario) {
                return { 
                    success: true, 
                    status: false, 
                    message: 'Formulário não encontrado' 
                };
            }

            return {
                success: true,
                status: formulario.Status
            };
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido ao buscar status';
            return { success: false, message: `Erro ao buscar status: ${errorMessage}` };
        }
    }
}
