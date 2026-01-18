/**
 * Normaliza um valor de enum de PascalCase para texto legível
 * Exemplo: "AlteracaoHumor" -> "Alteração de Humor"
 * 
 * @param enumValue - Valor do enum em PascalCase
 * @returns String normalizada e legível
 */
export function normalizeEnum(enumValue: string | null | undefined): string {
  if (!enumValue || typeof enumValue !== 'string') return '';

  // Mapeamento completo de valores de enum para suas versões normalizadas
  const enumMappings: { [key: string]: string } = {
    // Queixas
    'AlteracaoHumor': 'Alteração de Humor',
    'AdopcaoFilhos': 'Adoção de Filhos',
    'AnsiedadeDoenca': 'Ansiedade de Doença',
    'AnsiedadeSocial': 'Ansiedade Social',
    'AssedioMoral': 'Assédio Moral',
    'Autocritismo': 'Autocriticismo',
    'BaixaAutoconfianca': 'Baixa Autoconfiança',
    'BaixaAutoeficacia': 'Baixa Autoeficácia',
    'BaixaAutoestima': 'Baixa Autoestima',
    'BaixoDesenvolvimentoPessoal': 'Baixo Desenvolvimento Pessoal',
    'BloqueioCritico': 'Bloqueio Crítico',
    'BullyingImportunacao': 'Bullying e Importunação',
    'BuscaAprovacaoExcessiva': 'Busca de Aprovação Excessiva',
    'DiagnosticoCancer': 'Diagnóstico de Câncer',
    'DiagnosticoDoencaTerminal': 'Diagnóstico de Doença Terminal',
    'Ciumes': 'Ciúmes',
    'CompulsaoAlimentar': 'Compulsão Alimentar',
    'CompulsoesRituais': 'Compulsões e Rituais',
    'ConflitosAmorosos': 'Conflitos Amorosos',
    'ConflitosAmorososFamiliares': 'Conflitos Amorosos Familiares',
    'ConflitosConjugais': 'Conflitos Conjugais',
    'ConflitosFamiliares': 'Conflitos Familiares',
    'ConflitosLegais': 'Conflitos Legais',
    'DependenciaEmocional': 'Dependência Emocional',
    'DependenciaQuimica': 'Dependência Química',
    'DepressaoPosParto': 'Depressão Pós-Parto',
    'DesadaptacaoMudanca': 'Desadaptação à Mudança',
    'DesafiosAdolescencia': 'Desafios da Adolescência',
    'Desanimo': 'Desânimo',
    'DescontroleEmocional': 'Descontrole Emocional',
    'Desmotivacao': 'Desmotivação',
    'SofrimentoGravidez': 'Sofrimento na Gravidez',
    'DificuldadeEmagrecimento': 'Dificuldade de Emagrecimento',
    'DificuldadeFocar': 'Dificuldade de Foco',
    'DificuldadeAprendizagem': 'Dificuldade de Aprendizagem',
    'DificuldadeFoco': 'Dificuldade de Foco',
    'DificuldadeLideranca': 'Dificuldade de Liderança',
    'DificuldadesRelacionamentoFilhos': 'Dificuldades no Relacionamento com Filhos',
    'DisforiaGenero': 'Disforia de Gênero',
    'DisforiaRejeicao': 'Disforia de Rejeição',
    'DisfuncaoErectil': 'Disfunção Erétil',
    'DisfuncoesSexuais': 'Disfunções Sexuais',
    'DismorfismoCorporal': 'Dismorfismo Corporal',
    'DoencasCronicas': 'Doenças Crônicas',
    'DorCronica': 'Dor Crônica',
    'EjaculacaoPrecoce': 'Ejaculação Precoce',
    'EsquecimentosFrequentes': 'Esquecimentos Frequentes',
    'EstresseExcessivo': 'Estresse Excessivo',
    'EstressePosTraumatico': 'Estresse Pós-Traumático',
    'ExplosoesRaiva': 'Explosões de Raiva',
    'FaltaAssertividade': 'Falta de Assertividade',
    'FaltaAutoconhecimento': 'Falta de Autoconhecimento',
    'FaltaDesejo': 'Falta de Desejo',
    'FaltaPrazer': 'Falta de Prazer',
    'FaltaPropositoVida': 'Falta de Propósito de Vida',
    'FobiaSocial': 'Fobia Social',
    'FobiasEspecificas': 'Fobias Específicas',
    'HivAids': 'HIV/Soropositivo',
    'IdeacaoSuicida': 'Ideação Suicida',
    'IdososTerceiraIdade': 'Idosos (Terceira Idade)',
    'IntoleranciaReligiosa': 'Intolerância Religiosa',
    'LgbtqiapnIdentidadeGenero': 'LGBTQIA+ e Identidade de Gênero',
    'LutoSuicidio': 'Luto por Suicídio',
    'MedoMorte': 'Medo da Morte',
    'MedoSolidao': 'Medo da Solidão',
    'MedoAviao': 'Medo de Avião',
    'MedoDirigir': 'Medo de Dirigir',
    'MedoExamesDoencas': 'Medo de Exames e Doenças',
    'MedoFalarPublico': 'Medo de Falar em Público',
    'MedoExacerbado': 'Medo Exacerbado',
    'MorteLuto': 'Morte e Luto',
    'Obsessoes': 'Obsessões',
    'OrientacaoSexual': 'Orientação Sexual',
    'OuvirVerCoisas': 'Ouvir e Ver Coisas',
    'PensamentosIntrusivosPerturbadores': 'Pensamentos Intrusivos Perturbadores',
    'PensarDemais': 'Pensar Demais',
    'PessoasDeficienciaPcd': 'Pessoas com Deficiência (PCD)',
    'PreconceitoLgbtqiapn': 'Preconceito LGBTQIA+',
    'PreparacaoAposentadoria': 'Preparação para Aposentadoria',
    'ProblemasAprendizagem': 'Problemas de Aprendizagem',
    'ProblemasFinanceiros': 'Problemas Financeiros',
    'ReabilitacaoNeuropsicologica': 'Reabilitação Neuropsicológica',
    'RelacionamentoConflitosAmorosos': 'Relacionamento e Conflitos Amorosos',
    'Resiliencia': 'Resiliência',
    'RelacionamentoConflitosFamiliares': 'Relacionamento e Conflitos Familiares',
    'RelacionamentosAfetivos': 'Relacionamentos Afetivos',
    'RelacionamentosAmigos': 'Relacionamentos com Amigos',
    'SaudeTrabalhador': 'Saúde do Trabalhador',
    'SentimentoFracasso': 'Sentimento de Fracasso',
    'SentirForaCorpo': 'Sentir-se Fora do Corpo',
    'SindromeBurnout': 'Síndrome de Burnout',
    'SofrimentoMudancaCarreira': 'Sofrimento com Mudança de Carreira',
    'SofrimentoTerceiraIdade': 'Sofrimento na Terceira Idade',
    'SupervisaoClinicaPsicologia': 'Supervisão Clínica em Psicologia',
    'TimidezExcessiva': 'Timidez Excessiva',
    'TranstornoAnsiedadeGeneralizada': 'Transtorno de Ansiedade Generalizada',
    'TranstornoDeficitAtencaoHiperatividade': 'Transtorno de Déficit de Atenção e Hiperatividade',
    'TranstornoEstressePosTraumatico': 'Transtorno de Estresse Pós-Traumático',
    'TranstornoPersonalidadeAntissocial': 'Transtorno de Personalidade Antissocial',
    'TranstornoPersonalidadeBorderline': 'Transtorno de Personalidade Borderline',
    'TranstornoPersonalidadeDependente': 'Transtorno de Personalidade Dependente',
    'TranstornoPersonalidadeEsquizotipica': 'Transtorno de Personalidade Esquizotípica',
    'TranstornoPersonalidadeEvitativa': 'Transtorno de Personalidade Evitativa',
    'TranstornoPersonalidadeNarcisista': 'Transtorno de Personalidade Narcisista',
    'TranstornoEspectroAutista': 'Transtorno do Espectro Autista',
    'TranstornoSono': 'Transtorno do Sono',
    'TranstornoObsessivoCompulsivo': 'Transtorno Obsessivo-Compulsivo',
    'TranstornoPorUsoAlcool': 'Transtorno por Uso de Álcool',
    'TranstornosAlimentares': 'Transtornos Alimentares',
    'Traicao': 'Traição',
    'TraumasAbusos': 'Traumas e Abusos',
    'ViolenciaDomestica': 'Violência Doméstica',
    'ViolenciaSexual': 'Violência Sexual',
    'ViciosJogos': 'Vícios em Jogos',
    'ViciosPornografia': 'Vícios em Pornografia',
    'ViciosTelas': 'Vícios em Telas',
    'TdaTdah': 'TDA/TDAH',
    'Tdah': 'TDAH',
    'Tea': 'TEA',
    'Toc': 'TOC',
    'BabyBlues': 'Baby Blues',
    'AnorexiaNervosa': 'Anorexia Nervosa',
    'BulimiaNervosa': 'Bulimia Nervosa',
    
    // Sexo
    'PrefiroNaoInformar': 'Prefiro não informar',
    'PrefiroNaoDeclarar': 'Prefiro não declarar',
    'NaoBinario': 'Não binário',
    
    // Pronomes
    'EleDele': 'Ele/Dele',
    'ElaDela': 'Ela/Dela',
    'EluDelu': 'Elu/Delu',
    'Outro': 'Outro',
    
    // Abordagens
    'Acp': 'ACP',
    'AnaliseBioenergetica': 'Análise Bioenergética',
    'AnaliseComportamento': 'Análise do Comportamento',
    'AnaliseExistencial': 'Análise Existencial',
    'AnaliseTransacional': 'Análise Transacional',
    'AssessoramentoAcademico': 'Assessoramento Acadêmico',
    'AvaliacaoPerfilProfissional': 'Avaliação de Perfil Profissional',
    'AvaliacaoNeuropsicologicaTriagem': 'Avaliação Neuropsicológica e Triagem',
    'AvaliacaoPsicologicaBariatrica': 'Avaliação Psicológica Bariátrica',
    'AvaliacaoPsicologicaClinicaTriagem': 'Avaliação Psicológica Clínica e Triagem',
    'AvaliacaoEmissaoLaudoTriagem': 'Avaliação, Emissão de Laudo e Triagem',
    'CoachingCarreira': 'Coaching de Carreira',
    'CoachingEmagrecimento': 'Coaching de Emagrecimento',
    'CoachingNegocios': 'Coaching de Negócios',
    'CoachingVida': 'Coaching de Vida',
    'CoachingExecutivo': 'Coaching Executivo',
    'ConstrucionismoSocial': 'Construcionismo Social',
    'CorporalReichiana': 'Corporal Reichiana',
    'CuidadosPaliativos': 'Cuidados Paliativos',
    'DaseinAnalyses': 'Dasein Analyses',
    'Esquizoanalise': 'Esquizoanálise',
    'EvolucaoEmocional': 'Evolução Emocional',
    'ExpressaoCratividade': 'Expressão e Criatividade',
    'FenomenologiaExistencial': 'Fenomenologia Existencial',
    'GestaltTerapia': 'Gestalt Terapia',
    'Hipnoterapia': 'Hipnoterapia',
    'Humanista': 'Humanista',
    'InterpretacaoSonhos': 'Interpretação de Sonhos',
    'Logoterapia': 'Logoterapia',
    'Ludoterapia': 'Ludoterapia',
    'Mindfulness': 'Mindfulness',
    'Neurociencias': 'Neurociências',
    'Neuropsicopedagogia': 'Neuropsicopedagogia',
    'OrientacaoEducadores': 'Orientação para Educadores',
    'OrientacaoPais': 'Orientação para Pais',
    'OrientacaoProfissionalVocacional': 'Orientação Profissional e Vocacional',
    'PlanejamentoPsicopedagogico': 'Planejamento Psicopedagógico',
    'PsicanaliseBion': 'Psicanálise (Bion)',
    'PsicanaliseFreud': 'Psicanálise (Freud)',
    'PsicanaliseKlein': 'Psicanálise (Klein)',
    'PsicanaliseLacan': 'Psicanálise (Lacan)',
    'PsicanaliseWinnicott': 'Psicanálise (Winnicott)',
    'Psicodinamica': 'Psicodinâmica',
    'Psicodrama': 'Psicodrama',
    'PsicologiaAnaliticaJunguiana': 'Psicologia Analítica Junguiana',
    'PsicologiaClinica': 'Psicologia Clínica',
    'PsicologiaAtividade': 'Psicologia da Atividade',
    'PsicologiaEsporte': 'Psicologia do Esporte',
    'PsicologiaSelfKohut': 'Psicologia do Self (Kohut)',
    'PsicologiaEscolarEducacional': 'Psicologia Escolar e Educacional',
    'PsicologiaHistoricoCultural': 'Psicologia Histórico-Cultural',
    'PsicologiaOncologica': 'Psicologia Oncológica',
    'PsicologiaOrganizacionalTrabalho': 'Psicologia Organizacional e do Trabalho',
    'PsicologiaTranspessoal': 'Psicologia Transpessoal',
    'Psiconefrologia': 'Psiconefrologia',
    'Psicopedagogia': 'Psicopedagogia',
    'Psicossomatica': 'Psicossomática',
    'PsicossomaticaPsicanalitica': 'Psicossomática Psicanalítica',
    'PsicoterapiaAnaliticaFuncionalFap': 'Psicoterapia Analítica Funcional (FAP)',
    'PsicoterapiaBreve': 'Psicoterapia Breve',
    'PsicoterapiaSexual': 'Psicoterapia Sexual',
    'TeoriaApego': 'Teoria do Apego',
    'TerapiaAfirmativa': 'Terapia Afirmativa',
    'TerapiaBaseadaMindfulnessTbm': 'Terapia Baseada em Mindfulness (TBM)',
    'TerapiaCognitivaComportamentalTcc': 'Terapia Cognitivo-Comportamental (TCC)',
    'TerapiaCognitivaComportamentalBaseadaProcessos': 'Terapia Cognitivo-Comportamental Baseada em Processos',
    'TerapiaCognitivaProcessualTcp': 'Terapia Cognitiva Processual (TCP)',
    'TerapiaComportamentalDialeticaDbt': 'Terapia Comportamental Dialética (DBT)',
    'TerapiaAceitacaoCompromissoAct': 'Terapia de Aceitação e Compromisso (ACT)',
    'TerapiaAtivacaoComportamental': 'Terapia de Ativação Comportamental',
    'TerapiaCasal': 'Terapia de Casal',
    'TerapiaExposicaoPrevencaoRespostaFobiasTpr': 'Terapia de Exposição e Prevenção de Resposta para Fobias (TPR)',
    'TerapiaExposicaoPrevencaoRespostaTocTpr': 'Terapia de Exposição e Prevenção de Resposta para TOC (TPR)',
    'TerapiaReversaoHabitosTrh': 'Terapia de Reversão de Hábitos (TRH)',
    'TerapiaEsquemaJeffreyYoungTe': 'Terapia de Esquema de Jeffrey Young (TE)',
    'TerapiaLuto': 'Terapia de Luto',
    'TerapiaEmdr': 'Terapia EMDR',
    'TerapiaFamiliar': 'Terapia Familiar',
    'TerapiaFocadaCompaixaoTfc': 'Terapia Focada em Compaixão (TFC)',
    'TerapiaFocadaEmocoesTfe': 'Terapia Focada em Emoções (TFE)',
    'TerapiaFocadaEsquemaEmocional': 'Terapia Focada em Esquema Emocional',
    'TerapiaNarrativa': 'Terapia Narrativa',
    'TerapiaSexual': 'Terapia Sexual',
    'TerapiaSistemica': 'Terapia Sistêmica',
    'Transpessoal': 'Transpessoal',
  };

  // Mapeamento de palavras específicas que precisam de tratamento especial
  const specialWords: { [key: string]: string } = {
    'Alteracao': 'Alteração',
    'Adopcao': 'Adoção',
    'Avaliacao': 'Avaliação',
    'Orientacao': 'Orientação',
    'Preparacao': 'Preparação',
    'Reabilitacao': 'Reabilitação',
    'Supervisao': 'Supervisão',
    'Transicao': 'Transição',
    'Ansiedade': 'Ansiedade',
    'Depressao': 'Depressão',
    'Automutilacao': 'Automutilação',
    'Compulsao': 'Compulsão',
    'Compulsoes': 'Compulsões',
    'Dependencia': 'Dependência',
    'Desadaptacao': 'Desadaptação',
    'Dificuldade': 'Dificuldade',
    'Dificuldades': 'Dificuldades',
    'Disfuncao': 'Disfunção',
    'Disfuncoes': 'Disfunções',
    'Ejaculacao': 'Ejaculação',
    'Explosoes': 'Explosões',
    'Hiperatividade': 'Hiperatividade',
    'Impaciencia': 'Impaciência',
    'Intolerancia': 'Intolerância',
    'Menopausa': 'Menopausa',
    'Procrastinacao': 'Procrastinação',
    'Relacionamento': 'Relacionamento',
    'Relacionamentos': 'Relacionamentos',
    'Sindrome': 'Síndrome',
    'Transtorno': 'Transtorno',
    'Transtornos': 'Transtornos',
    'TranstornoSono': 'Transtorno do Sono',
    'Violencia': 'Violência',
    'Xenofobia': 'Xenofobia',
    'Psicanalise': 'Psicanálise',
    'Psicologia': 'Psicologia',
    'Psicopedagogia': 'Psicopedagogia',
    'Psicossomatica': 'Psicossomática',
    'Psiconefrologia': 'Psiconefrologia',
    'Terapia': 'Terapia',
    'Terapias': 'Terapias',
    'Coaching': 'Coaching',
    'Analise': 'Análise',
    'Assessoramento': 'Assessoramento',
    'Construcionismo': 'Construcionismo',
    'Cuidados': 'Cuidados',
    'Evolucao': 'Evolução',
    'Expressao': 'Expressão',
    'Fenomenologia': 'Fenomenologia',
    'Gestalt': 'Gestalt',
    'Hipnoterapia': 'Hipnoterapia',
    'Humanista': 'Humanista',
    'Interpretacao': 'Interpretação',
    'Logoterapia': 'Logoterapia',
    'Ludoterapia': 'Ludoterapia',
    'Mindfulness': 'Mindfulness',
    'Neurociencias': 'Neurociências',
    'Neuropsicopedagogia': 'Neuropsicopedagogia',
    'Planejamento': 'Planejamento',
    'Psicodinamica': 'Psicodinâmica',
    'Psicodrama': 'Psicodrama',
    'Transpessoal': 'Transpessoal',
    'Aceitacao': 'Aceitação',
    'Ativacao': 'Ativação',
    'Compaixao': 'Compaixão',
    'Emocoes': 'Emoções',
    'Exposicao': 'Exposição',
    'Prevencao': 'Prevenção',
    'Resposta': 'Resposta',
    'Reversao': 'Reversão',
    'Habitos': 'Hábitos',
    'Esquema': 'Esquema',
    'Narrativa': 'Narrativa',
    'Sistemica': 'Sistêmica',
    'Cognitiva': 'Cognitiva',
    'Comportamental': 'Comportamental',
    'Dialetica': 'Dialética',
    'Funcional': 'Funcional',
    'Breve': 'Breve',
    'Sexual': 'Sexual',
    'Afirmativa': 'Afirmativa',
    'Baseada': 'Baseada',
    'Processos': 'Processos',
    'Processual': 'Processual',
    'Casal': 'Casal',
    'Familiar': 'Familiar',
    'Emocional': 'Emocional',
    'Luto': 'Luto',
    'Emdr': 'EMDR',
    'Tcc': 'TCC',
    'Tcp': 'TCP',
    'Dbt': 'DBT',
    'Act': 'ACT',
    'Tbm': 'TBM',
    'Tfc': 'TFC',
    'Tfe': 'TFE',
    'Tpr': 'TPR',
    'Trh': 'TRH',
    'Te': 'TE',
    'Fap': 'FAP',
    'Acp': 'ACP',
    'Tdah': 'TDAH',
    'Tda': 'TDA',
    'Tea': 'TEA',
    'Toc': 'TOC',
    'Pcd': 'PCD',
    'Hiv': 'HIV',
    'Aids': 'AIDS',
    'Lgbtqiapn': 'LGBTQIA+',
    'Pos': 'Pós',
    'Pre': 'Pré',
    'PosParto': 'Pós-Parto',
    'PosTraumatico': 'Pós-Traumático',
    'Doenca': 'Doença',
    'Doencas': 'Doenças',
    'Terminal': 'Terminal',
    'Cronicas': 'Crônicas',
    'Cronica': 'Crônica',
    'Bariatrica': 'Bariátrica',
    'Clinica': 'Clínica',
    'Clinico': 'Clínico',
    'Neuropsicologica': 'Neuropsicológica',
    'Psicologica': 'Psicológica',
    'Perfil': 'Perfil',
    'Profissional': 'Profissional',
    'Vocacional': 'Vocacional',
    'Academico': 'Acadêmico',
    'Emissao': 'Emissão',
    'Laudo': 'Laudo',
    'Triagem': 'Triagem',
    'Carreira': 'Carreira',
    'Emagrecimento': 'Emagrecimento',
    'Negocios': 'Negócios',
    'Vida': 'Vida',
    'Executivo': 'Executivo',
    'Social': 'Social',
    'Reichiana': 'Reichiana',
    'Paliativos': 'Paliativos',
    'Analyses': 'Análises',
    'Esquizoanalise': 'Esquizoanálise',
    'Cratividade': 'Criatividade',
    'Existencial': 'Existencial',
    'Transacional': 'Transacional',
    'Bioenergetica': 'Bioenergética',
    'Comportamento': 'Comportamento',
    'Bion': 'Bion',
    'Freud': 'Freud',
    'Klein': 'Klein',
    'Lacan': 'Lacan',
    'Winnicott': 'Winnicott',
    'Analitica': 'Analítica',
    'Junguiana': 'Junguiana',
    'Atividade': 'Atividade',
    'Esporte': 'Esporte',
    'Self': 'Self',
    'Kohut': 'Kohut',
    'Escolar': 'Escolar',
    'Educacional': 'Educacional',
    'Historico': 'Histórico',
    'Cultural': 'Cultural',
    'Oncologica': 'Oncológica',
    'Organizacional': 'Organizacional',
    'Trabalho': 'Trabalho',
    'Psicanalitica': 'Psicanalítica',
  };

  // Primeiro, tenta encontrar correspondência exata no mapeamento completo
  if (enumMappings[enumValue]) {
    return enumMappings[enumValue];
  }

  // Depois, tenta encontrar correspondência exata no mapeamento de palavras especiais
  if (specialWords[enumValue]) {
    return specialWords[enumValue];
  }

  // Se o valor já está em português e não tem letras maiúsculas no meio (ex: "Masculino", "Feminino"), retorna como está
  // Verifica se não há letras maiúsculas no meio da palavra (apenas a primeira pode ser maiúscula)
  if (!/[A-Z]/.test(enumValue.slice(1))) {
    return enumValue;
  }

  // Divide a string em palavras (antes de cada letra maiúscula)
  const words: string[] = [];
  let currentWord = '';

  for (let i = 0; i < enumValue.length; i++) {
    const char = enumValue[i];
    
    // Se encontrar uma letra maiúscula e já tiver uma palavra acumulada, adiciona a palavra anterior
    if (char === char.toUpperCase() && char !== char.toLowerCase() && currentWord.length > 0) {
      // Verifica se a palavra atual está no mapeamento especial
      if (specialWords[currentWord]) {
        words.push(specialWords[currentWord]);
      } else {
        // Capitaliza a primeira letra e mantém o resto em minúsculas
        words.push(currentWord.charAt(0).toUpperCase() + currentWord.slice(1).toLowerCase());
      }
      currentWord = char;
    } else {
      currentWord += char;
    }
  }

  // Adiciona a última palavra
  if (currentWord.length > 0) {
    if (specialWords[currentWord]) {
      words.push(specialWords[currentWord]);
    } else {
      words.push(currentWord.charAt(0).toUpperCase() + currentWord.slice(1).toLowerCase());
    }
  }

  // Junta as palavras com espaços
  let result = words.join(' ');

  // Aplica correções específicas para padrões comuns
  result = result
    .replace(/\bDe\b/g, 'de')
    .replace(/\bDa\b/g, 'da')
    .replace(/\bDo\b/g, 'do')
    .replace(/\bDos\b/g, 'dos')
    .replace(/\bDas\b/g, 'das')
    .replace(/\bE\b/g, 'e')
    .replace(/\bEm\b/g, 'em')
    .replace(/\bPara\b/g, 'para')
    .replace(/\bCom\b/g, 'com')
    .replace(/\bPor\b/g, 'por')
    .replace(/\bA\b/g, 'a')
    .replace(/\bO\b/g, 'o')
    .replace(/\bOs\b/g, 'os')
    .replace(/\bAs\b/g, 'as');

  // Capitaliza a primeira letra
  if (result.length > 0) {
    result = result.charAt(0).toUpperCase() + result.slice(1);
  }

  return result;
}

/**
 * Normaliza um array de valores de enum
 * 
 * @param enumValues - Array de valores de enum
 * @returns Array de strings normalizadas
 */
export function normalizeEnumArray(enumValues: string[] | undefined | null): string[] {
  if (!enumValues || !Array.isArray(enumValues)) {
    return [];
  }
  return enumValues
    .filter((value): value is string => typeof value === 'string' && value.length > 0)
    .map(normalizeEnum);
}

/**
 * Normaliza um valor de enum de ExperienciaClinica para texto legível com range
 * Exemplo: "Entre3_5Anos" -> "3-5 anos"
 * 
 * @param experiencia - Valor do enum de experiência clínica
 * @returns String normalizada e legível com range, espaçamento e acentuação corretos
 */
export function normalizeExperienciaClinica(experiencia: string | null | undefined): string {
  if (!experiencia || typeof experiencia !== 'string') return 'Não informado';

  const map: { [key: string]: string } = {
    'Nenhuma': 'Nenhuma',
    'Ano1': '1 ano',
    'Entre1_5Anos': '1 a 5 anos',
    'Entre6_10Anos': '6 a 10 anos',
    'Entre11_15Anos': '11 a 15 anos',
    'Entre15_20Anos': '15 a 20 anos',
    'Mais20Anos': 'Mais de 20 anos',
    // Compatibilidade com formatos anteriores
    'Menos1Ano': 'Menos de 1 ano',
    'Entre1_3Anos': '1 a 3 anos',
    'Entre3_5Anos': '3 a 5 anos',
    'Entre5_10Anos': '5 a 10 anos',
    'Mais10Anos': 'Mais de 10 anos',
    'ENTRE_1_2_ANOS': '1 a 2 anos',
    'ENTRE_3_5_ANOS': '3 a 5 anos',
    'ENTRE_5_10_ANOS': '5 a 10 anos',
    'MAIS_10_ANOS': 'Mais de 10 anos',
  };

  const normalized = map[experiencia];
  if (normalized) {
    return normalized;
  }

  // Fallback: tenta normalizar automaticamente caso o valor não esteja no map
  // Converte "Entre1_3Anos" -> "1 a 3 anos"
  const match = experiencia.match(/^Entre(\d+)_(\d+)Anos$/);
  if (match) {
    return `${match[1]} a ${match[2]} anos`;
  }
  
  // Converte "Menos1Ano" -> "Menos de 1 ano"
  if (experiencia === 'Menos1Ano' || experiencia === 'MENOS1ANO') {
    return 'Menos de 1 ano';
  }
  
  // Converte "Mais10Anos" -> "Mais de 10 anos"
  if (experiencia === 'Mais10Anos' || experiencia === 'MAIS10ANOS') {
    return 'Mais de 10 anos';
  }

  return experiencia;
}