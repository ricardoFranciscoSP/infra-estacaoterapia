// Retorna o ISO da data de hoje
export function getTodayISO(): string {
    // Ajusta para fuso horário de Brasília (UTC-3)
    const now = new Date();
    const utc3 = new Date(now.getTime() - 3 * 60 * 60 * 1000);
    const yyyy = utc3.getFullYear();
    const mm = String(utc3.getMonth() + 1).padStart(2, '0');
    const dd = String(utc3.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

// Gera os dias do calendário para o mês selecionado
export function generateCalendarDays(selectedMonthOffset = 0): Date[] {
    // Ajusta para fuso horário de Brasília (UTC-3)
    const now = new Date();
    const utc3 = new Date(now.getTime() - 3 * 60 * 60 * 1000);
    const year = utc3.getFullYear();
    const month = utc3.getMonth() + selectedMonthOffset;

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - startDate.getDay());

    const days: Date[] = [];
    const currentDate = new Date(startDate);

    while (currentDate <= lastDay || days.length < 42) {
        days.push(new Date(currentDate));
        currentDate.setDate(currentDate.getDate() + 1);
    }

    return days;
}

// Verifica se a data é hoje
export function isToday(date: Date, todayISO: string): boolean {
    // Ajusta para fuso horário de Brasília (UTC-3)
    const dateBrazil = new Date(date.getTime() - 3 * 60 * 60 * 1000);
    return dateBrazil.toISOString().split("T")[0] === todayISO;
}

// Verifica se a data é passada
export function isPastDate(date: Date, todayISO: string): boolean {
    // Ajusta para fuso horário de Brasília (UTC-3)
    const dateBrazil = new Date(date.getTime() - 3 * 60 * 60 * 1000);
    return dateBrazil < new Date(todayISO);
}
