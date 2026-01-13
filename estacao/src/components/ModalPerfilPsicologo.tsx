"use client";

import React from "react";
import Image from "next/image";

import { Psicologo, Formacao } from "@/types/psicologoTypes";
import { normalizeEnum, normalizeExperienciaClinica } from "@/utils/enumUtils";
import { useEscapeKey } from "@/hooks/useEscapeKey";
interface ModalPerfilPsicologoProps {
  open: boolean;
  onClose: () => void;
  psicologo: Psicologo | null;
}


const mapTipoAtendimento = (tipos?: string[]) => {
  const map: { [key: string]: string } = {
    'CRIANÇAS': 'Crianças',
    'ADOLESCENTES': 'Adolescentes',
    'ADULTOS': 'Adultos',
    'IDOSOS': 'Idosos',
    'CASAIS': 'Casais'
  };
  return tipos?.map(tipo => map[tipo] || tipo) || [];
};

const mapIdiomas = (idiomas?: string[]) => {
  const map: { [key: string]: string } = {
    'PORTUGUES': 'Português',
    'INGLES': 'Inglês',
    'ESPANHOL': 'Espanhol',
    'FRANCES': 'Francês'
  };
  return idiomas?.map(idioma => map[idioma] || idioma) || [];
};

const mapQueixas = (queixas?: string[]) => {
  return queixas?.map(queixa => normalizeEnum(queixa)) || [];
};

const mapTipoFormacao = (tipo?: string) => {
  const map: { [key: string]: string } = {
    'Bacharelado': 'Bacharelado',
    'Curso': 'Curso',
    'Graduacao': 'Graduação',
    'PosGraduacao': 'Pós-Graduação',
    'Mestrado': 'Mestrado',
    'Doutorado': 'Doutorado',
    'PosDoutorado': 'Pós-Doutorado',
    'Residencia': 'Residência',
    'Especializacao': 'Especialização',
    'CursoLivre': 'Curso Livre',
    'Certificacao': 'Certificação',
    'Outro': 'Outro',
  };
  return map[tipo || 'Outro'] || tipo || 'Outro';
};

const ModalPerfilPsicologo: React.FC<ModalPerfilPsicologoProps> = ({ open, onClose, psicologo }) => {
  // Fecha o modal ao pressionar ESC
  useEscapeKey(open, onClose);
  
  if (!open || !psicologo) return null;

  const perfilProfissional = psicologo?.ProfessionalProfiles?.[0];
  const allQueixas = mapQueixas(perfilProfissional?.Queixas);
  const tipoAtendimento = mapTipoAtendimento(perfilProfissional?.TipoAtendimento);
  const idiomas = mapIdiomas(perfilProfissional?.Idiomas);
  const experiencia = normalizeExperienciaClinica(perfilProfissional?.ExperienciaClinica);

  return (
    <>
      {/* Modal Desktop */}
      <div className="hidden sm:flex fixed inset-0 z-50 items-center justify-center bg-[#F2F4FD]/80">
        <div className="relative bg-white rounded-[8px] shadow-lg flex flex-col w-[792px] max-w-full h-auto opacity-100">
          {/* Header */}
          <div className="w-full h-[56px] rounded-tl-[8px] rounded-tr-[8px] bg-[#232A5C] flex items-center justify-center relative">
            <span className="text-white text-lg font-bold text-center w-full">Perfil do psicólogo</span>
            <button
              type="button"
              onClick={onClose}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-white text-2xl font-bold hover:text-[#d1d5db] transition"
              aria-label="Fechar"
            >
              ×
            </button>
          </div>
          {/* Conteúdo */}
          <div className="flex flex-col flex-1 px-8 pt-8 pb-4">
            <div className="flex items-center gap-6 mb-6">
              {psicologo.Image?.[0]?.Url ? (
                <Image 
                  src={psicologo.Image[0].Url} 
                  alt={`Foto do psicólogo(a) ${psicologo.Nome}`} 
                  width={64} 
                  height={64} 
                  className="w-16 h-16 rounded-full object-cover border-2 border-[#8494E9]" 
                />
              ) : (
                <Image 
                  src="/assets/avatar-placeholder.svg" 
                  alt={`Avatar de perfil genérico para ${psicologo.Nome}`} 
                  width={64} 
                  height={64} 
                  className="w-16 h-16 rounded-full object-cover border-2 border-[#8494E9]" 
                />
              )}
              <div className="flex flex-col">
                <span className="text-[#444D9D] font-semibold text-lg">{psicologo.Nome}</span>
                <span className="text-[#6D75C0] text-base font-semibold">CRP {psicologo.Crp || "Não informado"}</span>
                <span className="text-[#49525A] text-base font-medium">Sexo: {psicologo?.Sexo === 'FEMININO' ? 'Feminino' : psicologo?.Sexo === 'MASCULINO' ? 'Masculino' : 'Não informado'}</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="text-[#49525A] text-sm">
                <span className="font-semibold">Sexo:</span> {psicologo?.Sexo === 'FEMININO' ? 'Feminino' : psicologo?.Sexo === 'MASCULINO' ? 'Masculino' : 'Não informado'}
              </div>
              <div className="text-[#49525A] text-sm">
                <span className="font-semibold">Experiência:</span> {experiencia}
              </div>
              <div className="text-[#49525A] text-sm">
                <span className="font-semibold">Atende:</span> {tipoAtendimento.join(', ') || 'Não informado'}
              </div>
              <div className="text-[#49525A] text-sm">
                <span className="font-semibold">Idiomas:</span> {idiomas.join(', ') || 'Não informado'}
              </div>
            </div>

            {/* Seção de Abordagens */}
            <div className="mb-6">
              <div className="text-[#49525A] text-sm">
                <span className="font-semibold">Abordagem Centrada na Pessoa (ACP), Análise do comportamento, Neurociências, Terapia cognitiva comportamental (TCC)</span>
              </div>
              <button className="text-[#6D75C0] text-sm font-semibold mt-2 hover:text-[#444D9D] transition">
                Ver todas
              </button>
            </div>

            {/* Seção de Queixas (Tags/Botões) */}
            <div className="mb-6">
              <div className="flex flex-wrap gap-2">
                {allQueixas.length > 0 ? (
                  allQueixas.map((queixa, index) => (
                    <button
                      key={index}
                      className="px-4 py-2 rounded-[8px] border border-[#6D75C0] text-[#6D75C0] font-semibold text-sm hover:bg-[#f2f4fd] transition cursor-pointer"
                    >
                      {queixa}
                    </button>
                  ))
                ) : (
                  <span className="text-[#49525A] text-sm">Não informado</span>
                )}
              </div>
            </div>

            {/* Seção Sobre Mim */}
            <div className="mb-6">
              <span className="font-semibold text-[#49525A] text-sm block mb-2">Sobre mim</span>
              <p className="text-[#49525A] text-sm leading-relaxed">
                {perfilProfissional?.SobreMim || 'Não informado'}
              </p>
            </div>

            {/* Seção Formação acadêmica */}
            <div className="mb-6">
              <span className="font-semibold text-[#49525A] text-sm block mb-3">Formação acadêmica</span>
              {perfilProfissional?.Formacoes && perfilProfissional.Formacoes.length > 0 ? (
                perfilProfissional.Formacoes.map((formacao: Formacao) => (
                  <div
                    key={formacao.Id}
                    className="bg-[#F1F2F4] border border-[#E3E6E8] rounded-[8px] p-4 mb-4 flex flex-col gap-2"
                  >
                    <div className="font-medium text-[14px] leading-[20px] text-[#49525A]">
                      {formacao.TipoFormacao ? `${mapTipoFormacao(formacao.TipoFormacao)} - ${formacao.Curso}` : formacao.Curso}
                    </div>
                    <div className="font-normal text-[13px] leading-[20px] text-[#75838F]">
                      {formacao.Instituicao}
                    </div>
                    <div className="font-normal text-[13px] leading-[20px] text-[#75838F]">
                      <span className="font-semibold">Período:</span> {formacao.DataInicio} - {formacao.DataConclusao}
                    </div>
                    <div className="font-normal text-[13px] leading-[20px] text-[#75838F]">
                      <span className="font-semibold">Status:</span> {formacao.Status}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-[#75838F] text-sm">Nenhuma formação cadastrada.</p>
              )}
            </div>

            <div className="mt-6 flex justify-center">
              <button
                className="w-[345px] h-12 rounded-[8px] border border-[#6D75C0] text-[#6D75C0] font-semibold text-base flex items-center justify-center px-6 cursor-pointer hover:bg-[#f2f4fd] transition"
                onClick={onClose}
                type="button"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Mobile */}
      <div className="sm:hidden fixed inset-0 z-50 flex flex-col">
        <div className="relative w-full h-full bg-white flex flex-col">
          {/* Header fixo */}
          <div className="sticky top-0 z-10 bg-[#232A5C] flex items-center justify-center h-[56px] border-b border-[#ECECEC]">
            <span className="text-white text-lg font-bold text-center w-full">Perfil do psicólogo</span>
            <button
              type="button"
              onClick={onClose}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-white text-2xl font-bold hover:text-[#d1d5db] transition"
              aria-label="Fechar"
              style={{ zIndex: 20 }}
            >
              ×
            </button>
          </div>
          {/* Conteúdo com rolagem */}
          <div className="flex-1 overflow-y-auto px-4 pt-6 pb-4">
            <div className="flex items-center gap-4 mb-6">
              {psicologo.Image?.[0]?.Url ? (
                <Image 
                  src={psicologo.Image[0].Url} 
                  alt={`Foto do psicólogo(a) ${psicologo.Nome}`} 
                  width={48} 
                  height={48} 
                  className="w-12 h-12 rounded-full object-cover border-2 border-[#8494E9]" 
                />
              ) : (
                <Image 
                  src="/assets/avatar-placeholder.svg" 
                  alt={`Avatar de perfil genérico para ${psicologo.Nome}`} 
                  width={48} 
                  height={48} 
                  className="w-12 h-12 rounded-full object-cover border-2 border-[#8494E9]" 
                />
              )}
              <div className="flex flex-col">
                <span className="text-[#444D9D] font-semibold text-base">{psicologo.Nome}</span>
                <span className="text-[#6D75C0] text-sm font-semibold">CRP {psicologo.Crp || "Não informado"}</span>
              </div>
            </div>

            {/* Seção de Informações Básicas */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <div className="text-[#49525A] text-xs mb-3">
                  <span className="font-semibold block mb-1">Sexo:</span> 
                  <span>{psicologo?.Sexo === 'FEMININO' ? 'Feminino' : psicologo?.Sexo === 'MASCULINO' ? 'Masculino' : 'Não informado'}</span>
                </div>
                <div className="text-[#49525A] text-xs">
                  <span className="font-semibold block mb-1">Atende:</span> 
                  <span>{tipoAtendimento.join(', ') || 'Não informado'}</span>
                </div>
              </div>
              <div>
                <div className="text-[#49525A] text-xs mb-3">
                  <span className="font-semibold block mb-1">Experiência:</span> 
                  <span>{experiencia}</span>
                </div>
                <div className="text-[#49525A] text-xs">
                  <span className="font-semibold block mb-1">Idiomas:</span> 
                  <span>{idiomas.join(', ') || 'Não informado'}</span>
                </div>
              </div>
            </div>

            {/* Seção de Abordagens */}
            <div className="mb-6">
              <div className="text-[#49525A] text-sm">
                <span className="font-semibold">Abordagem Centrada na Pessoa (ACP), Análise do comportamento, Neurociências, Terapia cognitiva comportamental (TCC)</span>
              </div>
              <button className="text-[#6D75C0] text-xs font-semibold mt-2 hover:text-[#444D9D] transition">
                Ver todas
              </button>
            </div>

            {/* Seção de Queixas (Tags/Botões) */}
            <div className="mb-6">
              <div className="flex flex-wrap gap-2">
                {allQueixas.length > 0 ? (
                  allQueixas.map((queixa, index) => (
                    <button
                      key={index}
                      className="px-4 py-2 rounded-[8px] border border-[#6D75C0] text-[#6D75C0] font-semibold text-xs hover:bg-[#f2f4fd] transition cursor-pointer"
                    >
                      {queixa}
                    </button>
                  ))
                ) : (
                  <span className="text-[#49525A] text-sm">Não informado</span>
                )}
              </div>
            </div>

            {/* Seção Sobre Mim */}
            <div className="mb-6">
              <span className="font-semibold text-[#49525A] text-sm block mb-2">Sobre mim</span>
              <p className="text-[#49525A] text-xs leading-relaxed">
                {perfilProfissional?.SobreMim || 'Não informado'}
              </p>
            </div>

            {/* Seção Formação acadêmica */}
            <div className="mb-6">
              <span className="font-semibold text-[#49525A] text-sm block mb-3">Formação acadêmica</span>
              {perfilProfissional?.Formacoes && perfilProfissional.Formacoes.length > 0 ? (
                perfilProfissional.Formacoes.map((formacao: Formacao) => (
                  <div
                    key={formacao.Id}
                    className="bg-[#F1F2F4] border border-[#E3E6E8] rounded-[8px] p-3 mb-4 flex flex-col gap-2"
                  >
                    <div className="font-medium text-[13px] leading-[18px] text-[#49525A]">
                      {formacao.TipoFormacao ? `${mapTipoFormacao(formacao.TipoFormacao)} - ${formacao.Curso}` : formacao.Curso}
                    </div>
                    <div className="font-normal text-[12px] leading-[18px] text-[#75838F]">
                      {formacao.Instituicao}
                    </div>
                    <div className="font-normal text-[12px] leading-[18px] text-[#75838F]">
                      <span className="font-semibold">Período:</span> {formacao.DataInicio} - {formacao.DataConclusao}
                    </div>
                    <div className="font-normal text-[12px] leading-[18px] text-[#75838F]">
                      <span className="font-semibold">Status:</span> {formacao.Status}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-[#75838F] text-xs">Nenhuma formação cadastrada.</p>
              )}
            </div>

            <div className="mt-6 flex justify-center">
              <button
                className="w-full h-11 rounded-[8px] border border-[#6D75C0] text-[#6D75C0] font-semibold text-base flex items-center justify-center px-6 cursor-pointer hover:bg-[#f2f4fd] transition"
                onClick={onClose}
                type="button"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ModalPerfilPsicologo;
