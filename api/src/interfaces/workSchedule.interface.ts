export interface IWorkScheduleService {
    setWorkSchedules(
        userId: string,
        schedules: { diaDaSemana: string; horarioInicio: string; horarioFinal: string; breaks?: { startTime: string; endTime: string }[] }[],
        targetPsychologistId?: string
    ): Promise<any>;
}
