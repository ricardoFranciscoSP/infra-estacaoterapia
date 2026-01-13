import { getPaymentCompanyInfo } from '@/utils/checkoutUtils';
import { generateGatewayToken } from '@/lib/vindiGateway';
import { z } from "zod";
import { luhnCheck } from "@/utils/securePayment";

// Tipo para endereço
export type AddressType = {
    cep: string;
    endereco: string;
    numero?: string;
    complemento?: string;
    bairro: string;
    cidade: string;
    estado: string;
};

// Máscara de cartão
export function maskCreditCard(value: string) {
    return value
        .replace(/\D/g, '')
        .slice(0, 16)
        .replace(/(\d{4})(?=\d)/g, '$1 ')
        .trim();
}

// Schema de validação
export const checkoutSchema = z.object({
    numeroCartao: z
        .string()
        .min(1, "Número do cartão é obrigatório")
        .refine((val) => val.trim().length > 0, { message: "Número do cartão é obrigatório" })
        // Aceita com espaços simples, NBSP ou sem espaços
        .regex(/^(?:\d{4}[ \u00A0]?){3}\d{4}$/, "Número inválido")
        .refine((val) => luhnCheck(val), { message: "Número do cartão inválido" }),
    nomeTitular: z
        .string()
        .min(1, "Informe o nome do titular")
        .refine((val) => val.trim().length > 0, { message: "Informe o nome do titular" }),
    validade: z
        .string()
        .min(1, "Validade é obrigatória")
        .refine((val) => val.trim().length > 0, { message: "Validade é obrigatória" })
        .regex(/^(0[1-9]|1[0-2])\/\d{2}$/, "Validade inválida (MM/AA)")
        .refine((val) => {
            // Evita datas expiradas: compara MM/AA com o mês atual
            const [mmStr, yyStr] = val.split("/");
            const mm = Number(mmStr);
            const yy = Number(yyStr);
            if (!mm || !yy) return false;
            const now = new Date();
            const curYY = now.getFullYear() % 100; // dois dígitos
            const curMM = now.getMonth() + 1;
            return yy > curYY || (yy === curYY && mm >= curMM);
        }, { message: "Cartão expirado" }),
    cvv: z
        .string()
        .min(1, "CVV é obrigatório")
        .refine((val) => val.trim().length > 0, { message: "CVV é obrigatório" })
        .regex(/^\d{3,4}$/, "CVV inválido"),
    cep: z.string().regex(/^\d{5}-?\d{3}$/, "CEP inválido"),
    endereco: z.string().min(1, "Informe o endereço"),
    numero: z.string().optional(),
    complemento: z.string().optional(),
    bairro: z.string().min(1, "Informe o bairro"),
    cidade: z.string().min(1, "Informe a cidade"),
    estado: z.string().length(2, "Estado inválido"),
});

export type CheckoutFormType = z.infer<typeof checkoutSchema>;

// Utilitário de endereço
export function isAddressComplete(address: {
    cep: string; endereco: string; numero: string;
    complemento?: string; bairro: string; cidade: string; estado: string;
}) {
    return (
        address.cep.length >= 8 &&
        !!address.endereco &&
        !!address.bairro &&
        !!address.cidade &&
        !!address.estado
    );
}

// Bloquear caracteres especiais
export function blockSpecialChars(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!/[0-9]/.test(e.key) && e.key.length === 1) e.preventDefault();
}

// 🔹 NOVO: Gera token + objeto de pagamento pronto
export async function gerarObjetoPagamento({ formData, plano, user, }: {
    formData: CheckoutFormType;
    plano: {
        Id?: string;
        ProductId?: string;
        VindiPlanId?: string;
        Preco?: string;
    };
    user: {
        VindiCustomerId?: string;
        Address?: AddressType[];
        Id?: number | string;
    };
    getValues: (field: string) => string;
}) {

    // 1. Gera token (mantido caso precise)
    const tokenObj = await generateGatewayToken({
        nomeTitular: formData.nomeTitular,
        numeroCartao: formData.numeroCartao,
        validade: formData.validade,
        cvv: formData.cvv,
        getPaymentCompanyInfo,
    });

    const companyInfo = getPaymentCompanyInfo(formData.numeroCartao);

    // 2. Monta objeto conforme solicitado
    return {
        companyInfo,
        tokenObj,
        customer_id: user?.Id ?? user?.VindiCustomerId ?? "",
        plano,
    };
}
