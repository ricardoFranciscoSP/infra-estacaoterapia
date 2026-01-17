import axios from "axios";

export interface RecaptchaVerificationResult {
  success: boolean;
  score?: number;
  action?: string;
  errorCodes?: string[];
}

export async function verifyRecaptcha(token: string, remoteIp?: string): Promise<RecaptchaVerificationResult> {
  const secret = process.env.RECAPTCHA_SECRET_KEY;
  if (!secret) {
    throw new Error("RECAPTCHA_SECRET_KEY não configurada.");
  }

  const params = new URLSearchParams({
    secret,
    response: token,
  });

  if (remoteIp) {
    params.append("remoteip", remoteIp);
  }

  const { data } = await axios.post(
    "https://www.google.com/recaptcha/api/siteverify",
    params,
    {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    }
  );

  return {
    success: Boolean(data.success),
    score: typeof data.score === "number" ? data.score : undefined,
    action: typeof data.action === "string" ? data.action : undefined,
    errorCodes: Array.isArray(data["error-codes"]) ? data["error-codes"] : undefined,
  };
}
