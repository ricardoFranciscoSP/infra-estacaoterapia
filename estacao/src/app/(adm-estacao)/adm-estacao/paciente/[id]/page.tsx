"use client";
import React, { useState, ReactNode, useEffect, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { useAdmPacienteById, useUpdateAdmPaciente } from "@/hooks/admin/useAdmPaciente";
import { formatDateBR } from "@/utils/formatarDataHora";
import toast from "react-hot-toast";
import Image from "next/image";
import { admPacienteService } from "@/services/admPacienteService";
// Removido: consultas admin – vamos usar apenas os dados do próprio paciente

type InputProps = {
  label: string;
  value: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
  type?: string;
};

function Input({ label, value, onChange, disabled, type = "text" }: InputProps) {
  return (
    <div className="mb-4">
      <label className="block text-xs font-semibold text-[#6C757D] uppercase tracking-wider mb-2">{label}</label>
      <input
        type={type}
        className={`w-full px-4 py-2.5 border rounded-lg shadow-sm text-sm font-medium transition-all ${
          disabled 
            ? "bg-[#F9FAFB] text-[#212529] border-[#E5E9FA] cursor-not-allowed" 
            : "bg-white text-[#212529] border-[#E5E9FA] focus:ring-2 focus:ring-[#8494E9] focus:border-[#8494E9]"
        }`}
        value={value}
        onChange={onChange}
        disabled={disabled}
      />
    </div>
  );
}

type SectionProps = {
  title: string;
  children: ReactNode;
};

function Section({ title, children }: SectionProps) {
  return (
    <section className="mb-6">
      <h2 className="text-base font-bold text-[#212529] mb-4 pb-3 border-b border-[#E5E9FA]">{title}</h2>
      <div className="bg-white rounded-xl shadow-md border border-[#E5E9FA] p-6">{children}</div>
    </section>
  );
}

export default function PacienteDetalhePage() {
  const params = useParams();
  const id = params && "id" in params ? params.id : undefined;
  const idStr = Array.isArray(id) ? id[0] : id;
  const { paciente, isLoading: isLoadingPaciente, refetch } = useAdmPacienteById(idStr);
  const updatePacienteMutation = useUpdateAdmPaciente();
  
  // Estados para campos editáveis
  const [nomeEdit, setNomeEdit] = useState("");
  const [emailEdit, setEmailEdit] = useState("");
  const [telefoneEdit, setTelefoneEdit] = useState("");
  const [dataNascimentoEdit, setDataNascimentoEdit] = useState("");
  const [sexoEdit, setSexoEdit] = useState("");
  const [statusEdit, setStatusEdit] = useState("");
  const [enderecoEdit, setEnderecoEdit] = useState({
    Cep: "",
    Rua: "",
    Numero: "",
    Complemento: "",
    Bairro: "",
    Cidade: "",
    Estado: "",
  });
  
  // Estados para edição de foto
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(false);
  
  // Inicializa estados quando paciente carrega
  useEffect(() => {
    if (paciente) {
      setNomeEdit(paciente.Nome || "");
      setEmailEdit(paciente.Email || "");
      setTelefoneEdit(paciente.Telefone || "");
      setDataNascimentoEdit(paciente.DataNascimento ? new Date(paciente.DataNascimento).toISOString().split('T')[0] : "");
      setSexoEdit(paciente.Sexo || "");
      setStatusEdit(paciente.Status || "");
      
      const enderecoAtual = paciente.Address && paciente.Address.length > 0 ? paciente.Address[0] : undefined;
      if (enderecoAtual) {
        setEnderecoEdit({
          Cep: enderecoAtual.Cep || "",
          Rua: enderecoAtual.Rua || "",
          Numero: enderecoAtual.Numero || "",
          Complemento: enderecoAtual.Complemento || "",
          Bairro: enderecoAtual.Bairro || "",
          Cidade: enderecoAtual.Cidade || "",
          Estado: enderecoAtual.Estado || "",
        });
      }
      
      // Inicializa preview da imagem
      if (paciente.Images && paciente.Images.length > 0 && paciente.Images[0]?.Url) {
        setImagePreview(paciente.Images[0].Url);
      } else {
        setImagePreview(null);
      }
    }
  }, [paciente]);
  
  // Função para lidar com upload de imagem
  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setImagePreview(URL.createObjectURL(file));
    setImageLoading(true);

    try {
      const currentImage = paciente?.Images && paciente.Images.length > 0 ? paciente.Images[0] : null;
      
      if (currentImage?.Id) {
        // Atualiza imagem existente
        await admPacienteService().updateImage(idStr || "", currentImage.Id, file);
        toast.success('Imagem atualizada com sucesso!');
      } else {
        // Faz upload de nova imagem
        await admPacienteService().uploadImage(idStr || "", file);
        toast.success('Imagem adicionada com sucesso!');
      }
      
      await refetch();
      setImageLoading(false);
    } catch (error) {
      console.error("Erro ao atualizar imagem:", error);
      toast.error('Erro ao atualizar imagem.');
      setImageLoading(false);
      setImagePreview(paciente?.Images && paciente.Images.length > 0 ? paciente.Images[0]?.Url || null : null);
    }
  };

  // Função para deletar imagem
  const handleDeleteImage = async () => {
    if (!paciente?.Images || paciente.Images.length === 0) return;
    
    const currentImage = paciente.Images[0];
    if (!currentImage?.Id) return;

    if (!confirm('Tem certeza que deseja excluir a foto? Esta ação não pode ser desfeita.')) {
      return;
    }

    try {
      setImageLoading(true);
      await admPacienteService().deleteImage(currentImage.Id);
      toast.success('Foto excluída com sucesso!');
      setImagePreview(null);
      await refetch();
      setImageLoading(false);
    } catch (error) {
      console.error("Erro ao deletar imagem:", error);
      toast.error('Erro ao excluir foto.');
      setImageLoading(false);
    }
  };

  // Função para salvar edição
  const handleSalvarEdicao = async () => {
    if (!idStr || !paciente) return;
    
    try {
      await updatePacienteMutation.mutateAsync({
        id: idStr,
        update: {
          ...paciente,
          Nome: nomeEdit,
          Email: emailEdit,
          Telefone: telefoneEdit,
          DataNascimento: dataNascimentoEdit ? new Date(dataNascimentoEdit).toISOString() : paciente.DataNascimento,
          Sexo: (sexoEdit || undefined) as typeof paciente.Sexo | undefined,
          Status: statusEdit,
          Address: enderecoEdit ? [enderecoEdit as typeof paciente.Address[0]] : undefined,
        },
      });
      
      refetch();
      toast.success("Paciente atualizado com sucesso!");
    } catch (error) {
      console.error("Erro ao salvar edição:", error);
      toast.error("Erro ao atualizar o paciente, tente novamente.");
    }
  };


  // Exibição exclusivamente com base no objeto do paciente

  // Consultas do próprio objeto do paciente mapeadas para o card
  type ConsultaCardData = {
    Id: string;
    Data?: string;
    Hora?: string;
    Profissional?: string;
    Status?: string;
  };
  const consultasDoPaciente: ConsultaCardData[] = useMemo(() => {
    type ConsultaPacienteRaw = {
      Id: string;
      Agenda?: { Data?: string; Horario?: string; Status?: string };
      Date?: string;
      Time?: string;
      Profissional?: string;
      Psicologo?: { Nome?: string };
      Status?: string;
      ReservaSessao?: { Status?: string };
    };
    const arr: ConsultaPacienteRaw[] = Array.isArray(paciente?.ConsultaPacientes) ? paciente?.ConsultaPacientes : [];
    return arr.map((c) => ({
      Id: c.Id,
      Data: c.Agenda?.Data || c.Date,
      Hora: c.Agenda?.Horario || c.Time,
      Profissional: c.Profissional || c.Psicologo?.Nome,
      Status: c.Status || c.ReservaSessao?.Status || c.Agenda?.Status,
    }));
  }, [paciente?.ConsultaPacientes]);

  // Derivação de hora quando vier apenas Data (ISO)
  const deriveHora = (data?: string, hora?: string) => {
    if (hora) return hora;
    if (!data) return undefined;
    // Se for ISO com tempo, extrai HH:mm
    const iso = new Date(data);
    if (!isNaN(iso.getTime())) {
      const hh = String(iso.getHours()).padStart(2, '0');
      const mm = String(iso.getMinutes()).padStart(2, '0');
      // Evita retornar 00:00 quando a string não tem hora real
      const hasTime = /T\d{2}:\d{2}/.test(data) || /\d{2}:\d{2}/.test(data);
      return hasTime ? `${hh}:${mm}` : undefined;
    }
    // Caso seja uma string solta com HH:mm
    const match = data.match(/(\d{2}:\d{2})/);
    return match ? match[1] : undefined;
  };

  const consultasFonte: ConsultaCardData[] = consultasDoPaciente
    .map((c) => ({
      Id: c.Id,
      Data: c.Data,
      Hora: deriveHora(c.Data, c.Hora),
      Profissional: c.Profissional,
      Status: c.Status,
    }))
    .sort((a, b) => {
      const toMillis = (data?: string, hora?: string) => {
        if (!data) return 0;
        const datePart = data.includes('T') ? data.split('T')[0] : data; // yyyy-MM-dd
        const time = (hora && /^\d{2}:\d{2}$/.test(hora)) ? hora : '00:00';
        return new Date(`${datePart}T${time}:00`).getTime();
      };
      return toMillis(b.Data, b.Hora) - toMillis(a.Data, a.Hora);
    });

  const porPagina = 3;
  const [pagina, setPagina] = useState(1);
  const totalConsultas = consultasFonte.length;
  const totalPaginas = Math.ceil(totalConsultas / porPagina);
  const consultasPaginadas = consultasFonte.slice((pagina - 1) * porPagina, pagina * porPagina);

  // Código limpo: sem logs de debug

  // Compras/Financeiro: pega do array FinanceiroEntries e PlanoAssinaturas
  type Compra = {
    Id: string;
    Data?: string;
    Tipo?: string;
    Descricao?: string;
    Valor?: number;
    Status?: string;
  };
  
  type ItemFinanceiro = {
    Id?: string;
    id?: string;
    CreatedAt?: string;
    DataCompra?: string;
    Data?: string;
    Tipo?: string;
    TipoPlano?: string;
    Creditos?: number;
    Descricao?: string;
    Nome?: string;
    Valor?: number;
    PrecoTotal?: number;
    Status?: string;
  };
  
  // Combina dados de FinanceiroEntries, PlanoAssinaturas e CreditosAvulsos
  const itensFinanceiros: ItemFinanceiro[] = [
    ...(Array.isArray(paciente?.FinanceiroEntries) ? paciente.FinanceiroEntries : []),
    ...(Array.isArray(paciente?.PlanoAssinaturas) ? paciente.PlanoAssinaturas : []),
    ...(Array.isArray(paciente?.CreditosAvulsos) ? paciente.CreditosAvulsos : []),
  ] as ItemFinanceiro[];
  
  const compras: Compra[] = itensFinanceiros
    .filter((item) => item && (item.Id || item.id))
    .map((item) => ({
      Id: item.Id || item.id || '',
      Data: item.CreatedAt || item.DataCompra || item.Data,
      Tipo: item.Tipo || item.TipoPlano || (item.Creditos ? "Créditos Avulsos" : "Compra"),
      Descricao: item.Descricao || item.Nome || `Plano ${item.TipoPlano || ""}`,
      Valor: item.Valor || item.PrecoTotal || 0,
      Status: item.Status || "Pago",
    }));

  const [paginaCompras, setPaginaCompras] = useState(1);
  const porPaginaCompras = 5;
  const totalCompras = compras.length;
  const totalPaginasCompras = Math.ceil(totalCompras / porPaginaCompras);
  const comprasPaginadas = compras
    .sort((a, b) => new Date(b.Data || "").getTime() - new Date(a.Data || "").getTime())
    .slice((paginaCompras - 1) * porPaginaCompras, paginaCompras * porPaginaCompras);

  // Debug: Log para verificar dados de compras
  useEffect(() => {
    if (paciente) {
      console.log("📊 Dados do paciente:", {
        FinanceiroEntries: paciente.FinanceiroEntries,
        PlanoAssinaturas: paciente.PlanoAssinaturas,
        CreditosAvulsos: paciente.CreditosAvulsos,
        TotalCompras: compras.length
      });
    }
  }, [paciente, compras.length]);

  if (isLoadingPaciente) {
    return <div className="p-6 font-fira-sans"></div>;
  }
  if (!paciente) {
    return <div className="p-6 font-fira-sans">Paciente não encontrado.</div>;
  }

  return (
    <motion.main
      className="w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      {/* Breadcrumbs */}
      <nav className="text-xs sm:text-sm text-[#6C757D] mb-4 sm:mb-6" aria-label="Breadcrumb">
        <ol className="flex items-center space-x-2">
          <li>
            <Link href="/adm-estacao/pacientes" className="text-[#8494E9] hover:text-[#6B7FD7] transition-colors font-medium">
              Pacientes
            </Link>
          </li>
          <li className="text-[#6C757D]">/</li>
          <li className="text-[#212529] font-semibold">{paciente.Nome}</li>
        </ol>
      </nav>

      {/* Header com Info do Paciente */}
      <div className="bg-white rounded-xl shadow-md border border-[#E5E9FA] p-4 sm:p-6 mb-6">
        <div className="flex items-center gap-4">
          <div className="relative">
            {imagePreview ? (
              <div className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-[#8494E9]">
                <Image
                  src={imagePreview}
                  alt={paciente.Nome}
                  fill
                  className="object-cover"
                  unoptimized
                />
              </div>
            ) : (
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#8494E9] to-[#6B7FD7] flex items-center justify-center text-white font-bold text-2xl shadow-lg">
                {paciente.Nome.charAt(0).toUpperCase()}
              </div>
            )}
            <label className="absolute bottom-0 right-0 w-6 h-6 bg-[#8494E9] rounded-full flex items-center justify-center cursor-pointer hover:bg-[#6B7FD7] transition-colors shadow-md">
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
                disabled={imageLoading}
              />
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </label>
            {imagePreview && (
              <button
                onClick={handleDeleteImage}
                disabled={imageLoading}
                className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white hover:bg-red-600 transition-colors shadow-md"
                title="Excluir foto"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
            {imageLoading && (
              <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}
          </div>
          <div className="flex-1">
            <h1 className="text-xl sm:text-2xl font-bold text-[#212529] mb-1">{paciente.Nome}</h1>
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-xs text-[#6C757D]">
                <span className="font-semibold">Cadastrado em:</span> {paciente.CreatedAt ? new Date(paciente.CreatedAt).toLocaleDateString("pt-BR") : ""}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Dados Pessoais */}
        <div>
          <Section title="Dados Pessoais">
            <Input 
              label="Nome" 
              value={nomeEdit} 
              onChange={(e) => setNomeEdit(e.target.value)}
              disabled={false} 
            />
            <Input 
              label="E-mail" 
              value={emailEdit} 
              onChange={(e) => setEmailEdit(e.target.value)}
              disabled={false} 
            />
            <Input 
              label="Telefone" 
              value={telefoneEdit} 
              onChange={(e) => setTelefoneEdit(e.target.value)}
              disabled={false} 
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Data de Nascimento"
                value={dataNascimentoEdit}
                onChange={(e) => setDataNascimentoEdit(e.target.value)}
                disabled={false}
                type="date"
              />
              <Input 
                label="Gênero" 
                value={sexoEdit} 
                onChange={(e) => setSexoEdit(e.target.value)}
                disabled={false} 
              />
            </div>
            <button
              className="w-full mt-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-lg transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              type="button"
              onClick={handleSalvarEdicao}
              disabled={updatePacienteMutation.isPending}
            >
              {updatePacienteMutation.isPending ? "Salvando..." : "Salvar alterações"}
            </button>
          </Section>
        </div>

        {/* Status e Datas */}
        <div>
          <Section title="Informações do Sistema">
            <div className="mb-4">
              <label className="block text-xs font-semibold text-[#6C757D] uppercase tracking-wider mb-2">Status da Conta</label>
              <select
                value={statusEdit}
                onChange={(e) => setStatusEdit(e.target.value)}
                className="w-full px-4 py-2.5 border rounded-lg shadow-sm text-sm font-medium transition-all bg-white text-[#212529] border-[#E5E9FA] focus:ring-2 focus:ring-[#8494E9] focus:border-[#8494E9]"
              >
                <option value="Ativo">Ativo</option>
                <option value="Inativo">Inativo</option>
                <option value="Bloqueado">Bloqueado</option>
                <option value="Pendente">Pendente</option>
              </select>
            </div>
            <Input
              label="Último Acesso"
              value={paciente.LastLogin ? new Date(paciente.LastLogin).toLocaleString("pt-BR") : "Nunca acessou"}
              disabled={true}
            />
            <Input
              label="Data de Cadastro"
              value={paciente.CreatedAt ? new Date(paciente.CreatedAt).toLocaleString("pt-BR") : ""}
              disabled={true}
            />
            <button
              className="w-full mt-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-lg transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              type="button"
              onClick={handleSalvarEdicao}
              disabled={updatePacienteMutation.isPending}
            >
              {updatePacienteMutation.isPending ? "Salvando..." : "Salvar alterações"}
            </button>
          </Section>
        </div>
      </div>

      {/* Endereço - 100% largura */}
      <div className="mt-6">
        <Section title="Endereço Completo">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Input 
              label="CEP" 
              value={enderecoEdit.Cep} 
              onChange={(e) => setEnderecoEdit({ ...enderecoEdit, Cep: e.target.value })}
              disabled={false} 
            />
            <Input 
              label="Rua" 
              value={enderecoEdit.Rua} 
              onChange={(e) => setEnderecoEdit({ ...enderecoEdit, Rua: e.target.value })}
              disabled={false} 
            />
            <Input 
              label="Número" 
              value={enderecoEdit.Numero} 
              onChange={(e) => setEnderecoEdit({ ...enderecoEdit, Numero: e.target.value })}
              disabled={false} 
            />
            <Input 
              label="Complemento" 
              value={enderecoEdit.Complemento} 
              onChange={(e) => setEnderecoEdit({ ...enderecoEdit, Complemento: e.target.value })}
              disabled={false} 
            />
            <Input 
              label="Bairro" 
              value={enderecoEdit.Bairro} 
              onChange={(e) => setEnderecoEdit({ ...enderecoEdit, Bairro: e.target.value })}
              disabled={false} 
            />
            <Input 
              label="Cidade" 
              value={enderecoEdit.Cidade} 
              onChange={(e) => setEnderecoEdit({ ...enderecoEdit, Cidade: e.target.value })}
              disabled={false} 
            />
            <Input 
              label="Estado" 
              value={enderecoEdit.Estado} 
              onChange={(e) => setEnderecoEdit({ ...enderecoEdit, Estado: e.target.value })}
              disabled={false} 
            />
          </div>
          <button
            className="w-full mt-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-lg transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            type="button"
            onClick={handleSalvarEdicao}
            disabled={updatePacienteMutation.isPending}
          >
            {updatePacienteMutation.isPending ? "Salvando..." : "Salvar alterações de endereço"}
          </button>
        </Section>
      </div>

      {/* Histórico de Compras */}
      <div className="mt-8">
        <h2 className="text-xl font-bold text-[#212529] mb-4 flex items-center gap-2">
          <svg className="w-6 h-6 text-[#8494E9]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          Histórico de Compras
        </h2>
        {comprasPaginadas.length === 0 ? (
          <div className="bg-white rounded-xl shadow-md p-12 border border-[#E5E9FA] text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#F2F4FD] mb-4">
              <svg className="w-8 h-8 text-[#8494E9]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
            <p className="text-[#6C757D] text-base font-medium">Nenhuma compra encontrada</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-md border border-[#E5E9FA] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm text-[#212529]">
                <thead>
                  <tr className="bg-[#F9FAFB] text-left">
                    <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider text-[#6C757D]">Data</th>
                    <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider text-[#6C757D]">Tipo</th>
                    <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider text-[#6C757D]">Descrição</th>
                    <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider text-[#6C757D]">Valor</th>
                    <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider text-[#6C757D]">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {comprasPaginadas.map((compra) => (
                    <tr key={compra.Id} className="border-b border-[#E5E9FA] hover:bg-[#F9FAFB] transition-colors">
                      <td className="px-4 py-3 text-[#6C757D]">
                        {compra.Data ? new Date(compra.Data).toLocaleDateString("pt-BR") : "-"}
                      </td>
                      <td className="px-4 py-3 font-medium">{compra.Tipo || "-"}</td>
                      <td className="px-4 py-3">{compra.Descricao || "-"}</td>
                      <td className="px-4 py-3 font-semibold text-[#8494E9]">
                        {compra.Valor ? `R$ ${compra.Valor.toFixed(2).replace(".", ",")}` : "-"}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                          compra.Status === "Pago" || compra.Status === "Ativo"
                            ? "bg-green-100 text-green-700" 
                            : compra.Status === "Pendente"
                            ? "bg-yellow-100 text-yellow-700"
                            : compra.Status === "Cancelado" || compra.Status === "Expirado"
                            ? "bg-red-100 text-red-700"
                            : "bg-gray-100 text-gray-700"
                        }`}>
                          {compra.Status || "N/A"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {totalPaginasCompras > 1 && (
              <div className="flex justify-end items-center gap-3 p-4 border-t border-[#E5E9FA]">
                <button
                  className="px-4 py-2 border border-[#E5E9FA] rounded-lg text-[#212529] font-medium hover:bg-[#F9FAFB] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  onClick={() => setPaginaCompras((p) => Math.max(1, p - 1))}
                  disabled={paginaCompras === 1}
                >
                  ← Anterior
                </button>
                <span className="text-sm text-[#6C757D] font-medium">
                  Página {paginaCompras} de {totalPaginasCompras}
                </span>
                <button
                  className="px-4 py-2 border border-[#E5E9FA] rounded-lg text-[#212529] font-medium hover:bg-[#F9FAFB] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  onClick={() => setPaginaCompras((p) => Math.min(totalPaginasCompras, p + 1))}
                  disabled={paginaCompras === totalPaginasCompras}
                >
                  Próxima →
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Consultas do paciente */}
      <div className="mt-8">
        <h2 className="text-xl font-bold text-[#212529] mb-4 flex items-center gap-2">
          <svg className="w-6 h-6 text-[#8494E9]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Histórico de Consultas
        </h2>
        {consultasPaginadas.length === 0 ? (
          <div className="bg-white rounded-xl shadow-md p-12 border border-[#E5E9FA] text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#F2F4FD] mb-4">
              <svg className="w-8 h-8 text-[#8494E9]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-[#6C757D] text-base font-medium">Nenhuma consulta encontrada</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {consultasPaginadas.map((c: ConsultaCardData) => (
              <div key={c.Id} className="bg-white rounded-xl shadow-md border border-[#E5E9FA] p-5 hover:shadow-lg transition-all">
                <div className="flex items-center justify-between mb-3">
                  <div className="font-bold text-[#212529]">
                    {c.Data ? formatDateBR(c.Data) : ""}
                    {c.Hora ? ` às ${c.Hora}` : ""}
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-semibold
                    ${["Completed", "Concluido", "Concluída", "Realizada"].includes(String(c.Status))
                      ? "bg-green-100 text-green-700"
                      : ["Reservado", "Agendado", "Pendente", "Pending"].includes(String(c.Status))
                      ? "bg-yellow-100 text-yellow-700"
                      : ["Cancelado", "Canceled", "Cancelada"].includes(String(c.Status))
                      ? "bg-red-100 text-red-700"
                      : "bg-gray-100 text-gray-700"}
                  `}>
                    {c.Status}
                  </span>
                </div>
                <div className="text-sm text-[#6C757D] pt-3 border-t border-[#E5E9FA]">
                  <span className="font-semibold text-[#212529]">Profissional:</span> {c.Profissional || "Não informado"}
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="flex justify-end items-center gap-3 mt-6">
          <button
            className="px-4 py-2 border border-[#E5E9FA] rounded-lg text-[#212529] font-medium hover:bg-[#F9FAFB] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            onClick={() => setPagina((p) => Math.max(1, p - 1))}
            disabled={pagina === 1}
          >
            ← Anterior
          </button>
          <span className="text-sm text-[#6C757D] font-medium">
            Página {pagina} de {totalPaginas || 1}
          </span>
          <button
            className="px-4 py-2 border border-[#E5E9FA] rounded-lg text-[#212529] font-medium hover:bg-[#F9FAFB] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
            disabled={pagina === totalPaginas || totalPaginas === 0}
          >
            Próxima →
          </button>
        </div>
      </div>
    </motion.main>
  );
}
