import { api } from "@/lib/axios";

// Tipagem para upload de imagem
export type PsicologoImagemFormData = FormData;

export const userPsicologoService = () => {
    return {
        getMeusPsicologos: () => api.get('/adm-psicologos/user/me'),
        updatePsicologo: (psicologo: Partial<updatePsicologo>) => api.put(`/adm-psicologos/user/me`, psicologo),
        uploadImagem: (formData: PsicologoImagemFormData) => api.post(`/adm-psicologos/user/me/image`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        }),
        updateImagem: (imageId: string, formData: PsicologoImagemFormData) => api.put(`/adm-psicologos/user/me/image/${imageId}`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        }),
        deleteImagem: (imageId: string) => api.delete(`/users/image/${imageId}`),
        deleteFormacao: (formacaoId: string) => api.delete(`/adm-psicologos/user/me/formacao/${formacaoId}`),
        // Métodos específicos para atualizações parciais
        updateDadosBancarios: (chavePix: string) => api.put('/adm-psicologos/user/me/dados-bancarios', { chavePix }),
        updateDadosPessoais: (data: {
            Nome?: string;
            Telefone?: string;
            WhatsApp?: string;
            Sexo?: string;
            Pronome?: string;
            RacaCor?: string;
            Rg?: string;
        }) => api.put('/adm-psicologos/user/me/dados-pessoais', data),
        updateSobreMim: (sobreMim: string) => api.put('/adm-psicologos/user/me/sobre-mim', { sobreMim }),
        updateEspecialidades: (data: {
            ExperienciaClinica?: string | null;
            TipoAtendimento?: string[];
            Abordagens?: string[];
            Queixas?: string[];
            Idiomas?: string[];
        }) => api.put('/adm-psicologos/user/me/especialidades', data),
        updateEndereco: (addressData: {
            Rua?: string;
            Numero?: string;
            Bairro?: string;
            Cidade?: string;
            Estado?: string;
            Cep?: string;
            Complemento?: string;
        }, isBillingAddress?: boolean) => api.put('/adm-psicologos/user/me/endereco', { ...addressData, isBillingAddress }),
        updatePessoalJuridica: (data: {
            CNPJ?: string;
            RazaoSocial?: string;
            NomeFantasia?: string;
            InscricaoEstadual?: string;
            SimplesNacional?: boolean;
        }) => api.put('/adm-psicologos/user/me/pessoal-juridica', data),
        updateFormacoes: (formacoes: Array<{
            Id?: string;
            TipoFormacao?: string;
            Instituicao?: string;
            Curso?: string;
            DataInicio?: string;
            DataConclusao?: string;
            Status?: string;
        }>) => api.put('/adm-psicologos/user/me/formacoes', { formacoes }),
    };
}

export type updatePsicologo = {
    Nome: string;
    Email: string;
    Cpf: string;
    Telefone: string;
    WhatsApp?: string;
    DataNascimento: string;
    Sexo: string;
    Pronome: string;
    RacaCor?: string;
    Rg: string;
    Address: {
        Rua: string;
        Numero: string;
        Bairro: string;
        Cidade: string;
        Estado: string;
        Cep: string;
        Complemento: string;
    }[];
    PessoalJuridica?: {
        Id?: string;
        InscricaoEstadual: string;
        SimplesNacional: boolean;
        RazaoSocial: string;
        NomeFantasia: string;
        CNPJ?: string;
        DadosBancarios?: {
            Id?: string;
            PessoalJuridicaId?: string;
            ChavePix: string;
        };
    };
    ProfessionalProfiles: {
        TipoPessoaJuridico: string[];
        TipoAtendimento: string[];
        ExperienciaClinica: string;
        Idiomas: string[];
        SobreMim: string;
        Abordagens: string[];
        Queixas: string[];
        Formacoes: {
            TipoFormacao: string;
            Instituicao: string;
            Curso: string;
            DataInicio: string;
            DataConclusao: string;
            Status: string;
        }[];
        DadosBancarios?: {
            Id?: string;
            PsicologoAutonomoId?: string;
            ChavePix: string;
        };
    }[];
}