import prisma from '../prisma/client';
import { WebSocketNotificationService } from './websocketNotification.service';
import { NotificationService } from './notification.service';
import { VindiService } from './vindi.service';
import { ContratoService, getTemplateContratoByTipoPlano } from './gerarPdf.service';
import { JobService } from './jobService';
import type { Plano } from '../interfaces/user.interface';
import {
    ControleFinanceiroStatus,
    TipoFatura,
    ConsultaAvulsaStatus,
    FaturaStatus,
    PlanoCompraStatus,
    ControleConsultaMensalStatus
} from '../generated/prisma/client';
import { CicloPlanoService } from './cicloPlano.service';
import type {
    VindiBill,
    VindiWebhookPayload,
    VindiWebhookEvent,
    VindiSubscription,
    VindiInvoice,
    VindiCharge,
    VindiPeriod,
    VindiIssue,
    VindiPaymentProfile,
    VindiMessage
} from '../types/vindi.types';
import type { Prisma } from '../generated/prisma/client';

// Este serviço foi padronizado para não enfileirar diretamente.
// O enfileiramento e os retries são responsabilidade do controller/worker BullMQ.

export class WebHookService {
    private static async resolveUserIdByCustomerId(customerId?: string | number | null): Promise<string | null> {
        try {
            if (!customerId) return null;
            const user = await prisma.user.findFirst({ where: { VindiCustomerId: String(customerId) }, select: { Id: true } });
            return user?.Id ?? null;
        } catch {
            return null;
        }
    }

    private static async resolveUserIdFromBill(bill: VindiBill | null | undefined): Promise<string | null> {
        const codigoFatura = bill?.id ? String(bill.id) : null;
        const customerId = bill?.customer?.id ? String(bill.customer.id) : null;

        if (codigoFatura) {
            const f = await prisma.fatura.findFirst({ where: { CodigoFatura: codigoFatura } });
            if (f) {
                const fin = await prisma.financeiro.findFirst({ where: { FaturaId: f.Id } });
                if (fin?.UserId) return fin.UserId;
            }
        }

        if (customerId) {
            return await this.resolveUserIdByCustomerId(customerId);
        }
        return null;
    }

    private static async notifyUser(userId: string | null, title: string, message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') {
        try {
            // Usa serviço de batching para otimizar notificações
            const { getWebSocketNotificationBatchService } = require('./websocketNotificationBatch.service');
            const ws = getWebSocketNotificationBatchService();
            const notifier = new NotificationService(ws);
            await notifier.sendNotification({ userId: userId ?? undefined, title, message, type });
        } catch (err) {
            console.warn('Falha ao enviar notificação:', title, err);
        }
    }
    private static toJsonMetadata(value: unknown): Prisma.InputJsonValue | undefined {
        if (value === undefined) return undefined;
        try {
            // Serializa para garantir compatibilidade com campo JSON do Prisma
            return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
        } catch (err) {
            console.warn('[Webhook] Falha ao normalizar metadata para JSON:', err);
            return undefined;
        }
    }

    private static async audit(params: { eventType: string; status: string; message?: string; userId?: string | null; paymentId?: string | null; amount?: number | null; cardLast4?: string | null; metadata?: unknown; }): Promise<void> {
        const { eventType, status, message, userId, paymentId, amount, cardLast4, metadata } = params;
        const normalizedMetadata = this.toJsonMetadata(metadata ?? undefined);
        try {
            await prisma.paymentAudit.create({
                data: {
                    eventType,
                    status,
                    message,
                    userId: userId ?? undefined,
                    paymentId: paymentId ?? undefined,
                    amount: amount ?? null,
                    cardLast4: cardLast4 ?? undefined,
                    metadata: normalizedMetadata,
                },
            });
        } catch (e) {
            console.warn('Falha ao gravar PaymentAudit:', eventType, e);
        }
    }
    static async processEvent(event: VindiWebhookPayload | VindiWebhookEvent | Record<string, unknown>) {
        // Função auxiliar para extrair tipo do evento
        const extractEventType = (evt: unknown): string => {
            if (typeof evt !== 'object' || evt === null) return 'unknown';
            const obj = evt as Record<string, unknown>;
            if (typeof obj.type === 'string') return obj.type;
            if (typeof obj.eventType === 'string') return obj.eventType;
            if (typeof obj.event === 'object' && obj.event !== null) {
                const eventObj = obj.event as Record<string, unknown>;
                if (typeof eventObj.type === 'string') return eventObj.type;
            }
            return 'unknown';
        };

        console.log('🔍 [Webhook] processEvent: INICIANDO', {
            eventType: extractEventType(event),
            hasEvent: typeof event === 'object' && event !== null && 'event' in event,
            hasPayload: typeof event === 'object' && event !== null && 'payload' in event,
            keys: typeof event === 'object' && event !== null ? Object.keys(event) : [],
            eventStructure: typeof event === 'object' && event !== null ? JSON.stringify(event, null, 2).substring(0, 500) : 'not an object'
        });

        // Normaliza forma do payload: aceita diferentes estruturas
        // 1. { event: { type, created_at, data } } - estrutura da Vindi
        // 2. { type, created_at, data } - estrutura direta
        // 3. { payload: { ... } } - estrutura com payload
        let e: VindiWebhookPayload | Record<string, unknown>;
        let type: string;
        let created_at: string | undefined;
        let data: VindiWebhookPayload['data'];

        if (event && typeof event === 'object' && event !== null) {
            const eventRecord = event as Record<string, unknown>;

            // Caso 1: { event: { type, created_at, data } } - estrutura da Vindi
            if ('event' in eventRecord && eventRecord.event && typeof eventRecord.event === 'object' && eventRecord.event !== null) {
                console.log('🔍 [Webhook] processEvent: Estrutura detectada: { event: {...} }');
                const eventObj = eventRecord.event as Record<string, unknown>;
                e = eventObj as VindiWebhookPayload;
                type = typeof eventObj.type === 'string' ? eventObj.type :
                    typeof eventObj.eventType === 'string' ? eventObj.eventType : 'unknown';
                created_at = typeof eventObj.created_at === 'string' ? eventObj.created_at :
                    typeof eventObj.createdAt === 'string' ? eventObj.createdAt : undefined;
                // Data pode estar em event.data ou event.event.data
                const eventData = eventObj.data as VindiWebhookPayload['data'] | undefined;
                const rootData = eventRecord.data as VindiWebhookPayload['data'] | undefined;
                data = eventData || rootData || {};
            }
            // Caso 2: { payload: { ... } } - estrutura com payload wrapper
            else if ('payload' in eventRecord && eventRecord.payload && typeof eventRecord.payload === 'object' && eventRecord.payload !== null) {
                console.log('🔍 [Webhook] processEvent: Estrutura detectada: { payload: {...} }');
                const payloadObj = eventRecord.payload as Record<string, unknown>;
                // Pode ter event dentro do payload: { payload: { event: {...} } }
                if (payloadObj.event && typeof payloadObj.event === 'object' && payloadObj.event !== null) {
                    console.log('🔍 [Webhook] processEvent: Payload contém event interno');
                    const eventObj = payloadObj.event as Record<string, unknown>;
                    e = eventObj as VindiWebhookPayload;
                    type = typeof eventObj.type === 'string' ? eventObj.type :
                        typeof eventObj.eventType === 'string' ? eventObj.eventType : 'unknown';
                    created_at = typeof eventObj.created_at === 'string' ? eventObj.created_at :
                        typeof eventObj.createdAt === 'string' ? eventObj.createdAt : undefined;
                    const eventData = eventObj.data as VindiWebhookPayload['data'] | undefined;
                    const payloadData = payloadObj.data as VindiWebhookPayload['data'] | undefined;
                    data = eventData || payloadData || {};
                } else {
                    e = payloadObj as VindiWebhookPayload;
                    type = typeof payloadObj.type === 'string' ? payloadObj.type :
                        typeof payloadObj.eventType === 'string' ? payloadObj.eventType : 'unknown';
                    created_at = typeof payloadObj.created_at === 'string' ? payloadObj.created_at :
                        typeof payloadObj.createdAt === 'string' ? payloadObj.createdAt : undefined;
                    data = (payloadObj.data as VindiWebhookPayload['data']) || {};
                }
            }
            // Caso 3: { type, created_at, data } - estrutura direta
            else {
                console.log('🔍 [Webhook] processEvent: Estrutura detectada: direta { type, data }');
                e = event as VindiWebhookPayload;
                type = typeof e.type === 'string' ? e.type :
                    typeof (e as Record<string, unknown>).eventType === 'string' ? (e as Record<string, unknown>).eventType as string : 'unknown';
                created_at = typeof e.created_at === 'string' ? e.created_at :
                    typeof (e as Record<string, unknown>).createdAt === 'string' ? (e as Record<string, unknown>).createdAt as string : undefined;
                data = e.data || {};
            }
        } else {
            console.error('❌ [Webhook] processEvent: Event não é um objeto válido', { event });
            e = {};
            type = 'unknown';
            created_at = undefined;
            data = {};
        }

        const createdAt = created_at || new Date().toISOString();

        console.log('🔍 [Webhook] processEvent: Evento normalizado', {
            type,
            createdAt,
            hasData: !!data,
            dataKeys: data && typeof data === 'object' ? Object.keys(data) : [],
            dataStructure: data && typeof data === 'object' ? JSON.stringify(data, null, 2).substring(0, 500) : 'no data'
        });

        console.log('🔍 [Webhook] processEvent: Processando evento', {
            type,
            createdAt,
            hasSubscription: !!data?.subscription,
            hasBill: !!data?.bill,
            hasCharge: !!data?.charge,
            hasInvoice: !!data?.invoice,
            billId: data?.bill?.id,
            subscriptionId: data?.subscription?.id,
            invoiceId: data?.invoice?.id
        });

        switch (type) {
            case "subscription_canceled":
                console.log('🔍 [Webhook] processEvent: subscription_canceled detectado');
                if (data?.subscription) {
                    await this.handleSubscriptionCanceled(data.subscription as VindiSubscription, createdAt);
                }
                break;
            case "subscription_created":
                if (data?.subscription) {
                    await this.handleSubscriptionCreated(data.subscription as VindiSubscription, createdAt);
                }
                break;
            case "subscription_reactivated":
                if (data?.subscription) {
                    await this.handleSubscriptionReactivated(data.subscription as VindiSubscription, createdAt);
                }
                break;
            case "charge_created":
                if (data?.charge) {
                    await this.handleChargeCreated(data.charge as VindiCharge, createdAt);
                }
                break;
            case "charge_refunded":
                if (data?.charge) {
                    await this.handleChargeRefunded(data.charge as VindiCharge, createdAt);
                }
                break;
            case "charge_canceled":
                if (data?.charge) {
                    await this.handleChargeCanceled(data.charge as VindiCharge, createdAt);
                }
                break;
            case "charge_rejected":
                if (data?.charge) {
                    await this.handleChargeRejected(data.charge as VindiCharge, createdAt);
                }
                break;
            case "bill_created":
                if (data?.bill) {
                    await this.handleBillCreated(data.bill as VindiBill, createdAt);
                }
                break;
            case "bill_paid":
                console.log('🔍 [Webhook] processEvent: bill_paid detectado', {
                    billId: data?.bill?.id,
                    customerId: data?.bill?.customer?.id,
                    amount: data?.bill?.amount,
                    status: data?.bill?.status,
                    hasBill: !!data?.bill,
                    dataKeys: data && typeof data === 'object' ? Object.keys(data) : []
                });
                if (data?.bill) {
                    console.log('✅ [Webhook] processEvent: Chamando handleBillPaid...');
                    await this.handleBillPaid(data.bill as VindiBill, createdAt);
                    console.log('✅ [Webhook] processEvent: handleBillPaid concluído');
                } else {
                    console.error('❌ [Webhook] processEvent: bill_paid sem data.bill', {
                        data,
                        dataKeys: data && typeof data === 'object' ? Object.keys(data) : [],
                        dataStructure: data && typeof data === 'object' ? JSON.stringify(data, null, 2).substring(0, 1000) : 'no data'
                    });
                }
                break;
            case "bill_canceled":
                if (data?.bill) {
                    await this.handleBillCanceled(data.bill as VindiBill, createdAt);
                }
                break;
            case "bill_seen":
                if (data?.bill) {
                    await this.handleBillSeen(data.bill as VindiBill, createdAt);
                }
                break;
            case "period_created":
                if (data?.period) {
                    await this.handlePeriodCreated(data.period as VindiPeriod, createdAt);
                }
                break;
            case "issue_created":
                if (data?.issue) {
                    await this.handleIssueCreated(data.issue as VindiIssue, createdAt);
                }
                break;
            case "payment_profile_created":
                if (data?.payment_profile) {
                    await this.handlePaymentProfileCreated(data.payment_profile as VindiPaymentProfile, createdAt);
                }
                break;
            case "message_seen":
                if (data?.message) {
                    await this.handleMessageSeen(data.message as VindiMessage, createdAt);
                }
                break;
            case "invoice_issued":
                if (data?.invoice) {
                    await this.handleInvoiceIssued(data.invoice as VindiInvoice, createdAt);
                }
                break;
            case "payment_profile_renewed":
                if (data?.payment_profile) {
                    await this.handlePaymentProfileRenewed(data.payment_profile as VindiPaymentProfile, createdAt);
                }
                break;
            case "subscription_charged":
                if (data?.subscription && data?.bill) {
                    await this.handleSubscriptionCharged(data.subscription as VindiSubscription, data.bill as VindiBill, createdAt);
                }
                break;
            case "invoice_charged":
                if (data?.invoice && data?.bill) {
                    await this.handleInvoiceCharged(data.invoice as VindiInvoice, data.bill as VindiBill, createdAt);
                }
                break;
            default:
                console.warn("⚠️ [Webhook] processEvent: Evento não tratado", {
                    type,
                    hasData: !!data,
                    dataKeys: data && typeof data === 'object' ? Object.keys(data) : []
                });
        }

        console.log('✅ [Webhook] processEvent: CONCLUÍDO', {
            type,
            timestamp: new Date().toISOString()
        });
    }
    static handleBillCanceled(bill: VindiBill, created_at: string | undefined) {
        return (async () => {
            const codigoFatura = String(bill?.id || '');
            const userId = await this.resolveUserIdFromBill(bill);
            await Promise.all([
                prisma.fatura.updateMany({ where: { CodigoFatura: codigoFatura }, data: { Status: FaturaStatus.Canceled } }),
                prisma.financeiro.updateMany({ where: { Fatura: { CodigoFatura: codigoFatura } }, data: { Status: ControleFinanceiroStatus.Cancelado } })
            ]);
            // Notificações: agora restritas a Assinatura Criada e Pagamento Aprovado.
            const billAmount = typeof bill?.amount === 'number' ? bill.amount : (bill?.amount ? Number(bill.amount) : null);
            await this.audit({
                eventType: 'bill_canceled',
                status: 'SUCCESS',
                message: 'Fatura cancelada',
                userId,
                paymentId: codigoFatura,
                amount: billAmount,
                metadata: bill
            });
        })();
    }

    // Métodos para cada evento (implemente a lógica conforme necessário)
    static async handleSubscriptionCanceled(subscription: VindiSubscription, createdAt: string) {
        const customerId = subscription?.customer?.id ?? subscription?.customer_id;
        const subscriptionId = subscription?.id ? String(subscription.id) : null;
        const userId = await this.resolveUserIdByCustomerId(customerId);

        if (userId && subscriptionId) {
            // IMPORTANTE: Só cancela a assinatura específica que corresponde ao VindiSubscriptionId
            // Evita cancelar assinaturas novas que foram criadas após o cancelamento
            const assinaturaParaCancelar = await prisma.assinaturaPlano.findFirst({
                where: {
                    UserId: userId,
                    VindiSubscriptionId: subscriptionId,
                    Status: { in: [PlanoCompraStatus.Ativo, PlanoCompraStatus.AguardandoPagamento] }
                }
            });

            if (assinaturaParaCancelar) {
                console.log(`[Webhook] handleSubscriptionCanceled: Cancelando assinatura específica ${assinaturaParaCancelar.Id} (VindiSubscriptionId: ${subscriptionId})`);
                await Promise.all([
                    prisma.assinaturaPlano.updateMany({
                        where: {
                            Id: assinaturaParaCancelar.Id,
                            VindiSubscriptionId: subscriptionId
                        },
                        data: { Status: PlanoCompraStatus.Cancelado, DataFim: new Date() }
                    }),
                    prisma.controleConsultaMensal.updateMany({
                        where: {
                            UserId: userId,
                            AssinaturaPlanoId: assinaturaParaCancelar.Id,
                            Status: { in: [ControleConsultaMensalStatus.Ativo, ControleConsultaMensalStatus.AguardandoPagamento] }
                        },
                        data: { Status: ControleConsultaMensalStatus.Cancelado }
                    }),
                    prisma.financeiro.updateMany({
                        where: {
                            UserId: userId,
                            Status: ControleFinanceiroStatus.AguardandoPagamento,
                            PlanoAssinaturaId: assinaturaParaCancelar.PlanoAssinaturaId
                        },
                        data: { Status: ControleFinanceiroStatus.Cancelado }
                    })
                ]);
            } else {
                console.warn(`[Webhook] handleSubscriptionCanceled: Assinatura com VindiSubscriptionId ${subscriptionId} não encontrada ou já cancelada para userId ${userId}`);
            }
        } else {
            console.error(`[Webhook] handleSubscriptionCanceled: userId ou subscriptionId ausente`, { userId, subscriptionId });
        }
        // Notificações: agora restritas a Assinatura Criada e Pagamento Aprovado.
        await this.audit({
            eventType: 'subscription_canceled',
            status: 'SUCCESS',
            message: 'Assinatura cancelada',
            userId,
            paymentId: String(subscription?.id ?? ''),
            metadata: subscription
        });
    }
    static async handleSubscriptionCreated(subscription: VindiSubscription, createdAt: string) {
        const customerId = subscription?.customer?.id ?? subscription?.customer_id;
        const userId = await this.resolveUserIdByCustomerId(customerId);
        await this.notifyUser(userId, 'Assinatura criada', 'Sua assinatura foi criada e está aguardando confirmação de pagamento.', 'info');
        await this.audit({ eventType: 'subscription_created', status: 'SUCCESS', message: 'Assinatura criada', userId, paymentId: String(subscription?.id ?? ''), metadata: subscription });
    }
    static async handleSubscriptionReactivated(subscription: VindiSubscription, createdAt: string) {
        const customerId = subscription?.customer?.id ?? subscription?.customer_id;
        const userId = await this.resolveUserIdByCustomerId(customerId);
        if (userId) {
            await Promise.all([
                prisma.assinaturaPlano.updateMany({ where: { UserId: userId }, data: { Status: PlanoCompraStatus.Ativo } }),
                prisma.controleConsultaMensal.updateMany({ where: { UserId: userId }, data: { Status: ControleConsultaMensalStatus.Ativo } })
            ]);
        }
        // Notificações: agora restritas a Assinatura Criada e Pagamento Aprovado.
        await this.audit({
            eventType: 'subscription_reactivated',
            status: 'SUCCESS',
            message: 'Assinatura reativada',
            userId,
            paymentId: String(subscription?.id ?? ''),
            metadata: subscription
        });
    }
    static async handleChargeCreated(charge: VindiCharge, createdAt: string) {
        const billId = charge?.bill?.id ?? charge?.invoice?.id;
        let userId: string | null = null;
        if (charge?.customer?.id) {
            userId = await this.resolveUserIdByCustomerId(charge.customer.id);
        }
        if (billId) {
            await prisma.fatura.updateMany({ where: { CodigoFatura: String(billId) }, data: { Status: FaturaStatus.Pending } });
        }
        // Notificações: agora restritas a Assinatura Criada e Pagamento Aprovado.
        const chargeAmountCreated = typeof charge?.amount === 'number' ? charge.amount : (charge?.amount ? Number(charge.amount) : null);
        await this.audit({
            eventType: 'charge_created',
            status: 'SUCCESS',
            message: 'Cobrança criada',
            userId,
            paymentId: String(charge?.id ?? billId ?? ''),
            amount: chargeAmountCreated,
            metadata: charge
        });
    }
    static async handleChargeRefunded(charge: VindiCharge, createdAt: string) {
        const billId = charge?.bill?.id ?? charge?.invoice?.id;
        const userId = await this.resolveUserIdByCustomerId(charge?.customer?.id);
        const amount = typeof charge?.amount === 'number' ? charge.amount : (charge?.amount ? Number(charge.amount) : null);

        await Promise.all([
            prisma.fatura.updateMany({ where: { CodigoFatura: String(billId || '') }, data: { Status: FaturaStatus.Failed } }),
            prisma.financeiro.updateMany({ where: { Fatura: { CodigoFatura: String(billId || '') } }, data: { Status: ControleFinanceiroStatus.Reprovado } })
        ]);

        // Registra auditoria usando AdminActionLog
        try {
            const { logPaymentError } = await import('../utils/auditLogger.util');
            if (userId && amount !== null) {
                await logPaymentError(
                    userId,
                    'outro',
                    amount / 100, // Vindi trabalha com centavos
                    'Pagamento estornado',
                    {
                        chargeId: String(charge?.id ?? billId ?? ''),
                        billId: String(billId || ''),
                        evento: 'charge_refunded',
                    },
                    undefined // IP não disponível em webhooks
                );
            }
        } catch (auditError) {
            console.error('[WebhookService] Erro ao registrar auditoria de charge_refunded:', auditError);
        }

        // Mantém o método audit antigo para compatibilidade
        await this.audit({
            eventType: 'charge_refunded',
            status: 'SUCCESS',
            message: 'Pagamento estornado',
            userId,
            paymentId: String(charge?.id ?? billId ?? ''),
            amount,
            metadata: charge as Prisma.InputJsonValue
        });
    }
    static async handleChargeCanceled(charge: VindiCharge, createdAt: string) {
        const billId = charge?.bill?.id ?? charge?.invoice?.id;
        const userId = await this.resolveUserIdByCustomerId(charge?.customer?.id);
        const amount = typeof charge?.amount === 'number' ? charge.amount : (charge?.amount ? Number(charge.amount) : null);

        await Promise.all([
            prisma.fatura.updateMany({ where: { CodigoFatura: String(billId || '') }, data: { Status: FaturaStatus.Canceled } }),
            prisma.financeiro.updateMany({ where: { Fatura: { CodigoFatura: String(billId || '') } }, data: { Status: ControleFinanceiroStatus.Cancelado } })
        ]);

        // Registra auditoria usando AdminActionLog
        try {
            const { logPaymentError } = await import('../utils/auditLogger.util');
            if (userId && amount !== null) {
                await logPaymentError(
                    userId,
                    'outro',
                    amount / 100, // Vindi trabalha com centavos
                    'Cobrança cancelada',
                    {
                        chargeId: String(charge?.id ?? billId ?? ''),
                        billId: String(billId || ''),
                        evento: 'charge_canceled',
                    },
                    undefined // IP não disponível em webhooks
                );
            }
        } catch (auditError) {
            console.error('[WebhookService] Erro ao registrar auditoria de charge_canceled:', auditError);
        }

        // Mantém o método audit antigo para compatibilidade
        await this.audit({
            eventType: 'charge_canceled',
            status: 'SUCCESS',
            message: 'Cobrança cancelada',
            userId,
            paymentId: String(charge?.id ?? billId ?? ''),
            amount,
            metadata: charge
        });
    }
    static async handleChargeRejected(charge: VindiCharge, createdAt: string) {
        const billId = charge?.bill?.id ?? charge?.invoice?.id;
        const userId = await this.resolveUserIdByCustomerId(charge?.customer?.id);
        const amount = typeof charge?.amount === 'number' ? charge.amount : (charge?.amount ? Number(charge.amount) : null);
        const errorMessage = charge?.last_transaction?.gateway_message || charge?.gateway_message || 'Pagamento rejeitado';

        await Promise.all([
            prisma.fatura.updateMany({ where: { CodigoFatura: String(billId || '') }, data: { Status: FaturaStatus.Failed } }),
            prisma.financeiro.updateMany({ where: { Fatura: { CodigoFatura: String(billId || '') } }, data: { Status: ControleFinanceiroStatus.Reprovado } })
        ]);

        // Registra auditoria usando AdminActionLog
        try {
            const { logPaymentError } = await import('../utils/auditLogger.util');
            if (userId && amount !== null) {
                await logPaymentError(
                    userId,
                    'outro',
                    amount / 100, // Vindi trabalha com centavos
                    errorMessage,
                    {
                        chargeId: String(charge?.id ?? billId ?? ''),
                        billId: String(billId || ''),
                        gatewayResponse: charge?.last_transaction?.gateway_response_fields,
                    },
                    undefined // IP não disponível em webhooks
                );
            }
        } catch (auditError) {
            console.error('[WebhookService] Erro ao registrar auditoria de charge_rejected:', auditError);
        }

        // Mantém o método audit antigo para compatibilidade
        await this.audit({
            eventType: 'charge_rejected',
            status: 'SUCCESS',
            message: 'Pagamento rejeitado',
            userId,
            paymentId: String(charge?.id ?? billId ?? ''),
            amount,
            metadata: charge
        });
    }
    static async waitForFatura(
        customerId: string,
        tentativas = 20,
        delayMs = 200,
        opts?: { createdAt?: string; status?: string; windowMinutes?: number }
    ) {
        const windowMinutes = opts?.windowMinutes ?? 60 * 24 * 30; // 30 dias por padrão
        const evtDate = opts?.createdAt ? new Date(opts.createdAt) : null;

        for (let i = 0; i < tentativas; i++) {
            const where: Prisma.FaturaWhereInput = { CustomerId: customerId };
            if (opts?.status) {
                // Converte string para enum FaturaStatus
                const statusMap: Record<string, FaturaStatus> = {
                    'Pending': FaturaStatus.Pending,
                    'Paid': FaturaStatus.Paid,
                    'Canceled': FaturaStatus.Canceled,
                    'Failed': FaturaStatus.Failed,
                };
                where.Status = statusMap[opts.status] || FaturaStatus.Pending;
            }
            if (evtDate) {
                const min = new Date(evtDate.getTime() - windowMinutes * 60 * 1000);
                const max = new Date(evtDate.getTime() + windowMinutes * 60 * 1000);
                where.CreatedAt = { gte: min, lte: max };
            }

            const fatura = await prisma.fatura.findFirst({
                where,
                orderBy: { CreatedAt: 'desc' }
            });
            if (fatura) return fatura;
            await new Promise(res => setTimeout(res, delayMs));
        }
        return null;
    }

    /**
     * Aguarda tanto a Fatura quanto o Financeiro estarem criados no banco
     * Isso garante que todos os dados necessários estejam disponíveis antes de processar o webhook
     * Aumentado tentativas e tempo para garantir que registros sejam encontrados mesmo quando criados após o webhook
     */
    static async waitForFaturaAndFinanceiro(
        customerId: string,
        codigoFatura: string | null,
        tentativas = 6, // Reduzido para 6 tentativas (600ms no total)
        delayMs = 100, // Reduzido para 100ms entre tentativas
        opts?: { createdAt?: string; status?: string; windowMinutes?: number }
    ): Promise<{ fatura: Prisma.FaturaGetPayload<{}>; financeiro: Prisma.FinanceiroGetPayload<{}> } | null> {
        const windowMinutes = opts?.windowMinutes ?? 60 * 24 * 30;
        const evtDate = opts?.createdAt ? new Date(opts.createdAt) : null;
        const maxWaitTime = 3000; // Timeout máximo de 3 segundos
        const startTime = Date.now();

        // Primeira tentativa imediata (sem delay)
        for (let i = 0; i < tentativas; i++) {
            // Verifica timeout
            if (Date.now() - startTime > maxWaitTime) {
                console.warn(`[Webhook] Timeout ao aguardar Fatura e Financeiro após ${maxWaitTime}ms`);
                break;
            }
            // Primeiro, tenta encontrar a fatura pelo CodigoFatura (mais preciso)
            let fatura: Prisma.FaturaGetPayload<{}> | null = null;
            if (codigoFatura) {
                fatura = await prisma.fatura.findFirst({
                    where: { CodigoFatura: codigoFatura }
                });
            }

            // Se não encontrou pelo CodigoFatura, busca por CustomerId
            // Também busca faturas sem CodigoFatura preenchido (pendentes de atualização)
            if (!fatura) {
                const where: Prisma.FaturaWhereInput = {
                    CustomerId: customerId,
                    OR: [
                        { CodigoFatura: null },
                        { CodigoFatura: '' },
                        { CodigoFatura: codigoFatura }
                    ]
                };
                if (opts?.status) {
                    // Converte string para enum FaturaStatus
                    const statusMap: Record<string, FaturaStatus> = {
                        'Pending': FaturaStatus.Pending,
                        'Paid': FaturaStatus.Paid,
                        'Canceled': FaturaStatus.Canceled,
                        'Failed': FaturaStatus.Failed,
                    };
                    where.Status = statusMap[opts.status] || FaturaStatus.Pending;
                }
                if (evtDate) {
                    const min = new Date(evtDate.getTime() - windowMinutes * 60 * 1000);
                    const max = new Date(evtDate.getTime() + windowMinutes * 60 * 1000);
                    where.CreatedAt = { gte: min, lte: max };
                }

                fatura = await prisma.fatura.findFirst({
                    where,
                    orderBy: { CreatedAt: 'desc' }
                });
            }

            // Se encontrou a fatura, verifica se o Financeiro existe
            if (fatura) {
                // Busca financeiro pela FaturaId (mais direto)
                let financeiro = await prisma.financeiro.findFirst({
                    where: { FaturaId: fatura.Id.toString() }
                });

                // Se não encontrou pela FaturaId, busca pelo CodigoFatura via relacionamento com Fatura
                // Isso evita duplicação se o Financeiro foi criado antes da Fatura ter CodigoFatura
                if (!financeiro && codigoFatura) {
                    financeiro = await prisma.financeiro.findFirst({
                        where: {
                            Fatura: {
                                CodigoFatura: codigoFatura
                            }
                        }
                    });
                }

                // Se ainda não encontrou pela FaturaId ou CodigoFatura, tenta buscar pelo UserId e Tipo
                // Primeiro busca financeiros sem FaturaId (mais provável de ser o correto)
                if (!financeiro && fatura.UserId) {
                    financeiro = await prisma.financeiro.findFirst({
                        where: {
                            UserId: fatura.UserId,
                            Status: (opts?.status as ControleFinanceiroStatus | undefined) || ControleFinanceiroStatus.AguardandoPagamento,
                            FaturaId: null // Prefere financeiros sem FaturaId vinculado
                        },
                        orderBy: { CreatedAt: 'desc' }
                    });
                }

                // Se encontrou um financeiro sem FaturaId, atualiza o FaturaId para vincular à fatura
                if (financeiro && (!financeiro.FaturaId || financeiro.FaturaId !== fatura.Id.toString())) {
                    financeiro = await prisma.financeiro.update({
                        where: { Id: financeiro.Id },
                        data: { FaturaId: fatura.Id.toString() }
                    });
                }

                // Se ambos existem, retorna
                if (financeiro && fatura) {
                    return {
                        fatura: fatura as Prisma.FaturaGetPayload<{}>,
                        financeiro: financeiro as Prisma.FinanceiroGetPayload<{}>
                    };
                }
            }

            // Aguarda antes da próxima tentativa (exceto na primeira)
            if (i < tentativas - 1) {
                await new Promise(res => setTimeout(res, delayMs));
            }
        }

        return null;
    }

    static async handleBillCreated(bill: VindiBill, createdAt: string) {
        // Padronizado: deixamos as tentativas para o BullMQ (delay + backoff). Aqui só validamos pré-condições
        const codigoFatura = String(bill?.id ?? '');
        const customerId = bill?.customer?.id ? String(bill.customer.id) : null;
        if (!codigoFatura) {
            throw new Error('Bill sem id; re-tentar');
        }

        // Verifica se a fatura já foi registrada no sistema; se ainda não, lança para retry
        const existeFatura = await prisma.fatura.findFirst({
            where: { CodigoFatura: codigoFatura }
        });

        if (!existeFatura) {
            // Tenta localizar fatura do cliente pendente (sem CodigoFatura) pela janela temporal do evento
            if (!customerId) {
                console.log('Fatura ainda não está no banco e não há customerId; re-tentará mais tarde:', { codigoFatura, createdAt });
                throw new Error('Fatura ainda não criada no banco; re-tentar');
            }

            const candidatas = await prisma.fatura.findMany({
                where: {
                    CustomerId: customerId,
                    Status: 'Pending',
                    OR: [
                        { CodigoFatura: null },
                        { CodigoFatura: '' }
                    ]
                },
                orderBy: { CreatedAt: 'desc' },
                take: 5
            });

            if (!candidatas || candidatas.length === 0) {
                console.log('Fatura ainda não está no banco (sem candidatas pendentes). Re-tentará mais tarde:', { codigoFatura, customerId, createdAt });
                throw new Error('Fatura ainda não criada no banco; re-tentar');
            }

            // Seleciona a mais próxima do horário do evento
            let escolhida = candidatas[0];
            if (createdAt) {
                const evtTime = new Date(createdAt).getTime();
                escolhida = candidatas.reduce((best, cur) => {
                    const bestDiff = Math.abs(new Date(best.CreatedAt).getTime() - evtTime);
                    const curDiff = Math.abs(new Date(cur.CreatedAt).getTime() - evtTime);
                    return curDiff < bestDiff ? cur : best;
                }, escolhida);
            }

            // Calcula DataVencimento mensal se for tipo Plano (30 dias)
            const tipoFatura = escolhida.Tipo;
            let dataVencimentoMensal: Date | undefined;
            if (tipoFatura === TipoFatura.Plano) {
                const evtDate = createdAt ? new Date(createdAt) : new Date();
                dataVencimentoMensal = new Date(evtDate);
                dataVencimentoMensal.setDate(dataVencimentoMensal.getDate() + 30); // 30 dias para cobrança mensal
            }

            // Usa updateMany para evitar exceção P2025 e tratamos pelo count
            const result = await prisma.fatura.updateMany({
                where: { Id: String(escolhida.Id) },
                data: {
                    CodigoFatura: codigoFatura,
                    Status: 'Pending',
                    ...(dataVencimentoMensal ? { DataVencimento: dataVencimentoMensal } : {})
                }
            });

            if (result.count === 0) {
                // Em corrida extrema, a escolhida pode ter sido removida/trocada; delega ao retry
                throw new Error('Falha ao vincular fatura ao CodigoFatura; re-tentar');
            }
        }

        // Atualiza status e DataVencimento se necessário
        // Para planos, calcula DataVencimento mensal (30 dias) se não estiver definido
        const faturaExistente = await prisma.fatura.findFirst({
            where: { CodigoFatura: codigoFatura }
        });

        if (faturaExistente && faturaExistente.Tipo === TipoFatura.Plano) {
            // Se a fatura é de plano e não tem DataVencimento válida, calcula baseado na DataInicio
            if (!faturaExistente.DataVencimento || new Date(faturaExistente.DataVencimento) < new Date()) {
                const userIdFatura = faturaExistente.UserId;
                if (userIdFatura) {
                    const assinaturaPlano = await prisma.assinaturaPlano.findFirst({
                        where: {
                            UserId: userIdFatura,
                            Status: { in: [PlanoCompraStatus.Ativo, PlanoCompraStatus.AguardandoPagamento] }
                        },
                        orderBy: { DataInicio: 'asc' },
                        include: { Financeiro: { where: { Tipo: TipoFatura.Plano }, orderBy: { CreatedAt: 'asc' } } }
                    });

                    if (assinaturaPlano?.DataInicio) {
                        const numeroParcela = (assinaturaPlano.Financeiro?.length || 0) + 1;
                        const dataInicio = new Date(assinaturaPlano.DataInicio);
                        const dataVencimentoMensal = new Date(dataInicio);
                        // Calcula DataVencimento = DataInicio + (número da parcela) meses
                        // Primeira parcela: DataInicio + 1 mês, Segunda: DataInicio + 2 meses, etc.
                        dataVencimentoMensal.setMonth(dataVencimentoMensal.getMonth() + numeroParcela);
                        // Garante que o dia seja o mesmo da assinatura (mantém dia do mês)
                        const diaInicio = dataInicio.getDate();
                        dataVencimentoMensal.setDate(diaInicio);

                        await prisma.fatura.updateMany({
                            where: { CodigoFatura: codigoFatura },
                            data: {
                                Status: 'Pending',
                                DataVencimento: dataVencimentoMensal
                            }
                        });
                    } else {
                        await prisma.fatura.updateMany({
                            where: { CodigoFatura: codigoFatura },
                            data: { Status: 'Pending' }
                        });
                    }
                } else {
                    await prisma.fatura.updateMany({
                        where: { CodigoFatura: codigoFatura },
                        data: { Status: 'Pending' }
                    });
                }
            } else {
                await prisma.fatura.updateMany({
                    where: { CodigoFatura: codigoFatura },
                    data: { Status: 'Pending' }
                });
            }
        } else {
            await prisma.fatura.updateMany({
                where: { CodigoFatura: codigoFatura },
                data: { Status: 'Pending' }
            });
        }

        // Registra auditoria e cria/atualiza Transaction com dados de PIX, se houver
        try {
            const userId = await this.resolveUserIdFromBill(bill);
            const faturaPend = await prisma.fatura.findFirst({ where: { CodigoFatura: codigoFatura } });
            const billAmount = faturaPend?.Valor ?? (typeof bill?.amount === 'number' ? bill.amount : (bill?.amount ? Number(bill.amount) : null)) ?? null;
            await this.audit({
                eventType: 'bill_created',
                status: 'SUCCESS',
                message: 'Fatura criada',
                userId,
                paymentId: codigoFatura,
                amount: billAmount,
                metadata: (bill as unknown) as Prisma.InputJsonValue
            });

            // Persistência em Transaction (evita duplicidade por VindiBillId)
            const vindiBillIdNum = Number(bill?.id ?? bill?.bill_id ?? 0) || 0;
            const lastTx = bill?.charges?.[0]?.last_transaction;
            const qrCode = lastTx?.gateway_response_fields?.qrcode_path || bill?.pix?.qr_code || '';
            const qrCodeText = lastTx?.gateway_response_fields?.qrcode_original_path || bill?.pix?.qr_code_text || '';
            const amount = (typeof bill?.amount === 'number' ? bill.amount : Number(bill?.amount)) || faturaPend?.Valor || 0;
            const customerId = bill?.customer?.id ? String(bill.customer.id) : faturaPend?.CustomerId || '';
            const statusString = bill?.status || 'Pending';
            const status = statusString === 'Paid' ? FaturaStatus.Paid :
                statusString === 'Pending' ? FaturaStatus.Pending :
                    statusString === 'Canceled' ? FaturaStatus.Canceled :
                        statusString === 'Failed' ? FaturaStatus.Failed :
                            FaturaStatus.Pending;

            if (vindiBillIdNum) {
                const existing = await prisma.transaction.findFirst({ where: { VindiBillId: vindiBillIdNum } });
                if (existing) {
                    await prisma.transaction.update({
                        where: { Id: existing.Id },
                        data: { Amount: amount, Status: status, QrCode: qrCode, QrCodeText: qrCodeText, CustomerId: customerId }
                    });
                } else {
                    await prisma.transaction.create({
                        data: {
                            VindiBillId: vindiBillIdNum,
                            Amount: amount,
                            Status: status,
                            QrCode: qrCode,
                            QrCodeText: qrCodeText,
                            CustomerId: customerId,
                            CreatedAt: bill?.created_at ? new Date(bill.created_at) : new Date()
                        }
                    });
                }
            }
        } catch (notifyErr) {
            console.warn('Falha ao processar auditoria/transaction em bill_created (prosseguindo):', notifyErr);
        }

        console.log('handleBillCreated concluído (fatura já existe).');
    }
    static async handleBillPaid(bill: VindiBill, createdAt: string) {
        const startTime = Date.now();
        console.log('🚀 [Webhook] handleBillPaid: INICIANDO processamento otimizado', {
            createdAt,
            codigoFatura: bill?.id,
            billId: bill?.id,
            customerId: bill?.customer?.id,
            amount: bill?.amount,
            status: bill?.status,
            timestamp: new Date().toISOString()
        });

        try {
            // 1️⃣ PROCESSAMENTO RÁPIDO: Libera consultas imediatamente
            console.log('🔍 [Webhook] handleBillPaid: Chamando _liberarConsultasRapido...');
            const resultadoRapido = await this._liberarConsultasRapido(bill, createdAt);
            console.log('🔍 [Webhook] handleBillPaid: Resultado do processamento rápido', {
                success: resultadoRapido.success,
                hasData: !!resultadoRapido.data,
                error: resultadoRapido.error,
                codigoFatura: resultadoRapido.data?.codigoFatura,
                userId: resultadoRapido.data?.userId
            });

            if (!resultadoRapido.success) {
                console.warn('[Webhook] Processamento rápido falhou, tentando método completo:', resultadoRapido.error);
                // Fallback: usa método completo se o rápido falhar
                const ok = await this._atualizaFaturaEFinanceiro(bill, createdAt);
                if (!ok) {
                    throw new Error('Falha ao atualizar fatura/financeiro, solicitar retry');
                }
                return;
            }

            // 2️⃣ PROCESSAMENTO EM BACKGROUND: Enfileira tarefas não-críticas (não bloqueia resposta)
            if (resultadoRapido.data && resultadoRapido.data.fatura && resultadoRapido.data.financeiro) {
                // OTIMIZAÇÃO: Enfileira em vez de usar setImmediate para melhor controle
                this._enfileirarProcessamentoBackground(bill, {
                    fatura: resultadoRapido.data.fatura,
                    financeiro: resultadoRapido.data.financeiro,
                    userId: resultadoRapido.data.userId,
                    codigoFatura: resultadoRapido.data.codigoFatura
                }, createdAt).catch(err => {
                    console.error('[Webhook] Erro ao enfileirar processamento em background:', err);
                    // Fallback: usa setImmediate se não conseguir enfileirar
                    setImmediate(() => {
                        this._processarBackground(bill, {
                            fatura: resultadoRapido.data!.fatura,
                            financeiro: resultadoRapido.data!.financeiro,
                            userId: resultadoRapido.data!.userId,
                            codigoFatura: resultadoRapido.data!.codigoFatura
                        }, createdAt).catch(backgroundErr => {
                            console.error('[Webhook] Erro no processamento em background (fallback):', backgroundErr);
                        });
                    });
                });
            }

            const duration = Date.now() - startTime;
            console.log('✅ [Webhook] handleBillPaid: CONCLUÍDO com sucesso', {
                duracao: `${duration}ms`,
                codigoFatura: bill?.id,
                timestamp: new Date().toISOString()
            });
        } catch (error: unknown) {
            const err = error as { message?: string };
            const duration = Date.now() - startTime;
            console.error('❌ [Webhook] handleBillPaid: ERRO após processamento', {
                error: err?.message || String(error),
                stack: err instanceof Error ? err.stack : undefined,
                duracao: `${duration}ms`,
                codigoFatura: bill?.id,
                timestamp: new Date().toISOString()
            });
            // Em caso de erro, tenta o método completo como fallback
            const ok = await this._atualizaFaturaEFinanceiro(bill, createdAt);
            if (!ok) {
                throw new Error('Falha ao atualizar fatura/financeiro, solicitar retry');
            }
        }
    }
    static async handleBillSeen(bill: VindiBill, createdAt: string) {
        const userId = await this.resolveUserIdFromBill(bill);
        // Notificações: agora restritas a Assinatura Criada e Pagamento Aprovado.
        await this.audit({
            eventType: 'bill_seen',
            status: 'SUCCESS',
            message: 'Fatura visualizada',
            userId,
            paymentId: String(bill?.id ?? ''),
            metadata: (bill as unknown) as Prisma.InputJsonValue
        });
    }
    static async handlePeriodCreated(period: VindiPeriod, createdAt: string) {
        //  console.log('handlePeriodCreated:', { period, createdAt });
        // ...
    }
    static async handleIssueCreated(issue: VindiIssue, createdAt: string) {
        const userId = await this.resolveUserIdByCustomerId(issue?.customer?.id);
        // Notificações: agora restritas a Assinatura Criada e Pagamento Aprovado.
        await this.audit({
            eventType: 'issue_created',
            status: 'SUCCESS',
            message: 'Ocorrência registrada',
            userId,
            paymentId: String(issue?.id ?? ''),
            metadata: issue
        });
    }
    static async handlePaymentProfileCreated(paymentProfile: VindiPaymentProfile, createdAt: string) {
        const userId = await this.resolveUserIdByCustomerId(paymentProfile?.customer?.id);
        // Notificações: agora restritas a Assinatura Criada e Pagamento Aprovado.
        await this.audit({
            eventType: 'payment_profile_created',
            status: 'SUCCESS',
            message: 'Forma de pagamento adicionada',
            userId,
            paymentId: String(paymentProfile?.id ?? ''),
            metadata: paymentProfile
        });
    }
    static async handleMessageSeen(message: VindiMessage, createdAt: string) {
        const userId = await this.resolveUserIdByCustomerId(message?.customer?.id);
        // Notificações: agora restritas a Assinatura Criada e Pagamento Aprovado.
        await this.audit({ eventType: 'message_seen', status: 'SUCCESS', message: 'Mensagem visualizada', userId, paymentId: String(message?.id ?? ''), metadata: message });
    }
    static async handleInvoiceIssued(invoice: VindiInvoice, createdAt: string) {
        const userId = await this.resolveUserIdByCustomerId(invoice?.customer?.id);
        // Notificações: agora restritas a Assinatura Criada e Pagamento Aprovado.
        await this.audit({
            eventType: 'invoice_issued',
            status: 'SUCCESS',
            message: 'Nota fiscal emitida',
            userId,
            paymentId: String(invoice?.id ?? ''),
            metadata: invoice
        });
    }
    static async handlePaymentProfileRenewed(paymentProfile: VindiPaymentProfile, createdAt: string) {
        const userId = await this.resolveUserIdByCustomerId(paymentProfile?.customer?.id);
        // Notificações: agora restritas a Assinatura Criada e Pagamento Aprovado.
        await this.audit({
            eventType: 'payment_profile_renewed',
            status: 'SUCCESS',
            message: 'Forma de pagamento atualizada',
            userId,
            paymentId: String(paymentProfile?.id ?? ''),
            metadata: paymentProfile
        });
    }

    /**
     * Cria registros faltantes (Fatura e Financeiro) quando o webhook chega antes deles serem criados
     * Usa dados do bill da Vindi para preencher os campos necessários
     */
    private static async criarRegistrosFaltantes(
        bill: VindiBill,
        customerId: string,
        codigoFatura: string,
        userId: string | null
    ): Promise<{ fatura: Prisma.FaturaGetPayload<{}>; financeiro: Prisma.FinanceiroGetPayload<{}> } | null> {
        try {
            if (!userId) {
                console.error('[Webhook] Não é possível criar registros faltantes sem userId');
                return null;
            }

            // Busca detalhes do bill na Vindi para obter informações completas
            let billDetails = bill;
            try {
                if (bill?.id) {
                    billDetails = await VindiService.getBillById(Number(bill.id));
                }
            } catch (err) {
                console.warn('[Webhook] Erro ao buscar detalhes do bill na Vindi, usando dados do webhook:', err);
            }

            const valor = billDetails?.amount ?? bill?.amount ?? 0;
            let tipo = await this.determinarTipoFatura(billDetails, bill, userId);

            // ✅ DIFERENCIAÇÃO: Se o tipo determinado for PrimeiraConsulta ou ConsultaAvulsa,
            // verifica o PlanoAssinatura.Tipo para garantir que está correto
            // Se PlanoAssinatura.Tipo = "unico", deve ser ConsultaAvulsa (não PrimeiraConsulta)
            if ((tipo === TipoFatura.PrimeiraConsulta || tipo === TipoFatura.ConsultaAvulsa) && userId) {
                try {
                    // Busca o PlanoAssinatura relacionado ao bill através do product_id
                    const productId = billDetails?.product_items?.[0]?.product_id ||
                        (billDetails?.bill_items?.[0] as { product_id?: string | number })?.product_id ||
                        bill?.product_items?.[0]?.product_id ||
                        (bill?.bill_items?.[0] as { product_id?: string | number })?.product_id;

                    if (productId) {
                        const planoAssinatura = await prisma.planoAssinatura.findFirst({
                            where: { ProductId: String(productId) },
                            select: { Tipo: true, Id: true }
                        });

                        if (planoAssinatura?.Tipo) {
                            const tipoPlano = planoAssinatura.Tipo.toLowerCase();
                            console.log('[Webhook] criarRegistrosFaltantes: Verificando PlanoAssinatura.Tipo', {
                                productId,
                                tipoPlano,
                                tipoAtual: tipo,
                                planoId: planoAssinatura.Id
                            });

                            // Se o Tipo do plano for "unico", deve ser ConsultaAvulsa
                            if (tipoPlano === 'unico' || tipoPlano === 'único') {
                                tipo = TipoFatura.ConsultaAvulsa;
                                console.log('[Webhook] criarRegistrosFaltantes: Tipo ajustado para ConsultaAvulsa (PlanoAssinatura.Tipo = unico)');
                            } else if (tipoPlano === 'primeiraconsulta' || tipoPlano === 'primeiraConsulta') {
                                tipo = TipoFatura.PrimeiraConsulta;
                                console.log('[Webhook] criarRegistrosFaltantes: Tipo ajustado para PrimeiraConsulta (PlanoAssinatura.Tipo = primeiraConsulta)');
                            }
                        }
                    }
                } catch (err) {
                    console.warn('[Webhook] criarRegistrosFaltantes: Erro ao verificar PlanoAssinatura.Tipo, usando tipo determinado:', err);
                }
            }

            const dataEmissao = billDetails?.created_at ? new Date(billDetails.created_at) : new Date();
            // Calcula data de vencimento baseado no tipo
            let dataVencimento: Date;
            if (tipo === TipoFatura.Multa) {
                // Multa: data de vencimento = data de pagamento (data atual)
                dataVencimento = new Date();
            } else if (tipo === TipoFatura.Plano) {
                // IMPORTANTE: Para planos, DataVencimento deve ser baseada na DataInicio da assinatura
                // Busca a AssinaturaPlano para pegar a DataInicio
                if (userId) {
                    const assinaturaPlano = await prisma.assinaturaPlano.findFirst({
                        where: {
                            UserId: userId,
                            Status: { in: [PlanoCompraStatus.Ativo, PlanoCompraStatus.AguardandoPagamento] }
                        },
                        orderBy: { DataInicio: 'asc' }, // Pega a mais antiga (primeira assinatura)
                        include: { Financeiro: { orderBy: { CreatedAt: 'asc' } } }
                    });

                    if (assinaturaPlano?.DataInicio) {
                        // Calcula quantas parcelas já existem para determinar a próxima
                        const financeirosExistentes = assinaturaPlano.Financeiro?.filter(f => f.Tipo === TipoFatura.Plano) || [];
                        const numeroParcela = financeirosExistentes.length + 1; // Próxima parcela

                        // DataVencimento = DataInicio + (30 dias * número da parcela)
                        const dataInicio = new Date(assinaturaPlano.DataInicio);
                        dataVencimento = new Date(dataInicio);
                        dataVencimento.setMonth(dataVencimento.getMonth() + numeroParcela);
                        // Garante que o dia seja o mesmo da DataInicio
                        const diaInicio = dataInicio.getDate();
                        dataVencimento.setDate(diaInicio);
                    } else {
                        // Fallback: se não encontrar assinatura, usa 30 dias após dataEmissao
                        const dataBase = dataEmissao || new Date();
                        dataVencimento = new Date(dataBase);
                        dataVencimento.setDate(dataVencimento.getDate() + 30);
                    }
                } else {
                    // Fallback: se não tiver userId, usa 30 dias após dataEmissao
                    const dataBase = dataEmissao || new Date();
                    dataVencimento = new Date(dataBase);
                    dataVencimento.setDate(dataVencimento.getDate() + 30);
                }
            } else if (billDetails?.due_at) {
                // Para outros tipos, usa due_at do bill
                dataVencimento = new Date(billDetails.due_at);
            } else {
                // Default: 15 dias
                dataVencimento = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000);
            }

            // Verifica se a fatura já existe (pode ter sido criada entre a busca e agora)
            let fatura = await prisma.fatura.findFirst({
                where: { CodigoFatura: codigoFatura }
            });

            // Se não existe, cria a fatura
            // IMPORTANTE: Para tipo Plano, busca o valor correto do PlanoAssinatura
            let valorFatura = typeof valor === 'number' ? valor : parseFloat(String(valor)) || 0;
            if (tipo === TipoFatura.Plano && userId) {
                const assinaturaPlano = await prisma.assinaturaPlano.findFirst({
                    where: { UserId: userId },
                    orderBy: { DataInicio: 'desc' },
                    include: { PlanoAssinatura: true }
                });
                if (assinaturaPlano?.PlanoAssinatura?.Preco) {
                    valorFatura = assinaturaPlano.PlanoAssinatura.Preco;
                    console.log('[Webhook] Usando valor do plano na Fatura:', {
                        valorBill: typeof valor === 'number' ? valor : parseFloat(String(valor)) || 0,
                        valorPlano: valorFatura
                    });
                }
            }

            if (!fatura) {
                console.log('[Webhook] Criando fatura faltante:', { codigoFatura, userId, tipo, valor: valorFatura });
                fatura = await prisma.fatura.create({
                    data: {
                        CodigoFatura: codigoFatura,
                        Valor: valorFatura, // Usa valor do plano se for tipo Plano
                        Status: FaturaStatus.Pending,
                        Tipo: tipo,
                        CustomerId: customerId,
                        UserId: userId,
                        DataEmissao: dataEmissao,
                        DataVencimento: dataVencimento
                    }
                });
            }

            // Verifica se o financeiro já existe
            // Primeiro, busca pela FaturaId (mais direto)
            let financeiro = await prisma.financeiro.findFirst({
                where: { FaturaId: fatura.Id.toString() }
            });

            // Se não encontrou pela FaturaId, verifica pelo CodigoFatura via relacionamento com Fatura
            // Isso evita criar duplicado se o Financeiro foi criado antes da Fatura ter CodigoFatura
            if (!financeiro && codigoFatura) {
                console.log('[Webhook] Financeiro não encontrado pela FaturaId, buscando pelo CodigoFatura:', { codigoFatura, userId });
                financeiro = await prisma.financeiro.findFirst({
                    where: {
                        Fatura: {
                            CodigoFatura: codigoFatura
                        }
                    }
                });
            }

            // Se ainda não encontrou, verifica se existe um Financeiro recente do mesmo tipo, valor e usuário
            // (evita duplicação por timing entre criação e atualização de CodigoFatura)
            if (!financeiro && userId) {
                console.log('[Webhook] Financeiro não encontrado pelo CodigoFatura, buscando por correspondência:', { userId, tipo, valor });
                const valorNumber = typeof valor === 'number' ? valor : parseFloat(String(valor)) || 0;
                financeiro = await prisma.financeiro.findFirst({
                    where: {
                        UserId: userId,
                        Tipo: tipo,
                        Valor: valorNumber,
                        Status: ControleFinanceiroStatus.AguardandoPagamento,
                        CreatedAt: {
                            gte: new Date(Date.now() - 5 * 60 * 1000) // Últimos 5 minutos
                        }
                    },
                    orderBy: { CreatedAt: 'desc' }
                });

                // Se encontrou um Financeiro existente sem FaturaId ou com FaturaId diferente, atualiza o FaturaId
                if (financeiro && (!financeiro.FaturaId || financeiro.FaturaId !== fatura.Id.toString())) {
                    console.log('[Webhook] Atualizando FaturaId do Financeiro existente:', { financeiroId: financeiro.Id, faturaId: fatura.Id });
                    financeiro = await prisma.financeiro.update({
                        where: { Id: financeiro.Id },
                        data: { FaturaId: fatura.Id.toString() }
                    });
                }
            }

            // Se não existe, verifica uma última vez usando upsert para evitar race condition
            if (!financeiro) {
                console.log('[Webhook] Financeiro não encontrado. Tentando criar ou atualizar (upsert)...', { faturaId: fatura.Id, userId, tipo, valor });

                // Tenta determinar o PlanoAssinaturaId e o valor CORRETO do plano se for tipo Plano
                let planoAssinaturaId: string | null = null;
                let valorCorretoPlano: number = typeof valor === 'number' ? valor : parseFloat(String(valor)) || 0;

                // ✅ DIFERENCIAÇÃO: Para ConsultaAvulsa e PrimeiraConsulta, também busca o PlanoAssinatura
                // para garantir que o Tipo do Financeiro está correto
                if (tipo === TipoFatura.Plano || tipo === TipoFatura.Multa ||
                    tipo === TipoFatura.ConsultaAvulsa || tipo === TipoFatura.PrimeiraConsulta) {

                    // Primeiro tenta buscar pelo product_id do bill
                    const productId = billDetails?.product_items?.[0]?.product_id ||
                        (billDetails?.bill_items?.[0] as { product_id?: string | number })?.product_id ||
                        bill?.product_items?.[0]?.product_id ||
                        (bill?.bill_items?.[0] as { product_id?: string | number })?.product_id;

                    let planoAssinatura: { PlanoAssinaturaId?: string | null; PlanoAssinatura?: { Tipo?: string | null; Preco?: number | null } } | null = null;

                    if (productId) {
                        // Busca o PlanoAssinatura pelo ProductId
                        const plano = await prisma.planoAssinatura.findFirst({
                            where: { ProductId: String(productId) },
                            select: { Id: true, Tipo: true, Preco: true }
                        });

                        if (plano) {
                            // Busca AssinaturaPlano que usa este plano
                            const assinaturaPlano = await prisma.assinaturaPlano.findFirst({
                                where: {
                                    UserId: userId,
                                    PlanoAssinaturaId: plano.Id
                                },
                                orderBy: { DataInicio: 'desc' },
                                include: { PlanoAssinatura: true }
                            });

                            if (assinaturaPlano) {
                                planoAssinatura = assinaturaPlano;
                            } else {
                                // Se não encontrou AssinaturaPlano, usa o plano diretamente
                                planoAssinatura = {
                                    PlanoAssinaturaId: plano.Id,
                                    PlanoAssinatura: {
                                        Tipo: plano.Tipo,
                                        Preco: plano.Preco
                                    }
                                };
                            }
                        }
                    }

                    // Se não encontrou pelo productId, tenta buscar pela AssinaturaPlano do usuário
                    if (!planoAssinatura) {
                        const assinaturaPlano = await prisma.assinaturaPlano.findFirst({
                            where: { UserId: userId },
                            orderBy: { DataInicio: 'desc' },
                            include: { PlanoAssinatura: true }
                        });

                        if (assinaturaPlano) {
                            planoAssinatura = assinaturaPlano;
                        }
                    }

                    if (planoAssinatura?.PlanoAssinaturaId) {
                        planoAssinaturaId = planoAssinatura.PlanoAssinaturaId;

                        // ✅ DIFERENCIAÇÃO: Se o PlanoAssinatura.Tipo for "unico", ajusta o tipo para ConsultaAvulsa
                        if (planoAssinatura.PlanoAssinatura?.Tipo) {
                            const tipoPlano = planoAssinatura.PlanoAssinatura.Tipo.toLowerCase();
                            if (tipoPlano === 'unico' || tipoPlano === 'único') {
                                tipo = TipoFatura.ConsultaAvulsa;
                                console.log('[Webhook] criarRegistrosFaltantes: Tipo ajustado para ConsultaAvulsa baseado em PlanoAssinatura.Tipo = unico');
                            } else if (tipoPlano === 'primeiraconsulta' || tipoPlano === 'primeiraConsulta') {
                                tipo = TipoFatura.PrimeiraConsulta;
                                console.log('[Webhook] criarRegistrosFaltantes: Tipo ajustado para PrimeiraConsulta baseado em PlanoAssinatura.Tipo = primeiraConsulta');
                            }
                        }

                        // IMPORTANTE: Para tipo Plano, usa o Preco do PlanoAssinatura, não o valor do bill
                        // O valor do bill pode ter taxas, proporcional de renovação, etc.
                        if (tipo === TipoFatura.Plano && planoAssinatura.PlanoAssinatura?.Preco) {
                            const valorBillOriginal = typeof valor === 'number' ? valor : parseFloat(String(valor)) || 0;
                            valorCorretoPlano = planoAssinatura.PlanoAssinatura.Preco;
                            console.log('[Webhook] Usando valor do plano ao invés do bill:', {
                                valorBill: valorBillOriginal,
                                valorPlano: valorCorretoPlano,
                                planoId: planoAssinaturaId
                            });
                        }
                    }
                } else {
                    valorCorretoPlano = typeof valor === 'number' ? valor : parseFloat(String(valor)) || 0;
                }

                // ⚡ VERIFICAÇÃO ROBUSTA DE DUPLICAÇÃO: Busca por múltiplos critérios antes de criar
                // Verifica se já existe Financeiro com mesmo FaturaId (mais direto)
                let financeiroPossivelDuplicado = await prisma.financeiro.findUnique({
                    where: { FaturaId: fatura.Id.toString() }
                });

                // ⚡ VERIFICAÇÃO ROBUSTA: Se não encontrou por FaturaId, verifica por múltiplos critérios
                // Isso previne duplicação mesmo quando há diferentes FaturaIds para o mesmo pagamento
                if (!financeiroPossivelDuplicado && userId) {
                    // Para planos, verifica também pelo PlanoAssinaturaId e Valor
                    const whereCondition: Prisma.FinanceiroWhereInput = {
                        UserId: userId,
                        Tipo: tipo,
                        Status: ControleFinanceiroStatus.AguardandoPagamento,
                        Valor: valorCorretoPlano, // IMPORTANTE: Valor deve ser exatamente igual
                        CreatedAt: {
                            gte: new Date(Date.now() - 30 * 60 * 1000) // Últimos 30 minutos
                        }
                    };

                    // Se for plano, adiciona verificação por PlanoAssinaturaId
                    if (planoAssinaturaId && (tipo === TipoFatura.Plano || tipo === TipoFatura.Multa)) {
                        whereCondition.PlanoAssinaturaId = planoAssinaturaId;
                    }

                    financeiroPossivelDuplicado = await prisma.financeiro.findFirst({
                        where: whereCondition,
                        orderBy: { CreatedAt: 'desc' }
                    });

                    if (financeiroPossivelDuplicado) {
                        console.log('[Webhook] ⚠️ Financeiro possível duplicado encontrado por correspondência:', {
                            financeiroId: financeiroPossivelDuplicado.Id,
                            faturaIdExistente: financeiroPossivelDuplicado.FaturaId,
                            novaFaturaId: fatura.Id,
                            valor: financeiroPossivelDuplicado.Valor,
                            planoAssinaturaId: financeiroPossivelDuplicado.PlanoAssinaturaId
                        });
                    }
                }

                // Se encontrou duplicado, atualiza ao invés de criar novo
                if (financeiroPossivelDuplicado) {
                    if (financeiroPossivelDuplicado.FaturaId !== fatura.Id.toString()) {
                        // Atualiza FaturaId e Valor se necessário
                        console.log('[Webhook] Financeiro duplicado encontrado. Atualizando FaturaId e Valor:', {
                            financeiroId: financeiroPossivelDuplicado.Id,
                            faturaIdExistente: financeiroPossivelDuplicado.FaturaId,
                            novaFaturaId: fatura.Id,
                            valorAntigo: financeiroPossivelDuplicado.Valor,
                            valorNovo: valorCorretoPlano
                        });
                        financeiro = await prisma.financeiro.update({
                            where: { Id: financeiroPossivelDuplicado.Id },
                            data: {
                                FaturaId: fatura.Id.toString(),
                                Valor: valorCorretoPlano, // Garante que o valor é o do plano
                                DataVencimento: dataVencimento
                            }
                        });
                    } else {
                        // Já está vinculado corretamente, apenas atualiza valor se diferente
                        if (financeiroPossivelDuplicado.Valor !== valorCorretoPlano) {
                            console.log('[Webhook] Financeiro já existe com mesmo FaturaId. Atualizando Valor:', {
                                financeiroId: financeiroPossivelDuplicado.Id,
                                valorAntigo: financeiroPossivelDuplicado.Valor,
                                valorNovo: valorCorretoPlano
                            });
                            financeiro = await prisma.financeiro.update({
                                where: { Id: financeiroPossivelDuplicado.Id },
                                data: { Valor: valorCorretoPlano, DataVencimento: dataVencimento }
                            });
                        } else {
                            financeiro = financeiroPossivelDuplicado;
                        }
                    }
                    console.log('[Webhook] Usando Financeiro existente (evitou duplicação):', { financeiroId: financeiro.Id });
                    if (!fatura || !financeiro) {
                        throw new Error('Fatura ou financeiro não encontrados');
                    }
                    return { fatura, financeiro };
                }

                // Usa upsert para garantir que não cria duplicado mesmo em race condition
                // Se já existe com esse FaturaId, apenas atualiza. Se não existe, cria.
                try {
                    financeiro = await prisma.financeiro.upsert({
                        where: {
                            FaturaId: fatura.Id.toString() // Usa FaturaId como chave única
                        },
                        update: {
                            // Se já existe, atualiza os campos (caso tenha sido criado sem alguns dados)
                            UserId: userId,
                            PlanoAssinaturaId: planoAssinaturaId,
                            Valor: valorCorretoPlano, // IMPORTANTE: Usa valor do plano, não do bill
                            DataVencimento: dataVencimento,
                            Tipo: tipo,
                            Status: ControleFinanceiroStatus.AguardandoPagamento
                        },
                        create: {
                            UserId: userId,
                            PlanoAssinaturaId: planoAssinaturaId,
                            Valor: valorCorretoPlano, // IMPORTANTE: Usa valor do plano, não do bill
                            DataVencimento: dataVencimento,
                            Status: ControleFinanceiroStatus.AguardandoPagamento,
                            Tipo: tipo,
                            FaturaId: fatura.Id.toString()
                        }
                    });
                    console.log('[Webhook] Financeiro criado/atualizado com sucesso via upsert:', { financeiroId: financeiro.Id, faturaId: fatura.Id, valor: valorCorretoPlano });
                } catch (error: unknown) {
                    // Se der erro de unique constraint (pode acontecer em race condition), busca o existente
                    const err = error as { code?: string; message?: string };
                    if (err.code === 'P2002' || err.message?.includes('Unique constraint')) {
                        console.warn('[Webhook] Erro de constraint único detectado. Buscando Financeiro existente...', { faturaId: fatura.Id });
                        financeiro = await prisma.financeiro.findUnique({
                            where: { FaturaId: fatura.Id.toString() }
                        });
                        if (financeiro) {
                            console.log('[Webhook] Financeiro encontrado após erro de constraint:', { financeiroId: financeiro.Id });
                        } else {
                            console.error('[Webhook] Erro ao criar/buscar Financeiro:', err);
                            throw error;
                        }
                    } else {
                        console.error('[Webhook] Erro inesperado ao criar Financeiro:', err);
                        throw error;
                    }
                }
            } else {
                console.log('[Webhook] Financeiro já existe, usando existente:', { financeiroId: financeiro.Id, faturaId: fatura.Id });
            }

            return { fatura, financeiro };
        } catch (err: unknown) {
            console.error('[Webhook] Erro ao criar registros faltantes:', err);
            return null;
        }
    }

    /**
     * Determina o tipo de fatura baseado nos dados do bill
     */
    private static async determinarTipoFatura(billDetails: VindiBill | null | undefined, bill: VindiBill | null | undefined, userId: string | null): Promise<TipoFatura> {
        // Verifica se é multa (product_id 320985)
        const productId = billDetails?.bill_items?.[0]?.product_id || bill?.bill_items?.[0]?.product_id;
        if (productId === 320985 || String(productId) === "320985") {
            console.log('[Webhook] Tipo detectado: Multa (product_id 320985)');
            return TipoFatura.Multa;
        }

        // Verifica se há subscription_id (indica que é um plano)
        if (billDetails?.subscription?.id || bill?.subscription?.id) {
            return TipoFatura.Plano;
        }

        // Se temos userId, verifica no banco se há registros que indiquem o tipo
        if (userId) {
            try {
                // OTIMIZAÇÃO: Verifica primeiro se já existe uma Fatura com o CodigoFatura e usa o Tipo dela
                const codigoFatura = billDetails?.id ? String(billDetails.id) : (bill?.id ? String(bill.id) : null);
                if (codigoFatura) {
                    const faturaExistente = await prisma.fatura.findFirst({
                        where: {
                            CodigoFatura: codigoFatura
                        }
                    });

                    if (faturaExistente?.Tipo) {
                        console.log('[Webhook] Tipo detectado da Fatura existente:', faturaExistente.Tipo);
                        return faturaExistente.Tipo as TipoFatura;
                    }

                    // Se não encontrou a fatura pelo CodigoFatura, verifica CreditoAvulso/ConsultaAvulsa pelo CodigoFatura
                    const [creditoPorFatura, consultaPorFatura] = await Promise.all([
                        prisma.creditoAvulso.findFirst({
                            where: {
                                CodigoFatura: codigoFatura
                            }
                        }),
                        prisma.consultaAvulsa.findFirst({
                            where: {
                                CodigoFatura: codigoFatura
                            }
                        })
                    ]);

                    if (creditoPorFatura?.Tipo) {
                        console.log('[Webhook] Tipo detectado do CreditoAvulso pelo CodigoFatura:', creditoPorFatura.Tipo);
                        return creditoPorFatura.Tipo as TipoFatura;
                    }

                    if (consultaPorFatura?.Tipo) {
                        console.log('[Webhook] Tipo detectado da ConsultaAvulsa pelo CodigoFatura:', consultaPorFatura.Tipo);
                        return consultaPorFatura.Tipo as TipoFatura;
                    }
                }

                // Se não encontrou pelo CodigoFatura, verifica Financeiro recente (últimos 10 minutos) pendente
                const financeiroRecente = await prisma.financeiro.findFirst({
                    where: {
                        UserId: userId,
                        Status: ControleFinanceiroStatus.AguardandoPagamento,
                        CreatedAt: {
                            gte: new Date(Date.now() - 10 * 60 * 1000) // Últimos 10 minutos
                        }
                    },
                    include: {
                        Fatura: true
                    },
                    orderBy: { CreatedAt: 'desc' }
                });

                if (financeiroRecente?.Fatura?.Tipo) {
                    console.log('[Webhook] Tipo detectado do Financeiro recente:', financeiroRecente.Fatura.Tipo);
                    return financeiroRecente.Fatura.Tipo as TipoFatura;
                }

                if (financeiroRecente?.Tipo) {
                    console.log('[Webhook] Tipo detectado do Financeiro recente (sem fatura):', financeiroRecente.Tipo);
                    return financeiroRecente.Tipo as TipoFatura;
                }

                // Verifica se há AssinaturaPlano pendente (indica que é um plano, unico ou primeiraConsulta)
                const assinaturaPlano = await prisma.assinaturaPlano.findFirst({
                    where: {
                        UserId: userId,
                        Status: { in: [PlanoCompraStatus.AguardandoPagamento, PlanoCompraStatus.Ativo] }
                    },
                    include: {
                        PlanoAssinatura: true
                    },
                    orderBy: { DataInicio: 'desc' }
                });

                if (assinaturaPlano) {
                    // Verifica o tipo do plano para mapear corretamente
                    const tipoPlano = assinaturaPlano.PlanoAssinatura?.Tipo?.toLowerCase();

                    if (tipoPlano === 'unico') {
                        console.log('[Webhook] Tipo detectado: ConsultaAvulsa (PlanoAssinatura.Tipo = unico)');
                        return TipoFatura.ConsultaAvulsa;
                    } else if (tipoPlano === 'primeiraconsulta' || tipoPlano === 'primeiraConsulta') {
                        console.log('[Webhook] Tipo detectado: PrimeiraConsulta (PlanoAssinatura.Tipo = primeiraConsulta)');
                        return TipoFatura.PrimeiraConsulta;
                    } else {
                        console.log('[Webhook] Tipo detectado: Plano (PlanoAssinatura.Tipo = ' + tipoPlano + ')');
                        return TipoFatura.Plano;
                    }
                }

                // Verifica se há Financeiro com tipo Multa pendente para este usuário
                const financeiroMulta = await prisma.financeiro.findFirst({
                    where: {
                        UserId: userId,
                        Tipo: TipoFatura.Multa,
                        Status: { in: [ControleFinanceiroStatus.AguardandoPagamento] }
                    },
                    orderBy: { CreatedAt: 'desc' }
                });

                if (financeiroMulta) {
                    console.log('[Webhook] Tipo detectado: Multa (encontrado Financeiro com tipo Multa)');
                    return TipoFatura.Multa;
                }
            } catch (err) {
                console.warn('[Webhook] Erro ao verificar tipo de fatura no banco:', err);
            }
        }

        // Verifica se há product_items que indiquem tipo
        const productItems = billDetails?.product_items || bill?.product_items || [];
        if (productItems.length > 0) {
            // Verifica se há metadata ou outros campos que indiquem o tipo
            if (billDetails?.metadata?.tipo) {
                const tipoMetadata = billDetails.metadata.tipo as string;
                if (tipoMetadata === 'Plano') return TipoFatura.Plano;
                if (tipoMetadata === 'PrimeiraConsulta') return TipoFatura.PrimeiraConsulta;
                if (tipoMetadata === 'ConsultaAvulsa') return TipoFatura.ConsultaAvulsa;
                if (tipoMetadata === 'Multa') return TipoFatura.Multa;
            }
            // Por padrão, assume ConsultaAvulsa se não for identificado outro tipo
            return TipoFatura.ConsultaAvulsa;
        }

        // Verifica se há metadata ou outros campos que indiquem o tipo
        if (billDetails?.metadata?.tipo) {
            const tipoMetadata = billDetails.metadata.tipo as string;
            if (tipoMetadata === 'Plano') return TipoFatura.Plano;
            if (tipoMetadata === 'PrimeiraConsulta') return TipoFatura.PrimeiraConsulta;
            if (tipoMetadata === 'ConsultaAvulsa') return TipoFatura.ConsultaAvulsa;
            if (tipoMetadata === 'Multa') return TipoFatura.Multa;
        }

        // Default: ConsultaAvulsa (apenas se não for possível determinar outro tipo)
        return TipoFatura.ConsultaAvulsa;
    }

    /**
     * PROCESSAMENTO RÁPIDO: Libera consultas e ativa plano IMEDIATAMENTE
     * Foca apenas em: Fatura, Financeiro, CreditoAvulso/ConsultaAvulsa, AssinaturaPlano, CicloPlano e notificação
     * META: < 1 segundo do webhook até plano ativo e notificação enviada
     */
    public static async _liberarConsultasRapido(
        bill: VindiBill,
        createdAt?: string
    ): Promise<{ success: boolean; data?: { fatura: Prisma.FaturaGetPayload<{}> | null; financeiro: Prisma.FinanceiroGetPayload<{}> | null; userId: string | null; codigoFatura: string }; error?: string }> {
        const startTime = Date.now();
        console.log('🔍 [Webhook] _liberarConsultasRapido: INICIANDO', {
            billId: bill?.id,
            customerId: bill?.customer?.id,
            amount: bill?.amount,
            status: bill?.status,
            createdAt,
            timestamp: new Date().toISOString()
        });

        try {
            const customerId = bill.customer?.id ? String(bill.customer.id) : null;
            const codigoFatura = bill?.id ? String(bill.id) : null;

            console.log('🔍 [Webhook] _liberarConsultasRapido: Resolvendo userId...', { customerId, codigoFatura });
            const userId = await this.resolveUserIdByCustomerId(customerId);
            console.log('🔍 [Webhook] _liberarConsultasRapido: userId resolvido', { userId, customerId, codigoFatura });

            if (!customerId || !codigoFatura) {
                console.error('❌ [Webhook] _liberarConsultasRapido: CustomerId ou codigoFatura ausente', { customerId, codigoFatura });
                return { success: false, error: 'CustomerId ou codigoFatura ausente' };
            }

            console.log('⚡ [Webhook] _liberarConsultasRapido: Processamento rápido iniciado', { customerId, codigoFatura, userId });

            // 🔴 CRÍTICO: Garante que a Fatura existe ANTES de tentar atualizar
            // Se não existir, cria IMEDIATAMENTE com Status Paid (já que é bill_paid)
            if (!userId) {
                return { success: false, error: 'userId ausente, não é possível criar/atualizar Fatura' };
            }

            // Busca Fatura existente
            let fatura = await prisma.fatura.findFirst({
                where: { CodigoFatura: codigoFatura }
            });

            // Se a Fatura não existe, cria IMEDIATAMENTE com Status Paid
            if (!fatura) {
                console.log('⚡ [Webhook] Fatura não encontrada. Criando IMEDIATAMENTE com Status Paid...', { codigoFatura, userId });

                // Busca dados do bill para criar a Fatura corretamente
                let billDetails = bill;
                try {
                    if (bill?.id) {
                        billDetails = await VindiService.getBillById(Number(bill.id));
                    }
                } catch (err) {
                    console.warn('[Webhook] Erro ao buscar detalhes do bill na Vindi, usando dados do webhook:', err);
                }

                const valor = billDetails?.amount ?? bill?.amount ?? 0;
                const tipo = await this.determinarTipoFatura(billDetails, bill, userId);
                const dataEmissao = billDetails?.created_at ? new Date(billDetails.created_at) : new Date();

                // Calcula data de vencimento
                let dataVencimento: Date;
                if (tipo === TipoFatura.Multa) {
                    dataVencimento = new Date();
                } else if (tipo === TipoFatura.Plano && userId) {
                    const assinaturaPlano = await prisma.assinaturaPlano.findFirst({
                        where: {
                            UserId: userId,
                            Status: { in: [PlanoCompraStatus.Ativo, PlanoCompraStatus.AguardandoPagamento] }
                        },
                        orderBy: { DataInicio: 'asc' },
                        include: { Financeiro: { orderBy: { CreatedAt: 'asc' } } }
                    });
                    if (assinaturaPlano?.DataInicio) {
                        const financeirosExistentes = assinaturaPlano.Financeiro?.filter(f => f.Tipo === TipoFatura.Plano) || [];
                        const numeroParcela = financeirosExistentes.length + 1;
                        const dataInicio = new Date(assinaturaPlano.DataInicio);
                        dataVencimento = new Date(dataInicio);
                        dataVencimento.setMonth(dataVencimento.getMonth() + numeroParcela);
                        const diaInicio = dataInicio.getDate();
                        dataVencimento.setDate(diaInicio);
                    } else {
                        dataVencimento = new Date(dataEmissao);
                        dataVencimento.setDate(dataVencimento.getDate() + 30);
                    }
                } else if (billDetails?.due_at) {
                    dataVencimento = new Date(billDetails.due_at);
                } else {
                    dataVencimento = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000);
                }

                // Determina valor correto (para planos, usa valor do plano)
                let valorFatura = typeof valor === 'number' ? valor : parseFloat(String(valor)) || 0;
                if (tipo === TipoFatura.Plano && userId) {
                    const assinaturaPlano = await prisma.assinaturaPlano.findFirst({
                        where: { UserId: userId },
                        orderBy: { DataInicio: 'desc' },
                        include: { PlanoAssinatura: true }
                    });
                    if (assinaturaPlano?.PlanoAssinatura?.Preco) {
                        valorFatura = assinaturaPlano.PlanoAssinatura.Preco;
                    }
                }

                // Cria Fatura IMEDIATAMENTE com Status Paid (já que é bill_paid)
                fatura = await prisma.fatura.create({
                    data: {
                        CodigoFatura: codigoFatura,
                        Valor: valorFatura,
                        Status: FaturaStatus.Paid, // ⚡ CRÍTICO: Cria já com Status Paid
                        Tipo: tipo,
                        CustomerId: customerId,
                        UserId: userId,
                        DataEmissao: dataEmissao,
                        DataVencimento: dataVencimento
                    }
                });
                console.log('✅ [Webhook] Fatura criada IMEDIATAMENTE com Status Paid:', { faturaId: fatura.Id, codigoFatura });
            } else {
                // Se a Fatura existe, atualiza Status para Paid
                if (fatura.Status !== FaturaStatus.Paid) {
                    await prisma.fatura.updateMany({
                        where: { CodigoFatura: codigoFatura },
                        data: { Status: FaturaStatus.Paid }
                    });
                    console.log('✅ [Webhook] Fatura atualizada para Paid:', { faturaId: fatura.Id, codigoFatura });
                }
            }

            // Busca Financeiro relacionado
            let financeiro = await prisma.financeiro.findFirst({
                where: { FaturaId: fatura.Id.toString() }
            });

            // Se não encontrou Financeiro, tenta buscar por CodigoFatura
            if (!financeiro) {
                financeiro = await prisma.financeiro.findFirst({
                    where: {
                        Fatura: {
                            CodigoFatura: codigoFatura
                        }
                    }
                });
            }

            // Se ainda não encontrou, cria registros faltantes (inclui Financeiro)
            if (!financeiro) {
                console.log('⚡ [Webhook] Financeiro não encontrado. Criando registros faltantes...');
                const registrosCriados = await this.criarRegistrosFaltantes(bill, customerId, codigoFatura, userId);
                if (registrosCriados && registrosCriados.financeiro) {
                    financeiro = registrosCriados.financeiro;
                    // Atualiza Fatura para Paid se foi criada como Pending
                    if (registrosCriados.fatura.Status !== FaturaStatus.Paid) {
                        await prisma.fatura.updateMany({
                            where: { CodigoFatura: codigoFatura },
                            data: { Status: FaturaStatus.Paid }
                        });
                        fatura = await prisma.fatura.findFirst({
                            where: { CodigoFatura: codigoFatura }
                        }) || fatura;
                    }
                } else {
                    return { success: false, error: 'Não foi possível criar Financeiro' };
                }
            }

            // 2️⃣ Atualiza Financeiro para Aprovado (CRÍTICO)
            await prisma.financeiro.update({
                where: { Id: financeiro.Id.toString() },
                data: { Status: ControleFinanceiroStatus.Aprovado }
            });

            // OTIMIZAÇÃO: Busca fatura e financeiro atualizados em paralelo
            const [faturaAtualizada, financeiroAtualizado] = await Promise.all([
                prisma.fatura.findFirst({ where: { CodigoFatura: codigoFatura } }),
                prisma.financeiro.findFirst({ where: { Id: financeiro.Id.toString() } })
            ]);

            if (!faturaAtualizada || !financeiroAtualizado) {
                return { success: false, error: 'Fatura ou financeiro não encontrados após atualização' };
            }

            fatura = faturaAtualizada;
            financeiro = financeiroAtualizado;

            // 3️⃣ CRÍTICO: Libera CreditoAvulso/ConsultaAvulsa IMEDIATAMENTE para TODOS os tipos (exceto Multa)
            // Isso garante que consultas avulsas sejam ativadas assim que a Vindi retornar paid
            if (fatura?.Tipo && fatura.Tipo !== TipoFatura.Multa && financeiro?.UserId) {
                console.log(`⚡ [Webhook] _liberarConsultasRapido: Ativando ConsultaAvulsa/CreditoAvulso IMEDIATAMENTE`, {
                    codigoFatura,
                    userId: financeiro.UserId,
                    tipoFatura: fatura.Tipo
                });
                await this._atualizarCreditoEConsultaAvulsa(codigoFatura, financeiro.UserId, fatura.Tipo);
                console.log(`✅ [Webhook] _liberarConsultasRapido: ConsultaAvulsa/CreditoAvulso ativados com sucesso`);
            } else if (!fatura?.Tipo) {
                console.warn(`⚠️ [Webhook] _liberarConsultasRapido: Tipo de fatura não encontrado, tentando ativar ConsultaAvulsa/CreditoAvulso mesmo assim`, {
                    codigoFatura,
                    userId: financeiro?.UserId
                });
                // Tenta ativar mesmo sem tipo definido (pode ser consulta avulsa criada antes do tipo ser definido)
                if (financeiro?.UserId) {
                    await this._atualizarCreditoEConsultaAvulsa(codigoFatura, financeiro.UserId);
                }
            }

            // 4️⃣ NOVO: Ativa AssinaturaPlano imediatamente (CRÍTICO para planos, upgrade e downgrade)
            // Ativa para: Plano, Upgrade e Downgrade
            if ((fatura?.Tipo === TipoFatura.Plano ||
                fatura?.Tipo === TipoFatura.Upgrade ||
                fatura?.Tipo === TipoFatura.Downgrade) && financeiro?.UserId) {
                console.log(`⚡ [Webhook] Ativando AssinaturaPlano imediatamente para userId: ${financeiro.UserId}, tipo: ${fatura?.Tipo}`);
                await prisma.assinaturaPlano.updateMany({
                    where: {
                        UserId: financeiro.UserId,
                        Status: { in: [PlanoCompraStatus.AguardandoPagamento] }
                    },
                    data: { Status: PlanoCompraStatus.Ativo }
                });
                console.log(`⚡ [Webhook] AssinaturaPlano ativado com sucesso para userId: ${financeiro.UserId}`);
            }

            // 5️⃣ CRÍTICO: Ativa/Cria CicloPlano imediatamente (libera consultas na hora)
            // Para planos, upgrade e downgrade, busca/cria e ativa o CicloPlano
            if (financeiro?.UserId &&
                (fatura?.Tipo === TipoFatura.Plano ||
                    fatura?.Tipo === TipoFatura.Upgrade ||
                    fatura?.Tipo === TipoFatura.Downgrade)) {

                let cicloAtivado = false;

                // Primeiro tenta pelo CicloPlanoId do financeiro (mais rápido)
                if (financeiro?.CicloPlanoId) {
                    console.log(`⚡ [Webhook] Ativando CicloPlano imediatamente: ${financeiro.CicloPlanoId}`);
                    const cicloPendente = await prisma.cicloPlano.findUnique({
                        where: { Id: financeiro.CicloPlanoId }
                    });

                    if (cicloPendente && cicloPendente.Status === 'Pendente') {
                        await prisma.cicloPlano.update({
                            where: { Id: financeiro.CicloPlanoId },
                            data: { Status: 'Ativo' }
                        });
                        cicloAtivado = true;
                        console.log(`⚡ [Webhook] CicloPlano ${financeiro.CicloPlanoId} ativado`);
                    } else if (cicloPendente && cicloPendente.Status === 'Ativo') {
                        cicloAtivado = true; // Já está ativo
                    }
                }

                // Se não ativou pelo CicloPlanoId, busca/cria pelo AssinaturaPlano
                if (!cicloAtivado) {
                    const assinaturaPlano = await prisma.assinaturaPlano.findFirst({
                        where: {
                            UserId: financeiro.UserId,
                            Status: { in: [PlanoCompraStatus.AguardandoPagamento, PlanoCompraStatus.Ativo] }
                        },
                        orderBy: { DataInicio: 'desc' }
                    });

                    if (assinaturaPlano) {
                        // Busca ciclo pendente OU ativo recente (últimos 5 minutos)
                        const agora = new Date();
                        const cincoMinutosAtras = new Date(agora.getTime() - 5 * 60 * 1000);

                        const cicloExistente = await prisma.cicloPlano.findFirst({
                            where: {
                                AssinaturaPlanoId: assinaturaPlano.Id,
                                UserId: financeiro.UserId,
                                OR: [
                                    { Status: 'Pendente' },
                                    { Status: 'Ativo', CreatedAt: { gte: cincoMinutosAtras } }
                                ]
                            },
                            orderBy: { CreatedAt: 'desc' }
                        });

                        if (cicloExistente) {
                            if (cicloExistente.Status === 'Pendente') {
                                console.log(`⚡ [Webhook] Ativando CicloPlano pendente encontrado: ${cicloExistente.Id}`);
                                await prisma.cicloPlano.update({
                                    where: { Id: cicloExistente.Id },
                                    data: { Status: 'Ativo' }
                                });
                                console.log(`⚡ [Webhook] CicloPlano ${cicloExistente.Id} ativado com sucesso`);

                                // Atualiza o financeiro com o CicloPlanoId
                                await prisma.financeiro.update({
                                    where: { Id: financeiro.Id.toString() },
                                    data: { CicloPlanoId: cicloExistente.Id }
                                });
                                cicloAtivado = true;
                            } else {
                                // Já está ativo
                                cicloAtivado = true;
                            }
                        } else {
                            // CRÍTICO: Se não existe ciclo, cria e ativa IMEDIATAMENTE
                            console.log(`⚡ [Webhook] Criando e ativando novo CicloPlano para AssinaturaPlano: ${assinaturaPlano.Id}`);
                            const cicloFim = new Date(agora);
                            cicloFim.setDate(cicloFim.getDate() + 30);

                            const novoCiclo = await prisma.cicloPlano.create({
                                data: {
                                    AssinaturaPlanoId: assinaturaPlano.Id,
                                    UserId: financeiro.UserId,
                                    CicloInicio: agora,
                                    CicloFim: cicloFim,
                                    ConsultasDisponiveis: 4,
                                    Status: 'Ativo' // Cria já ativo!
                                }
                            });

                            // Atualiza o financeiro com o CicloPlanoId
                            await prisma.financeiro.update({
                                where: { Id: financeiro.Id.toString() },
                                data: { CicloPlanoId: novoCiclo.Id }
                            });

                            console.log(`⚡ [Webhook] Novo CicloPlano ${novoCiclo.Id} criado e ativado`);
                            cicloAtivado = true;
                        }
                    }
                }
            } else if (financeiro?.CicloPlanoId) {
                // Para outros tipos de fatura, ainda tenta ativar se tiver CicloPlanoId
                console.log(`⚡ [Webhook] Ativando CicloPlano imediatamente: ${financeiro.CicloPlanoId}`);
                const cicloPendente = await prisma.cicloPlano.findUnique({
                    where: { Id: financeiro.CicloPlanoId }
                });

                if (cicloPendente && cicloPendente.Status === 'Pendente') {
                    await prisma.cicloPlano.update({
                        where: { Id: financeiro.CicloPlanoId },
                        data: { Status: 'Ativo' }
                    });
                    console.log(`⚡ [Webhook] CicloPlano ${financeiro.CicloPlanoId} ativado`);
                }
            }

            // 6️⃣ NOVO: Ativa ControleConsultaMensal se existir (CRÍTICO)
            // Ativa para: Plano, Upgrade e Downgrade
            if (financeiro?.UserId &&
                (fatura?.Tipo === TipoFatura.Plano ||
                    fatura?.Tipo === TipoFatura.Upgrade ||
                    fatura?.Tipo === TipoFatura.Downgrade)) {
                console.log(`⚡ [Webhook] Ativando ControleConsultaMensal para userId: ${financeiro.UserId}, tipo: ${fatura?.Tipo}`);
                await prisma.controleConsultaMensal.updateMany({
                    where: {
                        UserId: financeiro.UserId,
                        Status: { in: [ControleConsultaMensalStatus.AguardandoPagamento] }
                    },
                    data: { Status: ControleConsultaMensalStatus.Ativo }
                });
                console.log(`⚡ [Webhook] ControleConsultaMensal ativado com sucesso para userId: ${financeiro.UserId}`);
            }

            // 7️⃣ Envia notificação imediatamente (CRÍTICO)
            if (financeiro?.UserId) {
                console.log('🔔 [Webhook] _liberarConsultasRapido: Preparando envio de notificação', {
                    userId: financeiro.UserId,
                    tipoFatura: fatura?.Tipo,
                    codigoFatura
                });

                try {
                    const ws = new WebSocketNotificationService();
                    const notifier = new NotificationService(ws);

                    let mensagem = 'Pagamento aprovado!';
                    let titulo = 'Pagamento Confirmado';

                    if (fatura?.Tipo === TipoFatura.Plano) {
                        titulo = '✅ Plano Ativado!';
                        mensagem = 'Pagamento aprovado! Seu plano foi ativado com sucesso. Você tem 4 consultas disponíveis';
                    } else if (fatura?.Tipo === TipoFatura.Downgrade) {
                        titulo = '✅ Plano Alterado';
                        mensagem = 'Seu plano foi alterado com sucesso! Verifique os detalhes em "Meus Planos"';
                    } else if (fatura?.Tipo === TipoFatura.Upgrade) {
                        titulo = '✅ Plano Atualizado';
                        mensagem = 'Seu plano foi atualizado com sucesso! Verifique os detalhes em "Meus Planos"';
                    } else if (fatura?.Tipo === TipoFatura.ConsultaAvulsa) {
                        titulo = '✅ Consulta Avulsa Ativada';
                        mensagem = 'Pagamento recebido com sucesso! Sua consulta avulsa foi ativada e está disponível para uso. Ela tem validade de 30 dias a partir de hoje.';
                    } else if (fatura?.Tipo === TipoFatura.PrimeiraConsulta) {
                        titulo = '✅ Primeira Consulta Ativada!';
                        mensagem = 'Pagamento aprovado! Sua primeira consulta foi ativada e está disponível para uso. Bem-vindo à Estação Terapia!';
                    }

                    console.log('🔔 [Webhook] _liberarConsultasRapido: Enviando notificação via NotificationService', {
                        userId: financeiro.UserId,
                        titulo,
                        mensagem,
                        tipo: 'success'
                    });

                    // Envia notificação via socket
                    await notifier.sendNotification({
                        userId: financeiro.UserId,
                        title: titulo,
                        message: mensagem,
                        type: 'success'
                    });

                    console.log('🔔 [Webhook] _liberarConsultasRapido: Notificação via NotificationService enviada, enviando evento direto via socket...');

                    // ADICIONAL: Envia também evento direto via socket para garantir que o frontend receba
                    const socketPayload = {
                        title: titulo,
                        message: mensagem,
                        tipo: fatura?.Tipo,
                        codigoFatura: codigoFatura,
                        valor: fatura?.Valor || financeiro?.Valor
                    };

                    console.log('🔔 [Webhook] _liberarConsultasRapido: Emitindo evento payment_confirmed via socket', {
                        userId: financeiro.UserId,
                        event: 'payment_confirmed',
                        payload: socketPayload
                    });

                    await ws.emitToUser(financeiro.UserId, 'payment_confirmed', socketPayload);

                    console.log('✅ [Webhook] _liberarConsultasRapido: Notificações enviadas com sucesso', {
                        userId: financeiro.UserId,
                        titulo,
                        tipo: fatura?.Tipo,
                        codigoFatura,
                        timestamp: new Date().toISOString()
                    });
                } catch (notifyErr) {
                    console.error('❌ [Webhook] _liberarConsultasRapido: Falha ao enviar notificação', {
                        error: notifyErr instanceof Error ? notifyErr.message : String(notifyErr),
                        stack: notifyErr instanceof Error ? notifyErr.stack : undefined,
                        userId: financeiro.UserId,
                        timestamp: new Date().toISOString()
                    });
                    // Não bloqueia o processamento se notificação falhar
                }
            } else {
                console.warn('⚠️ [Webhook] _liberarConsultasRapido: userId não encontrado, não é possível enviar notificação', {
                    financeiroUserId: financeiro?.UserId,
                    codigoFatura
                });
            }

            const duration = Date.now() - startTime;
            console.log(`⚡ [Webhook] Processamento rápido concluído em ${duration}ms`, { codigoFatura, userId, duracao: `${duration}ms` });

            return {
                success: true,
                data: { fatura, financeiro, userId, codigoFatura }
            };
        } catch (error: unknown) {
            const err = error as { message?: string };
            console.error('[Webhook] Erro no processamento rápido:', error);
            return { success: false, error: err?.message || String(error) };
        }
    }

    /**
     * Enfileira criação de registros faltantes em background
     */
    private static async _enfileirarCriacaoRegistros(
        bill: VindiBill,
        customerId: string,
        codigoFatura: string,
        userId: string
    ): Promise<void> {
        try {
            const { getWebhookQueue } = await import('../workers/worker.webhook');
            const queue = getWebhookQueue();

            if (!queue) {
                console.warn('[Webhook] Fila não disponível, criando registros de forma assíncrona');
                // Fallback: processa de forma assíncrona sem bloquear
                setImmediate(() => {
                    this.criarRegistrosFaltantes(bill, customerId, codigoFatura, userId).catch(err => {
                        console.error('[Webhook] Erro ao criar registros faltantes em background:', err);
                    });
                });
                return;
            }

            // Enfileira criação de registros com prioridade alta (mas não bloqueia)
            await queue.add(
                'criarRegistrosFaltantes',
                {
                    bill,
                    customerId,
                    codigoFatura,
                    userId
                },
                {
                    priority: 8, // Prioridade alta para criação de registros
                    attempts: 3,
                    backoff: { type: 'fixed', delay: 2000 },
                    removeOnComplete: 500,
                    removeOnFail: false
                }
            );

            console.log('[Webhook] Criação de registros enfileirada em background');
        } catch (error) {
            console.error('[Webhook] Erro ao enfileirar criação de registros:', error);
            // Não falha o processamento principal se não conseguir enfileirar
        }
    }

    /**
     * Enfileira processamento em background para tarefas não-críticas
     */
    public static async _enfileirarProcessamentoBackground(
        bill: VindiBill,
        dadosRapidos: { fatura: Prisma.FaturaGetPayload<{}>; financeiro: Prisma.FinanceiroGetPayload<{}>; userId: string | null; codigoFatura: string },
        createdAt?: string
    ): Promise<void> {
        try {
            // Usa a mesma fila de webhook, mas com prioridade menor
            const { getWebhookQueue } = await import('../workers/worker.webhook');
            const queue = getWebhookQueue();

            if (!queue) {
                console.warn('[Webhook] Fila não disponível, processando em background de forma assíncrona');
                // Fallback: processa de forma assíncrona sem bloquear
                setImmediate(() => {
                    this._processarBackground(bill, dadosRapidos, createdAt).catch(err => {
                        console.error('[Webhook] Erro no processamento em background:', err);
                    });
                });
                return;
            }

            // Enfileira job de background com prioridade menor
            await queue.add(
                'processWebhookBackground',
                {
                    bill,
                    dadosRapidos,
                    createdAt
                },
                {
                    priority: 5, // Prioridade menor que processamento normal
                    attempts: 3,
                    backoff: { type: 'fixed', delay: 5000 },
                    removeOnComplete: 500,
                    removeOnFail: false
                }
            );

            console.log('[Webhook] Processamento em background enfileirado');
        } catch (error) {
            console.error('[Webhook] Erro ao enfileirar processamento em background:', error);
            // Não falha o processamento principal se não conseguir enfileirar
        }
    }

    /**
     * Processa tarefas não-críticas em background
     * Método público para ser chamado pelo worker
     */
    public static async _processarBackground(
        bill: VindiBill,
        dadosRapidos: { fatura: Prisma.FaturaGetPayload<{}> | null; financeiro: Prisma.FinanceiroGetPayload<{}> | null; userId: string | null; codigoFatura: string },
        createdAt?: string
    ): Promise<void> {
        try {
            console.log('[Webhook] Iniciando processamento em background', { codigoFatura: dadosRapidos.codigoFatura });

            const { fatura, financeiro, userId, codigoFatura } = dadosRapidos;

            // 1. Criar registros faltantes se necessário (pode demorar - busca na API Vindi)
            if (!fatura || !financeiro) {
                const customerId = bill.customer?.id ? String(bill.customer.id) : null;
                if (customerId && userId) {
                    await this.criarRegistrosFaltantes(bill, customerId, codigoFatura, userId);
                }
            }

            // 2. Processar CicloPlano (pode demorar)
            if (fatura?.Tipo === TipoFatura.Plano && financeiro?.UserId) {
                await this._processarCicloPlanoBackground(bill, financeiro, fatura, createdAt);
            }

            // 3. Atualizar ControleConsultaMensal (não crítico)
            if (financeiro?.UserId && fatura?.Tipo === TipoFatura.Plano) {
                const assinaturaPlano = await prisma.assinaturaPlano.findFirst({
                    where: { UserId: financeiro.UserId },
                    orderBy: { DataInicio: 'desc' }
                });

                if (assinaturaPlano) {
                    const cicloAtivo = await prisma.cicloPlano.findFirst({
                        where: {
                            AssinaturaPlanoId: assinaturaPlano.Id,
                            UserId: financeiro.UserId,
                            Status: 'Ativo'
                        },
                        orderBy: { CreatedAt: 'desc' }
                    });

                    if (cicloAtivo) {
                        await prisma.controleConsultaMensal.updateMany({
                            where: {
                                UserId: financeiro.UserId,
                                AssinaturaPlanoId: assinaturaPlano.Id,
                                Status: { in: [ControleConsultaMensalStatus.AguardandoPagamento, ControleConsultaMensalStatus.Ativo] }
                            },
                            data: {
                                Status: ControleConsultaMensalStatus.Ativo,
                                CicloPlanoId: cicloAtivo.Id
                            }
                        });
                    }
                }
            }

            // 4. Processa Jobs pendentes da tabela Job para atualizar ConsultaAvulsa e CreditoAvulso
            // Isso garante que todas as tabelas estejam preenchidas antes de atualizar status
            if (codigoFatura) {
                try {
                    await this._processarJobsPendentesVindi(codigoFatura, financeiro?.UserId ?? userId);
                } catch (jobError) {
                    console.warn('[Webhook] Erro ao processar Jobs pendentes (não crítico):', jobError);
                    // Não falha o processamento se houver erro
                }
            }

            // 5. Auditoria detalhada (não crítico)
            await this.audit({
                eventType: 'bill_paid',
                status: 'SUCCESS',
                message: 'Pagamento aprovado (processamento completo)',
                userId: financeiro?.UserId ?? userId ?? null,
                paymentId: codigoFatura,
                amount: fatura?.Valor ?? financeiro?.Valor ?? null,
                metadata: bill
            });

            console.log('[Webhook] Processamento em background concluído');
        } catch (error) {
            console.error('[Webhook] Erro no processamento em background:', error);
            // Não propaga erro - é processamento não-crítico
        }
    }

    /**
     * Processa CicloPlano em background (pode demorar)
     */
    private static async _processarCicloPlanoBackground(
        bill: VindiBill,
        financeiro: Prisma.FinanceiroGetPayload<{}>,
        fatura: Prisma.FaturaGetPayload<{}>,
        createdAt?: string
    ): Promise<void> {
        try {
            if (!financeiro?.UserId) return;

            const assinaturaPlano = await prisma.assinaturaPlano.findFirst({
                where: {
                    UserId: financeiro.UserId,
                    Status: { in: [PlanoCompraStatus.AguardandoPagamento, PlanoCompraStatus.Ativo] }
                },
                orderBy: { DataInicio: 'desc' },
                include: { PlanoAssinatura: true }
            });

            if (!assinaturaPlano) return;

            const cicloService = new CicloPlanoService();
            const cicloAtivo = await cicloService.buscarCicloAtivo(assinaturaPlano.Id, financeiro.UserId);

            if (cicloAtivo) {
                // Renovação - cria novo ciclo
                const novoCiclo = await cicloService.renovarCiclo({
                    assinaturaPlanoId: assinaturaPlano.Id,
                    userId: financeiro.UserId,
                    consultasDisponiveis: 4
                });

                if (financeiro?.Id && novoCiclo) {
                    await prisma.financeiro.update({
                        where: { Id: financeiro.Id.toString() },
                        data: { CicloPlanoId: novoCiclo.Id }
                    });
                }
            } else {
                // Primeira compra - busca ou cria ciclo
                const cicloPendente = await prisma.cicloPlano.findFirst({
                    where: {
                        AssinaturaPlanoId: assinaturaPlano.Id,
                        UserId: financeiro.UserId,
                        Status: 'Pendente'
                    },
                    orderBy: { CreatedAt: 'desc' }
                });

                let primeiroCiclo;
                if (cicloPendente) {
                    primeiroCiclo = await cicloService.ativarCiclo(cicloPendente.Id);
                } else {
                    const agora = new Date();
                    const cicloFim = new Date(agora);
                    cicloFim.setDate(cicloFim.getDate() + 30);

                    primeiroCiclo = await cicloService.criarCiclo({
                        assinaturaPlanoId: assinaturaPlano.Id,
                        userId: financeiro.UserId,
                        cicloInicio: agora,
                        cicloFim: cicloFim,
                        consultasDisponiveis: 4,
                        status: 'Ativo'
                    });
                }

                if (financeiro?.Id && primeiroCiclo) {
                    await prisma.financeiro.update({
                        where: { Id: financeiro.Id.toString() },
                        data: { CicloPlanoId: primeiroCiclo.Id }
                    });
                }
            }
        } catch (error) {
            console.error('[Webhook] Erro ao processar CicloPlano em background:', error);
        }
    }

    /**
     * Função auxiliar otimizada para atualizar CreditoAvulso e ConsultaAvulsa para Status "Ativa"
     * Chamada sempre que um pagamento é processado (bill_paid, subscription_charged, invoice_charged)
     * Agora também atualiza o Tipo baseado no PlanoAssinatura quando não fornecido
     */
    private static async _atualizarCreditoEConsultaAvulsa(
        codigoFatura: string,
        userId: string | null,
        tipoFatura?: TipoFatura
    ): Promise<void> {
        const startTime = Date.now();
        console.log('🔍 [Webhook] _atualizarCreditoEConsultaAvulsa: INICIANDO', {
            codigoFatura,
            userId,
            tipoFatura,
            timestamp: new Date().toISOString()
        });

        if (!userId) {
            console.warn('⚠️ [Webhook] _atualizarCreditoEConsultaAvulsa: userId ausente, abortando', { codigoFatura });
            return;
        }

        try {
            // Se tipoFatura não foi fornecido, tenta buscar do PlanoAssinatura através do Financeiro
            let tipoFaturaFinal = tipoFatura;
            console.log('🔍 [Webhook] _atualizarCreditoEConsultaAvulsa: TipoFatura inicial', { tipoFatura, tipoFaturaFinal });

            if (!tipoFaturaFinal) {
                // Busca o Financeiro relacionado ao CodigoFatura
                const financeiro = await prisma.financeiro.findFirst({
                    where: {
                        Fatura: {
                            CodigoFatura: codigoFatura
                        },
                        UserId: userId
                    },
                    include: {
                        PlanoAssinatura: true
                    }
                });

                // Tenta buscar pelo PlanoAssinaturaId direto do Financeiro
                if (financeiro?.PlanoAssinaturaId && financeiro?.PlanoAssinatura?.Tipo) {
                    const tipoPlano = financeiro.PlanoAssinatura.Tipo.toLowerCase();

                    // Mapeia o tipo do plano para TipoFatura
                    // Para CreditoAvulso e ConsultaAvulsa, os tipos válidos são apenas ConsultaAvulsa e PrimeiraConsulta
                    if (tipoPlano === 'unico') {
                        tipoFaturaFinal = TipoFatura.ConsultaAvulsa;
                    } else if (tipoPlano === 'primeiraConsulta' || tipoPlano === 'primeiraconsulta') {
                        tipoFaturaFinal = TipoFatura.PrimeiraConsulta;
                    } else if (tipoPlano === 'mensal' || tipoPlano === 'trimestral' || tipoPlano === 'semestral') {
                        // Para planos recorrentes em CreditoAvulso/ConsultaAvulsa, trata como ConsultaAvulsa
                        // (o tipo Plano não se aplica a esses modelos)
                        tipoFaturaFinal = TipoFatura.ConsultaAvulsa;
                    }

                    console.log(`[Webhook] Tipo detectado do PlanoAssinatura: ${tipoPlano} -> ${tipoFaturaFinal}`);
                } else {
                    // Se não encontrou pelo PlanoAssinaturaId, tenta buscar pela AssinaturaPlano
                    const assinaturaPlano = await prisma.assinaturaPlano.findFirst({
                        where: {
                            UserId: userId,
                            Status: { in: [PlanoCompraStatus.AguardandoPagamento, PlanoCompraStatus.Ativo] }
                        },
                        include: {
                            PlanoAssinatura: true
                        },
                        orderBy: { DataInicio: 'desc' }
                    });

                    if (assinaturaPlano?.PlanoAssinatura?.Tipo) {
                        const tipoPlano = assinaturaPlano.PlanoAssinatura.Tipo.toLowerCase();

                        // Mapeia o tipo do plano para TipoFatura
                        // Para CreditoAvulso e ConsultaAvulsa, os tipos válidos são apenas ConsultaAvulsa e PrimeiraConsulta
                        if (tipoPlano === 'unico') {
                            tipoFaturaFinal = TipoFatura.ConsultaAvulsa;
                        } else if (tipoPlano === 'primeiraConsulta' || tipoPlano === 'primeiraconsulta') {
                            tipoFaturaFinal = TipoFatura.PrimeiraConsulta;
                        } else if (tipoPlano === 'mensal' || tipoPlano === 'trimestral' || tipoPlano === 'semestral') {
                            // Para planos recorrentes em CreditoAvulso/ConsultaAvulsa, trata como ConsultaAvulsa
                            // (o tipo Plano não se aplica a esses modelos)
                            tipoFaturaFinal = TipoFatura.ConsultaAvulsa;
                        }

                        console.log(`[Webhook] Tipo detectado do PlanoAssinatura via AssinaturaPlano: ${tipoPlano} -> ${tipoFaturaFinal}`);
                    }
                }
            }

            console.log('🔍 [Webhook] _atualizarCreditoEConsultaAvulsa: TipoFatura final determinado', {
                tipoFaturaFinal,
                codigoFatura,
                userId
            });

            // OTIMIZAÇÃO: Busca e atualiza em paralelo usando updateMany quando possível
            // Sempre atualiza o Tipo quando tipoFaturaFinal estiver disponível
            console.log('🔍 [Webhook] _atualizarCreditoEConsultaAvulsa: Executando atualizações em paralelo...', {
                codigoFatura,
                userId,
                tipoFaturaFinal,
                whereCredito: {
                    OR: [
                        { CodigoFatura: codigoFatura },
                        { UserId: userId, Status: ConsultaAvulsaStatus.Pendente }
                    ]
                },
                whereConsulta: {
                    OR: [
                        { CodigoFatura: codigoFatura },
                        { PacienteId: userId, Status: ConsultaAvulsaStatus.Pendente }
                    ]
                }
            });

            const atualizacoes = await Promise.allSettled([
                // Atualiza CreditoAvulso
                prisma.creditoAvulso.updateMany({
                    where: {
                        OR: [
                            { CodigoFatura: codigoFatura },
                            {
                                UserId: userId,
                                Status: ConsultaAvulsaStatus.Pendente
                            }
                        ]
                    },
                    data: {
                        Status: ConsultaAvulsaStatus.Ativa,
                        CodigoFatura: codigoFatura,
                        ...(tipoFaturaFinal ? { Tipo: tipoFaturaFinal } : {})
                    }
                }),
                // Atualiza ConsultaAvulsa
                prisma.consultaAvulsa.updateMany({
                    where: {
                        OR: [
                            { CodigoFatura: codigoFatura },
                            {
                                PacienteId: userId,
                                Status: ConsultaAvulsaStatus.Pendente
                            }
                        ]
                    },
                    data: {
                        Status: ConsultaAvulsaStatus.Ativa,
                        CodigoFatura: codigoFatura,
                        ...(tipoFaturaFinal ? { Tipo: tipoFaturaFinal } : {})
                    }
                })
            ]);

            // Log resultados (não falha se não encontrar)
            const creditoResult = atualizacoes[0];
            const consultaResult = atualizacoes[1];

            console.log('🔍 [Webhook] _atualizarCreditoEConsultaAvulsa: Resultados das atualizações', {
                credito: {
                    status: creditoResult.status,
                    count: creditoResult.status === 'fulfilled' ? creditoResult.value.count : 0,
                    error: creditoResult.status === 'rejected' ? creditoResult.reason : null
                },
                consulta: {
                    status: consultaResult.status,
                    count: consultaResult.status === 'fulfilled' ? consultaResult.value.count : 0,
                    error: consultaResult.status === 'rejected' ? consultaResult.reason : null
                }
            });

            if (creditoResult.status === 'fulfilled' && creditoResult.value.count > 0) {
                console.log(`✅ [Webhook] _atualizarCreditoEConsultaAvulsa: ${creditoResult.value.count} CreditoAvulso(s) atualizado(s) para Status: Ativa${tipoFaturaFinal ? ` com Tipo: ${tipoFaturaFinal}` : ''}`);
            } else if (creditoResult.status === 'fulfilled') {
                console.log(`ℹ️ [Webhook] _atualizarCreditoEConsultaAvulsa: Nenhum CreditoAvulso encontrado para atualizar`, { codigoFatura, userId });
            } else {
                console.error(`❌ [Webhook] _atualizarCreditoEConsultaAvulsa: Erro ao atualizar CreditoAvulso:`, creditoResult.reason);
            }

            if (consultaResult.status === 'fulfilled' && consultaResult.value.count > 0) {
                console.log(`✅ [Webhook] _atualizarCreditoEConsultaAvulsa: ${consultaResult.value.count} ConsultaAvulsa(s) atualizada(s) para Status: Ativa${tipoFaturaFinal ? ` com Tipo: ${tipoFaturaFinal}` : ''}`);
            } else if (consultaResult.status === 'fulfilled') {
                console.log(`ℹ️ [Webhook] _atualizarCreditoEConsultaAvulsa: Nenhuma ConsultaAvulsa encontrada para atualizar`, { codigoFatura, userId });
            } else {
                console.error(`❌ [Webhook] _atualizarCreditoEConsultaAvulsa: Erro ao atualizar ConsultaAvulsa:`, consultaResult.reason);
            }

            const duration = Date.now() - startTime;
            console.log(`✅ [Webhook] _atualizarCreditoEConsultaAvulsa: CONCLUÍDO`, {
                codigoFatura,
                userId,
                duracao: `${duration}ms`,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            const duration = Date.now() - startTime;
            // Não falha o processamento se houver erro - apenas loga
            console.error('❌ [Webhook] _atualizarCreditoEConsultaAvulsa: ERRO (não crítico)', {
                error: error instanceof Error ? error.message : String(error),
                stack: error instanceof Error ? error.stack : undefined,
                codigoFatura,
                userId,
                duracao: `${duration}ms`,
                timestamp: new Date().toISOString()
            });
        }
    }

    /**
     * Processa Jobs pendentes da tabela Job para atualizar ConsultaAvulsa e CreditoAvulso
     * Chamado após todas as tabelas estarem preenchidas (Fatura, Financeiro, etc)
     */
    private static async _processarJobsPendentesVindi(codigoFatura: string, userId: string | null): Promise<void> {
        if (!userId) {
            return;
        }

        try {
            // Busca Jobs pendentes relacionados a este códigoFatura
            // Como o Prisma não suporta filtro direto em JSON, buscamos todos e filtramos
            const jobsPendentes = await prisma.job.findMany({
                where: {
                    OR: [
                        { Type: { startsWith: 'vindi_' } },
                        { Type: 'update_status_tabelas' }
                    ],
                    Status: 'pending',
                    RunAt: { lte: new Date() }
                },
                orderBy: { CreatedAt: 'asc' }
            });

            // Filtra jobs que correspondem ao codigoFatura
            const jobsFiltrados = jobsPendentes.filter(job => {
                const payload = job.Payload as any;
                const jobCodigoFatura = payload?.codigoFatura ||
                    payload?.bill?.id ||
                    payload?.payload?.data?.bill?.id ||
                    payload?.payload?.bill?.id ||
                    payload?.data?.bill?.id ||
                    payload?.bill?.id;
                return jobCodigoFatura && (
                    String(jobCodigoFatura) === String(codigoFatura) ||
                    payload?.codigoFatura === codigoFatura
                );
            });

            if (jobsFiltrados.length === 0) {
                return;
            }

            console.log(`[Webhook] Processando ${jobsFiltrados.length} Job(s) pendente(s) para codigoFatura: ${codigoFatura}`);

            for (const job of jobsFiltrados) {
                try {
                    const payload = job.Payload as any;
                    const eventType = payload?.eventType;

                    // Processa job de atualização de status das tabelas
                    if (job.Type === 'update_status_tabelas') {
                        await this.atualizarStatusTabelasPorJob(job.Id);
                        await JobService.completeJob(job.Id);
                        console.log(`✅ [Webhook] Job de atualização de status ${job.Id} processado e marcado como concluído`);
                    }
                    // Atualiza ConsultaAvulsa e CreditoAvulso (jobs vindi_*)
                    else if (eventType === 'bill_paid' || eventType === 'subscription_charged' || eventType === 'invoice_charged') {
                        await this._atualizarCreditoEConsultaAvulsa(
                            codigoFatura,
                            userId,
                            payload?.tipoFatura
                        );

                        // Marca job como concluído
                        await JobService.completeJob(job.Id);
                        console.log(`✅ [Webhook] Job ${job.Id} processado e marcado como concluído`);
                    }
                } catch (jobError: unknown) {
                    const err = jobError as { message?: string };
                    console.error(`[Webhook] Erro ao processar Job ${job.Id}:`, err);

                    // Incrementa tentativas
                    const attempts = job.Attempts + 1;
                    if (attempts >= job.MaxAttempts) {
                        // Marca como falho após max tentativas
                        await JobService.failJob(job.Id, err?.message || String(jobError));
                        console.log(`❌ [Webhook] Job ${job.Id} marcado como falho após ${attempts} tentativas`);
                    } else {
                        // Atualiza tentativas mas mantém como pending
                        await prisma.job.update({
                            where: { Id: job.Id },
                            data: {
                                Attempts: attempts,
                                LastError: err?.message || String(jobError),
                                UpdatedAt: new Date()
                            }
                        });
                    }
                }
            }
        } catch (error) {
            console.error('[Webhook] Erro ao processar Jobs pendentes:', error);
            throw error;
        }
    }

    // Método agora público para permitir reuso pelo serviço de retry/worker.
    public static async _atualizaFaturaEFinanceiro(bill: VindiBill, createdAt?: string): Promise<boolean> {
        try {
            const customerId = bill.customer?.id ? String(bill.customer.id) : null;
            const codigoFatura = bill?.id ? String(bill.id) : null;
            const userId = await this.resolveUserIdByCustomerId(customerId);

            console.log('[Webhook] Iniciando _atualizaFaturaEFinanceiro', { customerId, codigoFatura, userId });

            if (!customerId) {
                console.error('[Webhook] CustomerId não encontrado no bill:', bill);
                await this.audit({
                    eventType: 'bill_paid',
                    status: 'FAILED',
                    message: 'CustomerId ausente no bill',
                    userId: null,
                    paymentId: codigoFatura,
                    metadata: (bill as unknown) as Prisma.InputJsonValue
                });
                return false;
            }
            if (!codigoFatura) {
                console.error('[Webhook] codigoFatura (bill.id) não encontrado no bill:', bill);
                await this.audit({
                    eventType: 'bill_paid',
                    status: 'FAILED',
                    message: 'codigoFatura ausente no bill',
                    userId: userId ?? null,
                    paymentId: null,
                    metadata: (bill as unknown) as Prisma.InputJsonValue
                });
                return false;
            }

            // Aguarda tanto a Fatura quanto o Financeiro estarem criados no banco
            // Aumentado tentativas e tempo para garantir que registros sejam encontrados
            console.log(`[Webhook] Aguardando Fatura e Financeiro para customerId: ${customerId}, codigoFatura: ${codigoFatura}`);
            let dados = await this.waitForFaturaAndFinanceiro(customerId, codigoFatura, 60, 500, { createdAt, status: 'Pending' });

            // Se não encontrou após aguardar, tenta criar os registros faltantes usando dados do bill
            if (!dados || !dados.fatura || !dados.financeiro) {
                console.warn('[Webhook] Fatura ou Financeiro não encontrados após aguardar. Tentando criar registros faltantes...', { customerId, codigoFatura, userId });

                // Tenta criar registros faltantes usando dados do bill da Vindi
                const registrosCriados = await this.criarRegistrosFaltantes(bill, customerId, codigoFatura, userId);

                if (registrosCriados && registrosCriados.fatura && registrosCriados.financeiro) {
                    console.log('[Webhook] Registros criados com sucesso:', { faturaId: registrosCriados.fatura.Id, financeiroId: registrosCriados.financeiro.Id });
                    // Usa os registros criados
                    dados = { fatura: registrosCriados.fatura, financeiro: registrosCriados.financeiro };
                } else {
                    console.error('[Webhook] Não foi possível criar registros faltantes:', { customerId, codigoFatura, userId });
                    await this.audit({
                        eventType: 'bill_paid',
                        status: 'FAILED',
                        message: 'Fatura ou Financeiro não encontrados e não foi possível criar',
                        userId: userId ?? null,
                        paymentId: codigoFatura,
                        metadata: bill
                    });

                    // Registra na auditoria AdminActionLog também
                    try {
                        const { logPaymentError } = await import('../utils/auditLogger.util');
                        const amount = typeof bill?.amount === 'number' ? bill.amount : (bill?.amount ? Number(bill.amount) : null);
                        if (userId && amount !== null) {
                            await logPaymentError(
                                userId,
                                'plano',
                                amount / 100,
                                'Fatura ou Financeiro não encontrados e não foi possível criar',
                                { billId: codigoFatura },
                                undefined
                            );
                        }
                    } catch (auditError) {
                        console.error('[WebhookService] Erro ao registrar auditoria de erro fatura/financeiro:', auditError);
                    }

                    return false;
                }
            }

            // Verifica se fatura e financeiro existem antes de usar
            if (!dados.fatura || !dados.financeiro) {
                console.error('[Webhook] Fatura ou financeiro não encontrados após criar registros faltantes');
                return false;
            }

            let faturaAtualizada = dados.fatura;
            let financeiro = dados.financeiro;

            // Atualiza a fatura com o CodigoFatura se ainda não estiver preenchido
            // IMPORTANTE: Não altera o Tipo da fatura (preserva Multa, Plano, etc)
            if (!faturaAtualizada.CodigoFatura || faturaAtualizada.CodigoFatura !== codigoFatura) {
                console.log(`[Webhook] Atualizando CodigoFatura na fatura ${faturaAtualizada.Id} com ${codigoFatura} (Tipo atual: ${faturaAtualizada.Tipo})`);

                // IMPORTANTE: Se o financeiro não tem FaturaId ou tem FaturaId diferente, atualiza antes de atualizar a Fatura
                // Isso garante que o Financeiro esteja vinculado corretamente antes da atualização
                if (financeiro && (!financeiro.FaturaId || financeiro.FaturaId !== faturaAtualizada.Id.toString())) {
                    console.log(`[Webhook] Atualizando FaturaId do Financeiro ${financeiro.Id} para ${faturaAtualizada.Id}`);
                    financeiro = await prisma.financeiro.update({
                        where: { Id: financeiro.Id.toString() },
                        data: { FaturaId: faturaAtualizada.Id.toString() }
                    });
                }

                // IMPORTANTE: NÃO atualiza DataVencimento ao pagar - mantém a data de vencimento original da parcela
                // A DataVencimento deve ser a data de vencimento da parcela atual, não da próxima
                const [, faturaBuscada] = await Promise.all([
                    prisma.fatura.updateMany({
                        where: { Id: faturaAtualizada.Id.toString() },
                        data: {
                            CodigoFatura: codigoFatura,
                            Status: FaturaStatus.Paid
                            // NÃO altera DataVencimento - preserva a data de vencimento original da parcela
                            // NÃO altera o Tipo - preserva o tipo original (Multa, Plano, etc)
                        }
                    }),
                    prisma.fatura.findFirst({ where: { Id: faturaAtualizada.Id.toString() } })
                ]);
                faturaAtualizada = faturaBuscada ?? faturaAtualizada;
            } else {
                // Se o CodigoFatura já está correto, apenas atualiza o status
                console.log(`[Webhook] Atualizando status da fatura ${faturaAtualizada.Id} para Paid (Tipo: ${faturaAtualizada.Tipo})`);

                // IMPORTANTE: Garante que o Financeiro está vinculado à Fatura correta
                if (financeiro && (!financeiro.FaturaId || financeiro.FaturaId !== faturaAtualizada.Id.toString())) {
                    console.log(`[Webhook] Atualizando FaturaId do Financeiro ${financeiro.Id} para ${faturaAtualizada.Id}`);
                    financeiro = await prisma.financeiro.update({
                        where: { Id: financeiro.Id.toString() },
                        data: { FaturaId: faturaAtualizada.Id.toString() }
                    });
                }

                // IMPORTANTE: NÃO atualiza DataVencimento ao pagar - mantém a data de vencimento original da parcela
                const [, faturaBuscada] = await Promise.all([
                    prisma.fatura.updateMany({
                        where: { CodigoFatura: codigoFatura },
                        data: {
                            Status: FaturaStatus.Paid
                            // NÃO altera DataVencimento - preserva a data de vencimento original da parcela
                            // NÃO altera o Tipo - preserva o tipo original (Multa, Plano, etc)
                        }
                    }),
                    prisma.fatura.findFirst({ where: { CodigoFatura: codigoFatura } })
                ]);
                faturaAtualizada = faturaBuscada ?? faturaAtualizada;
            }

            // OTIMIZAÇÃO: Atualiza financeiro e busca atualizado em paralelo
            // IMPORTANTE: NÃO altera DataVencimento ao pagar - mantém a data de vencimento original da parcela
            // NÃO altera o Tipo do financeiro (preserva Multa, Plano, etc)
            console.log(`[Webhook] Atualizando Financeiro ${financeiro.Id} para Aprovado (Tipo atual: ${financeiro.Tipo})`);
            const financeiroId = financeiro.Id.toString();

            const [, financeiroAtualizadoCompleto] = await Promise.all([
                prisma.financeiro.update({
                    where: { Id: financeiroId },
                    data: {
                        Status: ControleFinanceiroStatus.Aprovado
                        // NÃO altera DataVencimento - preserva a data de vencimento original da parcela
                        // NÃO altera o Tipo - preserva o tipo original (Multa, Plano, etc)
                    }
                }),
                prisma.financeiro.findFirst({
                    where: { Id: financeiroId }
                })
            ]);

            // Usa o financeiro atualizado completo
            financeiro = financeiroAtualizadoCompleto ?? financeiro;

            // OTIMIZAÇÃO: Atualiza CreditoAvulso e ConsultaAvulsa para TODOS os tipos (exceto Multa)
            // Usa função auxiliar otimizada que faz updateMany em paralelo
            if (faturaAtualizada?.Tipo !== TipoFatura.Multa && financeiro?.UserId) {
                await this._atualizarCreditoEConsultaAvulsa(
                    codigoFatura,
                    financeiro.UserId,
                    faturaAtualizada.Tipo
                );
            }

            // Se for PrimeiraConsulta, garante que o tipo está correto (função auxiliar já atualizou)
            if (faturaAtualizada?.Tipo === TipoFatura.PrimeiraConsulta) {
                console.log(`[Webhook] PrimeiraConsulta processada para userId: ${financeiro?.UserId}`);

                // Atualiza tipo se necessário (função auxiliar já atualizou status)
                if (financeiro?.UserId) {
                    await Promise.all([
                        prisma.creditoAvulso.updateMany({
                            where: {
                                CodigoFatura: codigoFatura,
                                UserId: financeiro.UserId
                            },
                            data: { Tipo: TipoFatura.PrimeiraConsulta }
                        }).catch(() => { }),
                        prisma.consultaAvulsa.updateMany({
                            where: {
                                CodigoFatura: codigoFatura,
                                PacienteId: financeiro.UserId
                            },
                            data: { Tipo: TipoFatura.PrimeiraConsulta }
                        }).catch(() => { })
                    ]);
                }
            }


            // Atualiza AssinaturaPlano e cria/renova ciclo se necessário
            // NOTA: Para renovações automáticas, subscription_charged ou invoice_charged já processam
            // Este bloco só processa se NÃO for uma renovação automática (bill_paid pode ser usado para primeira compra ou outros tipos)
            if (financeiro?.UserId && faturaAtualizada?.Tipo === 'Plano') {
                // Busca AssinaturaPlano com status AguardandoPagamento ou Ativo
                const assinaturaPlano = await prisma.assinaturaPlano.findFirst({
                    where: {
                        UserId: financeiro.UserId,
                        Status: { in: [PlanoCompraStatus.AguardandoPagamento, PlanoCompraStatus.Ativo] }
                    },
                    orderBy: { DataInicio: 'desc' },
                    include: { PlanoAssinatura: true }
                });

                if (assinaturaPlano) {
                    // Verifica se já existe ciclo ativo recente (criado nos últimos 5 minutos)
                    // Se sim, provavelmente já foi processado por subscription_charged ou invoice_charged
                    const cicloService = new CicloPlanoService();
                    const cicloAtivo = await cicloService.buscarCicloAtivo(assinaturaPlano.Id, financeiro.UserId);

                    const cicloRecente = cicloAtivo && cicloAtivo.CreatedAt
                        ? (new Date().getTime() - new Date(cicloAtivo.CreatedAt).getTime()) < (5 * 60 * 1000)
                        : false;

                    if (cicloRecente) {
                        console.log(`[Webhook] bill_paid: Ciclo recente detectado, provavelmente já processado por subscription_charged/invoice_charged. Pulando criação de ciclo.`);
                        // Apenas atualiza status da assinatura se necessário
                        if (assinaturaPlano.Status !== PlanoCompraStatus.Ativo) {
                            await prisma.assinaturaPlano.updateMany({
                                where: { Id: assinaturaPlano.Id },
                                data: { Status: PlanoCompraStatus.Ativo }
                            });
                        }
                        // Vincula financeiro ao ciclo existente se ainda não estiver vinculado
                        if (financeiro && cicloAtivo && !financeiro.CicloPlanoId) {
                            await prisma.financeiro.update({
                                where: { Id: financeiro.Id },
                                data: { CicloPlanoId: cicloAtivo.Id }
                            });
                            console.log(`[Webhook] bill_paid: Financeiro ${financeiro.Id} vinculado ao ciclo existente ${cicloAtivo.Id}`);
                        }
                    } else {
                        // Não há ciclo recente, processa normalmente (primeira compra ou renovação manual)
                        console.log(`[Webhook] bill_paid: Processando pagamento de plano para AssinaturaPlano: ${assinaturaPlano.Id}`);

                        // Atualiza status da assinatura (mas NÃO atualiza DataFim - permanece fixo)
                        await prisma.assinaturaPlano.updateMany({
                            where: {
                                Id: assinaturaPlano.Id
                            },
                            data: { Status: PlanoCompraStatus.Ativo }
                        });

                        if (cicloAtivo) {
                            // É uma renovação - cria novo ciclo
                            console.log(`[Webhook] bill_paid: Renovação detectada. Criando novo ciclo para AssinaturaPlano: ${assinaturaPlano.Id}`);

                            const novoCiclo = await cicloService.renovarCiclo({
                                assinaturaPlanoId: assinaturaPlano.Id,
                                userId: financeiro.UserId,
                                consultasDisponiveis: 4
                            });

                            // Atualiza financeiro para vincular ao novo ciclo
                            if (financeiro && novoCiclo) {
                                await prisma.financeiro.update({
                                    where: { Id: financeiro.Id },
                                    data: { CicloPlanoId: novoCiclo.Id }
                                });
                                console.log(`[Webhook] bill_paid: Financeiro ${financeiro.Id} vinculado ao novo ciclo ${novoCiclo.Id}`);
                            }
                        } else {
                            // É primeira compra - busca ciclo pendente ou cria novo
                            console.log(`[Webhook] bill_paid: Primeira compra. Buscando ou criando ciclo para AssinaturaPlano: ${assinaturaPlano.Id}`);

                            // Busca ciclo pendente existente
                            const cicloPendente = await prisma.cicloPlano.findFirst({
                                where: {
                                    AssinaturaPlanoId: assinaturaPlano.Id,
                                    UserId: financeiro.UserId,
                                    Status: "Pendente"
                                },
                                orderBy: { CreatedAt: 'desc' }
                            });

                            let primeiroCiclo;

                            if (cicloPendente) {
                                // Ativa o ciclo pendente
                                console.log(`[Webhook] bill_paid: Ativando ciclo pendente ${cicloPendente.Id}`);
                                primeiroCiclo = await cicloService.ativarCiclo(cicloPendente.Id);
                            } else {
                                // Cria novo ciclo já como Ativo (caso não tenha sido criado na compra)
                                // Cada ciclo sempre tem 30 dias de duração, independente do tipo de plano
                                const agora = new Date();
                                const cicloFim = new Date(agora);
                                cicloFim.setDate(cicloFim.getDate() + 30); // Ciclo sempre tem 30 dias

                                console.log('[Webhook] bill_paid: Criando novo ciclo (primeira compra):', {
                                    assinaturaPlanoId: assinaturaPlano.Id,
                                    userId: financeiro.UserId,
                                    cicloInicio: agora,
                                    cicloFim: cicloFim,
                                    cicloFimIsValid: cicloFim instanceof Date && !isNaN(cicloFim.getTime())
                                });

                                primeiroCiclo = await cicloService.criarCiclo({
                                    assinaturaPlanoId: assinaturaPlano.Id,
                                    userId: financeiro.UserId,
                                    cicloInicio: agora,
                                    cicloFim: cicloFim,
                                    consultasDisponiveis: 4,
                                    status: "Ativo" // Já cria como Ativo se não havia ciclo pendente
                                });

                                console.log('[Webhook] bill_paid: Ciclo criado com sucesso:', {
                                    cicloId: primeiroCiclo.Id,
                                    cicloFim: primeiroCiclo.CicloFim
                                });
                            }

                            // Atualiza financeiro para vincular ao ciclo
                            if (financeiro && primeiroCiclo) {
                                await prisma.financeiro.update({
                                    where: { Id: financeiro.Id },
                                    data: { CicloPlanoId: primeiroCiclo.Id }
                                });
                                console.log(`[Webhook] bill_paid: Financeiro ${financeiro.Id} vinculado ao ciclo ${primeiroCiclo.Id}`);
                            }

                            // Atualiza ControleConsultaMensal existente (se houver) para vincular ao ciclo
                            await prisma.controleConsultaMensal.updateMany({
                                where: {
                                    UserId: financeiro.UserId,
                                    AssinaturaPlanoId: assinaturaPlano.Id,
                                    Status: { in: [ControleConsultaMensalStatus.AguardandoPagamento, ControleConsultaMensalStatus.Ativo] }
                                },
                                data: {
                                    Status: ControleConsultaMensalStatus.Ativo,
                                    CicloPlanoId: primeiroCiclo.Id
                                }
                            });
                        }
                    }
                } else {
                    console.error('[Webhook] bill_paid: Nenhum AssinaturaPlano encontrado para UserId:', financeiro.UserId);
                }
            }

            // Ativa ciclos pendentes vinculados ao financeiro após confirmação de pagamento
            if (financeiro?.CicloPlanoId) {
                const cicloPendente = await prisma.cicloPlano.findUnique({
                    where: { Id: financeiro.CicloPlanoId },
                });

                if (cicloPendente && cicloPendente.Status === "Pendente") {
                    console.log(`[Webhook] bill_paid: Ativando ciclo pendente ${cicloPendente.Id} após confirmação de pagamento`);
                    const cicloService = new CicloPlanoService();
                    await cicloService.ativarCiclo(cicloPendente.Id);
                }
            }

            // Envia notificação em tempo real para o usuário (cliente)
            try {
                if (financeiro?.UserId) {
                    const ws = new WebSocketNotificationService();
                    const notifier = new NotificationService(ws);

                    // Notificar quando for pagamento de Plano
                    if (faturaAtualizada?.Tipo === TipoFatura.Plano) {
                        const mensagemBase = 'Pagamento aprovado! Seu plano foi ativado e suas 4 consultas liberadas';

                        await notifier.sendNotification({
                            userId: financeiro.UserId,
                            title: 'Pagamento aprovado',
                            message: mensagemBase,
                            type: 'success'
                        });

                        // Gera e envia contrato para o paciente após ativação do plano (primeira compra)
                        try {
                            // Verifica se já existe um contrato para evitar duplicação
                            const contratoExistente = await prisma.document.findFirst({
                                where: {
                                    UserId: financeiro.UserId,
                                    Type: 'ContratoPaciente'
                                }
                            });

                            if (!contratoExistente) {
                                console.log('[Webhook] bill_paid: Gerando contrato para paciente após ativação do plano');

                                // Busca assinatura ativa para obter o plano
                                const assinatura = await prisma.assinaturaPlano.findFirst({
                                    where: {
                                        UserId: financeiro.UserId,
                                        Status: PlanoCompraStatus.Ativo
                                    },
                                    include: {
                                        PlanoAssinatura: true
                                    }
                                });

                                if (assinatura?.PlanoAssinatura) {
                                    const contratoService = new ContratoService();
                                    // Determina o template baseado no tipo do plano
                                    const tipoPlano = assinatura.PlanoAssinatura.Tipo || null;
                                    const templateName = getTemplateContratoByTipoPlano(tipoPlano);
                                    console.log(`[Webhook] bill_paid: Gerando contrato com template ${templateName} para plano tipo ${tipoPlano}`);
                                    // Converte PlanoAssinatura para o formato Plano esperado
                                    const planoConvertido: Plano = {
                                        Id: Number(assinatura.PlanoAssinatura.Id) || 0,
                                        Nome: assinatura.PlanoAssinatura.Nome,
                                        Descricao: typeof assinatura.PlanoAssinatura.Descricao === 'string'
                                            ? assinatura.PlanoAssinatura.Descricao
                                            : JSON.stringify(assinatura.PlanoAssinatura.Descricao),
                                        Preco: assinatura.PlanoAssinatura.Preco,
                                        Tipo: assinatura.PlanoAssinatura.Tipo,
                                        Duracao: String(assinatura.PlanoAssinatura.Duracao),
                                        VindiPlanId: assinatura.PlanoAssinatura.VindiPlanId || '',
                                        ProductId: assinatura.PlanoAssinatura.ProductId || ''
                                    };
                                    await contratoService.gerarContratoPaciente(
                                        financeiro.UserId,
                                        planoConvertido,
                                        templateName
                                    );
                                    console.log('[Webhook] bill_paid: Contrato gerado e enviado para o paciente com sucesso');
                                }
                            } else {
                                console.log('[Webhook] bill_paid: Contrato já existe para este paciente, pulando geração');
                            }
                        } catch (contratoError) {
                            console.error('[Webhook] bill_paid: Erro ao gerar contrato para paciente:', contratoError);
                            // Não falha o processo se o contrato falhar
                        }
                    }
                    // Notificar quando for pagamento de ConsultaAvulsa
                    else if (faturaAtualizada?.Tipo === TipoFatura.ConsultaAvulsa) {
                        // Busca a ConsultaAvulsa atualizada após a atualização para obter a quantidade correta
                        let quantidade = 1; // default
                        try {
                            const consultaAvulsaAtualizada = await prisma.consultaAvulsa.findFirst({
                                where: {
                                    PacienteId: financeiro.UserId,
                                    CodigoFatura: codigoFatura
                                },
                                orderBy: { DataCriacao: 'desc' }
                            });
                            if (consultaAvulsaAtualizada?.Quantidade) {
                                quantidade = consultaAvulsaAtualizada.Quantidade;
                            }
                        } catch (err) {
                            console.warn('[Webhook] Erro ao buscar quantidade de ConsultaAvulsa para notificação:', err);
                        }

                        const mensagemBase = quantidade === 1
                            ? 'Pagamento recebido com sucesso! Sua consulta avulsa foi ativada e está disponível para uso. Ela tem validade de 30 dias a partir de hoje.'
                            : `Pagamento recebido com sucesso! Suas ${quantidade} consultas avulsas foram ativadas e estão disponíveis para uso. Cada uma tem validade de 30 dias a partir de hoje.`;

                        await notifier.sendNotification({
                            userId: financeiro.UserId,
                            title: '✅ Consulta Avulsa Ativada',
                            message: mensagemBase,
                            type: 'success'
                        });
                    }
                    // Notificar quando for pagamento de PrimeiraConsulta
                    else if (faturaAtualizada?.Tipo === TipoFatura.PrimeiraConsulta) {
                        const mensagemBase = 'Pagamento aprovado! Sua primeira consulta foi ativada e está disponível para uso.';

                        await notifier.sendNotification({
                            userId: financeiro.UserId,
                            title: 'Pagamento aprovado',
                            message: mensagemBase,
                            type: 'success'
                        });
                    }
                }
            } catch (notifyErr) {
                console.warn('[Webhook] Falha ao enviar notificação via WebSocket (prosseguindo):', notifyErr);
            }

            await this.audit({
                eventType: 'bill_paid',
                status: 'SUCCESS',
                message: 'Pagamento aprovado',
                userId: financeiro?.UserId ?? userId ?? null,
                paymentId: codigoFatura,
                amount: faturaAtualizada?.Valor ?? financeiro?.Valor ?? null,
                metadata: bill
            });

            // Emite evento via EventSync para atualizar frontend em tempo real
            try {
                if (financeiro?.UserId) {
                    const { getEventSyncService } = await import('./eventSync.service');
                    const eventSync = getEventSyncService();

                    // Publica evento de atualização de pagamento
                    await eventSync.publishEvent('payment:updated', {
                        userId: financeiro.UserId,
                        financeiroId: financeiro.Id,
                        codigoFatura: codigoFatura,
                        status: 'Aprovado',
                        tipo: faturaAtualizada?.Tipo || financeiro.Tipo,
                        valor: faturaAtualizada?.Valor ?? financeiro.Valor,
                        timestamp: new Date().toISOString()
                    });

                    console.log(`[Webhook] Evento payment:updated publicado para userId: ${financeiro.UserId}`);
                }
            } catch (eventErr) {
                console.warn('[Webhook] Falha ao publicar evento payment:updated (prosseguindo):', eventErr);
            }

            console.log('[Webhook] _atualizaFaturaEFinanceiro finalizado com sucesso', { codigoFatura, userId: financeiro?.UserId ?? userId });

            // Se chegou até aqui, sucesso
            return true;
        } catch (err: unknown) {
            const errObj = err as { code?: string; meta?: unknown; message?: string };
            // Se for erro de registro não encontrado (P2025) retorna false para retry
            if (errObj?.code === 'P2025') {
                console.warn('[Webhook] Registro não encontrado durante atualização da fatura, indicará retry:', errObj.meta || errObj.message);
                await this.audit({
                    eventType: 'bill_paid',
                    status: 'FAILED',
                    message: 'P2025 durante atualização da fatura',
                    userId: null,
                    paymentId: String(bill?.id ?? ''),
                    metadata: { error: errObj?.meta || errObj?.message, bill }
                });

                // Registra na auditoria AdminActionLog também
                try {
                    const { logPaymentError } = await import('../utils/auditLogger.util');
                    const amount = typeof bill?.amount === 'number' ? bill.amount : (bill?.amount ? Number(bill.amount) : null);
                    const userIdFromBill = await this.resolveUserIdFromBill(bill);
                    if (userIdFromBill && amount !== null) {
                        await logPaymentError(
                            userIdFromBill,
                            'plano',
                            amount / 100,
                            'P2025 durante atualização da fatura',
                            { billId: String(bill?.id ?? ''), error: errObj?.meta || errObj?.message },
                            undefined
                        );
                    }
                } catch (auditError) {
                    console.error('[WebhookService] Erro ao registrar auditoria de erro P2025:', auditError);
                }

                return false;
            }
            // Para outros erros, log e retorne false (para retrys) — ajuste conforme necessidade.
            console.error('[Webhook] Erro inesperado em _atualizaFaturaEFinanceiro:', err);
            await this.audit({
                eventType: 'bill_paid',
                status: 'FAILED',
                message: 'Erro inesperado na atualização',
                userId: null,
                paymentId: String(bill?.id ?? ''),
                metadata: { error: errObj?.message || String(err), bill }
            });

            // Registra na auditoria AdminActionLog também
            try {
                const { logPaymentError } = await import('../utils/auditLogger.util');
                const amount = typeof bill?.amount === 'number' ? bill.amount : (bill?.amount ? Number(bill.amount) : null);
                const userIdFromBill = await this.resolveUserIdFromBill(bill);
                if (userIdFromBill && amount !== null) {
                    await logPaymentError(
                        userIdFromBill,
                        'plano',
                        amount / 100,
                        'Erro inesperado na atualização',
                        { billId: String(bill?.id ?? ''), error: errObj?.message || String(err) },
                        undefined
                    );
                }
            } catch (auditError) {
                console.error('[WebhookService] Erro ao registrar auditoria de erro inesperado:', auditError);
            }

            return false;
        }
    }

    /**
     * Handler para subscription_charged - Processa renovação de assinatura e cria novo ciclo
     */
    static async handleSubscriptionCharged(subscription: VindiSubscription, bill: VindiBill, createdAt: string) {
        console.log('[Webhook] subscription_charged recebido:', { subscriptionId: subscription?.id, billId: bill?.id });

        try {
            const customerId = subscription?.customer?.id ? String(subscription.customer.id) : null;
            const userId = await this.resolveUserIdByCustomerId(customerId);

            if (!userId) {
                console.error('[Webhook] subscription_charged: userId não encontrado para customerId:', customerId);
                await this.audit({
                    eventType: 'subscription_charged',
                    status: 'FAILED',
                    message: 'UserId não encontrado',
                    userId: null,
                    paymentId: String(subscription?.id ?? ''),
                    metadata: { subscription, bill }
                });
                return;
            }

            // Busca a assinatura do plano
            const subscriptionId = subscription?.id ? String(subscription.id) : null;
            const assinaturaPlano = await prisma.assinaturaPlano.findFirst({
                where: {
                    UserId: userId,
                    VindiSubscriptionId: subscriptionId,
                    Status: { in: [PlanoCompraStatus.Ativo] }
                },
                include: { PlanoAssinatura: true }
            });

            if (!assinaturaPlano) {
                console.warn('[Webhook] subscription_charged: AssinaturaPlano não encontrada para subscriptionId:', subscriptionId);
                await this.audit({
                    eventType: 'subscription_charged',
                    status: 'FAILED',
                    message: 'AssinaturaPlano não encontrada',
                    userId,
                    paymentId: subscriptionId,
                    metadata: { subscription, bill }
                });
                return;
            }

            console.log(`[Webhook] subscription_charged: Processando renovação para AssinaturaPlano: ${assinaturaPlano.Id}`);

            // Processa o pagamento do bill se fornecido
            if (bill) {
                await this._atualizaFaturaEFinanceiro(bill, createdAt);

                // OTIMIZAÇÃO: Garante que CreditoAvulso e ConsultaAvulsa sejam atualizados
                const codigoFatura = bill?.id ? String(bill.id) : null;
                if (codigoFatura && userId) {
                    await this._atualizarCreditoEConsultaAvulsa(codigoFatura, userId);
                }
            }

            // Cria novo ciclo para a renovação
            const cicloService = new CicloPlanoService();
            const cicloAtivo = await cicloService.buscarCicloAtivo(assinaturaPlano.Id, userId);

            if (cicloAtivo) {
                // É uma renovação - cria novo ciclo
                console.log(`[Webhook] subscription_charged: Renovação detectada. Criando novo ciclo para AssinaturaPlano: ${assinaturaPlano.Id}`);

                const novoCiclo = await cicloService.renovarCiclo({
                    assinaturaPlanoId: assinaturaPlano.Id,
                    userId: userId,
                    consultasDisponiveis: 4
                });

                // Se houver bill, vincula o financeiro ao novo ciclo
                if (bill?.id) {
                    const codigoFatura = String(bill.id);
                    const financeiro = await prisma.financeiro.findFirst({
                        where: {
                            Fatura: { CodigoFatura: codigoFatura },
                            UserId: userId
                        }
                    });

                    if (financeiro && novoCiclo) {
                        await prisma.financeiro.update({
                            where: { Id: financeiro.Id },
                            data: { CicloPlanoId: novoCiclo.Id }
                        });
                        console.log(`[Webhook] subscription_charged: Financeiro ${financeiro.Id} vinculado ao novo ciclo ${novoCiclo.Id}`);
                    }
                }

                // Envia notificação
                await this.notifyUser(
                    userId,
                    'Plano Renovado',
                    `Seu plano foi renovado com sucesso! Novo ciclo iniciado com 4 consultas disponíveis.`,
                    'success'
                );
            } else {
                // Busca ciclo pendente ou cria novo
                const cicloPendente = await prisma.cicloPlano.findFirst({
                    where: {
                        AssinaturaPlanoId: assinaturaPlano.Id,
                        UserId: userId,
                        Status: "Pendente"
                    },
                    orderBy: { CreatedAt: 'desc' }
                });

                let primeiroCiclo;

                if (cicloPendente) {
                    // Ativa o ciclo pendente
                    console.log(`[Webhook] subscription_charged: Ativando ciclo pendente ${cicloPendente.Id}`);
                    primeiroCiclo = await cicloService.ativarCiclo(cicloPendente.Id);
                } else {
                    // Cria novo ciclo já como Ativo (renovação)
                    // Cada ciclo sempre tem 30 dias de duração, independente do tipo de plano
                    console.log(`[Webhook] subscription_charged: Criando novo ciclo para AssinaturaPlano: ${assinaturaPlano.Id}`);
                    const agora = new Date();
                    const cicloFim = new Date(agora);
                    cicloFim.setDate(cicloFim.getDate() + 30); // Ciclo sempre tem 30 dias

                    console.log('[Webhook] subscription_charged: Criando novo ciclo:', {
                        assinaturaPlanoId: assinaturaPlano.Id,
                        userId: userId,
                        cicloInicio: agora,
                        cicloFim: cicloFim,
                        cicloFimIsValid: cicloFim instanceof Date && !isNaN(cicloFim.getTime())
                    });

                    primeiroCiclo = await cicloService.criarCiclo({
                        assinaturaPlanoId: assinaturaPlano.Id,
                        userId: userId,
                        cicloInicio: agora,
                        cicloFim: cicloFim,
                        consultasDisponiveis: 4,
                        status: "Ativo"
                    });

                    console.log('[Webhook] subscription_charged: Ciclo criado com sucesso:', {
                        cicloId: primeiroCiclo.Id,
                        cicloFim: primeiroCiclo.CicloFim
                    });
                }

                // Se houver bill, vincula o financeiro ao ciclo
                if (bill?.id && primeiroCiclo) {
                    const codigoFatura = String(bill.id);
                    const financeiro = await prisma.financeiro.findFirst({
                        where: {
                            Fatura: { CodigoFatura: codigoFatura },
                            UserId: userId
                        }
                    });

                    if (financeiro) {
                        await prisma.financeiro.update({
                            where: { Id: financeiro.Id },
                            data: { CicloPlanoId: primeiroCiclo.Id }
                        });
                        console.log(`[Webhook] subscription_charged: Financeiro ${financeiro.Id} vinculado ao ciclo ${primeiroCiclo.Id}`);
                    }
                }
            }

            await this.audit({
                eventType: 'subscription_charged',
                status: 'SUCCESS',
                message: 'Renovação processada e novo ciclo criado',
                userId,
                paymentId: subscriptionId,
                metadata: { subscription, bill }
            });

        } catch (error: unknown) {
            const err = error as { message?: string };
            console.error('[Webhook] subscription_charged: Erro ao processar renovação:', error);
            await this.audit({
                eventType: 'subscription_charged',
                status: 'FAILED',
                message: `Erro: ${err?.message || String(error)}`,
                userId: null,
                paymentId: String(subscription?.id ?? ''),
                metadata: { error: err?.message || String(error), subscription, bill }
            });
        }
    }

    /**
     * Handler para invoice_charged - Processa renovação via invoice e cria novo ciclo
     */
    static async handleInvoiceCharged(invoice: VindiInvoice, bill: VindiBill, createdAt: string) {
        console.log('[Webhook] invoice_charged recebido:', { invoiceId: invoice?.id, billId: bill?.id });

        try {
            // Invoice geralmente vem com subscription_id
            const subscriptionId = invoice?.subscription?.id || invoice?.subscription_id;
            if (!subscriptionId) {
                console.warn('[Webhook] invoice_charged: subscription_id não encontrado no invoice');
                return;
            }

            const customerId = invoice?.customer?.id ? String(invoice.customer.id) : null;
            const userId = await this.resolveUserIdByCustomerId(customerId);

            if (!userId) {
                console.error('[Webhook] invoice_charged: userId não encontrado para customerId:', customerId);
                return;
            }

            // Busca a assinatura do plano
            const assinaturaPlano = await prisma.assinaturaPlano.findFirst({
                where: {
                    UserId: userId,
                    VindiSubscriptionId: String(subscriptionId),
                    Status: { in: [PlanoCompraStatus.Ativo] }
                },
                include: { PlanoAssinatura: true }
            });

            if (!assinaturaPlano) {
                console.warn('[Webhook] invoice_charged: AssinaturaPlano não encontrada para subscriptionId:', subscriptionId);
                return;
            }

            console.log(`[Webhook] invoice_charged: Processando renovação para AssinaturaPlano: ${assinaturaPlano.Id}`);

            // Processa o pagamento do bill se fornecido
            if (bill) {
                await this._atualizaFaturaEFinanceiro(bill, createdAt);

                // OTIMIZAÇÃO: Garante que CreditoAvulso e ConsultaAvulsa sejam atualizados
                const codigoFatura = bill?.id ? String(bill.id) : null;
                if (codigoFatura && userId) {
                    await this._atualizarCreditoEConsultaAvulsa(codigoFatura, userId);
                }
            }

            // Cria novo ciclo para a renovação
            const cicloService = new CicloPlanoService();
            const cicloAtivo = await cicloService.buscarCicloAtivo(assinaturaPlano.Id, userId);

            if (cicloAtivo) {
                // É uma renovação - cria novo ciclo
                console.log(`[Webhook] invoice_charged: Renovação detectada. Criando novo ciclo para AssinaturaPlano: ${assinaturaPlano.Id}`);

                const novoCiclo = await cicloService.renovarCiclo({
                    assinaturaPlanoId: assinaturaPlano.Id,
                    userId: userId,
                    consultasDisponiveis: 4
                });

                // Se houver bill, vincula o financeiro ao novo ciclo
                if (bill?.id) {
                    const codigoFatura = String(bill.id);
                    const financeiro = await prisma.financeiro.findFirst({
                        where: {
                            Fatura: { CodigoFatura: codigoFatura },
                            UserId: userId
                        }
                    });

                    if (financeiro && novoCiclo) {
                        await prisma.financeiro.update({
                            where: { Id: financeiro.Id },
                            data: { CicloPlanoId: novoCiclo.Id }
                        });
                        console.log(`[Webhook] invoice_charged: Financeiro ${financeiro.Id} vinculado ao novo ciclo ${novoCiclo.Id}`);
                    }
                }

                // Envia notificação
                await this.notifyUser(
                    userId,
                    'Plano Renovado',
                    `Seu plano foi renovado com sucesso! Novo ciclo iniciado com 4 consultas disponíveis.`,
                    'success'
                );
            } else {
                // Busca ciclo pendente ou cria novo
                const cicloPendente = await prisma.cicloPlano.findFirst({
                    where: {
                        AssinaturaPlanoId: assinaturaPlano.Id,
                        UserId: userId,
                        Status: "Pendente"
                    },
                    orderBy: { CreatedAt: 'desc' }
                });

                if (cicloPendente) {
                    // Ativa o ciclo pendente
                    console.log(`[Webhook] invoice_charged: Ativando ciclo pendente ${cicloPendente.Id}`);
                    const primeiroCiclo = await cicloService.ativarCiclo(cicloPendente.Id);

                    // Se houver bill, vincula o financeiro ao ciclo
                    if (bill?.id) {
                        const codigoFatura = String(bill.id);
                        const financeiro = await prisma.financeiro.findFirst({
                            where: {
                                Fatura: { CodigoFatura: codigoFatura },
                                UserId: userId
                            }
                        });

                        if (financeiro && primeiroCiclo) {
                            await prisma.financeiro.update({
                                where: { Id: financeiro.Id },
                                data: { CicloPlanoId: primeiroCiclo.Id }
                            });
                            console.log(`[Webhook] invoice_charged: Financeiro ${financeiro.Id} vinculado ao ciclo ${primeiroCiclo.Id}`);
                        }
                    }
                } else {
                    // Cria novo ciclo já como Ativo (renovação)
                    console.log(`[Webhook] invoice_charged: Criando novo ciclo para AssinaturaPlano: ${assinaturaPlano.Id}`);
                    const agora = new Date();
                    // Cada ciclo sempre tem 30 dias de duração, independente do tipo de plano
                    const cicloFim = new Date(agora);
                    cicloFim.setDate(cicloFim.getDate() + 30); // Ciclo sempre tem 30 dias

                    console.log('[Webhook] invoice_charged: Criando novo ciclo:', {
                        assinaturaPlanoId: assinaturaPlano.Id,
                        userId: userId,
                        cicloInicio: agora,
                        cicloFim: cicloFim,
                        cicloFimIsValid: cicloFim instanceof Date && !isNaN(cicloFim.getTime())
                    });

                    const primeiroCiclo = await cicloService.criarCiclo({
                        assinaturaPlanoId: assinaturaPlano.Id,
                        userId: userId,
                        cicloInicio: agora,
                        cicloFim: cicloFim,
                        consultasDisponiveis: 4,
                        status: "Ativo"
                    });

                    console.log('[Webhook] invoice_charged: Ciclo criado com sucesso:', {
                        cicloId: primeiroCiclo.Id,
                        cicloFim: primeiroCiclo.CicloFim
                    });

                    // Se houver bill, vincula o financeiro ao ciclo
                    if (bill?.id) {
                        const codigoFatura = String(bill.id);
                        const financeiro = await prisma.financeiro.findFirst({
                            where: {
                                Fatura: { CodigoFatura: codigoFatura },
                                UserId: userId
                            }
                        });

                        if (financeiro && primeiroCiclo) {
                            await prisma.financeiro.update({
                                where: { Id: financeiro.Id },
                                data: { CicloPlanoId: primeiroCiclo.Id }
                            });
                            console.log(`[Webhook] invoice_charged: Financeiro ${financeiro.Id} vinculado ao ciclo ${primeiroCiclo.Id}`);
                        }
                    }
                }
            }

            await this.audit({
                eventType: 'invoice_charged',
                status: 'SUCCESS',
                message: 'Renovação processada e novo ciclo criado',
                userId,
                paymentId: String(invoice?.id ?? ''),
                metadata: { invoice, bill }
            });

        } catch (error: unknown) {
            const err = error as { message?: string };
            console.error('[Webhook] invoice_charged: Erro ao processar renovação:', error);
            await this.audit({
                eventType: 'invoice_charged',
                status: 'FAILED',
                message: `Erro: ${err?.message || String(error)}`,
                userId: null,
                paymentId: String(invoice?.id ?? ''),
                metadata: { error: err?.message || String(error), invoice, bill }
            });
        }
    }

    /**
     * Atualiza os status das tabelas Financeiro, Fatura, ConsultaAvulsa e CreditoAvulso
     * baseado no bill.id do payload do job
     * Compara o bill.id com CodigoFatura e atualiza os status correspondentes
     */
    public static async atualizarStatusTabelasPorJob(jobId: string): Promise<void> {
        const startTime = Date.now();
        console.log('🔍 [Webhook] atualizarStatusTabelasPorJob: INICIANDO', { jobId, timestamp: new Date().toISOString() });

        try {
            // Busca o job
            console.log('🔍 [Webhook] atualizarStatusTabelasPorJob: Buscando job no banco...', { jobId });
            const job = await prisma.job.findUnique({
                where: { Id: jobId }
            });

            if (!job || !job.Payload) {
                console.error('❌ [Webhook] atualizarStatusTabelasPorJob: Job não encontrado ou sem payload', { jobId, hasJob: !!job, hasPayload: !!job?.Payload });
                throw new Error(`Job ${jobId} não encontrado ou sem payload`);
            }

            console.log('🔍 [Webhook] atualizarStatusTabelasPorJob: Job encontrado', {
                jobId,
                type: job.Type,
                status: job.Status,
                hasPayload: !!job.Payload
            });

            const payload = job.Payload as any;
            console.log('🔍 [Webhook] atualizarStatusTabelasPorJob: Payload extraído', {
                payloadKeys: Object.keys(payload || {}),
                hasPayloadPayload: !!payload?.payload,
                hasData: !!payload?.data,
                hasBill: !!payload?.bill,
                hasCodigoFatura: !!payload?.codigoFatura
            });

            // Extrai o bill.id do payload (pode estar em diferentes locais)
            const billId = payload?.payload?.data?.bill?.id ||
                payload?.payload?.bill?.id ||
                payload?.data?.bill?.id ||
                payload?.bill?.id ||
                payload?.codigoFatura;

            console.log('🔍 [Webhook] atualizarStatusTabelasPorJob: BillId extraído', {
                billId,
                sources: {
                    payloadPayloadDataBill: payload?.payload?.data?.bill?.id,
                    payloadPayloadBill: payload?.payload?.bill?.id,
                    payloadDataBill: payload?.data?.bill?.id,
                    payloadBill: payload?.bill?.id,
                    codigoFatura: payload?.codigoFatura
                }
            });

            if (!billId) {
                console.warn('⚠️ [Webhook] atualizarStatusTabelasPorJob: Job não contém bill.id no payload', {
                    jobId,
                    payloadKeys: Object.keys(payload || {})
                });
                return;
            }

            const codigoFatura = String(billId);

            // Extrai o status do bill (pode estar em diferentes locais)
            const billStatus = payload?.payload?.data?.bill?.status ||
                payload?.payload?.bill?.status ||
                payload?.data?.bill?.status ||
                payload?.bill?.status ||
                'Paid'; // Default para Paid se não encontrar

            console.log('🔍 [Webhook] atualizarStatusTabelasPorJob: Status extraído', {
                billStatus,
                codigoFatura,
                sources: {
                    payloadPayloadDataBill: payload?.payload?.data?.bill?.status,
                    payloadPayloadBill: payload?.payload?.bill?.status,
                    payloadDataBill: payload?.data?.bill?.status,
                    payloadBill: payload?.bill?.status
                }
            });

            console.log(`🔍 [Webhook] atualizarStatusTabelasPorJob: Atualizando status das tabelas`, {
                codigoFatura,
                billStatus,
                timestamp: new Date().toISOString()
            });

            // Mapeia o status do bill para os enums do sistema
            let faturaStatus: FaturaStatus;
            let financeiroStatus: ControleFinanceiroStatus;
            let consultaAvulsaStatus: ConsultaAvulsaStatus;

            switch (billStatus) {
                case 'Paid':
                case 'paid':
                    faturaStatus = FaturaStatus.Paid;
                    financeiroStatus = ControleFinanceiroStatus.Aprovado;
                    consultaAvulsaStatus = ConsultaAvulsaStatus.Ativa;
                    break;
                case 'Pending':
                case 'pending':
                    faturaStatus = FaturaStatus.Pending;
                    financeiroStatus = ControleFinanceiroStatus.AguardandoPagamento;
                    consultaAvulsaStatus = ConsultaAvulsaStatus.Pendente;
                    break;
                case 'Failed':
                case 'failed':
                    faturaStatus = FaturaStatus.Failed;
                    financeiroStatus = ControleFinanceiroStatus.Reprovado;
                    consultaAvulsaStatus = ConsultaAvulsaStatus.Pendente;
                    break;
                case 'Canceled':
                case 'canceled':
                    faturaStatus = FaturaStatus.Canceled;
                    financeiroStatus = ControleFinanceiroStatus.Cancelado;
                    consultaAvulsaStatus = ConsultaAvulsaStatus.Cancelada;
                    break;
                default:
                    // Se o status não for reconhecido, assume Paid (comportamento padrão para bill_paid)
                    faturaStatus = FaturaStatus.Paid;
                    financeiroStatus = ControleFinanceiroStatus.Aprovado;
                    consultaAvulsaStatus = ConsultaAvulsaStatus.Ativa;
                    console.warn(`[Webhook] Status desconhecido: ${billStatus}, usando padrão Paid/Aprovado/Ativa`);
            }

            // Atualiza as tabelas em paralelo
            console.log('🔍 [Webhook] atualizarStatusTabelasPorJob: Executando atualizações em paralelo...', {
                codigoFatura,
                faturaStatus,
                financeiroStatus,
                consultaAvulsaStatus,
                billStatus
            });

            // Primeiro, busca a Fatura para obter o FaturaId
            const fatura = await prisma.fatura.findFirst({
                where: { CodigoFatura: codigoFatura },
                select: { Id: true }
            });

            const faturaId = fatura?.Id;

            // Verifica quantos registros existem para atualizar
            const [faturaCount, financeiroCount, consultaCount, creditoCount] = await Promise.all([
                prisma.fatura.count({ where: { CodigoFatura: codigoFatura } }),
                faturaId ? prisma.financeiro.count({ where: { FaturaId: faturaId } }) : Promise.resolve(0),
                prisma.consultaAvulsa.count({ where: { CodigoFatura: codigoFatura } }),
                prisma.creditoAvulso.count({ where: { CodigoFatura: codigoFatura } })
            ]);

            console.log('🔍 [Webhook] atualizarStatusTabelasPorJob: Registros encontrados para atualizar', {
                fatura: faturaCount,
                faturaId,
                financeiro: financeiroCount,
                consultaAvulsa: consultaCount,
                creditoAvulso: creditoCount
            });

            const atualizacoes = await Promise.allSettled([
                // Atualiza Fatura
                prisma.fatura.updateMany({
                    where: { CodigoFatura: codigoFatura },
                    data: { Status: faturaStatus }
                }),
                // Atualiza Financeiro usando FaturaId (mais direto e eficiente)
                faturaId ? prisma.financeiro.updateMany({
                    where: { FaturaId: faturaId },
                    data: { Status: financeiroStatus }
                }) : Promise.resolve({ count: 0 }),
                // Atualiza ConsultaAvulsa
                prisma.consultaAvulsa.updateMany({
                    where: { CodigoFatura: codigoFatura },
                    data: { Status: consultaAvulsaStatus }
                }),
                // Atualiza CreditoAvulso
                prisma.creditoAvulso.updateMany({
                    where: { CodigoFatura: codigoFatura },
                    data: { Status: consultaAvulsaStatus }
                })
            ]);

            // Log dos resultados
            const [faturaResult, financeiroResult, consultaResult, creditoResult] = atualizacoes;

            console.log('🔍 [Webhook] atualizarStatusTabelasPorJob: Resultados das atualizações', {
                fatura: {
                    status: faturaResult.status,
                    count: faturaResult.status === 'fulfilled' ? faturaResult.value.count : 0,
                    error: faturaResult.status === 'rejected' ? faturaResult.reason : null
                },
                financeiro: {
                    status: financeiroResult.status,
                    count: financeiroResult.status === 'fulfilled' ? financeiroResult.value.count : 0,
                    error: financeiroResult.status === 'rejected' ? financeiroResult.reason : null
                },
                consultaAvulsa: {
                    status: consultaResult.status,
                    count: consultaResult.status === 'fulfilled' ? consultaResult.value.count : 0,
                    error: consultaResult.status === 'rejected' ? consultaResult.reason : null
                },
                creditoAvulso: {
                    status: creditoResult.status,
                    count: creditoResult.status === 'fulfilled' ? creditoResult.value.count : 0,
                    error: creditoResult.status === 'rejected' ? creditoResult.reason : null
                }
            });

            if (faturaResult.status === 'fulfilled') {
                console.log(`✅ [Webhook] atualizarStatusTabelasPorJob: ${faturaResult.value.count} Fatura(s) atualizada(s) para Status: ${faturaStatus}`);
            } else {
                console.error(`❌ [Webhook] atualizarStatusTabelasPorJob: Erro ao atualizar Fatura:`, faturaResult.reason);
            }

            if (financeiroResult.status === 'fulfilled') {
                console.log(`✅ [Webhook] atualizarStatusTabelasPorJob: ${financeiroResult.value.count} Financeiro(s) atualizado(s) para Status: ${financeiroStatus}`);
            } else {
                console.error(`❌ [Webhook] atualizarStatusTabelasPorJob: Erro ao atualizar Financeiro:`, financeiroResult.reason);
            }

            if (consultaResult.status === 'fulfilled') {
                console.log(`✅ [Webhook] atualizarStatusTabelasPorJob: ${consultaResult.value.count} ConsultaAvulsa(s) atualizada(s) para Status: ${consultaAvulsaStatus}`);
            } else {
                console.error(`❌ [Webhook] atualizarStatusTabelasPorJob: Erro ao atualizar ConsultaAvulsa:`, consultaResult.reason);
            }

            if (creditoResult.status === 'fulfilled') {
                console.log(`✅ [Webhook] atualizarStatusTabelasPorJob: ${creditoResult.value.count} CreditoAvulso(s) atualizado(s) para Status: ${consultaAvulsaStatus}`);
            } else {
                console.error(`❌ [Webhook] atualizarStatusTabelasPorJob: Erro ao atualizar CreditoAvulso:`, creditoResult.reason);
            }

            // Verifica se houve erros
            const erros = atualizacoes.filter(r => r.status === 'rejected');
            if (erros.length > 0) {
                const errorMessages = erros.map(e => e.status === 'rejected' ? (e.reason instanceof Error ? e.reason.message : String(e.reason)) : '').filter(Boolean);
                const errorMessage = `Erro ao atualizar ${erros.length} tabela(s): ${errorMessages.join('; ')}`;

                console.error(`❌ [Webhook] atualizarStatusTabelasPorJob: Erros ao atualizar tabelas:`, {
                    erros: errorMessages,
                    codigoFatura,
                    jobId
                });

                // 🔄 Cria um job de retry para tentar novamente depois
                try {
                    const retryJob = await JobService.createJob(
                        'update_status_tabelas_retry',
                        {
                            originalJobId: jobId,
                            codigoFatura,
                            billStatus,
                            faturaStatus,
                            financeiroStatus,
                            consultaAvulsaStatus,
                            faturaId,
                            errorDetails: errorMessages,
                            retryAttempt: (job.Attempts || 0) + 1,
                            originalPayload: payload
                        },
                        new Date(Date.now() + 30_000), // Retry em 30 segundos
                        { maxAttempts: 3 }
                    );

                    console.log(`🔄 [Webhook] atualizarStatusTabelasPorJob: Job de retry criado`, {
                        retryJobId: retryJob.Id,
                        originalJobId: jobId,
                        willRetryAt: retryJob.RunAt
                    });
                } catch (retryJobError: unknown) {
                    const retryErrorMsg = retryJobError instanceof Error ? retryJobError.message : String(retryJobError);
                    console.error(`❌ [Webhook] atualizarStatusTabelasPorJob: Erro ao criar job de retry:`, retryErrorMsg);
                }

                // Atualiza o Job original para failed
                await prisma.job.update({
                    where: { Id: jobId },
                    data: {
                        Status: "failed",
                        LastError: errorMessage
                    }
                }).catch((updateError: unknown) => {
                    const errorMsg = updateError instanceof Error ? updateError.message : String(updateError);
                    console.error(`❌ [Webhook] atualizarStatusTabelasPorJob: Erro ao atualizar status do Job para failed:`, errorMsg);
                });

                throw new Error(errorMessage);
            }

            // ✅ Atualiza o status do Job para "completed" após sucesso
            console.log(`🔍 [Webhook] atualizarStatusTabelasPorJob: Atualizando status do Job para completed...`);
            try {
                await prisma.job.update({
                    where: { Id: jobId },
                    data: {
                        Status: "completed",
                        LastError: null // Limpa qualquer erro anterior
                    }
                });
                console.log(`✅ [Webhook] atualizarStatusTabelasPorJob: Status do Job atualizado para completed`);
            } catch (updateError: unknown) {
                const errorMsg = updateError instanceof Error ? updateError.message : String(updateError);
                console.error(`❌ [Webhook] atualizarStatusTabelasPorJob: Erro ao atualizar status do Job para completed:`, errorMsg);
                // Não lança erro aqui para não interromper o fluxo, mas loga o problema
            }

            const duration = Date.now() - startTime;
            console.log(`✅ [Webhook] atualizarStatusTabelasPorJob: CONCLUÍDO com sucesso`, {
                jobId,
                codigoFatura,
                duracao: `${duration}ms`,
                tabelasAtualizadas: {
                    fatura: faturaResult.status === 'fulfilled' ? faturaResult.value.count : 0,
                    financeiro: financeiroResult.status === 'fulfilled' ? financeiroResult.value.count : 0,
                    consultaAvulsa: consultaResult.status === 'fulfilled' ? consultaResult.value.count : 0,
                    creditoAvulso: creditoResult.status === 'fulfilled' ? creditoResult.value.count : 0
                },
                timestamp: new Date().toISOString()
            });
        } catch (error: unknown) {
            const err = error as { message?: string };
            const duration = Date.now() - startTime;
            console.error(`❌ [Webhook] atualizarStatusTabelasPorJob: ERRO após processamento`, {
                jobId,
                error: err?.message || String(error),
                stack: err instanceof Error ? err.stack : undefined,
                duracao: `${duration}ms`,
                timestamp: new Date().toISOString()
            });
            throw error;
        }
    }

    /**
     * 🔄 Método de retry para atualizar status das tabelas
     * Lê o payload do job de retry e tenta atualizar novamente usando transação
     */
    public static async atualizarStatusTabelasPorJobRetry(jobId: string): Promise<void> {
        const startTime = Date.now();
        console.log('🔄 [Webhook] atualizarStatusTabelasPorJobRetry: INICIANDO', { jobId, timestamp: new Date().toISOString() });

        try {
            // Busca o job de retry
            const retryJob = await prisma.job.findUnique({
                where: { Id: jobId }
            });

            if (!retryJob || !retryJob.Payload) {
                console.error('❌ [Webhook] atualizarStatusTabelasPorJobRetry: Job de retry não encontrado ou sem payload', { jobId });
                throw new Error(`Job de retry ${jobId} não encontrado ou sem payload`);
            }

            const payload = retryJob.Payload as Record<string, unknown>;
            const codigoFatura = payload?.codigoFatura ? String(payload.codigoFatura) : null;
            const billStatus = payload?.billStatus ? String(payload.billStatus) : 'Paid';
            const originalJobId = payload?.originalJobId ? String(payload.originalJobId) : null;
            const retryAttempt = (payload?.retryAttempt as number) || 1;

            console.log('🔄 [Webhook] atualizarStatusTabelasPorJobRetry: Dados do retry', {
                jobId,
                originalJobId,
                codigoFatura,
                billStatus,
                retryAttempt
            });

            if (!codigoFatura) {
                throw new Error('CodigoFatura não encontrado no payload do job de retry');
            }

            // Mapeia o status do bill para os enums do sistema
            let faturaStatus: FaturaStatus;
            let financeiroStatus: ControleFinanceiroStatus;
            let consultaAvulsaStatus: ConsultaAvulsaStatus;

            switch (billStatus) {
                case 'Paid':
                case 'paid':
                    faturaStatus = FaturaStatus.Paid;
                    financeiroStatus = ControleFinanceiroStatus.Aprovado;
                    consultaAvulsaStatus = ConsultaAvulsaStatus.Ativa;
                    break;
                case 'Pending':
                case 'pending':
                    faturaStatus = FaturaStatus.Pending;
                    financeiroStatus = ControleFinanceiroStatus.AguardandoPagamento;
                    consultaAvulsaStatus = ConsultaAvulsaStatus.Pendente;
                    break;
                case 'Failed':
                case 'failed':
                    faturaStatus = FaturaStatus.Failed;
                    financeiroStatus = ControleFinanceiroStatus.Reprovado;
                    consultaAvulsaStatus = ConsultaAvulsaStatus.Pendente;
                    break;
                case 'Canceled':
                case 'canceled':
                    faturaStatus = FaturaStatus.Canceled;
                    financeiroStatus = ControleFinanceiroStatus.Cancelado;
                    consultaAvulsaStatus = ConsultaAvulsaStatus.Cancelada;
                    break;
                default:
                    faturaStatus = FaturaStatus.Paid;
                    financeiroStatus = ControleFinanceiroStatus.Aprovado;
                    consultaAvulsaStatus = ConsultaAvulsaStatus.Ativa;
            }

            // Busca a Fatura para obter o FaturaId
            const fatura = await prisma.fatura.findFirst({
                where: { CodigoFatura: codigoFatura },
                select: { Id: true }
            });

            const faturaId = fatura?.Id;

            // 🔄 Usa transação para garantir atomicidade
            console.log('🔄 [Webhook] atualizarStatusTabelasPorJobRetry: Executando atualizações em transação...');

            const resultado = await prisma.$transaction(async (tx) => {
                const atualizacoes = await Promise.allSettled([
                    // Atualiza Fatura
                    tx.fatura.updateMany({
                        where: { CodigoFatura: codigoFatura },
                        data: { Status: faturaStatus }
                    }),
                    // Atualiza Financeiro
                    faturaId ? tx.financeiro.updateMany({
                        where: { FaturaId: faturaId },
                        data: { Status: financeiroStatus }
                    }) : Promise.resolve({ count: 0 }),
                    // Atualiza ConsultaAvulsa
                    tx.consultaAvulsa.updateMany({
                        where: { CodigoFatura: codigoFatura },
                        data: { Status: consultaAvulsaStatus }
                    }),
                    // Atualiza CreditoAvulso
                    tx.creditoAvulso.updateMany({
                        where: { CodigoFatura: codigoFatura },
                        data: { Status: consultaAvulsaStatus }
                    })
                ]);

                // Verifica se houve erros
                const erros = atualizacoes.filter(r => r.status === 'rejected');
                if (erros.length > 0) {
                    const errorMessages = erros.map(e => e.status === 'rejected' ? (e.reason instanceof Error ? e.reason.message : String(e.reason)) : '').filter(Boolean);
                    throw new Error(`Erro ao atualizar ${erros.length} tabela(s) na transação: ${errorMessages.join('; ')}`);
                }

                return atualizacoes;
            }, {
                timeout: 10000, // 10 segundos de timeout
                maxWait: 5000  // 5 segundos de espera máxima
            });

            const [faturaResult, financeiroResult, consultaResult, creditoResult] = resultado;

            console.log('✅ [Webhook] atualizarStatusTabelasPorJobRetry: Atualizações concluídas com sucesso', {
                fatura: faturaResult.status === 'fulfilled' ? faturaResult.value.count : 0,
                financeiro: financeiroResult.status === 'fulfilled' ? financeiroResult.value.count : 0,
                consultaAvulsa: consultaResult.status === 'fulfilled' ? consultaResult.value.count : 0,
                creditoAvulso: creditoResult.status === 'fulfilled' ? creditoResult.value.count : 0
            });

            // Atualiza o status do job de retry para completed
            await prisma.job.update({
                where: { Id: jobId },
                data: {
                    Status: "completed",
                    LastError: null
                }
            });

            // Se houver job original, também atualiza ele
            if (originalJobId) {
                await prisma.job.update({
                    where: { Id: originalJobId },
                    data: {
                        Status: "completed",
                        LastError: null
                    }
                }).catch((err: unknown) => {
                    console.warn(`⚠️ [Webhook] atualizarStatusTabelasPorJobRetry: Não foi possível atualizar job original:`, err);
                });
            }

            const duration = Date.now() - startTime;
            console.log(`✅ [Webhook] atualizarStatusTabelasPorJobRetry: CONCLUÍDO com sucesso`, {
                jobId,
                originalJobId,
                codigoFatura,
                retryAttempt,
                duracao: `${duration}ms`,
                timestamp: new Date().toISOString()
            });
        } catch (error: unknown) {
            const err = error as { message?: string };
            const duration = Date.now() - startTime;
            const errorMessage = err?.message || String(error);

            console.error(`❌ [Webhook] atualizarStatusTabelasPorJobRetry: ERRO`, {
                jobId,
                error: errorMessage,
                stack: err instanceof Error ? err.stack : undefined,
                duracao: `${duration}ms`,
                timestamp: new Date().toISOString()
            });

            // Atualiza o job de retry para failed
            await prisma.job.update({
                where: { Id: jobId },
                data: {
                    Status: "failed",
                    LastError: errorMessage
                }
            }).catch((updateError: unknown) => {
                console.error(`❌ [Webhook] atualizarStatusTabelasPorJobRetry: Erro ao atualizar status do job para failed:`, updateError);
            });

            throw error;
        }
    }

    /**
     * 🔄 Rotina de verificação e atualização de status baseada em bill.id
     * Verifica Jobs pendentes e atualiza Fatura, Financeiro e ConsultaAvulsa
     */
    public static async verificarEAtualizarStatusPorBillId(): Promise<void> {
        const startTime = Date.now();
        console.log('🔄 [Webhook] verificarEAtualizarStatusPorBillId: INICIANDO', { timestamp: new Date().toISOString() });

        try {
            // Busca Jobs pendentes ou em processamento que tenham payload com bill.id
            // Otimizado: reduzido de 50 para 20 jobs por vez para economizar CPU
            const jobs = await prisma.job.findMany({
                where: {
                    Status: { in: ['pending', 'processing'] },
                    Type: { in: ['update_status_tabelas', 'vindi_bill_paid', 'vindi_subscription_charged', 'vindi_invoice_charged'] }
                },
                orderBy: { RunAt: 'asc' },
                take: 20 // Processa até 20 jobs por vez (reduzido de 50 para economizar CPU)
            });

            console.log(`🔍 [Webhook] verificarEAtualizarStatusPorBillId: Encontrados ${jobs.length} jobs para verificar`);

            let processados = 0;
            let atualizados = 0;
            let erros = 0;

            for (const job of jobs) {
                try {
                    if (!job.Payload) {
                        console.warn(`⚠️ [Webhook] verificarEAtualizarStatusPorBillId: Job ${job.Id} sem payload, pulando...`);
                        continue;
                    }

                    const payload = job.Payload as Record<string, unknown>;

                    // Função auxiliar para extrair valor aninhado de forma segura
                    const getNestedValue = (obj: unknown, path: string[]): unknown => {
                        let current: unknown = obj;
                        for (const key of path) {
                            if (current && typeof current === 'object' && key in current) {
                                current = (current as Record<string, unknown>)[key];
                            } else {
                                return undefined;
                            }
                        }
                        return current;
                    };

                    // Extrai bill.id de diferentes estruturas do payload
                    const billId = getNestedValue(payload, ['payload', 'event', 'data', 'bill', 'id']) ||
                        getNestedValue(payload, ['payload', 'data', 'bill', 'id']) ||
                        getNestedValue(payload, ['event', 'data', 'bill', 'id']) ||
                        getNestedValue(payload, ['data', 'bill', 'id']) ||
                        getNestedValue(payload, ['bill', 'id']) ||
                        (typeof payload?.codigoFatura !== 'undefined' ? payload.codigoFatura : undefined);

                    if (!billId) {
                        console.warn(`⚠️ [Webhook] verificarEAtualizarStatusPorBillId: Job ${job.Id} sem bill.id no payload, pulando...`);
                        continue;
                    }

                    const codigoFatura = String(billId);

                    // Extrai o status do bill
                    const billStatus = getNestedValue(payload, ['payload', 'event', 'data', 'bill', 'status']) ||
                        getNestedValue(payload, ['payload', 'data', 'bill', 'status']) ||
                        getNestedValue(payload, ['event', 'data', 'bill', 'status']) ||
                        getNestedValue(payload, ['data', 'bill', 'status']) ||
                        getNestedValue(payload, ['bill', 'status']) ||
                        'paid';

                    console.log(`🔍 [Webhook] verificarEAtualizarStatusPorBillId: Processando job ${job.Id}`, {
                        codigoFatura,
                        billStatus,
                        jobType: job.Type
                    });

                    // Busca Fatura com Status = Pending e CodigoFatura = bill.id
                    const fatura = await prisma.fatura.findFirst({
                        where: {
                            CodigoFatura: codigoFatura,
                            Status: FaturaStatus.Pending
                        }
                    });

                    // Busca Financeiro relacionado com Status = AguardandoPagamento
                    const financeiro = fatura ? await prisma.financeiro.findFirst({
                        where: {
                            FaturaId: fatura.Id,
                            Status: ControleFinanceiroStatus.AguardandoPagamento
                        }
                    }) : null;

                    // Busca ConsultaAvulsa com CodigoFatura = bill.id
                    const consultaAvulsa = await prisma.consultaAvulsa.findFirst({
                        where: {
                            CodigoFatura: codigoFatura
                        }
                    });

                    console.log(`🔍 [Webhook] verificarEAtualizarStatusPorBillId: Registros encontrados`, {
                        codigoFatura,
                        hasFatura: !!fatura,
                        hasFinanceiro: !!financeiro,
                        hasConsultaAvulsa: !!consultaAvulsa
                    });

                    // Mapeia o status do bill para os enums do sistema
                    let faturaStatus: FaturaStatus;
                    let financeiroStatus: ControleFinanceiroStatus;
                    let consultaAvulsaStatus: ConsultaAvulsaStatus;

                    switch (String(billStatus).toLowerCase()) {
                        case 'paid':
                            faturaStatus = FaturaStatus.Paid;
                            financeiroStatus = ControleFinanceiroStatus.Aprovado;
                            consultaAvulsaStatus = ConsultaAvulsaStatus.Ativa;
                            break;
                        case 'pending':
                            faturaStatus = FaturaStatus.Pending;
                            financeiroStatus = ControleFinanceiroStatus.AguardandoPagamento;
                            consultaAvulsaStatus = ConsultaAvulsaStatus.Pendente;
                            break;
                        case 'failed':
                        case 'rejected':
                            faturaStatus = FaturaStatus.Failed;
                            financeiroStatus = ControleFinanceiroStatus.Reprovado;
                            consultaAvulsaStatus = ConsultaAvulsaStatus.Pendente;
                            break;
                        case 'canceled':
                        case 'cancelled':
                            faturaStatus = FaturaStatus.Canceled;
                            financeiroStatus = ControleFinanceiroStatus.Cancelado;
                            consultaAvulsaStatus = ConsultaAvulsaStatus.Cancelada;
                            break;
                        default:
                            // Se o status não for reconhecido e o bill estiver paid, assume paid
                            if (String(billStatus).toLowerCase().includes('paid')) {
                                faturaStatus = FaturaStatus.Paid;
                                financeiroStatus = ControleFinanceiroStatus.Aprovado;
                                consultaAvulsaStatus = ConsultaAvulsaStatus.Ativa;
                            } else {
                                faturaStatus = FaturaStatus.Pending;
                                financeiroStatus = ControleFinanceiroStatus.AguardandoPagamento;
                                consultaAvulsaStatus = ConsultaAvulsaStatus.Pendente;
                            }
                    }

                    // Executa atualizações em transação
                    await prisma.$transaction(async (tx) => {
                        const atualizacoes: Array<Promise<{ count: number }>> = [];

                        // 1. Atualiza ConsultaAvulsa se existir
                        if (consultaAvulsa) {
                            atualizacoes.push(
                                tx.consultaAvulsa.updateMany({
                                    where: { CodigoFatura: codigoFatura },
                                    data: { Status: consultaAvulsaStatus }
                                })
                            );
                        }

                        // 2. Atualiza Fatura se existir e estiver Pending
                        if (fatura && fatura.Status === FaturaStatus.Pending) {
                            atualizacoes.push(
                                tx.fatura.updateMany({
                                    where: {
                                        CodigoFatura: codigoFatura,
                                        Status: FaturaStatus.Pending
                                    },
                                    data: { Status: faturaStatus }
                                })
                            );
                        }

                        // 3. Atualiza Financeiro se existir e estiver AguardandoPagamento
                        // Usa FaturaId da Fatura atualizada
                        if (financeiro && financeiro.Status === ControleFinanceiroStatus.AguardandoPagamento && fatura) {
                            atualizacoes.push(
                                tx.financeiro.updateMany({
                                    where: {
                                        FaturaId: fatura.Id,
                                        Status: ControleFinanceiroStatus.AguardandoPagamento
                                    },
                                    data: { Status: financeiroStatus }
                                })
                            );
                        }

                        // Executa todas as atualizações
                        const resultados = await Promise.allSettled(atualizacoes);

                        // Verifica se houve erros
                        const errosAtualizacao = resultados.filter(r => r.status === 'rejected');
                        if (errosAtualizacao.length > 0) {
                            const errorMessages = errosAtualizacao.map(e =>
                                e.status === 'rejected' ? (e.reason instanceof Error ? e.reason.message : String(e.reason)) : ''
                            ).filter(Boolean);
                            throw new Error(`Erro ao atualizar tabelas: ${errorMessages.join('; ')}`);
                        }

                        // Log dos resultados
                        const counts = resultados.map(r => r.status === 'fulfilled' ? r.value.count : 0);
                        console.log(`✅ [Webhook] verificarEAtualizarStatusPorBillId: Atualizações concluídas`, {
                            codigoFatura,
                            consultaAvulsa: consultaAvulsa ? counts[0] : 0,
                            fatura: fatura ? counts[consultaAvulsa ? 1 : 0] : 0,
                            financeiro: financeiro ? counts[consultaAvulsa && fatura ? 2 : consultaAvulsa ? 1 : 0] : 0
                        });
                    });

                    // 4. Atualiza o Status do Job para "completed"
                    await prisma.job.update({
                        where: { Id: job.Id },
                        data: {
                            Status: "completed",
                            LastError: null
                        }
                    });

                    atualizados++;
                    processados++;

                    console.log(`✅ [Webhook] verificarEAtualizarStatusPorBillId: Job ${job.Id} processado e atualizado com sucesso`);

                } catch (jobError: unknown) {
                    erros++;
                    const errorMessage = jobError instanceof Error ? jobError.message : String(jobError);
                    console.error(`❌ [Webhook] verificarEAtualizarStatusPorBillId: Erro ao processar job ${job.Id}:`, {
                        error: errorMessage,
                        stack: jobError instanceof Error ? jobError.stack : undefined
                    });

                    // Marca o job como failed após várias tentativas
                    const attempts = (job.Attempts || 0) + 1;
                    if (attempts >= (job.MaxAttempts || 3)) {
                        await prisma.job.update({
                            where: { Id: job.Id },
                            data: {
                                Status: "failed",
                                LastError: errorMessage,
                                Attempts: attempts
                            }
                        }).catch((updateError: unknown) => {
                            console.error(`❌ [Webhook] verificarEAtualizarStatusPorBillId: Erro ao atualizar job para failed:`, updateError);
                        });
                    } else {
                        // Reagenda para tentar novamente
                        await prisma.job.update({
                            where: { Id: job.Id },
                            data: {
                                Status: "pending",
                                LastError: errorMessage,
                                Attempts: attempts,
                                RunAt: new Date(Date.now() + 60_000) // Retry em 1 minuto
                            }
                        }).catch((updateError: unknown) => {
                            console.error(`❌ [Webhook] verificarEAtualizarStatusPorBillId: Erro ao reagendar job:`, updateError);
                        });
                    }
                }
            }

            const duration = Date.now() - startTime;
            console.log(`✅ [Webhook] verificarEAtualizarStatusPorBillId: CONCLUÍDO`, {
                processados,
                atualizados,
                erros,
                duracao: `${duration}ms`,
                timestamp: new Date().toISOString()
            });

        } catch (error: unknown) {
            const err = error as { message?: string };
            const duration = Date.now() - startTime;
            console.error(`❌ [Webhook] verificarEAtualizarStatusPorBillId: ERRO GERAL`, {
                error: err?.message || String(error),
                stack: err instanceof Error ? err.stack : undefined,
                duracao: `${duration}ms`,
                timestamp: new Date().toISOString()
            });
            throw error;
        }
    }
}
