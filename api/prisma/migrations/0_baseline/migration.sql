-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "CommissionStatus" AS ENUM ('pendente', 'disponivel', 'retido', 'pago');

-- CreateEnum
CREATE TYPE "FinanceiroPsicologoStatus" AS ENUM ('pendente', 'processando', 'aprovado', 'cancelado', 'retido', 'pago');

-- CreateEnum
CREATE TYPE "CommissionTipoPlano" AS ENUM ('mensal', 'trimestral', 'semestral', 'avulsa');

-- CreateEnum
CREATE TYPE "DraftSessionStatus" AS ENUM ('draft', 'auth_done', 'awaiting_plan', 'paid', 'completed', 'expired');

-- CreateEnum
CREATE TYPE "ControleConsultaStatus" AS ENUM ('Ativo', 'Inativo', 'Completed');

-- CreateEnum
CREATE TYPE "PlanoCompraStatus" AS ENUM ('AguardandoPagamento', 'Ativo', 'Expirado', 'Cancelado');

-- CreateEnum
CREATE TYPE "TipoCobranca" AS ENUM ('Mensal', 'Trimestral', 'Semestral', 'Anual', 'Avulso', 'Multa', 'Primeira');

-- CreateEnum
CREATE TYPE "ControleFinanceiroStatus" AS ENUM ('AguardandoPagamento', 'Cancelado', 'EmMonitoramento', 'Reprovado', 'Aprovado', 'EmDisputa', 'Chargeback', 'Multa');

-- CreateEnum
CREATE TYPE "Sexo" AS ENUM ('Masculino', 'Feminino', 'NaoBinario', 'PrefiroNaoDeclarar');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('Ativo', 'Inativo', 'Bloqueado', 'Pendente', 'Deletado', 'EmAnalise', 'EmAnaliseContrato');

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('Admin', 'Patient', 'Psychologist', 'Management', 'Finance');

-- CreateEnum
CREATE TYPE "ActionType" AS ENUM ('Read', 'Create', 'Update', 'Delete', 'Manage', 'Approve');

-- CreateEnum
CREATE TYPE "Module" AS ENUM ('Users', 'Reports', 'Plans', 'Payments', 'Sessions', 'Profiles', 'Evaluations', 'Onboarding', 'Finance', 'Agenda', 'Notifications', 'Promotions', 'SystemSettings', 'Psychologists', 'Clients', 'Contracts', 'Reviews', 'Cancelamentos', 'WorkSchedule', 'RedesSociais', 'Faq', 'Configuracoes', 'Permission');

-- CreateEnum
CREATE TYPE "TipoPessoaJuridica" AS ENUM ('PjAutonomo', 'Ei', 'Mei', 'SociedadeLtda', 'Eireli', 'Slu', 'Outro', 'Autonomo', 'Juridico');

-- CreateEnum
CREATE TYPE "Languages" AS ENUM ('Portugues', 'Ingles', 'Espanhol', 'Frances', 'Alemao', 'Italiano', 'Japones', 'Chines', 'Arabe', 'Libras', 'Outro');

-- CreateEnum
CREATE TYPE "TipoAtendimento" AS ENUM ('Idoso', 'Adultos', 'Casais', 'Adolescentes', 'Criancas', 'Grupo', 'Familia');

-- CreateEnum
CREATE TYPE "TipoFormacao" AS ENUM ('Curso', 'Graduacao', 'PosGraduacao', 'Mestrado', 'Doutorado', 'PosDoutorado', 'Residencia', 'Especializacao', 'CursoLivre', 'Certificacao', 'Outro', 'Bacharelado');

-- CreateEnum
CREATE TYPE "Recorrencia" AS ENUM ('Mensal', 'Trimestral', 'Semestral');

-- CreateEnum
CREATE TYPE "AutorTipoCancelamento" AS ENUM ('Paciente', 'Psicologo', 'Admin', 'Management', 'Sistema');

-- CreateEnum
CREATE TYPE "AgendaStatus" AS ENUM ('Disponivel', 'Indisponivel', 'Bloqueado', 'Reservado', 'Cancelado', 'Andamento', 'Concluido', 'Cancelled_by_patient', 'Cancelled_by_psychologist', 'Cancelled_no_show', 'Reagendada');

-- CreateEnum
CREATE TYPE "ExperienciaClinica" AS ENUM ('Nenhuma', 'Menos1Ano', 'Entre1_3Anos', 'Entre3_5Anos', 'Entre5_10Anos', 'Mais10Anos');

-- CreateEnum
CREATE TYPE "Pronome" AS ENUM ('EleDele', 'ElaDela', 'ElesDeles', 'ElasDelas', 'EluDelu', 'Outro', 'Dr', 'Dra', 'Psic', 'Prof', 'Mestre', 'Phd');

-- CreateEnum
CREATE TYPE "Abordagem" AS ENUM ('Acp', 'AnaliseBioenergetica', 'AnaliseComportamento', 'AnaliseExistencial', 'AnaliseTransacional', 'AssessoramentoAcademico', 'AvaliacaoPerfilProfissional', 'AvaliacaoNeuropsicologicaTriagem', 'AvaliacaoPsicologicaBariatrica', 'AvaliacaoPsicologicaClinicaTriagem', 'AvaliacaoEmissaoLaudoTriagem', 'CoachingCarreira', 'CoachingEmagrecimento', 'CoachingNegocios', 'CoachingVida', 'CoachingExecutivo', 'ConstrucionismoSocial', 'CorporalReichiana', 'CuidadosPaliativos', 'DaseinAnalyses', 'Esquizoanalise', 'EvolucaoEmocional', 'ExpressaoCratividade', 'FenomenologiaExistencial', 'GestaltTerapia', 'Hipnoterapia', 'Humanista', 'InterpretacaoSonhos', 'Logoterapia', 'Ludoterapia', 'Mindfulness', 'Neurociencias', 'Neuropsicopedagogia', 'OrientacaoEducadores', 'OrientacaoPais', 'OrientacaoProfissionalVocacional', 'PlanejamentoPsicopedagogico', 'PsicanaliseBion', 'PsicanaliseFreud', 'PsicanaliseKlein', 'PsicanaliseLacan', 'PsicanaliseWinnicott', 'Psicodinamica', 'Psicodrama', 'PsicologiaAnaliticaJunguiana', 'PsicologiaClinica', 'PsicologiaAtividade', 'PsicologiaEsporte', 'PsicologiaSelfKohut', 'PsicologiaEscolarEducacional', 'PsicologiaHistoricoCultural', 'PsicologiaOncologica', 'PsicologiaOrganizacionalTrabalho', 'PsicologiaTranspessoal', 'Psiconefrologia', 'Psicopedagogia', 'Psicossomatica', 'PsicossomaticaPsicanalitica', 'PsicoterapiaAnaliticaFuncionalFap', 'PsicoterapiaBreve', 'PsicoterapiaSexual', 'TeoriaApego', 'TerapiaAfirmativa', 'TerapiaBaseadaMindfulnessTbm', 'TerapiaCognitivaComportamentalTcc', 'TerapiaCognitivaComportamentalBaseadaProcessos', 'TerapiaCognitivaProcessualTcp', 'TerapiaComportamentalDialeticaDbt', 'TerapiaAceitacaoCompromissoAct', 'TerapiaAtivacaoComportamental', 'TerapiaCasal', 'TerapiaExposicaoPrevencaoRespostaFobiasTpr', 'TerapiaExposicaoPrevencaoRespostaTocTpr', 'TerapiaReversaoHabitosTrh', 'TerapiaEsquemaJeffreyYoungTe', 'TerapiaLuto', 'TerapiaEmdr', 'TerapiaFamiliar', 'TerapiaFocadaCompaixaoTfc', 'TerapiaFocadaEmocoesTfe', 'TerapiaFocadaEsquemaEmocional', 'TerapiaNarrativa', 'TerapiaSexual', 'TerapiaSistemica', 'Transpessoal');

-- CreateEnum
CREATE TYPE "Queixa" AS ENUM ('Abandono', 'AdopcaoFilhos', 'Agorafobia', 'Agressividade', 'AlteracaoHumor', 'Angustia', 'AnorexiaNervosa', 'Ansiedade', 'AnsiedadeDoenca', 'AnsiedadeSocial', 'AssedioMoral', 'Autocritismo', 'Autolesao', 'Automutilacao', 'BabyBlues', 'BaixaAutoconfianca', 'BaixaAutoeficacia', 'BaixaAutoestima', 'BaixoDesenvolvimentoPessoal', 'BloqueioCritico', 'Borderline', 'BulimiaNervosa', 'BullyingImportunacao', 'BuscaAprovacaoExcessiva', 'DiagnosticoCancer', 'DiagnosticoDoencaTerminal', 'Ciumes', 'Claustofobia', 'Cleptomania', 'CompulsaoAlimentar', 'CompulsoesRituais', 'ConflitosAmorosos', 'ConflitosAmorososFamiliares', 'ConflitosConjugais', 'ConflitosFamiliares', 'ConflitosLegais', 'DependenciaEmocional', 'DependenciaQuimica', 'Depressao', 'DepressaoPosParto', 'DesadaptacaoMudanca', 'DesafiosAdolescencia', 'Desanimo', 'DescontroleEmocional', 'Desmotivacao', 'SofrimentoGravidez', 'DificuldadeEmagrecimento', 'DificuldadeFocar', 'DificuldadeAprendizagem', 'DificuldadeFoco', 'DificuldadeLideranca', 'DificuldadesRelacionamentoFilhos', 'Discalculia', 'DisforiaGenero', 'DisforiaRejeicao', 'DisfuncaoErectil', 'DisfuncoesSexuais', 'Dislexia', 'DismorfismoCorporal', 'Distimia', 'DoencasCronicas', 'DorCronica', 'EjaculacaoPrecoce', 'Encoprese', 'Enurese', 'EsquecimentosFrequentes', 'Esquizofrenia', 'EstresseExcessivo', 'EstressePosTraumatico', 'ExplosoesRaiva', 'FaltaAssertividade', 'FaltaAutoconhecimento', 'FaltaDesejo', 'FaltaPrazer', 'FaltaPropositoVida', 'FobiaSocial', 'FobiasEspecificas', 'Hiperatividade', 'Hipocondria', 'HivAids', 'IdeacaoSuicida', 'IdososTerceiraIdade', 'Impaciencia', 'Impulsividade', 'Insonia', 'IntoleranciaReligiosa', 'LgbtqiapnIdentidadeGenero', 'LutoSuicidio', 'MedoMorte', 'MedoSolidao', 'MedoAviao', 'MedoDirigir', 'MedoExamesDoencas', 'MedoFalarPublico', 'MedoExacerbado', 'Menopausa', 'Mitomania', 'MorteLuto', 'Obesidade', 'Obsessoes', 'OrientacaoSexual', 'OuvirVerCoisas', 'Passividade', 'PensamentosIntrusivosPerturbadores', 'PensarDemais', 'Perfeccionismo', 'PessoasDeficienciaPcd', 'Piromania', 'PreconceitoLgbtqiapn', 'PreparacaoAposentadoria', 'ProblemasAprendizagem', 'ProblemasFinanceiros', 'Procrastinacao', 'Racismo', 'Raiva', 'ReabilitacaoNeuropsicologica', 'RelacionamentoConflitosAmorosos', 'RelacionamentoConflitosFamiliares', 'RelacionamentosAfetivos', 'RelacionamentosAmigos', 'Resiliencia', 'SaudeTrabalhador', 'SentimentoFracasso', 'SentirForaCorpo', 'SindromeBurnout', 'SofrimentoMudancaCarreira', 'SofrimentoTerceiraIdade', 'SupervisaoClinicaPsicologia', 'Tanatofobia', 'TdaTdah', 'Tdah', 'Tea', 'TimidezExcessiva', 'Toc', 'Traicao', 'TransicaoCarreiras', 'TranstornoBipolar', 'TranstornoAnsiedadeGeneralizada', 'TranstornoDeficitAtencaoHiperatividade', 'TranstornoEstressePosTraumatico', 'TranstornoPanico', 'TranstornoPersonalidade', 'TranstornoPersonalidadeAntissocial', 'TranstornoPersonalidadeBorderline', 'TranstornoPersonalidadeDependente', 'TranstornoPersonalidadeEsquizotipica', 'TranstornoPersonalidadeEvitativa', 'TranstornoPersonalidadeNarcisista', 'TranstornoEspectroAutista', 'TranstornoSono', 'TranstornoObsessivoCompulsivo', 'TranstornoPorUsoAlcool', 'TranstornosAlimentares', 'TraumasAbusos', 'TreinamentoEmpresarial', 'Tricotilomania', 'Trifofobia', 'Vaginismo', 'ViciosJogos', 'ViciosPornografia', 'ViciosTelas', 'ViolenciaDomestica', 'ViolenciaSexual', 'Xenofobia');

-- CreateEnum
CREATE TYPE "ConsultaAvulsaStatus" AS ENUM ('Ativa', 'Concluida', 'Cancelada', 'Expirada', 'Pendente', 'Reagendada');

-- CreateEnum
CREATE TYPE "FaturaStatus" AS ENUM ('Paid', 'Pending', 'Failed', 'Canceled');

-- CreateEnum
CREATE TYPE "TipoFatura" AS ENUM ('Plano', 'ConsultaAvulsa', 'PrimeiraConsulta', 'Multa', 'Upgrade', 'Downgrade');

-- CreateEnum
CREATE TYPE "CancelamentoSessaoStatus" AS ENUM ('EmAnalise', 'Deferido', 'Indeferido', 'Cancelado');

-- CreateEnum
CREATE TYPE "ControleConsultaMensalStatus" AS ENUM ('AguardandoPagamento', 'Ativo', 'Inativo', 'Expirado', 'Cancelado', 'Completo', 'Reagendada');

-- CreateEnum
CREATE TYPE "FaqStatus" AS ENUM ('Ativo', 'Inativo');

-- CreateEnum
CREATE TYPE "FaqTipo" AS ENUM ('Paciente', 'Psicologo');

-- CreateEnum
CREATE TYPE "ProfessionalProfileStatus" AS ENUM ('Preenchido', 'Incompleto');

-- CreateEnum
CREATE TYPE "WebhookStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED');

-- CreateTable
CREATE TABLE "FinanceiroPsicologo" (
    "Id" TEXT NOT NULL,
    "UserId" TEXT NOT NULL,
    "Valor" DOUBLE PRECISION NOT NULL,
    "Status" "FinanceiroPsicologoStatus" NOT NULL,
    "DataVencimento" TIMESTAMP(3) NOT NULL,
    "Tipo" TEXT NOT NULL,
    "CreatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedAt" TIMESTAMP(3) NOT NULL,
    "ConsultationId" TEXT,
    "PatientId" TEXT,

    CONSTRAINT "FinanceiroPsicologo_pkey" PRIMARY KEY ("Id")
);

-- CreateTable
CREATE TABLE "DraftSession" (
    "CreatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "Id" TEXT NOT NULL,
    "IdAgenda" TEXT NOT NULL,
    "PatientId" TEXT,
    "PsychologistId" TEXT NOT NULL,
    "Status" "DraftSessionStatus" NOT NULL,
    "UpdatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DraftSession_pkey" PRIMARY KEY ("Id")
);

-- CreateTable
CREATE TABLE "User" (
    "Id" TEXT NOT NULL,
    "Nome" TEXT NOT NULL,
    "Email" TEXT NOT NULL,
    "Cpf" TEXT NOT NULL,
    "Crp" TEXT,
    "GoogleId" TEXT,
    "Telefone" TEXT NOT NULL,
    "DataNascimento" TIMESTAMP(3),
    "Sexo" "Sexo",
    "TermsAccepted" BOOLEAN NOT NULL DEFAULT false,
    "PrivacyAccepted" BOOLEAN NOT NULL DEFAULT false,
    "Status" "UserStatus" NOT NULL DEFAULT 'Ativo',
    "Password" TEXT NOT NULL,
    "Role" "Role" NOT NULL,
    "IsOnboard" BOOLEAN NOT NULL DEFAULT false,
    "ResetPasswordToken" TEXT,
    "DataAprovacao" TIMESTAMP(3),
    "VindiCustomerId" TEXT,
    "Pronome" "Pronome",
    "PaymentToken" TEXT,
    "PaymentProfileId" TEXT,
    "SubscriptionId" TEXT,
    "Rg" TEXT,
    "AssinaturaContrato" BOOLEAN DEFAULT false,
    "twoFASecret" TEXT,
    "isTwoFAEnabled" BOOLEAN NOT NULL DEFAULT false,
    "backupCodes" TEXT,
    "LastLogin" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "CreatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("Id")
);

-- CreateTable
CREATE TABLE "ProfessionalProfile" (
    "Id" TEXT NOT NULL,
    "UserId" TEXT NOT NULL,
    "TipoAtendimento" "TipoAtendimento"[],
    "ExperienciaClinica" "ExperienciaClinica",
    "Idiomas" "Languages"[],
    "SobreMim" TEXT,
    "Abordagens" "Abordagem"[],
    "Queixas" "Queixa"[],
    "Status" "ProfessionalProfileStatus" NOT NULL DEFAULT 'Incompleto',
    "CreatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedAt" TIMESTAMP(3) NOT NULL,
    "AreasAtuacao" TEXT,
    "TipoPessoaJuridico" "TipoPessoaJuridica",

    CONSTRAINT "ProfessionalProfile_pkey" PRIMARY KEY ("Id")
);

-- CreateTable
CREATE TABLE "PsychologistDocument" (
    "Id" TEXT NOT NULL,
    "ProfessionalProfileId" TEXT NOT NULL,
    "Url" TEXT NOT NULL,
    "Type" TEXT,
    "Description" TEXT,
    "CreatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PsychologistDocument_pkey" PRIMARY KEY ("Id")
);

-- CreateTable
CREATE TABLE "Address" (
    "Id" TEXT NOT NULL,
    "UserId" TEXT NOT NULL,
    "Rua" TEXT NOT NULL,
    "Numero" TEXT,
    "Complemento" TEXT,
    "Bairro" TEXT NOT NULL,
    "Cidade" TEXT NOT NULL,
    "Estado" TEXT NOT NULL,
    "Cep" TEXT NOT NULL,
    "CreatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Address_pkey" PRIMARY KEY ("Id")
);

-- CreateTable
CREATE TABLE "BillingAddress" (
    "Id" TEXT NOT NULL,
    "UserId" TEXT NOT NULL,
    "Rua" TEXT NOT NULL,
    "Numero" TEXT,
    "Complemento" TEXT,
    "Bairro" TEXT NOT NULL,
    "Cidade" TEXT NOT NULL,
    "Estado" TEXT NOT NULL,
    "Cep" TEXT NOT NULL,
    "CreatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BillingAddress_pkey" PRIMARY KEY ("Id")
);

-- CreateTable
CREATE TABLE "Image" (
    "Id" TEXT NOT NULL,
    "UserId" TEXT NOT NULL,
    "Url" TEXT NOT NULL,
    "CreatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Image_pkey" PRIMARY KEY ("Id")
);

-- CreateTable
CREATE TABLE "Review" (
    "Id" TEXT NOT NULL,
    "UserId" TEXT,
    "PsicologoId" TEXT NOT NULL,
    "Rating" INTEGER NOT NULL,
    "Comentario" TEXT,
    "Status" TEXT NOT NULL DEFAULT 'Pendente',
    "MostrarNaHome" BOOLEAN DEFAULT false,
    "MostrarNaPsicologo" BOOLEAN DEFAULT false,
    "CreatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("Id")
);

-- CreateTable
CREATE TABLE "Agenda" (
    "Id" TEXT NOT NULL,
    "Data" TIMESTAMP(3) NOT NULL,
    "Horario" TEXT NOT NULL,
    "DiaDaSemana" TEXT NOT NULL,
    "Status" "AgendaStatus" NOT NULL DEFAULT 'Disponivel',
    "PsicologoId" TEXT NOT NULL,
    "PacienteId" TEXT,
    "CreatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Agenda_pkey" PRIMARY KEY ("Id")
);

-- CreateTable
CREATE TABLE "RefreshToken" (
    "Id" TEXT NOT NULL,
    "UserId" TEXT NOT NULL,
    "Token" TEXT NOT NULL,
    "ExpiresAt" TIMESTAMP(3) NOT NULL,
    "Status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "RevokedAt" TIMESTAMP(3),
    "CreatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("Id")
);

-- CreateTable
CREATE TABLE "WorkSchedule" (
    "Id" TEXT NOT NULL,
    "UserId" TEXT NOT NULL,
    "DiaDaSemana" TEXT NOT NULL,
    "HorarioInicio" TEXT NOT NULL,
    "HorarioFim" TEXT NOT NULL,
    "Status" TEXT NOT NULL DEFAULT 'available',
    "Breaks" JSONB,
    "CreatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkSchedule_pkey" PRIMARY KEY ("Id")
);

-- CreateTable
CREATE TABLE "Favorite" (
    "Id" TEXT NOT NULL,
    "PatientId" TEXT NOT NULL,
    "PsychologistId" TEXT NOT NULL,
    "CreatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Favorite_pkey" PRIMARY KEY ("Id")
);

-- CreateTable
CREATE TABLE "PlanoAssinatura" (
    "Id" TEXT NOT NULL,
    "Nome" TEXT NOT NULL,
    "Descricao" JSONB,
    "Preco" DOUBLE PRECISION NOT NULL,
    "Duracao" INTEGER NOT NULL,
    "Tipo" TEXT NOT NULL,
    "Status" TEXT NOT NULL DEFAULT 'ativo',
    "Destaque" BOOLEAN,
    "AdminId" TEXT,
    "VindiPlanId" TEXT,
    "ProductId" TEXT,
    "CreatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlanoAssinatura_pkey" PRIMARY KEY ("Id")
);

-- CreateTable
CREATE TABLE "AssinaturaPlano" (
    "Id" TEXT NOT NULL,
    "UserId" TEXT NOT NULL,
    "PlanoAssinaturaId" TEXT NOT NULL,
    "DataInicio" TIMESTAMP(3) NOT NULL,
    "DataFim" TIMESTAMP(3),
    "Status" "PlanoCompraStatus" NOT NULL,
    "CreatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedAt" TIMESTAMP(3) NOT NULL,
    "VindiSubscriptionId" TEXT,

    CONSTRAINT "AssinaturaPlano_pkey" PRIMARY KEY ("Id")
);

-- CreateTable
CREATE TABLE "CicloPlano" (
    "Id" TEXT NOT NULL,
    "AssinaturaPlanoId" TEXT NOT NULL,
    "UserId" TEXT NOT NULL,
    "CicloInicio" TIMESTAMP(3) NOT NULL,
    "CicloFim" TIMESTAMP(3) NOT NULL,
    "Status" TEXT NOT NULL DEFAULT 'Ativo',
    "ConsultasDisponiveis" INTEGER NOT NULL DEFAULT 4,
    "ConsultasUsadas" INTEGER NOT NULL DEFAULT 0,
    "CreatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CicloPlano_pkey" PRIMARY KEY ("Id")
);

-- CreateTable
CREATE TABLE "Consulta" (
    "Id" TEXT NOT NULL,
    "Date" TIMESTAMP(3) NOT NULL,
    "Time" TEXT NOT NULL,
    "Status" TEXT NOT NULL DEFAULT 'Reservado',
    "GoogleEventId" TEXT,
    "PacienteId" TEXT,
    "PsicologoId" TEXT,
    "AgendaId" TEXT,
    "Valor" DOUBLE PRECISION,
    "CreatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedAt" TIMESTAMP(3) NOT NULL,
    "CicloPlanoId" TEXT,

    CONSTRAINT "Consulta_pkey" PRIMARY KEY ("Id")
);

-- CreateTable
CREATE TABLE "Financeiro" (
    "Id" TEXT NOT NULL,
    "UserId" TEXT NOT NULL,
    "PlanoAssinaturaId" TEXT,
    "Valor" DOUBLE PRECISION NOT NULL,
    "DataVencimento" TIMESTAMP(3) NOT NULL,
    "Status" "ControleFinanceiroStatus" NOT NULL,
    "FaturaId" TEXT,
    "Tipo" "TipoFatura" NOT NULL,
    "CreatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedAt" TIMESTAMP(3) NOT NULL,
    "CicloPlanoId" TEXT,

    CONSTRAINT "Financeiro_pkey" PRIMARY KEY ("Id")
);

-- CreateTable
CREATE TABLE "Fatura" (
    "Id" TEXT NOT NULL,
    "CodigoFatura" TEXT,
    "Valor" DOUBLE PRECISION NOT NULL,
    "Status" "FaturaStatus" NOT NULL,
    "DataEmissao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "DataVencimento" TIMESTAMP(3) NOT NULL DEFAULT (now() + '30 days'::interval),
    "Tipo" "TipoFatura" NOT NULL,
    "CustomerId" TEXT,
    "UserId" TEXT,
    "CreatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Fatura_pkey" PRIMARY KEY ("Id")
);

-- CreateTable
CREATE TABLE "ConsultaAvulsa" (
    "Id" TEXT NOT NULL,
    "PacienteId" TEXT NOT NULL,
    "PsicologoId" TEXT,
    "Status" "ConsultaAvulsaStatus" NOT NULL,
    "DataCriacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "Quantidade" INTEGER NOT NULL DEFAULT 1,
    "Tipo" "TipoFatura",
    "CodigoFatura" TEXT,

    CONSTRAINT "ConsultaAvulsa_pkey" PRIMARY KEY ("Id")
);

-- CreateTable
CREATE TABLE "AdminActionLog" (
    "Id" TEXT NOT NULL,
    "UserId" TEXT NOT NULL,
    "ActionType" "ActionType" NOT NULL,
    "Module" "Module" NOT NULL,
    "Description" TEXT NOT NULL,
    "Timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminActionLog_pkey" PRIMARY KEY ("Id")
);

-- CreateTable
CREATE TABLE "Formacao" (
    "Id" TEXT NOT NULL,
    "ProfessionalProfileId" TEXT NOT NULL,
    "TipoFormacao" "TipoFormacao" NOT NULL,
    "Instituicao" TEXT NOT NULL,
    "Curso" TEXT NOT NULL,
    "DataInicio" TEXT NOT NULL,
    "DataConclusao" TEXT,
    "Status" TEXT NOT NULL DEFAULT 'Em Andamento',
    "CreatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Formacao_pkey" PRIMARY KEY ("Id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "Id" TEXT NOT NULL,
    "Title" TEXT NOT NULL,
    "Message" TEXT NOT NULL,
    "Type" TEXT DEFAULT 'info',
    "IsForAllUsers" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("Id")
);

-- CreateTable
CREATE TABLE "NotificationStatus" (
    "Id" TEXT NOT NULL,
    "UserId" TEXT NOT NULL,
    "Status" TEXT NOT NULL DEFAULT 'unread',
    "Tipo" TEXT,
    "NotificationId" TEXT NOT NULL,
    "ReadAt" TIMESTAMP(3),
    "CreatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationStatus_pkey" PRIMARY KEY ("Id")
);

-- CreateTable
CREATE TABLE "Onboarding" (
    "Id" TEXT NOT NULL,
    "UserId" TEXT NOT NULL,
    "Step" TEXT NOT NULL,
    "Completed" BOOLEAN NOT NULL DEFAULT false,
    "CreatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Onboarding_pkey" PRIMARY KEY ("Id")
);

-- CreateTable
CREATE TABLE "CancelamentoSessao" (
    "Id" TEXT NOT NULL,
    "SessaoId" TEXT NOT NULL,
    "AutorId" TEXT NOT NULL,
    "Motivo" TEXT NOT NULL,
    "Protocolo" TEXT NOT NULL,
    "Tipo" "AutorTipoCancelamento" NOT NULL,
    "Data" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "PacienteId" TEXT NOT NULL,
    "PsicologoId" TEXT NOT NULL,
    "Horario" TEXT NOT NULL,
    "LinkDock" TEXT,
    "Status" "CancelamentoSessaoStatus" NOT NULL,

    CONSTRAINT "CancelamentoSessao_pkey" PRIMARY KEY ("Id")
);

-- CreateTable
CREATE TABLE "CreditoAvulso" (
    "Id" TEXT NOT NULL,
    "UserId" TEXT NOT NULL,
    "Valor" DOUBLE PRECISION NOT NULL,
    "Status" "ConsultaAvulsaStatus" NOT NULL,
    "Data" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ValidUntil" TIMESTAMP(3),
    "Quantidade" INTEGER NOT NULL DEFAULT 1,
    "CodigoFatura" TEXT,
    "Tipo" "TipoFatura",

    CONSTRAINT "CreditoAvulso_pkey" PRIMARY KEY ("Id")
);

-- CreateTable
CREATE TABLE "Commission" (
    "Id" TEXT NOT NULL,
    "PsicologoId" TEXT NOT NULL,
    "PacienteId" TEXT,
    "Valor" DOUBLE PRECISION NOT NULL,
    "TipoPlano" "CommissionTipoPlano" NOT NULL,
    "Status" "CommissionStatus" NOT NULL DEFAULT 'pendente',
    "Type" TEXT,
    "ConsultaId" TEXT,
    "Periodo" TEXT,
    "CreatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Commission_pkey" PRIMARY KEY ("Id")
);

-- CreateTable
CREATE TABLE "Permission" (
    "Id" TEXT NOT NULL,
    "Role" "Role" NOT NULL,
    "Module" "Module" NOT NULL,
    "Action" "ActionType" NOT NULL,
    "CreatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Permission_pkey" PRIMARY KEY ("Id")
);

-- CreateTable
CREATE TABLE "RolePermission" (
    "Id" TEXT NOT NULL,
    "Role" "Role" NOT NULL,
    "CreatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("Id")
);

-- CreateTable
CREATE TABLE "TarefasAgendadas" (
    "id" TEXT NOT NULL,
    "consulta_id" TEXT NOT NULL,
    "dataExecucao" TIMESTAMP(3) NOT NULL,
    "executada" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "TarefasAgendadas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReservaSessao" (
    "Id" TEXT NOT NULL,
    "ScheduledAt" TEXT,
    "PatientId" TEXT,
    "PsychologistId" TEXT,
    "PatientJoinedAt" TIMESTAMP(3),
    "PsychologistJoinedAt" TIMESTAMP(3),
    "Status" "AgendaStatus" NOT NULL DEFAULT 'Reservado',
    "AgoraChannel" TEXT,
    "ReservationId" TEXT,
    "Uid" INTEGER,
    "ConsultaId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "AgoraTokenPatient" TEXT,
    "AgoraTokenPsychologist" TEXT,
    "AgendaId" TEXT,
    "UidPsychologist" INTEGER,

    CONSTRAINT "ReservaSessao_pkey" PRIMARY KEY ("Id")
);

-- CreateTable
CREATE TABLE "ControleConsultaMensal" (
    "Id" TEXT NOT NULL,
    "UserId" TEXT NOT NULL,
    "AssinaturaPlanoId" TEXT NOT NULL,
    "MesReferencia" INTEGER NOT NULL,
    "AnoReferencia" INTEGER NOT NULL,
    "Status" "ControleConsultaMensalStatus" NOT NULL DEFAULT 'Ativo',
    "Validade" TIMESTAMP(3) NOT NULL DEFAULT (now() + '30 days'::interval),
    "ConsultasDisponiveis" INTEGER NOT NULL DEFAULT 4,
    "Used" INTEGER DEFAULT 0,
    "Available" INTEGER DEFAULT 4,
    "CreatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedAt" TIMESTAMP(3) NOT NULL,
    "CicloPlanoId" TEXT,

    CONSTRAINT "ControleConsultaMensal_pkey" PRIMARY KEY ("Id")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "Id" TEXT NOT NULL,
    "VindiBillId" INTEGER NOT NULL,
    "Amount" DOUBLE PRECISION NOT NULL,
    "Status" TEXT NOT NULL,
    "QrCode" TEXT NOT NULL,
    "QrCodeText" TEXT NOT NULL,
    "CustomerId" TEXT NOT NULL,
    "CreatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("Id")
);

-- CreateTable
CREATE TABLE "Job" (
    "Id" TEXT NOT NULL,
    "Type" TEXT NOT NULL,
    "Payload" JSONB NOT NULL,
    "Status" TEXT NOT NULL DEFAULT 'pending',
    "RunAt" TIMESTAMP(3) NOT NULL,
    "Cron" TEXT,
    "Attempts" INTEGER NOT NULL DEFAULT 0,
    "MaxAttempts" INTEGER NOT NULL DEFAULT 3,
    "LastError" TEXT,
    "CreatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Job_pkey" PRIMARY KEY ("Id")
);

-- CreateTable
CREATE TABLE "ConsultaParticipacao" (
    "Id" TEXT NOT NULL,
    "ConsultaId" TEXT NOT NULL,
    "UserId" TEXT NOT NULL,
    "TipoUsuario" TEXT NOT NULL,
    "EntradaEm" TIMESTAMP(3),
    "SaidaEm" TIMESTAMP(3),
    "DuracaoEmMin" INTEGER,

    CONSTRAINT "ConsultaParticipacao_pkey" PRIMARY KEY ("Id")
);

-- CreateTable
CREATE TABLE "Faq" (
    "Id" TEXT NOT NULL,
    "Pergunta" TEXT NOT NULL,
    "Resposta" TEXT NOT NULL,
    "Status" "FaqStatus" NOT NULL DEFAULT 'Ativo',
    "Tipo" "FaqTipo" NOT NULL,
    "CreatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Faq_pkey" PRIMARY KEY ("Id")
);

-- CreateTable
CREATE TABLE "Configuracao" (
    "Id" TEXT NOT NULL,
    "googleTagManager" TEXT,
    "googleAnalytics" TEXT,
    "googleAds" TEXT,
    "agoraAppId" TEXT,
    "agoraAppCertificate" TEXT,
    "vindiApiKey" TEXT,
    "darkMode" BOOLEAN DEFAULT false,
    "idiomaPadrao" TEXT DEFAULT 'pt-BR',
    "idiomasDisponiveis" TEXT,
    "logoUrl" TEXT,
    "tituloSistema" TEXT,
    "fusoHorarioPadrao" TEXT DEFAULT 'America/Sao_Paulo',
    "duracaoConsultaMin" INTEGER DEFAULT 50,
    "intervaloEntreConsultas" INTEGER DEFAULT 10,
    "antecedenciaMinAgendamento" INTEGER DEFAULT 1,
    "antecedenciaMaxAgendamento" INTEGER DEFAULT 4320,
    "antecedenciaCancelamento" INTEGER DEFAULT 24,
    "gatewayPagamento" TEXT,
    "moedaPadrao" TEXT DEFAULT 'BRL',
    "taxaAdministrativa" DOUBLE PRECISION DEFAULT 0.0,
    "percentualRepassePsicologo" DOUBLE PRECISION DEFAULT 40.0,
    "emitirNotaFiscal" BOOLEAN DEFAULT false,
    "emailHost" TEXT,
    "emailPort" INTEGER,
    "emailUser" TEXT,
    "emailPassword" TEXT,
    "emailFrom" TEXT,
    "lembreteAntesConsulta" INTEGER DEFAULT 60,
    "enviarNotificacaoSMS" BOOLEAN DEFAULT false,
    "enviarNotificacaoPush" BOOLEAN DEFAULT false,
    "politicaPrivacidadeUrl" TEXT,
    "termosUsoUrl" TEXT,
    "consentimentoGravacao" BOOLEAN DEFAULT false,
    "tempoRetencaoDadosMeses" INTEGER DEFAULT 24,
    "anonimizarDadosInativos" BOOLEAN DEFAULT true,
    "tempoExpiracaoSessaoMinutos" INTEGER DEFAULT 60,
    "politicaSenhaMinCaracteres" INTEGER DEFAULT 8,
    "exigir2FA" BOOLEAN DEFAULT false,
    "bloqueioTentativasFalhas" INTEGER DEFAULT 5,
    "CreatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Configuracao_pkey" PRIMARY KEY ("Id")
);

-- CreateTable
CREATE TABLE "RedesSociais" (
    "Id" TEXT NOT NULL,
    "Facebook" TEXT,
    "Instagram" TEXT,
    "Linkedin" TEXT,
    "X" TEXT,
    "Tiktok" TEXT,
    "Youtube" TEXT,
    "CreatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RedesSociais_pkey" PRIMARY KEY ("Id")
);

-- CreateTable
CREATE TABLE "PessoalJuridica" (
    "Id" TEXT NOT NULL,
    "CNPJ" TEXT NOT NULL,
    "PsicologoId" TEXT NOT NULL,
    "RazaoSocial" TEXT NOT NULL,
    "NomeFantasia" TEXT,
    "InscricaoEstadual" TEXT,
    "SimplesNacional" BOOLEAN DEFAULT false,
    "CreatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PessoalJuridica_pkey" PRIMARY KEY ("Id")
);

-- CreateTable
CREATE TABLE "DadosBancarios" (
    "Id" TEXT NOT NULL,
    "PessoalJuridicaId" TEXT NOT NULL,
    "CreatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedAt" TIMESTAMP(3) NOT NULL,
    "ChavePix" TEXT NOT NULL,

    CONSTRAINT "DadosBancarios_pkey" PRIMARY KEY ("Id")
);

-- CreateTable
CREATE TABLE "Document" (
    "Id" TEXT NOT NULL,
    "UserId" TEXT NOT NULL,
    "Url" TEXT NOT NULL,
    "Type" TEXT,
    "Description" TEXT,
    "DataHoraAceite" TIMESTAMP(3) NOT NULL,
    "IpNavegador" TEXT NOT NULL,
    "AssinaturaDigital" TEXT,
    "CreatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("Id")
);

-- CreateTable
CREATE TABLE "Solicitacoes" (
    "Id" TEXT NOT NULL,
    "UserId" TEXT NOT NULL,
    "Title" TEXT NOT NULL,
    "Tipo" TEXT NOT NULL,
    "Status" TEXT NOT NULL DEFAULT 'Pendente',
    "Protocol" TEXT NOT NULL,
    "Descricao" TEXT,
    "Documentos" TEXT,
    "Log" TEXT,
    "SLA" INTEGER,
    "CreatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Solicitacoes_pkey" PRIMARY KEY ("Id")
);

-- CreateTable
CREATE TABLE "LoginLog" (
    "Id" TEXT NOT NULL,
    "UserId" TEXT NOT NULL,
    "Email" TEXT,
    "Ip" TEXT,
    "UserAgent" TEXT,
    "Success" BOOLEAN NOT NULL,
    "Message" TEXT,
    "CreatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoginLog_pkey" PRIMARY KEY ("Id")
);

-- CreateTable
CREATE TABLE "WebhookEvent" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "WebhookStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastAttemptAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "WebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentAudit" (
    "id" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "userId" TEXT,
    "paymentId" TEXT,
    "status" TEXT NOT NULL,
    "message" TEXT,
    "cardLast4" TEXT,
    "amount" DOUBLE PRECISION,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentAudit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_ReservaSessaoFinanceiroPsicologo" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ReservaSessaoFinanceiroPsicologo_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_UserPlanoAssinatura" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_UserPlanoAssinatura_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_AssinaturaPlanoFinanceiro" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_AssinaturaPlanoFinanceiro_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_RolePermissionToPermission" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_RolePermissionToPermission_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_Email_key" ON "User"("Email");

-- CreateIndex
CREATE UNIQUE INDEX "User_Cpf_key" ON "User"("Cpf");

-- CreateIndex
CREATE UNIQUE INDEX "User_Crp_key" ON "User"("Crp");

-- CreateIndex
CREATE UNIQUE INDEX "User_GoogleId_key" ON "User"("GoogleId");

-- CreateIndex
CREATE UNIQUE INDEX "User_VindiCustomerId_key" ON "User"("VindiCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_Token_key" ON "RefreshToken"("Token");

-- CreateIndex
CREATE UNIQUE INDEX "PlanoAssinatura_VindiPlanId_key" ON "PlanoAssinatura"("VindiPlanId");

-- CreateIndex
CREATE UNIQUE INDEX "AssinaturaPlano_VindiSubscriptionId_key" ON "AssinaturaPlano"("VindiSubscriptionId");

-- CreateIndex
CREATE INDEX "CicloPlano_AssinaturaPlanoId_idx" ON "CicloPlano"("AssinaturaPlanoId");

-- CreateIndex
CREATE INDEX "CicloPlano_UserId_idx" ON "CicloPlano"("UserId");

-- CreateIndex
CREATE INDEX "CicloPlano_CicloInicio_CicloFim_idx" ON "CicloPlano"("CicloInicio", "CicloFim");

-- CreateIndex
CREATE INDEX "Consulta_CicloPlanoId_idx" ON "Consulta"("CicloPlanoId");

-- CreateIndex
CREATE UNIQUE INDEX "Financeiro_FaturaId_key" ON "Financeiro"("FaturaId");

-- CreateIndex
CREATE INDEX "Financeiro_CicloPlanoId_idx" ON "Financeiro"("CicloPlanoId");

-- CreateIndex
CREATE UNIQUE INDEX "Fatura_CodigoFatura_key" ON "Fatura"("CodigoFatura");

-- CreateIndex
CREATE UNIQUE INDEX "ConsultaAvulsa_CodigoFatura_key" ON "ConsultaAvulsa"("CodigoFatura");

-- CreateIndex
CREATE UNIQUE INDEX "CancelamentoSessao_Protocolo_key" ON "CancelamentoSessao"("Protocolo");

-- CreateIndex
CREATE UNIQUE INDEX "Permission_Role_Module_Action_key" ON "Permission"("Role", "Module", "Action");

-- CreateIndex
CREATE UNIQUE INDEX "ReservaSessao_ConsultaId_key" ON "ReservaSessao"("ConsultaId");

-- CreateIndex
CREATE INDEX "ControleConsultaMensal_CicloPlanoId_idx" ON "ControleConsultaMensal"("CicloPlanoId");

-- CreateIndex
CREATE UNIQUE INDEX "ControleConsultaMensal_UserId_AssinaturaPlanoId_MesReferenc_key" ON "ControleConsultaMensal"("UserId", "AssinaturaPlanoId", "MesReferencia", "AnoReferencia");

-- CreateIndex
CREATE UNIQUE INDEX "PessoalJuridica_CNPJ_key" ON "PessoalJuridica"("CNPJ");

-- CreateIndex
CREATE UNIQUE INDEX "PessoalJuridica_PsicologoId_key" ON "PessoalJuridica"("PsicologoId");

-- CreateIndex
CREATE UNIQUE INDEX "DadosBancarios_PessoalJuridicaId_key" ON "DadosBancarios"("PessoalJuridicaId");

-- CreateIndex
CREATE UNIQUE INDEX "Solicitacoes_Protocol_key" ON "Solicitacoes"("Protocol");

-- CreateIndex
CREATE INDEX "_ReservaSessaoFinanceiroPsicologo_B_index" ON "_ReservaSessaoFinanceiroPsicologo"("B");

-- CreateIndex
CREATE INDEX "_UserPlanoAssinatura_B_index" ON "_UserPlanoAssinatura"("B");

-- CreateIndex
CREATE INDEX "_AssinaturaPlanoFinanceiro_B_index" ON "_AssinaturaPlanoFinanceiro"("B");

-- CreateIndex
CREATE INDEX "_RolePermissionToPermission_B_index" ON "_RolePermissionToPermission"("B");

-- AddForeignKey
ALTER TABLE "FinanceiroPsicologo" ADD CONSTRAINT "FinanceiroPsicologo_UserId_fkey" FOREIGN KEY ("UserId") REFERENCES "User"("Id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfessionalProfile" ADD CONSTRAINT "ProfessionalProfile_UserId_fkey" FOREIGN KEY ("UserId") REFERENCES "User"("Id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PsychologistDocument" ADD CONSTRAINT "PsychologistDocument_ProfessionalProfileId_fkey" FOREIGN KEY ("ProfessionalProfileId") REFERENCES "ProfessionalProfile"("Id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Address" ADD CONSTRAINT "Address_UserId_fkey" FOREIGN KEY ("UserId") REFERENCES "User"("Id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillingAddress" ADD CONSTRAINT "BillingAddress_UserId_fkey" FOREIGN KEY ("UserId") REFERENCES "User"("Id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Image" ADD CONSTRAINT "Image_UserId_fkey" FOREIGN KEY ("UserId") REFERENCES "User"("Id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_PsicologoId_fkey" FOREIGN KEY ("PsicologoId") REFERENCES "User"("Id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_UserId_fkey" FOREIGN KEY ("UserId") REFERENCES "User"("Id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Agenda" ADD CONSTRAINT "Agenda_PacienteId_fkey" FOREIGN KEY ("PacienteId") REFERENCES "User"("Id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Agenda" ADD CONSTRAINT "Agenda_PsicologoId_fkey" FOREIGN KEY ("PsicologoId") REFERENCES "User"("Id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_UserId_fkey" FOREIGN KEY ("UserId") REFERENCES "User"("Id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkSchedule" ADD CONSTRAINT "WorkSchedule_UserId_fkey" FOREIGN KEY ("UserId") REFERENCES "User"("Id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Favorite" ADD CONSTRAINT "Favorite_PatientId_fkey" FOREIGN KEY ("PatientId") REFERENCES "User"("Id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Favorite" ADD CONSTRAINT "Favorite_PsychologistId_fkey" FOREIGN KEY ("PsychologistId") REFERENCES "User"("Id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanoAssinatura" ADD CONSTRAINT "PlanoAssinatura_AdminId_fkey" FOREIGN KEY ("AdminId") REFERENCES "User"("Id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssinaturaPlano" ADD CONSTRAINT "AssinaturaPlano_PlanoAssinaturaId_fkey" FOREIGN KEY ("PlanoAssinaturaId") REFERENCES "PlanoAssinatura"("Id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssinaturaPlano" ADD CONSTRAINT "AssinaturaPlano_UserId_fkey" FOREIGN KEY ("UserId") REFERENCES "User"("Id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CicloPlano" ADD CONSTRAINT "CicloPlano_AssinaturaPlanoId_fkey" FOREIGN KEY ("AssinaturaPlanoId") REFERENCES "AssinaturaPlano"("Id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CicloPlano" ADD CONSTRAINT "CicloPlano_UserId_fkey" FOREIGN KEY ("UserId") REFERENCES "User"("Id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Consulta" ADD CONSTRAINT "Consulta_AgendaId_fkey" FOREIGN KEY ("AgendaId") REFERENCES "Agenda"("Id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Consulta" ADD CONSTRAINT "Consulta_CicloPlanoId_fkey" FOREIGN KEY ("CicloPlanoId") REFERENCES "CicloPlano"("Id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Consulta" ADD CONSTRAINT "Consulta_PacienteId_fkey" FOREIGN KEY ("PacienteId") REFERENCES "User"("Id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Consulta" ADD CONSTRAINT "Consulta_PsicologoId_fkey" FOREIGN KEY ("PsicologoId") REFERENCES "User"("Id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Financeiro" ADD CONSTRAINT "Financeiro_CicloPlanoId_fkey" FOREIGN KEY ("CicloPlanoId") REFERENCES "CicloPlano"("Id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Financeiro" ADD CONSTRAINT "Financeiro_FaturaId_fkey" FOREIGN KEY ("FaturaId") REFERENCES "Fatura"("Id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Financeiro" ADD CONSTRAINT "Financeiro_PlanoAssinaturaId_fkey" FOREIGN KEY ("PlanoAssinaturaId") REFERENCES "PlanoAssinatura"("Id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Financeiro" ADD CONSTRAINT "Financeiro_UserId_fkey" FOREIGN KEY ("UserId") REFERENCES "User"("Id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsultaAvulsa" ADD CONSTRAINT "ConsultaAvulsa_PacienteId_fkey" FOREIGN KEY ("PacienteId") REFERENCES "User"("Id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsultaAvulsa" ADD CONSTRAINT "ConsultaAvulsa_PsicologoId_fkey" FOREIGN KEY ("PsicologoId") REFERENCES "User"("Id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminActionLog" ADD CONSTRAINT "AdminActionLog_UserId_fkey" FOREIGN KEY ("UserId") REFERENCES "User"("Id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Formacao" ADD CONSTRAINT "Formacao_ProfessionalProfileId_fkey" FOREIGN KEY ("ProfessionalProfileId") REFERENCES "ProfessionalProfile"("Id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationStatus" ADD CONSTRAINT "NotificationStatus_NotificationId_fkey" FOREIGN KEY ("NotificationId") REFERENCES "Notification"("Id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationStatus" ADD CONSTRAINT "NotificationStatus_UserId_fkey" FOREIGN KEY ("UserId") REFERENCES "User"("Id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Onboarding" ADD CONSTRAINT "Onboarding_UserId_fkey" FOREIGN KEY ("UserId") REFERENCES "User"("Id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CancelamentoSessao" ADD CONSTRAINT "CancelamentoSessao_AutorId_CancelamentoPaciente_fkey" FOREIGN KEY ("AutorId") REFERENCES "User"("Id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CancelamentoSessao" ADD CONSTRAINT "CancelamentoSessao_SessaoId_fkey" FOREIGN KEY ("SessaoId") REFERENCES "Consulta"("Id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditoAvulso" ADD CONSTRAINT "CreditoAvulso_UserId_fkey" FOREIGN KEY ("UserId") REFERENCES "User"("Id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Commission" ADD CONSTRAINT "Commission_ConsultaId_fkey" FOREIGN KEY ("ConsultaId") REFERENCES "Consulta"("Id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Commission" ADD CONSTRAINT "Commission_PsicologoId_fkey" FOREIGN KEY ("PsicologoId") REFERENCES "User"("Id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReservaSessao" ADD CONSTRAINT "ReservaSessao_ConsultaId_fkey" FOREIGN KEY ("ConsultaId") REFERENCES "Consulta"("Id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ControleConsultaMensal" ADD CONSTRAINT "ControleConsultaMensal_AssinaturaPlanoId_fkey" FOREIGN KEY ("AssinaturaPlanoId") REFERENCES "AssinaturaPlano"("Id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ControleConsultaMensal" ADD CONSTRAINT "ControleConsultaMensal_CicloPlanoId_fkey" FOREIGN KEY ("CicloPlanoId") REFERENCES "CicloPlano"("Id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ControleConsultaMensal" ADD CONSTRAINT "ControleConsultaMensal_UserId_fkey" FOREIGN KEY ("UserId") REFERENCES "User"("Id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsultaParticipacao" ADD CONSTRAINT "ConsultaParticipacao_ConsultaId_fkey" FOREIGN KEY ("ConsultaId") REFERENCES "Consulta"("Id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsultaParticipacao" ADD CONSTRAINT "ConsultaParticipacao_UserId_fkey" FOREIGN KEY ("UserId") REFERENCES "User"("Id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PessoalJuridica" ADD CONSTRAINT "PessoalJuridica_PsicologoId_fkey" FOREIGN KEY ("PsicologoId") REFERENCES "User"("Id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DadosBancarios" ADD CONSTRAINT "DadosBancarios_PessoalJuridicaId_fkey" FOREIGN KEY ("PessoalJuridicaId") REFERENCES "PessoalJuridica"("Id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_UserId_fkey" FOREIGN KEY ("UserId") REFERENCES "User"("Id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Solicitacoes" ADD CONSTRAINT "Solicitacoes_UserId_fkey" FOREIGN KEY ("UserId") REFERENCES "User"("Id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoginLog" ADD CONSTRAINT "LoginLog_UserId_fkey" FOREIGN KEY ("UserId") REFERENCES "User"("Id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ReservaSessaoFinanceiroPsicologo" ADD CONSTRAINT "_ReservaSessaoFinanceiroPsicologo_A_fkey" FOREIGN KEY ("A") REFERENCES "FinanceiroPsicologo"("Id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ReservaSessaoFinanceiroPsicologo" ADD CONSTRAINT "_ReservaSessaoFinanceiroPsicologo_B_fkey" FOREIGN KEY ("B") REFERENCES "ReservaSessao"("Id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_UserPlanoAssinatura" ADD CONSTRAINT "_UserPlanoAssinatura_A_fkey" FOREIGN KEY ("A") REFERENCES "PlanoAssinatura"("Id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_UserPlanoAssinatura" ADD CONSTRAINT "_UserPlanoAssinatura_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("Id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AssinaturaPlanoFinanceiro" ADD CONSTRAINT "_AssinaturaPlanoFinanceiro_A_fkey" FOREIGN KEY ("A") REFERENCES "AssinaturaPlano"("Id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AssinaturaPlanoFinanceiro" ADD CONSTRAINT "_AssinaturaPlanoFinanceiro_B_fkey" FOREIGN KEY ("B") REFERENCES "Financeiro"("Id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_RolePermissionToPermission" ADD CONSTRAINT "_RolePermissionToPermission_A_fkey" FOREIGN KEY ("A") REFERENCES "Permission"("Id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_RolePermissionToPermission" ADD CONSTRAINT "_RolePermissionToPermission_B_fkey" FOREIGN KEY ("B") REFERENCES "RolePermission"("Id") ON DELETE CASCADE ON UPDATE CASCADE;

