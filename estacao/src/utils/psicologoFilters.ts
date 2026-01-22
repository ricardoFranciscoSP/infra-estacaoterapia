export const normalizeFilterValue = (value: string) =>
  (value || "")
    // Separate camelCase/PascalCase tokens for matching with labels
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[_/\\-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

export const hasIntersection = (selected: string[] | undefined, target: string[] | undefined) => {
  if (!selected || selected.length === 0) return true;
  const targetSet = new Set((target ?? []).map(normalizeFilterValue));
  return selected.some((item) => targetSet.has(normalizeFilterValue(item)));
};

export const hasAllSelected = (selected: string[] | undefined, target: string[] | undefined) => {
  if (!selected || selected.length === 0) return true;
  const targetSet = new Set((target ?? []).map(normalizeFilterValue));
  return selected.every((item) => targetSet.has(normalizeFilterValue(item)));
};

export const hasRelatedMatch = (selected: string[] | undefined, target: string[] | undefined) => {
  if (!selected || selected.length === 0) return true;
  const targetNorms = (target ?? []).map(normalizeFilterValue);
  return selected.some((item) => {
    const itemNorm = normalizeFilterValue(item);
    if (!itemNorm) return false;
    return targetNorms.some((t) => t === itemNorm || t.includes(itemNorm) || itemNorm.includes(t));
  });
};

export const normalizarStatus = (status?: string | null) =>
  (status || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

export const periodoRange = (periodo?: string | null): [number, number] | null => {
  // Manhã: 06:00–12:00, Tarde: 12:01–18:00, Noite: 18:01–23:00
  if (periodo === "manha") return [6 * 60, 12 * 60];
  if (periodo === "tarde") return [12 * 60 + 1, 18 * 60];
  if (periodo === "noite") return [18 * 60 + 1, 23 * 60];
  return null;
};

export const toMinutes = (horario: string) => {
  if (!horario) return NaN;
  const match = horario.match(/(\d{1,2}):(\d{2})/);
  if (!match) return NaN;
  const hh = Number(match[1]);
  const mm = Number(match[2]);
  return hh * 60 + mm;
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
    const temAbordagem = hasRelatedMatch(filtros.abordagens, abordagensPsicologo);
    if (temAbordagem) filtrosCorrespondentes++;
  }

  if (filtros.queixas && filtros.queixas.length > 0) {
    totalFiltros++;
    const queixasPsicologo = profile.Queixas || [];
    const temQueixa = hasRelatedMatch(filtros.queixas, queixasPsicologo);
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
        if (!Number.isFinite(m)) return false;
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
