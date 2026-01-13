export interface FormularioSaqueAutonomo {
    Id: string;
    PsicologoAutonomoId: string;
    NumeroRg?: string | null;
    DataEmissaoRg?: string | null;
    OrgaoEmissor?: string | null;
    UfOrgaoEmissor?: string | null;
    DataNascimento?: string | null;
    Nacionalidade?: string | null;
    CidadeNascimentoPessoa?: string | null;
    EstadoNascimentoPessoa?: string | null;
    Sexo?: string | null;
    Raca?: string | null;
    EstadoCivil?: string | null;
    NomeConjuge?: string | null;
    RegimeBens?: string | null;
    PossuiDependente?: string | null;
    TipoDependente?: string | null;
    NomeDependente?: string | null;
    CpfDependente?: string | null;
    DataNascimentoDependente?: string | null;
    CidadeNascimento?: string | null;
    EstadoNascimento?: string | null;
    PossuiDeficiencia?: string | null;
    ChavePix?: string | null;
    Status: boolean;
    CreatedAt: string;
    UpdatedAt: string;
}

export interface CreateFormularioSaqueAutonomoData {
    NumeroRg?: string;
    DataEmissaoRg?: string;
    OrgaoEmissor?: string;
    UfOrgaoEmissor?: string;
    DataNascimento?: string;
    Nacionalidade?: string;
    CidadeNascimentoPessoa?: string;
    EstadoNascimentoPessoa?: string;
    Sexo?: string;
    Raca?: string;
    EstadoCivil?: string;
    NomeConjuge?: string;
    RegimeBens?: string;
    PossuiDependente?: string;
    TipoDependente?: string;
    NomeDependente?: string;
    CpfDependente?: string;
    DataNascimentoDependente?: string;
    CidadeNascimento?: string;
    EstadoNascimento?: string;
    PossuiDeficiencia?: string;
    ChavePix?: string;
}

export interface UpdateFormularioSaqueAutonomoData {
    NumeroRg?: string;
    DataEmissaoRg?: string;
    OrgaoEmissor?: string;
    UfOrgaoEmissor?: string;
    DataNascimento?: string;
    Nacionalidade?: string;
    CidadeNascimentoPessoa?: string;
    EstadoNascimentoPessoa?: string;
    Sexo?: string;
    Raca?: string;
    EstadoCivil?: string;
    NomeConjuge?: string;
    RegimeBens?: string;
    PossuiDependente?: string;
    TipoDependente?: string;
    NomeDependente?: string;
    CpfDependente?: string;
    DataNascimentoDependente?: string;
    CidadeNascimento?: string;
    EstadoNascimento?: string;
    PossuiDeficiencia?: string;
    ChavePix?: string;
    Status?: boolean;
}

export interface FormularioSaqueAutonomoResponse {
    success: boolean;
    message: string;
    formulario?: FormularioSaqueAutonomo;
}

export interface FormularioSaqueAutonomoStatusResponse {
    success: boolean;
    status?: boolean;
    message?: string;
}
