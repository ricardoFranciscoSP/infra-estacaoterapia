import { checkoutSchema } from "@/app/(painel)/painel/checkout-planos/[id]/checkoutBusiness";

// ============================================================================
// CONSTANTES
// ============================================================================

export const PRIMEIRA_CONSULTA_PRECO = 49.99;
export const CONSULTA_AVULSA_PRECO = 74.90;

// ============================================================================
// TIPOS
// ============================================================================

export type CardFormType = {
  numeroCartao: string;
  nomeTitular: string;
  validade: string;
  cvv: string;
};

export type AddressFormType = {
  cep: string;
  rua: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  estado: string;
};

export type UserType = {
  Id?: number | string;
  Address?: Array<{
    Cep?: string;
    Rua?: string;
    Numero?: string;
    Complemento?: string | null;
    Bairro?: string;
    Cidade?: string;
    Estado?: string;
  }>;
  FinanceiroEntries?: Array<{ Tipo: string }> | Record<string, unknown> | null;
};

export type PlanosType = {
  Tipo?: string;
  ProductId?: string;
  VindiPlanId?: string;
};

// ============================================================================
// VALIDAÇÕES DE CARTÃO
// ============================================================================

/**
 * Valida um campo individual do formulário de cartão
 */
export function validateCardField(
  fieldName: keyof CardFormType,
  value: string
): { isValid: boolean; error?: string } {
  try {
    let result: { success: boolean; error?: { issues: Array<{ message: string }> } } | null = null;

    switch (fieldName) {
      case "numeroCartao":
        result = checkoutSchema.shape.numeroCartao.safeParse(value);
        break;
      case "nomeTitular":
        result = checkoutSchema.shape.nomeTitular.safeParse(value);
        break;
      case "validade":
        result = checkoutSchema.shape.validade.safeParse(value);
        break;
      case "cvv":
        result = checkoutSchema.shape.cvv.safeParse(value);
        break;
    }

    if (result && !result.success && result.error) {
      const errorMessage = result.error.issues[0]?.message || `${fieldName} inválido`;
      return { isValid: false, error: errorMessage };
    }

    return { isValid: true };
  } catch (error) {
    console.error("Erro na validação:", error);
    return { isValid: false, error: "Erro ao validar campo" };
  }
}

/**
 * Valida todos os campos do formulário de cartão
 */
export function validateCardForm(cardForm: CardFormType): {
  isValid: boolean;
  errors: Record<string, string>;
} {
  const errors: Record<string, string> = {};

  // Valida número do cartão
  const cardNumberResult = validateCardField("numeroCartao", cardForm.numeroCartao);
  if (!cardNumberResult.isValid && cardNumberResult.error) {
    errors.numeroCartao = cardNumberResult.error;
  }

  // Valida nome do titular
  const nomeResult = validateCardField("nomeTitular", cardForm.nomeTitular);
  if (!nomeResult.isValid && nomeResult.error) {
    errors.nomeTitular = nomeResult.error;
  }

  // Valida validade
  const validadeResult = validateCardField("validade", cardForm.validade);
  if (!validadeResult.isValid && validadeResult.error) {
    errors.validade = validadeResult.error;
  }

  // Valida CVV
  const cvvResult = validateCardField("cvv", cardForm.cvv);
  if (!cvvResult.isValid && cvvResult.error) {
    errors.cvv = cvvResult.error;
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

// ============================================================================
// VALIDAÇÕES DE ENDEREÇO
// ============================================================================

/**
 * Valida se o endereço está completo
 * Nota: número é opcional para casos como "s/n" (sem número)
 */
export function isAddressValid(address: AddressFormType): boolean {
  return Boolean(
    address.rua.trim() &&
    address.bairro.trim() &&
    address.cidade.trim() &&
    address.estado.trim() &&
    address.cep.trim().length === 9
  );
}

// ============================================================================
// LÓGICA DE NEGÓCIO - PRIMEIRA COMPRA
// ============================================================================

/**
 * Verifica se o usuário já comprou a primeira consulta
 */
export function hasPrimeiraConsulta(user: UserType | null | undefined): boolean {
  if (!user?.FinanceiroEntries) {
    return false;
  }

  // Se for um array
  if (Array.isArray(user.FinanceiroEntries)) {
    return user.FinanceiroEntries.some((entry: { Tipo?: string }) => entry.Tipo === "PrimeiraConsulta");
  }

  // Se for um objeto Record
  if (typeof user.FinanceiroEntries === 'object') {
    const entries = Object.values(user.FinanceiroEntries);
    return entries.some((entry: { Tipo?: string } | unknown) => {
      if (entry && typeof entry === 'object' && 'Tipo' in entry) {
        return (entry as { Tipo?: string }).Tipo === "PrimeiraConsulta";
      }
      return false;
    });
  }

  return false;
}

// ============================================================================
// NORMALIZAÇÃO DE TIPO DE PLANO
// ============================================================================

/**
 * Normaliza o campo Tipo do plano para os valores esperados pela UI
 * Aceita variações como "primeiraConsulta" → "Unica" e "unico" → "Avulsa".
 */
export function normalizeTipo(tipo?: string): "Unica" | "Avulsa" {
  if (!tipo) return "Avulsa";
  const t = tipo.toLowerCase();
  if (t === "unica" || t === "primeiraconsulta" || t === "primeira consulta" || t === "primeira_consulta") {
    return "Unica";
  }
  if (t === "avulsa" || t === "unico" || t === "único") {
    return "Avulsa";
  }
  // Mantém compatibilidade caso já venha como "Unica" ou "Avulsa"
  if (t === "unica" || t === "avulsa") {
    return (tipo.toLowerCase() === "unica" ? "Unica" : "Avulsa");
  }
  // Fallback: tenta mapear exatamente para os dois tipos suportados
  return "Avulsa";
}

/**
 * Verifica se é a primeira compra (APENAS para planos do tipo "Unica")
 * NÃO deve ser usado para validar consultas avulsas (Avulsa)
 */
export function isPrimeiraCompra(pathname: string, user: UserType | null | undefined, planos?: PlanosType | null | undefined): boolean {
  // CRÍTICO: APENAS retorna true para planos do tipo "Unica" (primeira consulta promocional)
  // Para planos "Avulsa", SEMPRE retorna false (não deve bloquear multiplicação por quantidade)
  if (normalizeTipo(planos?.Tipo) === "Unica") {
    return !hasPrimeiraConsulta(user);
  }

  // Para planos "Avulsa" ou outros tipos, retorna false
  // Isso permite que valorTotal = precoUnitario * quantity
  return false;
}

/**
 * Verifica se deve bloquear a compra promocional
 */
export function shouldBlockPromocionalCompra(pathname: string, user: UserType | null | undefined): boolean {
  const isComprarConsultaRoute = pathname === "/painel/comprar-consulta";
  return isComprarConsultaRoute && hasPrimeiraConsulta(user);
}

/**
 * Verifica se o usuário pode comprar múltiplas consultas
 */
export function canBuyMultiple(user: UserType | null | undefined): boolean {
  if (!user?.FinanceiroEntries) {
    return false;
  }

  if (Array.isArray(user.FinanceiroEntries)) {
    return user.FinanceiroEntries.length > 0;
  }

  if (typeof user.FinanceiroEntries === 'object') {
    return Object.keys(user.FinanceiroEntries).length > 0;
  }

  return false;
}

/**
 * Verifica se é um produto único
 */
export function isProdutoUnico(planos: PlanosType | null | undefined): boolean {
  return normalizeTipo(planos?.Tipo) === "Unica";
}

// ============================================================================
// CÁLCULOS DE PREÇO
// ============================================================================

/**
 * Calcula o preço unitário baseado no tipo de compra
 */
export function getPrecoUnitario(isPrimeiraCompra: boolean): number {
  return isPrimeiraCompra ? PRIMEIRA_CONSULTA_PRECO : CONSULTA_AVULSA_PRECO;
}

/**
 * Calcula o valor total da compra
 */
export function getValorTotal(isPrimeiraCompra: boolean, quantity: number): number {
  if (isPrimeiraCompra) {
    return PRIMEIRA_CONSULTA_PRECO; // Sempre 1 consulta na primeira compra
  }
  return CONSULTA_AVULSA_PRECO * quantity;
}

/**
 * Formata o valor para exibição (R$ 00,00)
 */
export function formatCurrency(value: number): string {
  return `R$ ${value.toFixed(2).replace(".", ",")}`;
}

// ============================================================================
// UTILITÁRIOS DE CARTÃO
// ============================================================================

/**
 * Obtém o logo do cartão baseado no número
 */
export function getCardLogo(numeroCartao: string): string {
  const digits = numeroCartao.replace(/\D/g, "");
  if (digits.startsWith("4")) return "/assets/icons/visa.svg";
  if (digits.startsWith("5")) return "/assets/icons/mastercard.svg";
  if (digits.startsWith("3")) return "/assets/icons/amex.svg";
  return "/assets/icons/logos_mastercard.svg";
}

/**
 * Extrai os últimos 4 dígitos do cartão
 */
export function getLast4Digits(numero: string): string {
  const digits = numero.replace(/\D/g, "");
  return digits.slice(-4);
}

/**
 * Obtém informações da bandeira do cartão
 */
export function getPaymentCompanyInfo(numeroCartao: string): {
  payment_company_code: string;
  payment_company_id: number | string;
} {
  const digits = numeroCartao.replace(/\D/g, "");
  if (digits.startsWith("4")) return { payment_company_code: "visa", payment_company_id: 13 };
  if (digits.startsWith("5")) return { payment_company_code: "mastercard", payment_company_id: 12 };
  if (digits.startsWith("3")) return { payment_company_code: "american_express", payment_company_id: 14 };
  return { payment_company_code: "", payment_company_id: "" };
}

// ============================================================================
// UTILITÁRIOS DE ENDEREÇO
// ============================================================================

/**
 * Obtém o primeiro endereço do usuário
 */
export function getUserAddress(user: UserType | null | undefined): {
  Cep?: string;
  Rua?: string;
  Numero?: string;
  Complemento?: string | null;
  Bairro?: string;
  Cidade?: string;
  Estado?: string;
} | null {
  if (!user?.Address || !Array.isArray(user.Address) || user.Address.length === 0) {
    return null;
  }
  return user.Address[0];
}

/**
 * Preenche o formulário de endereço com os dados do usuário
 */
export function fillAddressFromUser(
  userAddress: {
    Cep?: string;
    Rua?: string;
    Numero?: string;
    Complemento?: string | null;
    Bairro?: string;
    Cidade?: string;
    Estado?: string;
  } | null
): AddressFormType {
  if (!userAddress) {
    return {
      cep: "",
      rua: "",
      numero: "",
      complemento: "",
      bairro: "",
      cidade: "",
      estado: "",
    };
  }

  return {
    cep: userAddress.Cep || "",
    rua: userAddress.Rua || "",
    numero: userAddress.Numero || "",
    complemento: userAddress.Complemento ?? "",
    bairro: userAddress.Bairro || "",
    cidade: userAddress.Cidade || "",
    estado: userAddress.Estado || "",
  };
}

/**
 * Limpa o formulário de endereço
 */
export function clearAddressForm(): AddressFormType {
  return {
    cep: "",
    rua: "",
    numero: "",
    complemento: "",
    bairro: "",
    cidade: "",
    estado: "",
  };
}

// ============================================================================
// VALIDAÇÃO DE QUANTIDADE
// ============================================================================

/**
 * Valida e ajusta a quantidade baseado nas regras de negócio
 */
export function validateQuantity(
  quantity: number,
  isProdutoUnico: boolean,
  isPrimeiraCompra: boolean
): number {
  if (isProdutoUnico || isPrimeiraCompra) {
    return 1; // Sempre 1 para produto único ou primeira compra
  }
  return Math.max(1, quantity); // Mínimo 1
}

