export interface IUserDataCheckService {
    checkAndNotifyUsers(): Promise<void>;
}
