/**
 * Repository para retornar todos os enums do sistema
 * Cada função retorna os valores do enum correspondente do Prisma Schema
 */

// ==================== ENUMS DE STATUS ====================

export function getCommissionStatus(): string[] {
    return ["pendente", "disponivel", "retido", "pago"];
}

export function getFinanceiroPsicologoStatus(): string[] {
    return ["pendente", "processando", "aprovado", "cancelado", "retido", "pago"];
}

export function getCommissionTipoPlano(): string[] {
    return ["mensal", "trimestral", "semestral", "avulsa"];
}

export function getControleConsultaStatus(): string[] {
    return ["Ativo", "Inativo", "Completed"];
}

export function getPlanoCompraStatus(): string[] {
    return ["AguardandoPagamento", "Ativo", "Expirado", "Cancelado"];
}

export function getTipoCobranca(): string[] {
    return ["Mensal", "Trimestral", "Semestral", "Anual", "Avulso", "Multa", "Primeira"];
}

export function getControleFinanceiroStatus(): string[] {
    return ["AguardandoPagamento", "Cancelado", "EmMonitoramento", "Reprovado", "Aprovado", "EmDisputa", "Chargeback", "Multa"];
}

export function getUserStatus(): string[] {
    return ["Ativo", "Inativo", "Bloqueado", "Pendente", "Deletado", "EmAnalise", "EmAnaliseContrato"];
}

export function getAgendaStatus(): string[] {
    return [
        "Disponivel", "Indisponivel", "Bloqueado", "Reservado", "Cancelado",
        "Andamento", "Concluido", "Cancelled_by_patient", "Cancelled_by_psychologist", "Cancelled_no_show"
    ];
}

export function getConsultaAvulsaStatus(): string[] {
    return ["Ativa", "Concluida", "Cancelada", "Expirada", "Pendente"];
}

export function getFaturaStatus(): string[] {
    return ["Paid", "Pending", "Failed", "Canceled"];
}

export function getTipoFatura(): string[] {
    return ["Plano", "ConsultaAvulsa", "PrimeiraConsulta"];
}

export function getCancelamentoSessaoStatus(): string[] {
    return ["EmAnalise", "Deferido", "Indeferido", "Cancelado"];
}

export function getControleConsultaMensalStatus(): string[] {
    return ["AguardandoPagamento", "Ativo", "Inativo", "Expirado", "Cancelado", "Completo"];
}

export function getFaqStatus(): string[] {
    return ["Ativo", "Inativo"];
}

export function getFaqTipo(): string[] {
    return ["Paciente", "Psicologo"];
}

export function getProfessionalProfileStatus(): string[] {
    return ["Preenchido", "Incompleto"];
}

export function getWebhookStatus(): string[] {
    return ["PENDING", "SUCCESS", "FAILED"];
}

// ==================== ENUMS DE USUÁRIO ====================

export function getSexo(): string[] {
    return ["Masculino", "Feminino", "Outro", "PrefiroNaoInformar"];
}

export function getRole(): string[] {
    return ["Admin", "Patient", "Psychologist", "Management", "Finance"];
}

export function getPronome(): string[] {
    return ["EleDele", "ElaDela", "EluDelu", "PrefiroNaoInformar"];
}

// ==================== ENUMS DE PERMISSÕES ====================

export function getActionType(): string[] {
    return ["Read", "Create", "Update", "Delete", "Manage", "Approve"];
}

export function getModule(): string[] {
    return [
        "Users", "Reports", "Plans", "Payments", "Sessions", "Profiles", "Evaluations",
        "Onboarding", "Finance", "Agenda", "Notifications", "Promotions", "SystemSettings",
        "Psychologists", "Clients", "Contracts", "Reviews", "Cancelamentos", "WorkSchedule",
        "RedesSociais", "Faq", "Configuracoes", "Permission"
    ];
}

// ==================== ENUMS DE PERFIL PROFISSIONAL ====================

export function getTipoPessoaJuridica(): string[] {
    return ["PjAutonomo", "Ei", "Mei", "SociedadeLtda", "Eireli", "Slu", "Outro"];
}

export function getLanguages(): string[] {
    return ["Portugues", "Ingles", "Espanhol", "Libras"];
}

export function getTipoAtendimento(): string[] {
    return ["Idoso", "Adultos", "Casais", "Adolescentes", "Criancas", "Grupo", "Familia"];
}

export function getTipoFormacao(): string[] {
    return [
        "Curso", "Graduacao", "PosGraduacao", "Mestrado", "Doutorado",
        "PosDoutorado", "Residencia", "Especializacao", "CursoLivre", "Certificacao", "Outro", "Bacharelado"
    ];
}

export function getRecorrencia(): string[] {
    return ["Mensal", "Trimestral", "Semestral"];
}

export function getAutorTipoCancelamento(): string[] {
    return ["Paciente", "Psicologo", "Admin", "Management", "Sistema"];
}

export function getExperienciaClinica(): string[] {
    return ["Entre1_5Anos", "Entre6_10Anos", "Entre11_15Anos", "Entre15_20Anos", "Mais20Anos"];
}

export function getAbordagem(): string[] {
    return [
        "Acp", "AnaliseBioenergetica", "AnaliseComportamento", "AnaliseExistencial", "AnaliseTransacional",
        "AssessoramentoAcademico", "AvaliacaoPerfilProfissional", "AvaliacaoNeuropsicologicaTriagem",
        "AvaliacaoPsicologicaBariatrica", "AvaliacaoPsicologicaClinicaTriagem", "AvaliacaoEmissaoLaudoTriagem",
        "CoachingCarreira", "CoachingEmagrecimento", "CoachingNegocios", "CoachingVida", "CoachingExecutivo",
        "ConstrucionismoSocial", "CorporalReichiana", "CuidadosPaliativos", "DaseinAnalyses", "Esquizoanalise",
        "EvolucaoEmocional", "ExpressaoCratividade", "FenomenologiaExistencial", "GestaltTerapia", "Hipnoterapia",
        "Humanista", "InterpretacaoSonhos", "Logoterapia", "Ludoterapia", "Mindfulness", "Neurociencias",
        "Neuropsicopedagogia", "OrientacaoEducadores", "OrientacaoPais", "OrientacaoProfissionalVocacional",
        "PlanejamentoPsicopedagogico", "PsicanaliseBion", "PsicanaliseFreud", "PsicanaliseKlein", "PsicanaliseLacan",
        "PsicanaliseWinnicott", "Psicodinamica", "Psicodrama", "PsicologiaAnaliticaJunguiana", "PsicologiaClinica",
        "PsicologiaAtividade", "PsicologiaEsporte", "PsicologiaSelfKohut", "PsicologiaEscolarEducacional",
        "PsicologiaHistoricoCultural", "PsicologiaOncologica", "PsicologiaOrganizacionalTrabalho",
        "PsicologiaTranspessoal", "Psiconefrologia", "Psicopedagogia", "Psicossomatica", "PsicossomaticaPsicanalitica",
        "PsicoterapiaAnaliticaFuncionalFap", "PsicoterapiaBreve", "PsicoterapiaSexual", "TeoriaApego",
        "TerapiaAfirmativa", "TerapiaBaseadaMindfulnessTbm", "TerapiaCognitivaComportamentalTcc",
        "TerapiaCognitivaComportamentalBaseadaProcessos", "TerapiaCognitivaProcessualTcp",
        "TerapiaComportamentalDialeticaDbt", "TerapiaAceitacaoCompromissoAct", "TerapiaAtivacaoComportamental",
        "TerapiaCasal", "TerapiaExposicaoPrevencaoRespostaFobiasTpr", "TerapiaExposicaoPrevencaoRespostaTocTpr",
        "TerapiaReversaoHabitosTrh", "TerapiaEsquemaJeffreyYoungTe", "TerapiaLuto", "TerapiaEmdr", "TerapiaFamiliar",
        "TerapiaFocadaCompaixaoTfc", "TerapiaFocadaEmocoesTfe", "TerapiaFocadaEsquemaEmocional", "TerapiaNarrativa",
        "TerapiaSexual", "TerapiaSistemica", "Transpessoal"
    ];
}

export function getRacaCor(): string[] {
    return ["Branca", "Preta", "Parda", "Amarela", "Indigena", "PrefiroNaoInformar"];
}

export function getGrauInstrucao(): string[] {
    return ["EnsinoSuperiorCompleto", "PosGraduacao", "Mestrado", "Doutorado", "PosDoutorado"];
}

export function getQueixa(): string[] {
    return [
        "Abandono", "AdopcaoFilhos", "Agorafobia", "Agressividade", "AlteracaoHumor", "Angustia", "AnorexiaNervosa",
        "Ansiedade", "AnsiedadeDoenca", "AnsiedadeSocial", "AssedioMoral", "Autocritismo", "Autolesao", "Automutilacao",
        "BabyBlues", "BaixaAutoconfianca", "BaixaAutoeficacia", "BaixaAutoestima", "BaixoDesenvolvimentoPessoal",
        "BloqueioCritico", "Borderline", "BulimiaNervosa", "BullyingImportunacao", "BuscaAprovacaoExcessiva",
        "DiagnosticoCancer", "DiagnosticoDoencaTerminal", "Ciumes", "Claustofobia", "Cleptomania", "CompulsaoAlimentar",
        "CompulsoesRituais", "ConflitosAmorosos", "ConflitosAmorososFamiliares", "ConflitosConjugais", "ConflitosFamiliares",
        "ConflitosLegais", "DependenciaEmocional", "DependenciaQuimica", "Depressao", "DepressaoPosParto",
        "DesadaptacaoMudanca", "DesafiosAdolescencia", "Desanimo", "DescontroleEmocional", "Desmotivacao",
        "SofrimentoGravidez", "DificuldadeEmagrecimento", "DificuldadeFocar", "DificuldadeAprendizagem", "DificuldadeFoco",
        "DificuldadeLideranca", "DificuldadesRelacionamentoFilhos", "Discalculia", "DisforiaGenero", "DisforiaRejeicao",
        "DisfuncaoErectil", "DisfuncoesSexuais", "Dislexia", "DismorfismoCorporal", "Distimia", "DoencasCronicas",
        "DorCronica", "EjaculacaoPrecoce", "Encoprese", "Enurese", "EsquecimentosFrequentes", "Esquizofrenia",
        "EstresseExcessivo", "EstressePosTraumatico", "ExplosoesRaiva", "FaltaAssertividade", "FaltaAutoconhecimento",
        "FaltaDesejo", "FaltaPrazer", "FaltaPropositoVida", "FobiaSocial", "FobiasEspecificas", "Hiperatividade",
        "Hipocondria", "HivAids", "IdeacaoSuicida", "IdososTerceiraIdade", "Impaciencia", "Impulsividade", "Insonia",
        "IntoleranciaReligiosa", "LgbtqiapnIdentidadeGenero", "LutoSuicidio", "MedoMorte", "MedoSolidao", "MedoAviao",
        "MedoDirigir", "MedoExamesDoencas", "MedoFalarPublico", "MedoExacerbado", "Menopausa", "Mitomania", "MorteLuto",
        "Obesidade", "Obsessoes", "OrientacaoSexual", "OuvirVerCoisas", "Passividade", "PensamentosIntrusivosPerturbadores",
        "PensarDemais", "Perfeccionismo", "PessoasDeficienciaPcd", "Piromania", "PreconceitoLgbtqiapn",
        "PreparacaoAposentadoria", "ProblemasAprendizagem", "ProblemasFinanceiros", "Procrastinacao", "Racismo", "Raiva",
        "ReabilitacaoNeuropsicologica", "RelacionamentoConflitosAmorosos", "RelacionamentoConflitosFamiliares",
        "RelacionamentosAfetivos", "RelacionamentosAmigos", "Resiliencia", "SaudeTrabalhador", "SentimentoFracasso",
        "SentirForaCorpo", "SindromeBurnout", "SofrimentoMudancaCarreira", "SofrimentoTerceiraIdade",
        "SupervisaoClinicaPsicologia", "Tanatofobia", "TdaTdah", "Tdah", "Tea", "TimidezExcessiva", "Toc", "Traicao",
        "TransicaoCarreiras", "TranstornoBipolar", "TranstornoAnsiedadeGeneralizada", "TranstornoDeficitAtencaoHiperatividade",
        "TranstornoEstressePosTraumatico", "TranstornoPanico", "TranstornoPersonalidade", "TranstornoPersonalidadeAntissocial",
        "TranstornoPersonalidadeBorderline", "TranstornoPersonalidadeDependente", "TranstornoPersonalidadeEsquizotipica",
        "TranstornoPersonalidadeEvitativa", "TranstornoPersonalidadeNarcisista", "TranstornoEspectroAutista",
        "TranstornoSono", "TranstornoObsessivoCompulsivo", "TranstornoPorUsoAlcool", "TranstornosAlimentares",
        "TraumasAbusos", "TreinamentoEmpresarial", "Tricotilomania", "Trifofobia", "Vaginismo", "ViciosJogos",
        "ViciosPornografia", "ViciosTelas", "ViolenciaDomestica", "ViolenciaSexual", "Xenofobia"
    ];
} 