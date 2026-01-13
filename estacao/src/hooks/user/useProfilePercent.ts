import { useMemo } from "react";
import { useUserPsicologo } from "./userPsicologoHook";

export function useProfilePercent(): number {
  const { psicologo } = useUserPsicologo();

  const percentual = useMemo(() => {
    if (!psicologo?.user?.[0]) {
      return 48; // Percentual base mínimo
    }

    const user = psicologo.user[0];
    const profile = user.ProfessionalProfiles?.[0];
    const address = Array.isArray(user.Address) ? user.Address[0] : user.Address;
    
    // Verifica se é Autônomo
    const tipoPessoaJuridico = profile?.TipoPessoaJuridico;
    const tiposArray = Array.isArray(tipoPessoaJuridico) 
      ? tipoPessoaJuridico 
      : tipoPessoaJuridico 
        ? [tipoPessoaJuridico] 
        : [];
    const isAutonomo = tiposArray.some((t: string) => t === "Autonomo") && 
      !tiposArray.some((t: string) => t === "Juridico" || t === "PjAutonomo" || t === "Ei" || t === "Mei" || t === "SociedadeLtda" || t === "Eireli" || t === "Slu");
    
    let camposPreenchidos = 0;
    // Contagem correta de campos editáveis:
    // Autônomo: 4 (dados pessoais) + 6 (endereço sem complemento) + 1 (sobre mim) + 5 (atendimento) + 1 (formação) + 1 (PIX) = 18 campos
    // PJ: 4 (dados pessoais) + 1 (inscrição municipal) + 7 (endereço com complemento) + 1 (sobre mim) + 5 (atendimento) + 1 (formação) + 1 (PIX) = 20 campos
    const isPJ = !isAutonomo && tiposArray.some((t: string) => t === "Juridico" || t === "PjAutonomo" || t === "Ei" || t === "Mei" || t === "SociedadeLtda" || t === "Eireli" || t === "Slu");
    const totalCamposEditaveis = isAutonomo ? 18 : 20;
    const percentualBase = 48; // Percentual dos campos bloqueados (Nome, CPF, CNPJ, Nome Fantasia)

    // Dados pessoais (4 campos - Telefone, Sexo, Pronome, Raça/Cor)
    if (user.Telefone && user.Telefone.trim() !== "") camposPreenchidos++;
    if (user.Sexo && user.Sexo.trim() !== "") camposPreenchidos++;
    if (user.Pronome && user.Pronome.trim() !== "") camposPreenchidos++;
    if (user.RacaCor && user.RacaCor.trim() !== "") camposPreenchidos++;

    // Dados empresa (1 campo - só conta para PJ)
    if (isPJ && user.PessoalJuridica?.InscricaoEstadual && user.PessoalJuridica.InscricaoEstadual.trim() !== "") camposPreenchidos++;

    // Endereço (6 campos para Autônomo, 7 para PJ - com complemento)
    if (address?.Cep && address.Cep.trim() !== "") camposPreenchidos++;
    if (address?.Rua && address.Rua.trim() !== "") camposPreenchidos++;
    if (address?.Numero && address.Numero.trim() !== "") camposPreenchidos++;
    // Complemento só conta se NÃO for Autônomo
    if (!isAutonomo && address?.Complemento && address.Complemento.trim() !== "") camposPreenchidos++;
    if (address?.Bairro && address.Bairro.trim() !== "") camposPreenchidos++;
    if (address?.Cidade && address.Cidade.trim() !== "") camposPreenchidos++;
    if (address?.Estado && address.Estado.trim() !== "") camposPreenchidos++;

    // Sobre mim (1 campo)
    if (profile?.SobreMim && profile.SobreMim.trim() !== "") camposPreenchidos++;

    // Atendimento e Experiência (5 campos)
    // Verifica se ExperienciaClinica existe e não é vazio (igual ao backend)
    if (profile?.ExperienciaClinica && profile.ExperienciaClinica.trim() !== "") camposPreenchidos++;
    if (profile?.Idiomas && profile.Idiomas.length > 0) camposPreenchidos++;
    if (profile?.TipoAtendimento && profile.TipoAtendimento.length > 0) camposPreenchidos++;
    if (profile?.Abordagens && profile.Abordagens.length > 0) camposPreenchidos++;
    if (profile?.Queixas && profile.Queixas.length > 0) camposPreenchidos++;

    // Formação acadêmica (1 campo - pelo menos uma formação completa)
    if (profile?.Formacoes && profile.Formacoes.length > 0) {
      const formacaoCompleta = profile.Formacoes.some((f: { TipoFormacao?: string | null; Tipo?: string; Curso?: string; Instituicao?: string }) => {
        const tipoFormacao = f.TipoFormacao || f.Tipo || "";
        return tipoFormacao.trim() !== "" &&
          (f.Curso || "").trim() !== "" &&
          (f.Instituicao || "").trim() !== "";
      });
      if (formacaoCompleta) camposPreenchidos++;
    }

    // Dados bancários (1 campo) - verifica tanto PessoalJuridica quanto ProfessionalProfile
    const chavePixPJ = user.PessoalJuridica?.DadosBancarios?.ChavePix;
    const chavePixProfile = profile?.DadosBancarios?.ChavePix;
    if ((chavePixPJ && chavePixPJ.trim() !== "") || (chavePixProfile && chavePixProfile.trim() !== "")) {
      camposPreenchidos++;
    }

    // Calcular percentual: 48% base (campos bloqueados) + percentual dos campos editáveis
    // Se todos os campos editáveis estiverem preenchidos = 52% adicional = 100% total
    // Se todos os campos estão preenchidos, garante 100%
    const percentualAdicional = camposPreenchidos === totalCamposEditaveis
      ? 52
      : totalCamposEditaveis > 0 
        ? Math.round((camposPreenchidos / totalCamposEditaveis) * 52)
        : 0;
    
    return Math.min(100, percentualBase + percentualAdicional);
  }, [psicologo]);

  return percentual;
}

