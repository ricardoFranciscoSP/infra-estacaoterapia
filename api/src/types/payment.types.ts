export type PaymentType = 'subscription' | 'charge';

export interface CreatePaymentDTO {
    userId: number;
    planId?: number;
    consultationId?: number;
    paymentMethod: string; // ex: credit_card
    cardHash?: string;
}