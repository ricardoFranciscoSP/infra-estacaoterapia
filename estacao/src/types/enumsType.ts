export interface Enums {
    queixa: string[];
    abordagem: string[];
}

export interface EnumsResponse {
    status: {
        userStatus: string[];
        agendaStatus: string[];
        planoCompraStatus: string[];
        controleFinanceiroStatus: string[];
        faturaStatus: string[];
        consultaAvulsaStatus: string[];
        cancelamentoSessaoStatus: string[];
        controleConsultaMensalStatus: string[];
        faqStatus: string[];
        professionalProfileStatus: string[];
        commissionStatus: string[];
        financeiroPsicologoStatus: string[];
        webhookStatus: string[];
        controleConsultaStatus: string[];
    };
    tipos: {
        tipoCobranca: string[];
        tipoAtendimento: string[];
        tipoFormacao: string[];
        tipoFatura: string[];
        faqTipo: string[];
        tipoPessoaJuridica: string[];
        autorTipoCancelamento: string[];
        commissionTipoPlano: string[];
    };
    usuario: {
        sexo: string[];
        role: string[];
        pronome: string[];
    };
    perfilProfissional: {
        languages: string[];
        experienciaClinica: string[];
        abordagem: string[];
        queixa: string[];
        tipoAtendimento: string[];
    };
    sistema: {
        actionType: string[];
        module: string[];
    };
    outros: {
        recorrencia: string[];
    };
}