/**
 * Tipos para objetos da Vindi
 */

export interface VindiBillCustomer {
    id?: number | string;
    name?: string;
    email?: string;
}

export interface VindiBillItem {
    product_id?: number;
    amount?: number;
}

export interface VindiBillCharge {
    last_transaction?: {
        gateway_response_fields?: {
            qrcode_path?: string;
            qrcode_original_path?: string;
        };
    };
}

export interface VindiBillPix {
    qr_code?: string;
    qr_code_text?: string;
}

export interface VindiBill {
    id?: number | string;
    bill_id?: number | string;
    customer?: VindiBillCustomer;
    amount?: number | string;
    status?: string;
    created_at?: string;
    due_at?: string;
    charges?: VindiBillCharge[];
    bill_items?: VindiBillItem[];
    product_items?: VindiBillItem[];
    pix?: VindiBillPix;
    subscription?: {
        id?: number | string;
    };
    metadata?: {
        tipo?: string;
        [key: string]: unknown;
    };
    [key: string]: unknown;
}

export interface VindiSubscription {
    id?: number | string;
    customer?: {
        id?: number | string;
    };
    customer_id?: number | string;
    status?: string;
    [key: string]: unknown;
}

export interface VindiInvoice {
    id?: number | string;
    customer?: {
        id?: number | string;
    };
    subscription?: {
        id?: number | string;
    };
    subscription_id?: number | string;
    status?: string;
}

export interface VindiCharge {
    id?: number | string;
    bill?: {
        id?: number | string;
    };
    invoice?: {
        id?: number | string;
    };
    customer?: {
        id?: number | string;
    };
    amount?: number | string;
    gateway_message?: string;
    gateway_response_fields?: Record<string, unknown>;
    last_transaction?: {
        gateway_message?: string;
        gateway_response_fields?: Record<string, unknown>;
        [key: string]: unknown;
    };
    [key: string]: unknown;
}

export interface VindiPeriod {
    id?: number | string;
    subscription?: {
        id?: number | string;
    };
    [key: string]: unknown;
}

export interface VindiIssue {
    id?: number | string;
    customer?: {
        id?: number | string;
    };
    [key: string]: unknown;
}

export interface VindiPaymentProfile {
    id?: number | string;
    customer?: {
        id?: number | string;
    };
}

export interface VindiMessage {
    id?: number | string;
    customer?: {
        id?: number | string;
    };
    [key: string]: unknown;
}

export interface VindiWebhookPayload {
    event?: {
        type?: string;
        created_at?: string;
    };
    type?: string;
    created_at?: string;
    data?: {
        bill?: VindiBill;
        subscription?: VindiSubscription;
        invoice?: VindiInvoice;
        charge?: VindiCharge;
        period?: VindiPeriod;
        issue?: VindiIssue;
        payment_profile?: VindiPaymentProfile;
        message?: VindiMessage;
    };
    bill?: VindiBill;
    subscription?: VindiSubscription;
    invoice?: VindiInvoice;
}

export interface VindiWebhookEvent {
    eventType: string;
    payload: VindiWebhookPayload;
}
