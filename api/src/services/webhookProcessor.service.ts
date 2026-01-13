import prisma from "../prisma/client";
export async function processVindiWebhook(event: any) {
    const { eventType, payload } = event;

    switch (eventType) {
        case "bill_paid":
            await handleBillPaid(payload);
            break;

        case "subscription_created":
            await handleSubscriptionCreated(payload);
            break;

        default:
            console.log("Evento não tratado:", eventType);
    }
}

async function handleBillPaid(payload: any) {
    const invoiceId = payload.data.id;
    const customerId = payload.data.customer?.id;

    const customer = await prisma.user.findUnique({
        where: { VindiCustomerId: String(customerId) },
    });

    if (!customer) {
        throw new Error("Cliente ainda não sincronizado, tentar novamente...");
    }

    await prisma.fatura.updateMany({
        where: { CodigoFatura: String(invoiceId) },
        data: { Status: "Paid" },
    });

    console.log(`💰 Fatura ${invoiceId} atualizada como PAGA.`);
}

async function handleSubscriptionCreated(payload: any) {
    const subscriptionId = payload.data.id;
    const customerId = payload.data.customer?.id;

    const paciente = await prisma.user.findUnique({
        where: { VindiCustomerId: String(customerId) },
    });

    if (!paciente) {
        throw new Error("Paciente ainda não registrado no sistema.");
    }
}
