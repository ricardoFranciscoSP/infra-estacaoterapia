export interface IScheduleService {
    getAvailableSchedules(psicologoId: string): Promise<any[]>;
}