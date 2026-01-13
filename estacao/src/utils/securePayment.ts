// Utilitários de segurança para formulários de pagamento

// Tipos auxiliares para evitar uso de any
type PaymentFieldName = "numeroCartao" | "validade" | "cvv";
type SetValueFn = (
    name: PaymentFieldName,
    value: string,
    options?: { shouldValidate?: boolean }
) => void;

interface PaymentSensitive {
    numeroCartao?: string;
    validade?: string;
    cvv?: string;
    [key: string]: string | undefined;
}

// Compatível com React.Dispatch<React.SetStateAction<T>>
type StateSetter<T> = (value: T | ((prev: T) => T)) => void;

// Luhn check para validar número de cartão
export function luhnCheck(cardNumber: string): boolean {
    const digits = cardNumber.replace(/\D/g, "");
    if (!digits) return false;
    let sum = 0;
    let shouldDouble = false;
    for (let i = digits.length - 1; i >= 0; i--) {
        let digit = parseInt(digits.charAt(i), 10);
        if (shouldDouble) {
            digit *= 2;
            if (digit > 9) digit -= 9;
        }
        sum += digit;
        shouldDouble = !shouldDouble;
    }
    return sum % 10 === 0;
}

// Limpa rapidamente campos sensíveis em formulários controlados (React Hook Form)
export function clearSensitiveForm(setValue?: SetValueFn) {
    try {
        if (setValue) {
            setValue("numeroCartao", "", { shouldValidate: false });
            setValue("validade", "", { shouldValidate: false });
            setValue("cvv", "", { shouldValidate: false });
        } else {
            // Fallback: limpa inputs do DOM se necessário
            const inputs = document.querySelectorAll<HTMLInputElement>(
                'input[autocomplete="cc-number"], input[autocomplete="cc-exp"], input[autocomplete="cc-csc"], input[name="numeroCartao"], input[name="validade"], input[name="cvv"]'
            );
            inputs.forEach((el) => {
                el.value = "";
                el.dispatchEvent(new Event("input", { bubbles: true }));
                el.dispatchEvent(new Event("change", { bubbles: true }));
            });
        }
    } catch {
        // silencioso por segurança
    }
}

// Limpa rapidamente estados locais com dados sensíveis
export function clearSensitiveState<T extends PaymentSensitive>(setter?: StateSetter<T>) {
    try {
        if (setter) {
            setter((prev) => ({ ...prev, numeroCartao: "", validade: "", cvv: "" } as T));
        }
    } catch {
        // silencioso
    }
}

// Evita logs de dados sensíveis; use para erros de gateways
export function logGatewayError(context: string, err: Error | string, extra?: Record<string, string | number | boolean | undefined>) {
    try {
        const safeExtra = extra ? JSON.parse(JSON.stringify(extra, (_k, v) => (typeof v === "string" ? maskPotentialCard(v) : v))) : undefined;
        // Só loga metadados seguros
        console.error(`[Pagamento] ${context}`, { error: toSafeError(err), ...safeExtra });
    } catch {
        console.error(`[Pagamento] ${context}`);
    }
}

function toSafeError(err: Error | string) {
    if (typeof err === 'string') return { message: err };
    return { message: err.message, name: err.name };
}

function maskPotentialCard(value: string) {
    // Mascara sequências longas de dígitos (13-19) mantendo somente os 4 finais
    return value.replace(/\b(\d{9,15})(\d{4})\b/g, (_m, _a, last4) => `************${last4}`);
}
