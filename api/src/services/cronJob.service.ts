import { ICronJobService } from "../interfaces/ICronJobService";
import { IUserDataCheckService } from "../interfaces/IUserDataCheckService";
import { IAgendaService } from "../interfaces/IAgendaService";
import { IReservationService } from "../interfaces/IReservationService";
import { UserDataCheckService } from "./userDataCheck.service";
import { AgendaService } from "./agenda.service";
import { ReservationService } from "./reservation.service";


export class CronJobService implements ICronJobService {
    // private userDataCheckService: IUserDataCheckService;
    private agendaService: IAgendaService;
    // private reservationService: IReservationService;

    constructor(
        userDataCheckService?: IUserDataCheckService,
        agendaService?: IAgendaService,
        reservationService?: IReservationService
    ) {
        //this.userDataCheckService = userDataCheckService ?? new UserDataCheckService();
        this.agendaService = agendaService ?? new AgendaService();
        //this.reservationService = reservationService ?? new ReservationService();
    }

    async executeAll(): Promise<void> {
        // await this.userDataCheckService.checkAndNotifyUsers();
        await this.agendaService.deletePreviousAgendas();
        await this.agendaService.generateAgenda();
        await this.agendaService.inactivateExpiredConsultations();
        // await this.reservationService.updateCompletedReservations();
    }
}
