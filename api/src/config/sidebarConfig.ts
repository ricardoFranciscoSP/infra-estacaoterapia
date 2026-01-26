import { Module } from "../types/permissions.types";

export type SidebarModuleConfig = {
    label: string;
    path: string;
    module: Module | null; // null = sempre visível
    icon: string;
    alwaysVisible?: boolean;
};

export const SIDEBAR_MODULES: SidebarModuleConfig[] = [
    { label: "Dashboard", path: "/adm-estacao", module: null, icon: "dashboard", alwaysVisible: true },
    { label: "Psicólogos", path: "/adm-estacao/psicologos", module: Module.Psychologists, icon: "users" },
    { label: "Pacientes", path: "/adm-estacao/pacientes", module: Module.Patients, icon: "users-alt" },
    { label: "Depoimentos", path: "/adm-estacao/depoimentos", module: Module.Reviews, icon: "chat" },
    { label: "Faq", path: "/adm-estacao/faq", module: Module.Faq, icon: "question" },
    { label: "Gestão de Consultas", path: "/adm-estacao/gestao-consultas", module: Module.WorkSchedule, icon: "calendar" },
    { label: "Gerar Agenda Manual", path: "/adm-estacao/gerar-agenda-manual", module: Module.Agenda, icon: "calendar" },
    { label: "Relatórios", path: "/adm-estacao/relatorios", module: Module.Reports, icon: "report" },
    { label: "Financeiro", path: "/adm-estacao/financeiro", module: Module.Finance, icon: "money" },
    { label: "Notificações", path: "/adm-estacao/notificacoes", module: Module.Notifications, icon: "bell" },
    { label: "Solicitações", path: "/adm-estacao/solicitacoes", module: null, icon: "inbox", alwaysVisible: true },
    { label: "Configurações", path: "/adm-estacao/configuracoes", module: Module.Configuracoes, icon: "cog" },
];

export function getAllowedSidebarModules(
    rolePerms: { Module: Module; Action: string }[],
    userPerms: { Module: Module; Action: string; Allowed: boolean }[]
): SidebarModuleConfig[] {
    function canAccess(module: Module | null): boolean {
        if (module === null) return true;
        // Só mostra se tiver permissão de 'Read' OU 'Manage'
        const actions = ["Read", "Manage"];
        for (const action of actions) {
            const up = userPerms.find((p) => p.Module === module && p.Action === action);
            const rp = rolePerms.find((p) => p.Module === module && p.Action === action);
            const allowed = up ? up.Allowed : !!rp;
            if (allowed) return true;
        }
        return false;
    }
    return SIDEBAR_MODULES.filter((mod) =>
        mod.alwaysVisible || canAccess(mod.module)
    );
}
