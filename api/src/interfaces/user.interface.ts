export type Plano = {
    Id: number;
    Nome: string;
    Descricao: string;
    Preco: number;
    Tipo: string;
    Duracao: string;
    VindiPlanId: string;
    ProductId: string;
}

export interface IUserService {
    getConsultaAvulsaByUser(userId: string): Promise<import("./consultaAvulsa.model").ConsultaAvulsa[]>;
    getCreditoAvulsoByUser(userId: string): Promise<import("./creditoAvulso.model").CreditoAvulso[]>;
    getLoggedUserId(req: any): string | null;
    fetchUsers(userId: string): Promise<any[]>;
    fetchUserById(id: string, loggedUser: any): Promise<any | null>;
    updateUser(userId: string, data: any): Promise<any | null>;
    changePassword(userId: string, oldPassword: string, newPassword: string): Promise<void>;
    uploadImage(userId: string, file: any): Promise<any>;
    listImages(userId: string): Promise<any[]>;
    updateImage(userId: string, id: string, file: any): Promise<any>;
    deleteImage(userId: string, imageId: string): Promise<any>;
    deleteUser(id: string): Promise<any>;
    onboarding(userId: string, status: string, objetivo: string): Promise<any>;
    verifyUserIsPatient(userId: string): Promise<any | null>;
    verifyUserRole(userId: string, roles: string[]): Promise<any | null>;
    getUserWithRelations(userId: string): Promise<any | null>;
    createEnderecoCobranca(userId: string, data: any): Promise<any | null>;
    updateIsOnboarding(userId: string, data: any): Promise<any>;
    getUserPlano(userId: string): Promise<Array<{
        Id: string;
        UserId: string;
        PlanoAssinaturaId: string;
        DataInicio: Date;
        DataFim: Date | null;
        Status: string;
        VindiSubscriptionId: string | null;
        CreatedAt: Date;
        UpdatedAt: Date;
        Ciclos: Array<{
            Id: string;
            AssinaturaPlanoId: string;
            UserId: string;
            CicloInicio: Date;
            CicloFim: Date;
            Status: string;
            ConsultasDisponiveis: number;
            ConsultasUsadas: number;
            CreatedAt: Date;
            UpdatedAt: Date;
            ControleConsultaMensal: Array<unknown>;
            Financeiro: Array<unknown>;
        }>;
        ControleConsultaMensal: Array<unknown>;
        Financeiro: Array<unknown>;
        PlanoAssinatura: {
            Id: string;
            Nome: string;
            Descricao: string[];
            Preco: number;
            Duracao: number;
            Tipo: string;
            Status: string;
            Destaque: boolean | null;
            VindiPlanId: string | null;
            ProductId: string | null;
            CreatedAt: Date;
            UpdatedAt: Date;
        } | null;
    }> | null>;
    envioContrato(userId: string, file: any): Promise<any>;
    previaContrato(userId: string, planos: Plano[]): Promise<any>;
    gerarContrato(userId: string, planos: Plano[] | Plano, templatePath: string): Promise<{ urlContrato: string }>;

}

export interface IUserController {
    getUserBasic(req: Request, res: Response): Promise<Response>;
    getUserFullDetails(req: Request, res: Response): Promise<Response>;
}
