export const normalizeFilterValue = (value: string) =>
  (value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/_/g, " ")
    .trim();

export const hasIntersection = (selected: string[] | undefined, target: string[] | undefined) => {
  if (!selected || selected.length === 0) return true;
  const targetSet = new Set((target ?? []).map(normalizeFilterValue));
  return selected.some((item) => targetSet.has(normalizeFilterValue(item)));
};

export const normalizarStatus = (status?: string | null) =>
  (status || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

export const periodoRange = (periodo?: string | null): [number, number] | null => {
  if (periodo === "manha") return [6 * 60, 12 * 60 - 1];
  if (periodo === "tarde") return [12 * 60, 18 * 60 - 1];
  if (periodo === "noite") return [18 * 60, 23 * 60 + 59];
  return null;
};

export const toMinutes = (horario: string) => {
  const [hh, mm] = horario.split(":").map(Number);
  return hh * 60 + (mm || 0);
};

export const ymd = (value: string) => value.slice(0, 10);

type PsicologoAtivo = import("@/types/psicologoTypes").PsicologoAtivo;

type PsicologoFilterInputs = {
  abordagens?: string[];
  queixas?: string[];
  idiomas?: string[];
  atendimentos?: string[];
  data?: string | null;
  periodo?: string;
};

export const calcularNotaMedia = (psicologo: PsicologoAtivo): number => {
  const reviews = psicologo.ReviewsReceived || [];
  if (reviews.length === 0) return 0;
  const soma = reviews.reduce((acc, r) => acc + (r.Rating || 0), 0);
  return soma / reviews.length;
};

export const contarVagasLivres = (psicologo: PsicologoAtivo): number => {
  const agendas = Array.isArray(psicologo.PsychologistAgendas)
    ? psicologo.PsychologistAgendas
    : [];
  return agendas.filter((agenda) => normalizarStatus(agenda.Status) === "disponivel").length;
};

export const calcularCompatibilidade = (
  psicologo: PsicologoAtivo,
  filtros: PsicologoFilterInputs
): number => {
  const profile = psicologo.ProfessionalProfiles?.[0];
  if (!profile) return 0;

  let totalFiltros = 0;
  let filtrosCorrespondentes = 0;

  if (filtros.abordagens && filtros.abordagens.length > 0) {
    totalFiltros++;
    const abordagensPsicologo = profile.Abordagens || [];
    const temAbordagem = filtros.abordagens.some((a) =>
      abordagensPsicologo.some((ap) => normalizeFilterValue(ap) === normalizeFilterValue(a))
    );
    if (temAbordagem) filtrosCorrespondentes++;
  }

  if (filtros.queixas && filtros.queixas.length > 0) {
    totalFiltros++;
    const queixasPsicologo = profile.Queixas || [];
    const temQueixa = filtros.queixas.some((q) =>
      queixasPsicologo.some((qp) => normalizeFilterValue(qp) === normalizeFilterValue(q))
    );
    if (temQueixa) filtrosCorrespondentes++;
  }

  if (filtros.idiomas && filtros.idiomas.length > 0) {
    totalFiltros++;
    const idiomasPsicologo = profile.Idiomas || [];
    const temIdioma = filtros.idiomas.some((i) =>
      idiomasPsicologo.some((ip) => normalizeFilterValue(ip) === normalizeFilterValue(i))
    );
    if (temIdioma) filtrosCorrespondentes++;
  }

  if (filtros.atendimentos && filtros.atendimentos.length > 0) {
    totalFiltros++;
    const tiposAtendimentoPsicologo = profile.TipoAtendimento || [];
    const temTipoAtendimento = filtros.atendimentos.some((a) =>
      tiposAtendimentoPsicologo.some((tap) => normalizeFilterValue(tap) === normalizeFilterValue(a))
    );
    if (temTipoAtendimento) filtrosCorrespondentes++;
  }

  if (filtros.data || filtros.periodo) {
    totalFiltros++;
    const agendas = psicologo.PsychologistAgendas ?? [];
    const range = periodoRange(filtros.periodo);
    const ok = agendas.some((agenda) => {
      const statusAgenda = normalizarStatus(agenda?.Status);
      if (statusAgenda !== "disponivel") return false;
      if (filtros.data && ymd(agenda.Data) < (filtros.data as string)) return false;
      if (range) {
        const m = toMinutes(agenda.Horario);
        return m >= range[0] && m <= range[1];
      }
      return true;
    });
    if (ok) filtrosCorrespondentes++;
  }

  if (totalFiltros === 0) return 100;
  return Math.round((filtrosCorrespondentes / totalFiltros) * 100);
};

export const sortPsicologos = (
  psicologosList: PsicologoAtivo[],
  options: {
    filtros: PsicologoFilterInputs;
    hasFiltroSelecionado: boolean;
    experienciaClinicaParaAnos: (value?: string | null) => number;
  }
): PsicologoAtivo[] => {
  const { filtros, hasFiltroSelecionado, experienciaClinicaParaAnos } = options;
  return [...psicologosList].sort((a, b) => {
    if (hasFiltroSelecionado) {
      const compatibilidadeA = calcularCompatibilidade(a, filtros);
      const compatibilidadeB = calcularCompatibilidade(b, filtros);
      if (compatibilidadeA !== compatibilidadeB) {
        return compatibilidadeB - compatibilidadeA;
      }
    }

    const livresA = contarVagasLivres(a);
    const livresB = contarVagasLivres(b);
    if (livresA !== livresB) {
      return livresB - livresA;
    }

    const experienciaA = experienciaClinicaParaAnos(a.ProfessionalProfiles?.[0]?.ExperienciaClinica);
    const experienciaB = experienciaClinicaParaAnos(b.ProfessionalProfiles?.[0]?.ExperienciaClinica);
    if (experienciaA !== experienciaB) {
      return experienciaB - experienciaA;
    }

    const notaA = calcularNotaMedia(a);
    const notaB = calcularNotaMedia(b);
    return notaB - notaA;
  });
};
