"use client";
import React from "react"; 
import SidebarPsicologo from "../SidebarPsicologo";
import Image from "next/image";
import { FiEdit2 } from "react-icons/fi";
import { useUserPsicologo, useUploadUserPsicologoImagem, useUpdateUserPsicologoImagem } from '@/hooks/user/userPsicologoHook';
import { useEnums } from "@/hooks/enumsHook";
import { Formacao, EnderecoCobranca } from "@/types/psicologoTypes";
import EditModal from '@/components/painelPsicologo/EditModal';
import FormDadosPessoais from "@/components/painelPsicologo/FormDadosPessoais";
import FormFormacao from "@/components/painelPsicologo/FormFormacao";
import FormEspecialidades from "@/components/painelPsicologo/FormEspecialidades";
import FormEndereco from "@/components/painelPsicologo/FormEndereco";
import FormJuridico from "@/components/painelPsicologo/FormJuridico";
import FormBancario from "@/components/painelPsicologo/FormBancario";
import FormSobreMim from "@/components/painelPsicologo/FormSobreMim";
import { PHONE_COUNTRIES, PhoneCountry, getFlagUrl, maskTelefoneByCountry, onlyDigits } from "@/utils/phoneCountries";
import { normalizeExperienciaClinica, normalizeEnum } from "@/utils/enumUtils";

// Tipagem para resposta do updateImagem
interface UpdateImagemResponse {
  url?: string;
  // Adicione outros campos conforme necessário
}

export default function MeuPerfilPage() {
  const { user: psicologos = [] } = useUserPsicologo()?.psicologo ?? {};
  const psicologo = psicologos[0];
  const { enums } = useEnums();
  const [modal, setModal] = React.useState<null | string>(null);
  
  // Verifica se é Pessoa Jurídica
  // TipoPessoaJuridico é um único valor enum (string), não um array
  const isPessoaJuridica = React.useMemo(() => {
    const tipoPessoa = psicologo?.ProfessionalProfiles?.[0]?.TipoPessoaJuridico;
    // Debug: log para verificar o valor
    console.log('[meu-perfil] TipoPessoaJuridico:', tipoPessoa, 'Tipo:', typeof tipoPessoa, 'É array?', Array.isArray(tipoPessoa));
    if (!tipoPessoa) return false;
    // Se for array (caso raro), verifica se tem algum tipo de PJ
    if (Array.isArray(tipoPessoa)) {
      return tipoPessoa.some(t => t === "Juridico" || t === "PjAutonomo" || t === "Ei" || t === "Mei" || t === "SociedadeLtda" || t === "Eireli" || t === "Slu");
    }
    // Verifica se é string e se é um tipo de PJ (não "Autonomo")
    const tipoPessoaStr = String(tipoPessoa);
    return tipoPessoaStr === "Juridico" || 
           tipoPessoaStr === "PjAutonomo" || 
           tipoPessoaStr === "Ei" || 
           tipoPessoaStr === "Mei" || 
           tipoPessoaStr === "SociedadeLtda" || 
           tipoPessoaStr === "Eireli" || 
           tipoPessoaStr === "Slu";
  }, [psicologo]);

  // Verifica se é Autônomo (não pessoa jurídica)
  // TipoPessoaJuridico é um único valor enum (string), não um array
  const isAutonomo = React.useMemo(() => {
    const tipoPessoa = psicologo?.ProfessionalProfiles?.[0]?.TipoPessoaJuridico;
    if (!tipoPessoa) return false;
    // Se for array (caso raro), verifica se tem "Autonomo" e não tem PJ
    if (Array.isArray(tipoPessoa)) {
      const temAutonomo = tipoPessoa.some(t => t === "Autonomo");
      const temPJ = tipoPessoa.some(t => t === "Juridico" || t === "PjAutonomo" || t === "Ei" || t === "Mei" || t === "SociedadeLtda" || t === "Eireli" || t === "Slu");
      return temAutonomo && !temPJ;
    }
    // Verifica se é string e se é exatamente "Autonomo"
    const tipoPessoaStr = String(tipoPessoa);
    return tipoPessoaStr === "Autonomo";
  }, [psicologo]);

  // Normaliza BillingAddress (pode vir como array ou objeto)
  const billingAddress = React.useMemo(() => {
    if (!psicologo?.BillingAddress) return null;
    return Array.isArray(psicologo.BillingAddress) 
      ? psicologo.BillingAddress[0] 
      : psicologo.BillingAddress;
  }, [psicologo?.BillingAddress]);

  // Estado local para imagem
  const [imagemUrl, setImagemUrl] = React.useState<string>(psicologo?.Images?.[0]?.Url ?? "/assets/Profile.svg");

  // Atualiza imagem quando psicologo muda
  React.useEffect(() => {
    setImagemUrl(psicologo?.Images?.[0]?.Url ?? "/assets/Profile.svg");
  }, [psicologo?.Images]);

  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const uploadUserImage = useUploadUserPsicologoImagem();
  const updateUserImage = useUpdateUserPsicologoImagem();
  const isPending = uploadUserImage.isPending || updateUserImage.isPending;

  // Handler para upload
  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !psicologo?.Id) return;
    
    // Cria URL local para mostrar preview imediato
    const localUrl = URL.createObjectURL(file);
    setImagemUrl(localUrl);

    const existingImage = psicologo?.Images?.[0];
    
    // Atualiza imagem existente ou faz upload de nova imagem
    if (existingImage?.UserId && existingImage?.Id) {
      updateUserImage.mutate(
        { imageId: existingImage.Id, file },
        {
          onSuccess: (data: UpdateImagemResponse) => {
            // Se backend retorna nova URL, atualiza
            if (data?.url) setImagemUrl(data.url);
          }
        }
      );
    } else {
      uploadUserImage.mutate(
        file,
        {
          onSuccess: (data: UpdateImagemResponse) => {
            // Se backend retorna nova URL, atualiza
            if (data?.url) setImagemUrl(data.url);
          }
        }
      );
    }
  };

  return (
    <div className="min-h-screen bg-[#F3F6F8] font-sans flex justify-center">
      <div className="w-full max-w-7xl flex flex-row">
        {/* Sidebar alinhado ao logo */}
        <aside className="hidden md:block flex-shrink-0 pt-8 pr-6">
          <SidebarPsicologo />
        </aside>
        {/* Container principal (header + conteúdo) */}
        <div className="flex flex-col flex-1 items-stretch w-full px-4 sm:px-2 md:px-8 py-4 sm:py-8 pb-32 sm:pb-8">
          {/* Header interno do conteúdo principal */}
          <section className="bg-white border border-[#E3E4F3] px-4 sm:px-6 py-6 sm:py-8 w-full rounded-2xl flex flex-col md:flex-row items-center md:items-center gap-6 sm:gap-8 mb-6 sm:mb-10 shadow-md">
            {/* Avatar + editar foto */}
            <div className="flex flex-col items-center">
              <div
                className="w-28 h-28 rounded-full border-4 border-[#0A66C2] overflow-hidden bg-white mb-3 shadow-sm transition-transform hover:scale-105 cursor-pointer"
                onClick={handleAvatarClick}
                title="Alterar foto"
                style={{ cursor: "pointer" }}
              >
                <Image
                  src={imagemUrl}
                  alt="Avatar"
                  width={112}
                  height={112}
                  className="object-cover w-full h-full"
                />
              </div>
              <button
                className="mt-2 px-4 py-1.5 rounded-lg border border-[#0A66C2] text-[#0A66C2] text-xs font-semibold flex items-center gap-2 hover:bg-[#EDF3F8] transition-all shadow-sm"
                onClick={handleAvatarClick}
                disabled={isPending}
                type="button"
              >
                <FiEdit2 size={16} />
                <span className="ml-1">{isPending ? "Atualizando..." : "Editar foto"}</span>
              </button>
              {/* Novo: input file oculto */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={handleFileChange}
              />
            </div>
            {/* Nome e CRP */}
            <div className="flex flex-col items-center md:items-start flex-1">
              <span className="text-2xl font-bold text-[#23253A] tracking-tight">{psicologo?.Nome ?? ""}</span>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className="text-[#0A66C2] text-base font-medium">CRP: {psicologo?.Crp ?? ""}</span>
                {(isAutonomo || isPessoaJuridica) && (
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    isAutonomo 
                      ? "bg-[#EDF3F8] text-[#0A66C2]" 
                      : "bg-[#E3E4F3] text-[#8494E9]"
                  }`}>
                    {isAutonomo ? "Autônomo" : "Pessoa Jurídica"}
                  </span>
                )}
              </div>
            </div>
          </section>
          {/* Cards de informações */}
          <main className="flex flex-col gap-4 sm:gap-6 w-full pb-8 sm:pb-0">
            {/* Dados pessoais - Representante legal da empresa e Dados empresa */}
            <div className="bg-white rounded-lg border border-[#E3E4F3] p-4 sm:p-6 flex flex-col gap-4 sm:gap-6 relative">
              <button
                className="absolute top-4 right-4 sm:top-6 sm:right-6 text-[#0A66C2] bg-transparent rounded-full p-2 transition hover:bg-[#EDF3F8] hover:scale-110 hover:shadow-md hover:cursor-pointer"
                style={{ cursor: "pointer" }}
                onClick={() => setModal("dadosPessoais")}
                aria-label="Editar Dados Pessoais"
                type="button"
              >
                <FiEdit2 size={18} className="sm:w-5 sm:h-5 transition-transform duration-150 group-hover:scale-110" style={{ cursor: "pointer" }} />
              </button>
              
              <h2 className="text-base font-semibold text-[#23253A] mb-2">
                {isAutonomo ? "Dados pessoais" : "Dados pessoais - Representante legal da empresa"}
              </h2>
              <div className="flex flex-col gap-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
                  <div>
                    <span className="text-[#49525A] font-semibold">Nome completo</span>
                    <div className="text-[#23253A]">{psicologo?.Nome ?? ""}</div>
                  </div>
                  <div>
                    <span className="text-[#49525A] font-semibold">Telefone</span>
                    <div className="text-[#23253A]">
                      {(() => {
                        const telefoneValue = psicologo?.Telefone || "";
                        if (!telefoneValue) return "-";
                        
                        // Detecta país pelo DDI
                        let detectedCountry: PhoneCountry | undefined;
                        if (telefoneValue.startsWith("+")) {
                          detectedCountry = PHONE_COUNTRIES.find(c => telefoneValue.startsWith(c.dial));
                        }
                        const country = detectedCountry || PHONE_COUNTRIES.find(c => c.code === "BR") || PHONE_COUNTRIES[0];
                        
                        // Remove DDI e formata
                        const digits = telefoneValue.startsWith("+")
                          ? onlyDigits(telefoneValue.replace(country.dial, "").trim())
                          : onlyDigits(telefoneValue);
                        const masked = maskTelefoneByCountry(country.code, digits);
                        
                        return (
                          <div className="flex items-center gap-2">
                            <Image
                              src={getFlagUrl(country.code)}
                              alt=""
                              width={20}
                              height={20}
                              unoptimized
                              className="w-5 h-5 object-contain"
                            />
                            <span>{country.dial} {masked}</span>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                    <div>
                    <span className="text-[#49525A] font-semibold">WhatsApp</span>
                    <div className="text-[#23253A]">
                      {(() => {
                        const whatsappValue = psicologo?.WhatsApp || "";
                        if (!whatsappValue) return "-";
                        
                        // Detecta país pelo DDI
                        let detectedCountry: PhoneCountry | undefined;
                        if (whatsappValue.startsWith("+")) {
                          detectedCountry = PHONE_COUNTRIES.find(c => whatsappValue.startsWith(c.dial));
                        }
                        const country = detectedCountry || PHONE_COUNTRIES.find(c => c.code === "BR") || PHONE_COUNTRIES[0];
                        
                        // Remove DDI e formata
                        const digits = whatsappValue.startsWith("+")
                          ? onlyDigits(whatsappValue.replace(country.dial, "").trim())
                          : onlyDigits(whatsappValue);
                        const masked = maskTelefoneByCountry(country.code, digits);
                        
                        return (
                          <div className="flex items-center gap-2">
                            <Image
                              src={getFlagUrl(country.code)}
                              alt=""
                              width={20}
                              height={20}
                              unoptimized
                              className="w-5 h-5 object-contain"
                            />
                            <span>{country.dial} {masked}</span>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                  <div>
                    <span className="text-[#49525A] font-semibold">Email</span>
                    <div className="text-[#23253A] break-all">{psicologo?.Email || "-"}</div>
                  </div>
                  <div>
                    <span className="text-[#49525A] font-semibold">RG/CPF</span>
                    <div className="text-[#23253A]">{psicologo?.Cpf || "-"}</div>
                  </div>
                  <div>
                    <span className="text-[#49525A] font-semibold">Gênero</span>
                    <div className="text-[#23253A]">{psicologo?.Sexo || "-"}</div>
                  </div>
                  <div>
                    <span className="text-[#49525A] font-semibold">Como gostaria de ser tratado(a)?</span>
                    <div className="text-[#23253A]">{psicologo?.Pronome || "-"}</div>
                  </div>
                  <div>
                    <span className="text-[#49525A] font-semibold">Qual raça / Cor você se autodeclara?</span>
                    <div className="text-[#23253A]">{psicologo?.RacaCor || "-"}</div>
                  </div>
                </div>
              </div>

              {/* Endereço - Representante Legal (logo abaixo dos dados pessoais) */}
              <div className="border-t border-[#E3E4F3] pt-6 mt-2 relative">
                <button
                  className="absolute top-4 right-0 sm:top-6 text-[#0A66C2] bg-transparent rounded-full p-2 transition hover:bg-[#EDF3F8] hover:scale-110 hover:shadow-md hover:cursor-pointer"
                  style={{ cursor: "pointer" }}
                  onClick={() => setModal("endereco")}
                  aria-label="Editar Endereço"
                  type="button"
                >
                  <FiEdit2 size={18} className="sm:w-5 sm:h-5 transition-transform duration-150 group-hover:scale-110" style={{ cursor: "pointer" }} />
                </button>
                <h2 className="text-base font-semibold text-[#23253A] mb-2">
                  {isPessoaJuridica ? "Endereço - Representante Legal" : "Endereço"}
                </h2>
                <div className="flex flex-col gap-4">
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
                    <div className="sm:col-span-3">
                      <span className="text-[#49525A] font-semibold text-sm">CEP</span>
                      <div className="text-[#23253A] text-sm break-all">{psicologo?.Address?.Cep || "-"}</div>
                    </div>
                    <div className="sm:col-span-9">
                      <span className="text-[#49525A] font-semibold text-sm">Endereço</span>
                      <div className="text-[#23253A] text-sm break-all">{psicologo?.Address?.Rua || "-"}</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <span className="text-[#49525A] font-semibold text-sm">Bairro</span>
                      <div className="text-[#23253A] text-sm break-all">{psicologo?.Address?.Bairro || "-"}</div>
                    </div>
                    <div>
                      <span className="text-[#49525A] font-semibold text-sm">Cidade</span>
                      <div className="text-[#23253A] text-sm break-all">{psicologo?.Address?.Cidade || "-"}</div>
                    </div>
                    <div>
                      <span className="text-[#49525A] font-semibold text-sm">Estado</span>
                      <div className="text-[#23253A] text-sm break-all">{psicologo?.Address?.Estado || "-"}</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <span className="text-[#49525A] font-semibold text-sm">Número</span>
                      <div className="text-[#23253A] text-sm break-all">{psicologo?.Address?.Numero || "-"}</div>
                    </div>
                    <div>
                      <span className="text-[#49525A] font-semibold text-sm">Complemento</span>
                      <div className="text-[#23253A] text-sm break-all">{psicologo?.Address?.Complemento || "-"}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Dados empresa (apenas para pessoa jurídica) */}
              {!isAutonomo && (
                <div className="border-t border-[#E3E4F3] pt-6 mt-2 relative">
                  <button
                    className="absolute top-4 right-0 sm:top-6 text-[#0A66C2] bg-transparent rounded-full p-2 transition hover:bg-[#EDF3F8] hover:scale-110 hover:shadow-md hover:cursor-pointer"
                    style={{ cursor: "pointer" }}
                    onClick={() => setModal("juridico")}
                    aria-label="Editar Dados da Empresa"
                    type="button"
                  >
                    <FiEdit2 size={18} className="sm:w-5 sm:h-5 transition-transform duration-150 group-hover:scale-110" style={{ cursor: "pointer" }} />
                  </button>
                  <h2 className="text-base font-semibold text-[#23253A] mb-2">
                    Dados empresa
                  </h2>
                  <div className="flex flex-col gap-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
                      <div>
                        <span className="text-[#49525A] font-semibold">Inscrição Municipal</span>
                        <div className="text-[#23253A] break-all">{psicologo?.PessoalJuridica?.InscricaoEstadual || "-"}</div>
                      </div>
                      <div>
                        <span className="text-[#49525A] font-semibold">CNPJ</span>
                        <div className="text-[#23253A] break-all">{psicologo?.PessoalJuridica?.CNPJ || "-"}</div>
                      </div>
                      <div className="col-span-1 sm:col-span-2">
                        <span className="text-[#49525A] font-semibold">Nome fantasia</span>
                        <div className="text-[#23253A] break-all">{psicologo?.PessoalJuridica?.NomeFantasia || "-"}</div>
                      </div>
                    </div>
                    {psicologo?.PessoalJuridica?.DescricaoExtenso && (
                      <div className="text-sm">
                        <span className="text-[#49525A] font-semibold">Descrição por extenso</span>
                        <div className="text-[#23253A] mt-1">{psicologo.PessoalJuridica.DescricaoExtenso}</div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Endereço - Empresa (logo abaixo dos dados da empresa, apenas para pessoa jurídica) */}
              {isPessoaJuridica && (
                <div className="border-t border-[#E3E4F3] pt-6 mt-2 relative">
                  <button
                    className="absolute top-4 right-0 sm:top-6 text-[#0A66C2] bg-transparent rounded-full p-2 transition hover:bg-[#EDF3F8] hover:scale-110 hover:shadow-md hover:cursor-pointer"
                    style={{ cursor: "pointer" }}
                    onClick={() => setModal("enderecoEmpresa")}
                    aria-label="Editar Endereço da Empresa"
                    type="button"
                  >
                    <FiEdit2 size={18} className="sm:w-5 sm:h-5 transition-transform duration-150 group-hover:scale-110" style={{ cursor: "pointer" }} />
                  </button>
                  <h2 className="text-base font-semibold text-[#23253A] mb-2">
                    Endereço - Empresa
                  </h2>
                  <div className="flex flex-col gap-4">
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
                      <div className="sm:col-span-3">
                        <span className="text-[#49525A] font-semibold text-sm">CEP</span>
                        <div className="text-[#23253A] text-sm break-all">
                          {(billingAddress as EnderecoCobranca | null)?.Cep || "-"}
                        </div>
                      </div>
                      <div className="sm:col-span-9">
                        <span className="text-[#49525A] font-semibold text-sm">Endereço</span>
                        <div className="text-[#23253A] text-sm break-all">
                          {(billingAddress as EnderecoCobranca | null)?.Rua || "-"}
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <span className="text-[#49525A] font-semibold text-sm">Bairro</span>
                        <div className="text-[#23253A] text-sm break-all">
                          {(billingAddress as EnderecoCobranca | null)?.Bairro || "-"}
                        </div>
                      </div>
                      <div>
                        <span className="text-[#49525A] font-semibold text-sm">Cidade</span>
                        <div className="text-[#23253A] text-sm break-all">
                          {(billingAddress as EnderecoCobranca | null)?.Cidade || "-"}
                        </div>
                      </div>
                      <div>
                        <span className="text-[#49525A] font-semibold text-sm">Estado</span>
                        <div className="text-[#23253A] text-sm break-all">
                          {(billingAddress as EnderecoCobranca | null)?.Estado || "-"}
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <span className="text-[#49525A] font-semibold text-sm">Número</span>
                        <div className="text-[#23253A] text-sm break-all">
                          {(billingAddress as EnderecoCobranca | null)?.Numero || "-"}
                        </div>
                      </div>
                      <div>
                        <span className="text-[#49525A] font-semibold text-sm">Complemento</span>
                        <div className="text-[#23253A] text-sm break-all">
                          {(billingAddress as EnderecoCobranca | null)?.Complemento || "-"}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <div className="border-t border-[#E3E4F3] pt-6 mt-2 relative">
                <button
                  className="absolute top-4 right-0 sm:top-6 text-[#0A66C2] bg-transparent rounded-full p-2 transition hover:bg-[#EDF3F8] hover:scale-110 hover:shadow-md hover:cursor-pointer"
                  style={{ cursor: "pointer" }}
                  onClick={() => setModal("sobreMim")}
                  aria-label="Editar Sobre Mim"
                  type="button"
                >
                  <FiEdit2 size={18} className="sm:w-5 sm:h-5 transition-transform duration-150 group-hover:scale-110" style={{ cursor: "pointer" }} />
                </button>
                <h2 className="text-base font-semibold text-[#23253A] mb-2">
                  Sobre mim
                </h2>
                <div className="text-sm">
                  <div className="text-[#23253A]">{psicologo?.ProfessionalProfiles?.[0]?.SobreMim || "-"}</div>
                </div>
              </div>
            </div>

            {/* Formação acadêmica e Atendimento/Experiência */}
            <div className="flex flex-col md:flex-row gap-4 sm:gap-6">
              {/* Formação acadêmica */}
              <div className="flex-1 bg-white rounded-lg border border-[#E3E4F3] p-4 sm:p-6 flex flex-col gap-4 relative">
                <button
                  className="absolute top-4 right-4 sm:top-6 sm:right-6 text-[#0A66C2] bg-transparent rounded-full p-2 transition hover:bg-[#EDF3F8] hover:scale-110 hover:shadow-md hover:cursor-pointer"
                  style={{ cursor: "pointer" }}
                  onClick={() => setModal("formacao")}
                  aria-label="Editar Formação Acadêmica"
                  type="button"
                >
                  <FiEdit2 size={18} className="sm:w-5 sm:h-5 transition-transform duration-150 group-hover:scale-110" style={{ cursor: "pointer" }} />
                </button>
                <h2 className="text-base font-semibold text-[#23253A] mb-2">
                  Formação acadêmica
                </h2>
                <ul className="space-y-4 text-sm">
                  {psicologo?.ProfessionalProfiles?.[0]?.Formacoes?.map((f: Formacao) => {
                    // Helper para formatar data MM/YYYY
                    const formatarDataMMYYYY = (data: string | null | undefined): string => {
                      if (!data) return "-";
                      // Se já estiver no formato MM/YYYY, retorna como está
                      if (data.match(/^\d{1,2}\/\d{4}$/)) {
                        const [mes, ano] = data.split('/');
                        const meses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
                        const mesNome = meses[parseInt(mes) - 1] || mes;
                        return `${mesNome}/${ano}`;
                      }
                      // Tenta parsear como Date
                      try {
                        const date = new Date(data);
                        if (!isNaN(date.getTime())) {
                          const meses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
                          return `${meses[date.getMonth()]}/${date.getFullYear()}`;
                        }
                      } catch {
                        // Ignora erro
                      }
                      return data;
                    };
                    
                    return (
                      <li key={f.Id} className="pl-1">
                        <span className="font-semibold text-[#23253A]">{f.Curso}</span>
                        <div className="text-xs text-[#49525A] mt-1">
                          Tipo: <span className="font-medium">{f.TipoFormacao ?? "-"}</span> | Instituição: <span className="font-medium">{f.Instituicao}</span> | Início: <span className="font-medium">{formatarDataMMYYYY(f.DataInicio ?? null)}</span> | Conclusão: <span className="font-medium">{formatarDataMMYYYY(f.DataConclusao ?? null)}</span> | <span className="font-medium">{f.Status}</span>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>

              {/* Atendimento e Experiência */}
              <div className="flex-1 bg-white rounded-lg border border-[#E3E4F3] p-4 sm:p-6 flex flex-col gap-4 relative">
                <button
                  className="absolute top-4 right-4 sm:top-6 sm:right-6 text-[#0A66C2] bg-transparent rounded-full p-2 transition hover:bg-[#EDF3F8] hover:scale-110 hover:shadow-md hover:cursor-pointer"
                  style={{ cursor: "pointer" }}
                  onClick={() => setModal("especialidades")}
                  aria-label="Editar Especialidades"
                  type="button"
                >
                  <FiEdit2 size={18} className="sm:w-5 sm:h-5 transition-transform duration-150 group-hover:scale-110" style={{ cursor: "pointer" }} />
                </button>
                <h2 className="text-base font-semibold text-[#23253A] mb-2">
                  Atendimento e Experiência profissional
                </h2>
                <div className="flex flex-col gap-4">
                  <div>
                    <span className="text-[#49525A] font-semibold text-sm">Tempo de experiência clínica</span>
                    <div className="text-[#23253A] text-sm mt-1">
                      {normalizeExperienciaClinica(psicologo?.ProfessionalProfiles?.[0]?.ExperienciaClinica) || "-"}
                    </div>
                  </div>
                  <div>
                    <span className="text-[#49525A] font-semibold text-sm">Idiomas</span>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {psicologo?.ProfessionalProfiles?.[0]?.Idiomas && psicologo.ProfessionalProfiles[0].Idiomas.length > 0 ? (
                        psicologo.ProfessionalProfiles[0].Idiomas.map((i: string) => (
                          <span key={i} className="bg-[#EDF3F8] text-[#0A66C2] text-xs px-3 py-1 rounded-full font-semibold shadow-sm">{i}</span>
                        ))
                      ) : (
                        <span className="text-[#23253A] text-sm">-</span>
                      )}
                    </div>
                  </div>
                  <div>
                    <span className="text-[#49525A] font-semibold text-sm">Qual(is) público(s) você atende?</span>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {psicologo?.ProfessionalProfiles?.[0]?.TipoAtendimento && psicologo.ProfessionalProfiles[0].TipoAtendimento.length > 0 ? (
                        psicologo.ProfessionalProfiles[0].TipoAtendimento.map((t: string) => (
                          <span key={t} className="bg-[#EDF3F8] text-[#0A66C2] text-xs px-3 py-1 rounded-full font-semibold shadow-sm">{t}</span>
                        ))
                      ) : (
                        <span className="text-[#23253A] text-sm">-</span>
                      )}
                    </div>
                  </div>
                  <div>
                    <span className="text-[#49525A] font-semibold text-sm">Abordagens</span>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {psicologo?.ProfessionalProfiles?.[0]?.Abordagens && psicologo.ProfessionalProfiles[0].Abordagens.length > 0 ? (
                        psicologo.ProfessionalProfiles[0].Abordagens.map((a: string) => (
                          <span key={a} className="bg-[#E3E4F3] text-[#23253A] text-xs px-3 py-1 rounded-full font-semibold shadow-sm">{normalizeEnum(a)}</span>
                        ))
                      ) : (
                        <span className="text-[#23253A] text-sm">-</span>
                      )}
                    </div>
                  </div>
                  <div>
                    <span className="text-[#49525A] font-semibold text-sm">Queixas e sintomas</span>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {psicologo?.ProfessionalProfiles?.[0]?.Queixas && psicologo.ProfessionalProfiles[0].Queixas.length > 0 ? (
                        psicologo.ProfessionalProfiles[0].Queixas.map((q: string) => (
                          <span key={q} className="bg-[#FFE6E6] text-[#E57373] text-xs px-3 py-1 rounded-full font-semibold shadow-sm">{normalizeEnum(q)}</span>
                        ))
                      ) : (
                        <span className="text-[#23253A] text-sm">-</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Dados Bancários */}
            <div className="bg-white rounded-lg border border-[#E3E4F3] p-4 sm:p-6 relative mb-4 sm:mb-0">
              <button
                className="absolute top-4 right-4 sm:top-6 sm:right-6 text-[#0A66C2] bg-transparent rounded-full p-2 transition hover:bg-[#EDF3F8] hover:scale-110 hover:shadow-md hover:cursor-pointer"
                style={{ cursor: "pointer" }}
                onClick={() => setModal("bancario")}
                aria-label="Editar Dados Bancários"
                type="button"
              >
                <FiEdit2 size={20} className="transition-transform duration-150 group-hover:scale-110" style={{ cursor: "pointer" }} />
              </button>
              <h2 className="text-base font-semibold text-[#23253A] mb-2">
                Dados bancários
              </h2>
              
              {/* Alerta informativo */}
              <div className="bg-[#FFF9E6] border border-[#FFE066] rounded-lg p-3 sm:p-4 flex items-start gap-2 sm:gap-3 mb-4">
                <div className="flex-shrink-0 w-5 h-5 rounded-full bg-[#FFC107] flex items-center justify-center text-white text-xs font-bold">
                  i
                </div>
                <p className="text-xs sm:text-sm text-[#856404] flex-1 leading-relaxed">
                  Atenção! A Chave PIX deverá ser obrigatoriamente o CPF (caso você seja autônomo atualmente) ou o CNPJ da sua empresa.
                </p>
              </div>

              <div className="text-sm">
                <div>
                  <span className="text-[#49525A] font-semibold">Chave PIX</span>
                  <div className="text-[#23253A] mt-1 break-all">
                    {(() => {
                      // Se for autônomo, busca PIX do ProfessionalProfile
                      if (isAutonomo) {
                        return psicologo?.ProfessionalProfiles?.[0]?.DadosBancarios?.ChavePix || "-";
                      }
                      // Se for pessoa jurídica, busca PIX do PessoalJuridica
                      return psicologo?.PessoalJuridica?.DadosBancarios?.ChavePix || "-";
                    })()}
                  </div>
                </div>
              </div>
            </div>
          </main>
          {/* Espaço extra no mobile para evitar corte */}
          <div className="h-24 sm:h-0"></div>
        </div>
      </div>
      {/* Modais de edição */}
      <EditModal
        open={modal === "dadosPessoais"}
        title="Editar Dados Pessoais"
        onClose={() => setModal(null)}
      >
        <FormDadosPessoais psicologo={psicologo} enums={enums} onSuccess={() => setModal(null)} />
      </EditModal>
      <EditModal
        open={modal === "formacao"}
        title="Editar Formação Acadêmica"
        onClose={() => setModal(null)}
      >
        <FormFormacao psicologo={psicologo} enums={enums} onSuccess={() => setModal(null)} />
      </EditModal>
      <EditModal
        open={modal === "especialidades"}
        title="Editar Especialidades"
        onClose={() => setModal(null)}
      >
        <FormEspecialidades psicologo={psicologo} enums={enums} onSuccess={() => setModal(null)} />
      </EditModal>
      <EditModal
        open={modal === "endereco"}
        title="Editar Endereço"
        onClose={() => setModal(null)}
      >
        <FormEndereco psicologo={psicologo} onSuccess={() => setModal(null)} />
      </EditModal>
      <EditModal
        open={modal === "juridico"}
        title="Editar Dados de Pessoa Jurídica"
        onClose={() => setModal(null)}
      >
        <FormJuridico psicologo={psicologo} onSuccess={() => setModal(null)} />
      </EditModal>
      <EditModal
        open={modal === "bancario"}
        title="Editar Dados Bancários"
        onClose={() => setModal(null)}
      >
        <FormBancario psicologo={psicologo} onSuccess={() => setModal(null)} />
      </EditModal>
      <EditModal
        open={modal === "sobreMim"}
        title="Editar Sobre Mim"
        onClose={() => setModal(null)}
        isLoading={modal === "sobreMim" && (() => {
          // Busca o estado de loading do formulário
          // Por enquanto, vamos usar um estado local
          return false; // Será atualizado via callback
        })()}
      >
        <FormSobreMim 
          psicologo={psicologo} 
          onSuccess={() => setModal(null)}
          onLoadingChange={() => {
            // Atualiza o estado de loading do modal
            // Isso requer um estado no componente pai
          }}
        />
      </EditModal>
      <EditModal
        open={modal === "enderecoEmpresa"}
        title="Editar Endereço da Empresa"
        onClose={() => setModal(null)}
      >
        <FormEndereco psicologo={psicologo} isBillingAddress={true} onSuccess={() => setModal(null)} />
      </EditModal>
    </div>
  );
}
