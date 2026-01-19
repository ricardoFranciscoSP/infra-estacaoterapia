type ApiErrorPayload = {
  message?: string;
  error?: string;
  details?: string;
  errors?: Array<{ message?: string } | string>;
};

const GENERIC_MESSAGES = new Set([
  "Erro interno do servidor.",
  "Erro ao registrar.",
  "Erro desconhecido.",
  "Ocorreu um erro ao processar sua solicitação.",
]);

const isGenericMessage = (value?: string) =>
  !!value && GENERIC_MESSAGES.has(value.trim());

export function normalizeApiErrorMessage(error: unknown, fallback: string): string {
  if (!error || typeof error !== "object") return fallback;

  const err = error as {
    message?: string;
    response?: { data?: ApiErrorPayload | string };
  };

  const data = err.response?.data;

  if (typeof data === "string" && data.trim()) {
    return data;
  }

  if (data && typeof data === "object") {
    const message = typeof data.message === "string" ? data.message.trim() : "";
    const errorMessage = typeof data.error === "string" ? data.error.trim() : "";
    const details = typeof data.details === "string" ? data.details.trim() : "";

    if (errorMessage && (isGenericMessage(message) || !message)) {
      return errorMessage;
    }
    if (message) return message;
    if (errorMessage) return errorMessage;
    if (details) return details;

    if (Array.isArray(data.errors)) {
      const combined = data.errors
        .map((item) => (typeof item === "string" ? item : item?.message))
        .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
        .join("; ");
      if (combined) return combined;
    }
  }

  if (typeof err.message === "string" && err.message.trim()) {
    return err.message;
  }

  return fallback;
}
