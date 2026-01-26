"use client";
import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";
import { useUsers } from "@/hooks/admin/useUsers";
import { usePermissionsByRole } from "@/hooks/usePermissions";
import { 
    moduleLabels, 
    Module, 
    ActionType, 
    Role,
    permissionsService,
} from "@/services/permissionsService";
import { User, userService } from "@/services/userService";
import toast from "react-hot-toast";

// Ícones SVG

const ShieldIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
  </svg>
);

const UserIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);

const EditIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-7.5-1.5L19.121 3.121a2.121 2.121 0 013 3l-10.621 10.621" />
  </svg>
);

const CloseIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

// Mapeamento de roles para nomes em português
const roleLabels: Record<Role, string> = {
    Admin: "Administrador",
    Management: "Gestão",
    Finance: "Financeiro",
    Patient: "Paciente",
    Psychologist: "Psicólogo",
};

// Todos os módulos disponíveis
const allModules: Module[] = [
    "Users",
    "Reports",
    "Plans",
    "Payments",
    "Sessions",
    "Profiles",
    "Evaluations",
    "Onboarding",
    "Finance",
    "Agenda",
    "Notifications",
    "Promotions",
    "SystemSettings",
    "Psychologists",
    "Clients",
    "Contracts",
    "Reviews",
    "Cancelamentos",
    "WorkSchedule",
    "RedesSociais",
    "Faq",
    "Configuracoes",
    "Security",
    "Permission",
] as Module[];

// Labels dos módulos
const getModuleLabel = (module: Module): string => {
    const labels: Record<string, string> = {
        Users: "Usuários",
        Reports: "Relatórios",
        Plans: "Planos",
        Payments: "Pagamentos",
        Sessions: "Sessões",
        Profiles: "Perfis",
        Evaluations: "Avaliações",
        Onboarding: "Onboarding",
        Finance: "Financeiro",
        Agenda: "Agenda",
        Notifications: "Notificações",
        Promotions: "Promoções",
        SystemSettings: "Configurações do Sistema",
        Psychologists: "Psicólogos",
        Clients: "Clientes",
        Contracts: "Contratos",
        Reviews: "Avaliações/Depoimentos",
        Cancelamentos: "Cancelamentos",
        WorkSchedule: "Agenda de Trabalho",
        RedesSociais: "Redes Sociais",
        Faq: "FAQ",
        Configuracoes: "Configurações",
        Security: "Segurança",
        Permission: "Permissões",
    };
    return labels[module] || moduleLabels[module] || module;
};

export default function PerfisAcessoPage() {
    const queryClient = useQueryClient();
    const [isSaving, setIsSaving] = useState(false);
    const [editingRole, setEditingRole] = useState<Role | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [isUserModalOpen, setIsUserModalOpen] = useState(false);
    const [userModulePermissions, setUserModulePermissions] = useState<Record<Module, Record<ActionType, boolean>>>({} as Record<Module, Record<ActionType, boolean>>);
    const [selectedUserRole, setSelectedUserRole] = useState<Role | null>(null);

    // Buscar permissões por role
    const { data: adminPermissions } = usePermissionsByRole("Admin");
    const { data: financePermissions } = usePermissionsByRole("Finance");
    const { data: managementPermissions } = usePermissionsByRole("Management");

    // Estado das permissões por role (inicializa com dados da API)
    const [rolePermissionsState, setRolePermissionsState] = useState<Record<Role, Record<Module, boolean>>>({
        Admin: {} as Record<Module, boolean>,
        Finance: {} as Record<Module, boolean>,
        Management: {} as Record<Module, boolean>,
        Patient: {} as Record<Module, boolean>,
        Psychologist: {} as Record<Module, boolean>,
    });


    // Inicializar permissões de roles quando dados chegarem
    useEffect(() => {
        if (adminPermissions) {
            setRolePermissionsState(prev => {
                const newState = { ...prev };
                allModules.forEach(module => {
                    newState.Admin[module] = adminPermissions.some(
                        p => p.Module === module && p.Action === "Manage"
                    );
                });
                return newState;
            });
        }
    }, [adminPermissions]);

    useEffect(() => {
        if (financePermissions) {
            setRolePermissionsState(prev => {
                const newState = { ...prev };
                allModules.forEach(module => {
                    newState.Finance[module] = financePermissions.some(
                        p => p.Module === module && p.Action === "Manage"
                    );
                });
                return newState;
            });
        }
    }, [financePermissions]);

    useEffect(() => {
        if (managementPermissions) {
            setRolePermissionsState(prev => {
                const newState = { ...prev };
                allModules.forEach(module => {
                    newState.Management[module] = managementPermissions.some(
                        p => p.Module === module && p.Action === "Manage"
                    );
                });
                return newState;
            });
        }
    }, [managementPermissions]);


    // Carregar permissões do usuário quando abrir modal de edição (role + user overrides)
    useEffect(() => {
        if (isUserModalOpen && editingUser) {
            const fetchUserPermissions = async () => {
                try {
                    const res = await permissionsService.getPermissionsForUser(editingUser.Id);
                    const data = (res.data as { success?: boolean; data?: { rolePermissions?: Array<{ Module: Module; Action: ActionType }>; userPermissions?: Array<{ Module: Module; Action: ActionType; Allowed: boolean }> } })?.data;
                    const rolePermissions = data?.rolePermissions ?? [];
                    const userPermissions = data?.userPermissions ?? [];
                    const perms: Record<Module, Record<ActionType, boolean>> = {} as Record<Module, Record<ActionType, boolean>>;

                    allModules.forEach((module) => {
                        perms[module] = {} as Record<ActionType, boolean>;
                        (["Read", "Create", "Update", "Delete", "Manage"] as ActionType[]).forEach((action) => {
                            const userPerm = userPermissions.find((p) => p.Module === module && p.Action === action);
                            const rolePerm = rolePermissions.find((p) => p.Module === module && p.Action === action);
                            if (userPerm) perms[module][action] = userPerm.Allowed;
                            else if (rolePerm) perms[module][action] = true;
                            else perms[module][action] = false;
                        });
                    });
                    setUserModulePermissions(perms);
                } catch (error) {
                    console.error("Erro ao carregar permissões:", error);
                    toast.error("Erro ao carregar permissões do usuário.");
                }
            };
            fetchUserPermissions();
        }
    }, [isUserModalOpen, editingUser]);

    const handleToggleRole = (role: Role, module: Module) => {
        setRolePermissionsState(prev => ({
            ...prev,
            [role]: {
                ...prev[role],
                [module]: !prev[role][module],
            },
        }));
    };

    const handleSaveRolePermissions = async (role: Role) => {
        setIsSaving(true);
        try {
            const permissions = allModules
                .filter(module => rolePermissionsState[role][module])
                .map(module => ({
                    module,
                    action: "Manage" as ActionType,
                }));

            await permissionsService.bulkCreateRolePermissions({ role, permissions });
            queryClient.invalidateQueries({ queryKey: ["rolePermissions"] });
            queryClient.invalidateQueries({ queryKey: ["permissionsByRole"] });
            toast.success(`Permissões do perfil ${roleLabels[role]} atualizadas com sucesso`);
        } catch (error) {
            console.error("Erro ao salvar permissões:", error);
            toast.error("Erro ao salvar permissões");
        } finally {
            setIsSaving(false);
        }
    };

    const rolesToShow: Role[] = ["Admin", "Finance", "Management"];
    const { users: allUsers } = useUsers();

    // Hook para fechar modais com ESC
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape' || e.key === 'Esc') {
                if (isModalOpen) {
                    setIsModalOpen(false);
                    setEditingRole(null);
                }
                if (isUserModalOpen) {
                    setIsUserModalOpen(false);
                    setEditingUser(null);
                    setSelectedUserRole(null);
                }
            }
        };
        
        if (isModalOpen || isUserModalOpen) {
            window.addEventListener('keydown', handleEscape);
            return () => window.removeEventListener('keydown', handleEscape);
        }
    }, [isModalOpen, isUserModalOpen]);

    return (
        <main className="w-full p-4 sm:p-6 lg:p-8">
            {/* Header */}
            <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6"
            >
                <div className="flex items-center gap-3 mb-2">
                    <ShieldIcon />
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Perfis de acesso por cargo e usuário</h1>
                </div>
                <p className="text-sm text-gray-500">Defina o que cada cargo pode acessar e restrinja por usuário (ex.: usuário X não pode ver o módulo Y).</p>
            </motion.div>

            {/* Tabela de permissões */}
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-white rounded-xl shadow-sm border border-[#E5E9FA] overflow-hidden"
            >
                <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-[#8494E9]/5 to-[#8494E9]/10">
                    <h2 className="text-lg font-semibold text-gray-800">Gerenciar Permissões por Perfil</h2>
                    <p className="text-sm text-gray-500 mt-1">Configure os módulos permitidos para cada perfil</p>
                </div>
                
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gradient-to-r from-[#8494E9]/5 to-[#8494E9]/10 border-b border-gray-200">
                            <tr>
                                <th className="py-4 px-6 text-left text-xs font-semibold text-[#8494E9] uppercase tracking-wider">
                                    Cargo (perfil)
                                </th>
                                <th className="py-4 px-6 text-left text-xs font-semibold text-[#8494E9] uppercase tracking-wider">
                                    Módulos Permitidos
                                </th>
                                <th className="py-4 px-6 text-center text-xs font-semibold text-[#8494E9] uppercase tracking-wider">
                                    Ações
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {rolesToShow.map((role) => (
                                <tr key={role} className="hover:bg-gray-50 transition-colors">
                                    <td className="py-4 px-6 font-semibold text-gray-900">
                                        {roleLabels[role]}
                                    </td>
                                    <td className="py-4 px-6">
                                        <div className="flex flex-wrap gap-1">
                                            {Object.entries(rolePermissionsState[role] || {})
                                                .filter(([, hasPermission]) => hasPermission)
                                                .map(([module]) => (
                                                    <span
                                                        key={module}
                                                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#8494E9]/10 text-[#8494E9] border border-[#8494E9]/20"
                                                    >
                                                        {getModuleLabel(module as Module)}
                                                    </span>
                                                ))}
                                            {Object.values(rolePermissionsState[role] || {}).every(v => !v) && (
                                                <span className="text-sm text-gray-500 italic">Nenhum módulo selecionado</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="py-4 px-6 text-center">
                                        <button
                                            onClick={() => {
                                                setEditingRole(role);
                                                setIsModalOpen(true);
                                            }}
                                            className="inline-flex items-center gap-2 px-3 py-2 text-sm bg-[#8494E9] text-white rounded-lg hover:bg-[#6B7FD7] transition-colors"
                                        >
                                            <EditIcon />
                                            Editar
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </motion.div>

            {/* Modal de Edição de Permissões */}
            {isModalOpen && editingRole && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="fixed inset-0 bg-transparent z-50 flex items-center justify-center p-4"
                    onClick={() => {
                        setIsModalOpen(false);
                        setEditingRole(null);
                    }}
                >
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 20 }}
                        transition={{ duration: 0.2 }}
                        onClick={(e) => e.stopPropagation()}
                        className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden"
                    >
                        {/* Header do Modal */}
                        <div className="bg-gradient-to-r from-[#8494E9] to-[#6B7FD7] px-6 py-5 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                                    <ShieldIcon />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-white">
                                        Editar Permissões
                                    </h3>
                                    <p className="text-sm text-white/90 mt-0.5">{roleLabels[editingRole]}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => {
                                    setIsModalOpen(false);
                                    setEditingRole(null);
                                }}
                                className="text-white hover:bg-white/20 transition-all p-2 rounded-lg"
                            >
                                <CloseIcon />
                            </button>
                        </div>

                        {/* Conteúdo do Modal */}
                        <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
                            <p className="text-sm text-gray-600 mb-4 flex items-center gap-2">
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                </svg>
                                Selecione os módulos que este cargo pode acessar
                            </p>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {allModules.map((module) => (
                                    <label
                                        key={module}
                                        className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all cursor-pointer ${
                                            rolePermissionsState[editingRole]?.[module]
                                                ? 'border-[#8494E9] bg-[#8494E9]/5 shadow-sm'
                                                : 'border-gray-200 bg-white hover:border-[#8494E9]/50 hover:bg-gray-50'
                                        }`}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={rolePermissionsState[editingRole]?.[module] || false}
                                            onChange={() => handleToggleRole(editingRole, module)}
                                            className="w-5 h-5 text-[#8494E9] rounded-md border-gray-300 focus:ring-[#8494E9] cursor-pointer"
                                        />
                                        <span className="text-sm font-medium text-gray-800 flex-1">
                                            {getModuleLabel(module)}
                                        </span>
                                        {rolePermissionsState[editingRole]?.[module] && (
                                            <svg className="w-5 h-5 text-[#8494E9]" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                            </svg>
                                        )}
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Footer do Modal */}
                        <div className="bg-white border-t border-gray-200 px-6 py-4 flex items-center justify-between">
                            <p className="text-xs text-gray-500">
                                {Object.values(rolePermissionsState[editingRole] || {}).filter(v => v).length} de {allModules.length} módulos selecionados
                            </p>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => {
                                        setIsModalOpen(false);
                                        setEditingRole(null);
                                    }}
                                    className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={async () => {
                                        if (editingRole) {
                                            await handleSaveRolePermissions(editingRole);
                                            setIsModalOpen(false);
                                            setEditingRole(null);
                                        }
                                    }}
                                    disabled={isSaving}
                                    className="px-5 py-2.5 text-sm font-medium bg-gradient-to-r from-[#8494E9] to-[#6B7FD7] text-white rounded-lg hover:shadow-lg hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                                >
                                    {isSaving ? (
                                        <span className="flex items-center gap-2">
                                            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                            </svg>
                                            Salvando...
                                        </span>
                                    ) : (
                                        "Salvar Permissões"
                                    )}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}

            {/* Seção de Usuários com Permissões */}
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-white rounded-xl shadow-sm border border-[#E5E9FA] mt-6 overflow-hidden"
            >
                <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-[#8494E9]/5 to-[#8494E9]/10">
                    <h2 className="text-lg font-semibold text-gray-800">Permissões por usuário</h2>
                    <p className="text-sm text-gray-500 mt-1">Restrinja ou amplie o acesso por usuário. Ex.: para o usuário X <strong>não ver</strong> o módulo Y, desmarque todas as ações desse módulo ao editar.</p>
                </div>
                
                <div className="overflow-x-auto">
                    {allUsers && allUsers.filter((u: User) => ["Admin", "Finance", "Management"].includes(u.Role)).length > 0 ? (
                        <table className="w-full min-w-[700px]">
                            <thead className="bg-gradient-to-r from-[#8494E9]/5 to-[#8494E9]/10 border-b border-gray-200">
                                <tr>
                                    <th className="py-4 px-6 text-left text-xs font-semibold text-[#8494E9] uppercase tracking-wider">
                                        Nome
                                    </th>
                                    <th className="py-4 px-6 text-left text-xs font-semibold text-[#8494E9] uppercase tracking-wider">
                                        Email
                                    </th>
                                    <th className="py-4 px-6 text-left text-xs font-semibold text-[#8494E9] uppercase tracking-wider">
                                        Cargo
                                    </th>
                                    <th className="py-4 px-6 text-center text-xs font-semibold text-[#8494E9] uppercase tracking-wider">
                                        Módulos visíveis
                                    </th>
                                    <th className="py-4 px-6 text-center text-xs font-semibold text-[#8494E9] uppercase tracking-wider">
                                        Ações
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {allUsers
                                    .filter((u: User) => ["Admin", "Finance", "Management"].includes(u.Role))
                                    .map((user: User) => (
                                        <tr key={user.Id} className="hover:bg-gray-50 transition-colors">
                                            <td className="py-4 px-6">
                                                <div className="font-medium text-gray-900">{user.Nome}</div>
                                            </td>
                                            <td className="py-4 px-6">
                                                <div className="text-sm text-gray-600">{user.Email}</div>
                                            </td>
                                            <td className="py-4 px-6">
                                                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-[#8494E9]/10 text-[#8494E9] border border-[#8494E9]/20">
                                                    {roleLabels[user.Role] || user.Role}
                                                </span>
                                            </td>
                                            <td className="py-4 px-6">
                                                <div className="flex gap-1 flex-wrap justify-center max-w-xs">
                                                    {user.Role === "Admin" && adminPermissions && adminPermissions.length > 0 && (
                                                        <span className="text-xs text-gray-600">
                                                            {adminPermissions.filter(p => p.Action === "Manage").length} módulos
                                                        </span>
                                                    )}
                                                    {user.Role === "Finance" && financePermissions && financePermissions.length > 0 && (
                                                        <span className="text-xs text-gray-600">
                                                            {financePermissions.filter(p => p.Action === "Manage").length} módulos
                                                        </span>
                                                    )}
                                                    {user.Role === "Management" && managementPermissions && managementPermissions.length > 0 && (
                                                        <span className="text-xs text-gray-600">
                                                            {managementPermissions.filter(p => p.Action === "Manage").length} módulos
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="py-4 px-6 text-center">
                                                <button
                                                    onClick={() => {
                                                        setEditingUser(user);
                                                        setSelectedUserRole(user.Role);
                                                        setIsUserModalOpen(true);
                                                    }}
                                                    className="inline-flex items-center gap-2 px-3 py-2 text-sm bg-[#8494E9] text-white rounded-lg hover:bg-[#6B7FD7] transition-colors"
                                                >
                                                    <EditIcon />
                                                    Editar
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                            </tbody>
                        </table>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-12 px-6">
                            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                                <UserIcon />
                            </div>
                            <p className="text-gray-500 text-center">Nenhum usuário administrativo cadastrado</p>
                        </div>
                    )}
                </div>
            </motion.div>

            {/* Modal de Edição de Usuário com Permissões Detalhadas */}
            {isUserModalOpen && editingUser && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="fixed inset-0 bg-transparent z-50 flex items-center justify-center p-4"
                    onClick={() => {
                        setIsUserModalOpen(false);
                        setEditingUser(null);
                        setSelectedUserRole(null);
                    }}
                >
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 20 }}
                        transition={{ duration: 0.2 }}
                        onClick={(e) => e.stopPropagation()}
                        className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden"
                    >
                        {/* Header do Modal */}
                        <div className="bg-gradient-to-r from-[#8494E9] to-[#6B7FD7] px-6 py-5 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                                    <UserIcon />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-white">
                                        {editingUser.Nome}
                                    </h3>
                                    <p className="text-sm text-white/90 mt-0.5">{editingUser.Email}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => {
                                    setIsUserModalOpen(false);
                                    setEditingUser(null);
                                    setSelectedUserRole(null);
                                }}
                                className="text-white hover:bg-white/20 transition-all p-2 rounded-lg"
                            >
                                <CloseIcon />
                            </button>
                        </div>

                        {/* Conteúdo do Modal */}
                        <div className="flex-1 overflow-y-auto">
                            <div className="p-6 space-y-6">
                                {/* Seleção de Cargo */}
                                <div className="bg-gradient-to-br from-[#8494E9]/5 to-[#6B7FD7]/5 rounded-xl p-5 border border-[#8494E9]/20">
                                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-800 mb-3">
                                        <svg className="w-5 h-5 text-[#8494E9]" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 0010 16a5.986 5.986 0 004.546-2.084A5 5 0 0010 11z" clipRule="evenodd" />
                                        </svg>
                                        Cargo do usuário
                                    </label>
                                    <select
                                        value={selectedUserRole || editingUser.Role}
                                        onChange={(e) => setSelectedUserRole(e.target.value as Role)}
                                        className="w-full px-4 py-3 border-2 border-[#8494E9]/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8494E9] focus:border-transparent bg-white text-gray-800 font-medium transition-all"
                                    >
                                        <option value="Admin">👑 Administrador</option>
                                        <option value="Finance">💰 Financeiro</option>
                                        <option value="Management">📊 Gestão</option>
                                    </select>
                                    <p className="text-xs text-gray-500 mt-2">O cargo define o padrão de módulos. Abaixo você restringe ou amplia por usuário.</p>
                                </div>

                                {/* Permissões de Links do Menu (Sidebar) */}
                                <div className="bg-white border-2 border-[#8494E9]/10 rounded-xl p-5 mb-6">
                                    <h4 className="text-base font-bold text-gray-800 mb-2 flex items-center gap-2">
                                        <svg className="w-5 h-5 text-[#8494E9]" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M3 5a2 2 0 012-2h10a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V5zm2 0v10h10V5H5z" clipRule="evenodd" />
                                        </svg>
                                        Links do Menu (Sidebar)
                                    </h4>
                                    <p className="text-xs text-gray-600 mb-4">Selecione quais links do menu este usuário pode visualizar (permite apenas "Ver").</p>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                        {require("@/config/sidebarConfig").SIDEBAR_MODULES.filter((m: any) => m.module).map((mod: any) => (
                                            <label
                                                key={mod.module}
                                                className={
                                                    'flex items-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-all ' +
                                                    ((userModulePermissions as Record<string, Record<ActionType, boolean>>)[mod.module]?.Read
                                                        ? 'border-[#8494E9] bg-[#8494E9]/10'
                                                        : 'border-gray-200 hover:border-[#8494E9]/30 hover:bg-gray-50')
                                                }
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={(userModulePermissions as Record<string, Record<ActionType, boolean>>)[mod.module]?.Read || false}
                                                    onChange={() => {
                                                        setUserModulePermissions(prev => ({
                                                            ...prev,
                                                            [mod.module]: {
                                                                ...((prev as Record<string, Record<ActionType, boolean>>)[mod.module]),
                                                                Read: !((prev as Record<string, Record<ActionType, boolean>>)[mod.module]?.Read)
                                                            }
                                                        }));
                                                    }}
                                                    className="w-4 h-4 text-[#8494E9] rounded border-gray-300 focus:ring-[#8494E9] cursor-pointer"
                                                />
                                                <span className="text-xs font-medium text-gray-700 flex items-center gap-1">
                                                    <span>{mod.icon && <i className={`icon-${mod.icon}`}></i>}</span>
                                                    {mod.label}
                                                </span>
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                {/* Permissões por Módulo (avançado) */}
                                <div>
                                    <div className="flex items-center justify-between mb-4">
                                        <div>
                                            <h4 className="text-base font-bold text-gray-800 flex items-center gap-2">
                                                <svg className="w-5 h-5 text-[#8494E9]" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                                            </svg>
                                            Permissões por módulo (avançado)
                                        </h4>
                                        <p className="text-xs text-gray-600 mt-1">Para este usuário <strong>não ver</strong> um módulo, desmarque todas as ações (Ver, Criar, Editar, etc.) desse módulo.</p>
                                    </div>
                                    </div>
                                    <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                                        {allModules.map((module) => (
                                            <div key={module} className="bg-white border-2 border-gray-200 rounded-xl p-4 hover:border-[#8494E9]/30 transition-all">
                                                <div className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                                                    <div className="w-2 h-2 bg-[#8494E9] rounded-full"></div>
                                                    {getModuleLabel(module)}
                                                </div>
                                                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                                                    {(["Read", "Create", "Update", "Delete", "Manage"] as ActionType[]).map((action) => {
                                                        const actionIcons: Record<ActionType, string> = {
                                                            Read: "👁️",
                                                            Create: "➕",
                                                            Update: "✏️",
                                                            Delete: "🗑️",
                                                            Manage: "⚙️",
                                                            Approve: "✅"
                                                        };
                                                        const actionLabels: Record<ActionType, string> = {
                                                            Read: "Ver",
                                                            Create: "Criar",
                                                            Update: "Editar",
                                                            Delete: "Deletar",
                                                            Manage: "Gerenciar",
                                                            Approve: "Aprovar"
                                                        };
                                                        return (
                                                            <label
                                                                key={action}
                                                                className={`flex items-center gap-2 p-2.5 rounded-lg border-2 cursor-pointer transition-all ${
                                                                    userModulePermissions[module]?.[action]
                                                                        ? 'border-[#8494E9] bg-[#8494E9]/10'
                                                                        : 'border-gray-200 hover:border-[#8494E9]/30 hover:bg-gray-50'
                                                                }`}
                                                            >
                                                                <input
                                                                    type="checkbox"
                                                                    checked={userModulePermissions[module]?.[action] || false}
                                                                    onChange={() => {
                                                                        setUserModulePermissions(prev => ({
                                                                            ...prev,
                                                                            [module]: {
                                                                                ...prev[module],
                                                                                [action]: !prev[module]?.[action]
                                                                            }
                                                                        }));
                                                                    }}
                                                                    className="w-4 h-4 text-[#8494E9] rounded border-gray-300 focus:ring-[#8494E9] cursor-pointer"
                                                                />
                                                                <span className="text-xs font-medium text-gray-700 flex items-center gap-1">
                                                                    <span>{actionIcons[action]}</span>
                                                                    {actionLabels[action]}
                                                                </span>
                                                            </label>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer do Modal */}
                        <div className="bg-white border-t-2 border-gray-200 px-6 py-4 flex items-center justify-end gap-3">
                            <button
                                onClick={() => {
                                    setIsUserModalOpen(false);
                                    setEditingUser(null);
                                    setSelectedUserRole(null);
                                }}
                                className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={async () => {
                                    if (!editingUser) return;
                                    
                                    setIsSaving(true);
                                    try {
                                        // 1. Atualizar o perfil (role) do usuário se foi alterado
                                        if (selectedUserRole && selectedUserRole !== editingUser.Role) {
                                            const roleRes = await userService.updateRole(editingUser.Id, selectedUserRole as User['Role']);
                                            if (roleRes.status !== 200 || !(roleRes.data as { success?: boolean })?.success) {
                                                throw new Error('Erro ao atualizar perfil do usuário');
                                            }
                                        }
                                        
                                        // 2. Salvar permissões específicas do usuário
                                        const validModules = [
                                            "Users","Reports","Plans","Payments","Sessions","Profiles","Evaluations","Onboarding","Finance","Agenda","Notifications","Promotions","SystemSettings","Psychologists","Patients","Clients","Contracts","Reviews","Cancelamentos","WorkSchedule","RedesSociais","Faq","Configuracoes","Admin"
                                        ];
                                        const validActions = ["Read", "Create", "Update", "Delete", "Manage"];
                                        const permissions: Array<{module: Module, action: ActionType, allowed: boolean}> = [];
                                        allModules.forEach(module => {
                                            if (!validModules.includes(module)) return;
                                            (validActions as ActionType[]).forEach(action => {
                                                // Sempre envia, mesmo que seja false
                                                permissions.push({
                                                    module,
                                                    action,
                                                    allowed: !!userModulePermissions[module]?.[action]
                                                });
                                            });
                                        });
                                        // Log para depuração
                                        console.log("Enviando permissões para API:", {
                                            userId: editingUser.Id,
                                            permissions
                                        });
                                        if (permissions.length > 0) {
                                            await permissionsService.bulkCreateUserPermissions({
                                                userId: editingUser.Id,
                                                permissions,
                                            });
                                        }
                                        
                                        queryClient.invalidateQueries({ queryKey: ["users"] });
                                        queryClient.invalidateQueries({ queryKey: ["permissionsByRole"] });
                                        queryClient.invalidateQueries({ queryKey: ["userPermissions", editingUser.Id] });
                                        queryClient.invalidateQueries({ queryKey: ["permissionsForUser", editingUser.Id] });
                                        toast.success("Usuário e permissões atualizados com sucesso!");
                                        setIsUserModalOpen(false);
                                        setEditingUser(null);
                                        setSelectedUserRole(null);
                                        setUserModulePermissions({} as Record<Module, Record<ActionType, boolean>>);
                                    } catch (error) {
                                        console.error("Erro ao salvar:", error);
                                        toast.error("Erro ao atualizar usuário e permissões");
                                    } finally {
                                        setIsSaving(false);
                                    }
                                }}
                                disabled={isSaving}
                                className="px-5 py-2.5 text-sm font-medium bg-gradient-to-r from-[#8494E9] to-[#6B7FD7] text-white rounded-lg hover:shadow-lg hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                            >
                                {isSaving ? (
                                    <span className="flex items-center gap-2">
                                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                        </svg>
                                        Salvando...
                                    </span>
                                ) : (
                                    "Salvar Alterações"
                                )}
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </main>
    );
}
