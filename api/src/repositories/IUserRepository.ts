export interface IUserRepository {
    findActivePsychologists(): Promise<any[]>;
    findById(id: string): Promise<any>;
}
