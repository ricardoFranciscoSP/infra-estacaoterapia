import { IAgendaService } from "../interfaces/IAgendaService";
import { deletarAgendasAnterioresCron } from "../cron/deletarAgendasAnterioresCron";
import { gerarAgendaCron } from "../cron/gerarAgendaCron";
import { cronQueryControl } from "../cron/cronQueryControl";

export class AgendaService implements IAgendaService {
    async deletePreviousAgendas(): Promise<void> {
        await deletarAgendasAnterioresCron();
    }
    async generateAgenda(): Promise<void> {
        await gerarAgendaCron();
    }
    async inactivateExpiredConsultations(): Promise<void> {
        await cronQueryControl();
    }

    async executarTarefas(): Promise<void> {
        await this.deletePreviousAgendas();
        await this.generateAgenda();
        await this.inactivateExpiredConsultations();
    }
}
