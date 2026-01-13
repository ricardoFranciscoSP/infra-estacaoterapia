export interface ICronJobService {
    executeAll(): Promise<void>;
}
