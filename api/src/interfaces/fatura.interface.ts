export interface ItemFatura {
    product_id: string;
    quantity: number;
    price_cents?: number;
}

export interface CriarFaturaInput {
    customer_id: string;
    items: ItemFatura[];
    payment_method_code?: string; // opcional: "credit_card", "boleto", "pix"
}
