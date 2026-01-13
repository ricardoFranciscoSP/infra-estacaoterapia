export interface IAgendaRepository {
    findFirst(params: { psicologoId: number, data: Date }): Promise<any>;
    create(agenda: any): Promise<any>;
    createMany(agendas: any[]): Promise<number>;
    deleteMany(filter: any): Promise<number>;
    count(filter: any): Promise<number>;
    findMany(filter: {
        where?: any;
        orderBy?: any;
        skip?: number;
        take?: number;
        // Adicione outros parâmetros conforme necessário
    }): Promise<any[]>;
}
