export function formatarData(dataISO: string): string {
    // Se vier no formato yyyy-MM-dd, retorna formatado manualmente, ignorando fuso
    if (/^\d{4}-\d{2}-\d{2}$/.test(dataISO)) {
        const [ano, mes, dia] = dataISO.split("-");
        // Remove zeros à esquerda do mês/dia
        const diaNum = String(Number(dia)).padStart(2, '0');
        // ...existing code...
        // Meses em português
        const meses = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
        const mesNome = meses[Number(mes) - 1] || mes;
        return `${diaNum} de ${mesNome} de ${ano}`;
    }
    // Se vier no formato dd/MM/yyyy, retorna como está
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(dataISO)) {
        return dataISO;
    }
    // Fallback: tenta converter para Date
    const dateObj: Date | null = new Date(dataISO);
    if (!isNaN(dateObj.getTime())) {
        return dateObj.toLocaleDateString("pt-BR", {
            day: "2-digit",
            month: "long",
            year: "numeric",
        });
    }
    return dataISO;
}
