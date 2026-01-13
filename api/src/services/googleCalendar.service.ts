import { google, calendar_v3 } from 'googleapis';
import * as fs from 'fs';
import { join } from 'path';
import { JWT } from 'google-auth-library';
import dayjs from 'dayjs';

// Caminho da chave da conta de serviço
const SERVICE_ACCOUNT_PATH = join(__dirname, '../config/service-account.json');

// Escopo necessário
const SCOPES = ['https://www.googleapis.com/auth/calendar.events '];

/**
 * Classe responsável por interagir com o Google Calendar
 */
export class GoogleCalendarService {
    private authClient: JWT;

    constructor() {
        this.authClient = this.authenticate();
    }

    /**
     * Autentica com a conta de serviço do Google
     */
    private authenticate(): JWT {
        const key = fs.readFileSync(SERVICE_ACCOUNT_PATH);
        const credentials = JSON.parse(key.toString());

        return new google.auth.JWT(
            credentials.client_email,
            undefined,
            credentials.private_key,
            SCOPES
        );
    }

    /**
     * Cria um evento no Google Calendar
     * @param calendarId ID do calendário onde será criado o evento
     * @param data Dados da consulta/reserva
     */
    async createEvent(calendarId: string, data: {
        pacienteNome: string;
        psicologoNome?: string;
        emailPaciente: string;
        emailPsicologo?: string;
        dataConsulta: Date | string;
        horario: string;
    }): Promise<calendar_v3.Schema$Event> {
        const calendar = google.calendar({ version: 'v3', auth: this.authClient });

        // Processa data e hora
        const [hora, minuto] = data.horario.split(':').map(Number);
        const startDate = dayjs(data.dataConsulta)
            .hour(hora)
            .minute(minuto)
            .second(0)
            .toDate();

        const endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // +1h

        // Evento padrão
        const event: calendar_v3.Schema$Event = {
            summary: `Consulta com ${data.pacienteNome}`,
            description: `Consulta agendada com o paciente ${data.pacienteNome}.`,
            start: {
                dateTime: startDate.toISOString(),
                timeZone: 'America/Sao_Paulo',
            },
            end: {
                dateTime: endDate.toISOString(),
                timeZone: 'America/Sao_Paulo',
            },
            //attendees: [],
            reminders: {
                useDefault: false,
                overrides: [
                    { method: 'email', minutes: 24 * 60 }, // 1 dia antes
                    { method: 'popup', minutes: 30 },      // 30 minutos antes
                ],
            },
        };

        // Adiciona participantes se tiver e-mails
        if (data.emailPaciente) {
            event.attendees?.push({ email: data.emailPaciente });
        }
        if (data.emailPsicologo) {
            event.attendees?.push({ email: data.emailPsicologo });
        }

        try {
            const response = await calendar.events.insert({
                calendarId,
                requestBody: event,
                sendUpdates: 'all',
                conferenceDataVersion: 1,
            });

            return response.data;
        } catch (error) {
            if (error && typeof error === 'object' && 'response' in error) {
                // @ts-ignore
                console.error('Erro ao criar evento no Google Calendar:', error.response?.data || error.message);
            } else {
                console.error('Erro ao criar evento no Google Calendar:', (error as Error).message || error);
            }
            throw error;
        }
    }
}