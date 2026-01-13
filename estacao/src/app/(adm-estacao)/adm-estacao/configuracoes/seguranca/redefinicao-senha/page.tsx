"use client";
import React, { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { useGenerateResetLink, useGenerateRandomPassword } from "@/hooks/passwordResetHook";
import { useUsers } from "@/hooks/admin/useUsers";
import { User } from "@/services/userService";
import toast from "react-hot-toast";

const SearchIcon = () => (
  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

const FilterIcon = () => (
  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
  </svg>
);

export default function RedefinicaoSenhaPage() {
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [roleFilter, setRoleFilter] = useState<'Admin' | 'Patient' | 'Psychologist' | 'Management' | 'Finance' | 'Todos'>('Todos');
  
  const { users, isLoading: isUsersLoading } = useUsers({
    search: searchTerm || undefined,
    role: roleFilter !== 'Todos' ? roleFilter : undefined,
  });

  const { generateResetLink, isLoading: isLoadingLink, data: resetLinkData } = useGenerateResetLink();
  const { generateRandomPassword, isLoading: isLoadingRandom } = useGenerateRandomPassword();

  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [showPassword, setShowPassword] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedPassword, setCopiedPassword] = useState(false);

  // Usuários filtrados localmente (para busca em tempo real no dropdown)
  const filteredUsers = useMemo(() => {
    if (!users || users.length === 0) return [];
    
    let filtered = users;
    
    // Filtro por busca (nome, email, CPF)
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter((user: User) => 
        user.Nome.toLowerCase().includes(search) ||
        user.Email.toLowerCase().includes(search) ||
        user.Cpf.toLowerCase().includes(search)
      );
    }

    return filtered.slice(0, 50); // Limita a 50 resultados para performance
  }, [users, searchTerm]);

  const selectedUser = users.find((u: User) => u.Id === selectedUserId);

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      Admin: 'Administrador',
      Patient: 'Paciente',
      Psychologist: 'Psicólogo',
      Management: 'Gestão',
      Finance: 'Financeiro',
    };
    return labels[role] || role;
  };

  const getRoleBadgeColor = (role: string) => {
    const colors: Record<string, string> = {
      Admin: 'bg-purple-100 text-purple-700',
      Patient: 'bg-blue-100 text-blue-700',
      Psychologist: 'bg-green-100 text-green-700',
      Management: 'bg-orange-100 text-orange-700',
      Finance: 'bg-yellow-100 text-yellow-700',
    };
    return colors[role] || 'bg-gray-100 text-gray-700';
  };

  const handleGenerateResetLink = async () => {
    if (!selectedUserId) {
      toast.error("Selecione um usuário primeiro.");
      return;
    }

    try {
      const result = await generateResetLink(selectedUserId);
      if (result?.resetLink) {
        // Copia o link para a área de transferência
        navigator.clipboard.writeText(result.resetLink);
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 3000);
      }
    } catch (error) {
      console.error("Erro ao gerar link:", error);
    }
  };

  const handleGenerateRandomPassword = async () => {
    if (!selectedUserId) {
      toast.error("Selecione um usuário primeiro.");
      return;
    }

    try {
      const result = await generateRandomPassword(selectedUserId);
      if (result?.password) {
        setGeneratedPassword(result.password);
        setShowPassword(true);
        // Copia a senha para a área de transferência
        navigator.clipboard.writeText(result.password);
        setCopiedPassword(true);
        setTimeout(() => setCopiedPassword(false), 3000);
      }
    } catch (error) {
      console.error("Erro ao gerar senha:", error);
    }
  };

  const copyToClipboard = (text: string, type: "link" | "password") => {
    navigator.clipboard.writeText(text);
    if (type === "link") {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 3000);
    } else {
      setCopiedPassword(true);
      setTimeout(() => setCopiedPassword(false), 3000);
    }
    toast.success("Copiado para a área de transferência!");
  };


  return (
    <main className="w-full p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <h1 className="text-2xl font-bold text-gray-800 mb-2">
          Redefinição de Senha
        </h1>
        <p className="text-sm text-gray-500">
          Gerencie a redefinição de senhas dos usuários do sistema. Escolha entre gerar um link de redefinição (recomendado) ou uma senha aleatória.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 gap-6">
        {/* Seleção de Usuário */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="bg-white rounded-xl shadow-sm p-6 border border-[#E5E9FA]"
        >
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Selecionar Usuário</h2>
          
          {/* Filtros */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {/* Campo de busca */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <SearchIcon />
              </div>
              <input
                type="text"
                placeholder="Buscar por nome, e-mail ou CPF..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#8494E9] focus:border-transparent transition-all outline-none"
              />
            </div>

            {/* Filtro por tipo de usuário */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FilterIcon />
              </div>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value as typeof roleFilter)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#8494E9] focus:border-transparent transition-all outline-none appearance-none bg-white cursor-pointer"
              >
                <option value="Todos">Todos os tipos</option>
                <option value="Admin">Administrador</option>
                <option value="Patient">Paciente</option>
                <option value="Psychologist">Psicólogo</option>
                <option value="Management">Gestão</option>
                <option value="Finance">Financeiro</option>
              </select>
            </div>
          </div>

          {/* Dropdown de seleção de usuário */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Selecionar usuário
            </label>
            <select
              value={selectedUserId}
              onChange={(e) => {
                setSelectedUserId(e.target.value);
                setShowPassword(false);
                setGeneratedPassword(null);
                setCopiedLink(false);
                setCopiedPassword(false);
              }}
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-[#8494E9] focus:border-transparent transition-all outline-none"
              disabled={isUsersLoading}
            >
              <option value="">
                {isUsersLoading ? 'Carregando usuários...' : filteredUsers.length === 0 ? 'Nenhum usuário encontrado' : 'Selecione um usuário...'}
              </option>
              {filteredUsers.map((user: User) => (
                <option key={user.Id} value={user.Id}>
                  {user.Nome} ({user.Email}) - {getRoleLabel(user.Role)}
                </option>
              ))}
            </select>
            {filteredUsers.length > 0 && (
              <p className="text-xs text-gray-500 mt-1">
                {filteredUsers.length} usuário(s) encontrado(s)
              </p>
            )}
          </div>

          {/* Informações do usuário selecionado */}
          {selectedUser && (
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <h3 className="font-medium text-gray-800 mb-3">Usuário selecionado:</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <p className="text-sm text-gray-600">
                    <strong>Nome:</strong> {selectedUser.Nome}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">
                    <strong>E-mail:</strong> {selectedUser.Email}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">
                    <strong>CPF:</strong> {selectedUser.Cpf}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">
                    <strong>Tipo:</strong>{' '}
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleBadgeColor(selectedUser.Role)}`}>
                      {getRoleLabel(selectedUser.Role)}
                    </span>
                  </p>
                </div>
                {selectedUser.Crp && (
                  <div>
                    <p className="text-sm text-gray-600">
                      <strong>CRP:</strong> {selectedUser.Crp}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-gray-600">
                    <strong>Status:</strong> {selectedUser.Status}
                  </p>
                </div>
              </div>
            </div>
          )}
        </motion.section>

        {/* Opções de Redefinição */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Opção 1: Link de Redefinição */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
            className="bg-white rounded-xl shadow-sm p-6 border border-[#E5E9FA]"
          >
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-gray-800">Opção 1 — Link de Redefinição (RECOMENDADO)</h2>
            </div>
            
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="font-medium text-green-800 mb-2">Vantagens:</h3>
                <ul className="text-sm text-green-700 space-y-1 list-disc list-inside">
                  <li>Mais seguro e LGPD-friendly</li>
                  <li>Admin nunca vê a senha</li>
                  <li>Melhor prática de segurança</li>
                  <li>Escalável</li>
                </ul>
              </div>

              <button
                type="button"
                onClick={handleGenerateResetLink}
                disabled={!selectedUserId || isLoadingLink}
                className={`w-full py-3 px-4 rounded-lg font-medium transition-all ${
                  !selectedUserId || isLoadingLink
                    ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                    : "bg-[#8494E9] text-white hover:bg-[#6b7cd9] shadow-md hover:shadow-lg"
                }`}
              >
                {isLoadingLink ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Gerando link...
                  </span>
                ) : (
                  "Gerar Link de Redefinição"
                )}
              </button>

              {resetLinkData?.resetLink && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <label className="text-sm font-medium text-gray-700">Link gerado:</label>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(resetLinkData.resetLink!, "link")}
                      className="text-sm text-[#8494E9] hover:text-[#6b7cd9] font-medium"
                    >
                      {copiedLink ? "Copiado!" : "Copiar"}
                    </button>
                  </div>
                  <p className="text-sm text-gray-600 break-all">{resetLinkData.resetLink}</p>
                  {resetLinkData.expiresAt && (
                    <p className="text-xs text-gray-500 mt-2">
                      Expira em: {new Date(resetLinkData.expiresAt).toLocaleString('pt-BR')}
                    </p>
                  )}
                </div>
              )}
            </div>
          </motion.section>

          {/* Opção 2: Senha Aleatória */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.3 }}
            className="bg-white rounded-xl shadow-sm p-6 border border-[#E5E9FA]"
          >
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-gray-800">Opção 2 — Senha Aleatória</h2>
            </div>

          <div className="space-y-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h3 className="font-medium text-yellow-800 mb-2">⚠️ Aviso:</h3>
              <p className="text-sm text-yellow-700">
                Por segurança, esta senha será exibida apenas uma vez. O usuário será obrigado a alterá-la no próximo login.
              </p>
              <p className="text-sm text-yellow-700 mt-2">
                <strong>Use apenas para casos operacionais (suporte, urgência).</strong>
              </p>
            </div>

            <button
              type="button"
              onClick={handleGenerateRandomPassword}
              disabled={!selectedUserId || isLoadingRandom}
              className={`w-full py-3 px-4 rounded-lg font-medium transition-all ${
                !selectedUserId || isLoadingRandom
                  ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                  : "bg-yellow-500 text-white hover:bg-yellow-600 shadow-md hover:shadow-lg"
              }`}
            >
              {isLoadingRandom ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Gerando senha...
                </span>
              ) : (
                "Gerar Senha Aleatória"
              )}
            </button>

            {showPassword && generatedPassword && (
              <div className="bg-red-50 border-2 border-red-200 rounded-lg p-6">
                <div className="flex items-center justify-between gap-2 mb-4">
                  <h3 className="font-bold text-red-800">Senha Gerada (exibida apenas uma vez):</h3>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(generatedPassword, "password")}
                    className="px-4 py-2 bg-[#8494E9] text-white rounded-lg hover:bg-[#6b7cd9] font-medium text-sm"
                  >
                    {copiedPassword ? "Copiado!" : "📋 Copiar"}
                  </button>
                </div>
                <div className="bg-white border border-red-300 rounded-lg p-4">
                  <p className="text-2xl font-mono font-bold text-center text-gray-800 tracking-wider">
                    {generatedPassword}
                  </p>
                </div>
                <div className="mt-4 bg-red-100 border border-red-300 rounded-lg p-3">
                  <p className="text-sm font-semibold text-red-800 mb-1">⚠️ Importante:</p>
                  <ul className="text-xs text-red-700 space-y-1 list-disc list-inside">
                    <li>Esta senha foi enviada por e-mail para o usuário</li>
                    <li>O usuário será obrigado a alterar a senha no próximo login</li>
                    <li>Esta senha não será mais exibida após fechar esta página</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
          </motion.section>
        </div>
      </div>
    </main>
  );
}

