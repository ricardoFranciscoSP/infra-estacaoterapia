import { CriarFaturaInput } from "../interfaces/fatura.interface";

export class FaturaService {

    async criarFatura({ customer_id, items, payment_method_code }: CriarFaturaInput) {
        const payload = {
            customer_id,
            items,
            payment_method_code,
        };
    }
}
