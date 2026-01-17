import { RecaptchaEnterpriseServiceClient } from "@google-cloud/recaptcha-enterprise";

type AssessmentResult = {
  score: number;
  action: string;
};

let client: RecaptchaEnterpriseServiceClient | null = null;

function getClient(): RecaptchaEnterpriseServiceClient {
  if (!client) {
    client = new RecaptchaEnterpriseServiceClient();
  }
  return client;
}

export async function verifyRecaptchaEnterprise(params: {
  token: string;
  expectedAction: string;
  siteKey?: string;
  projectId?: string;
}): Promise<AssessmentResult> {
  const projectId = params.projectId || process.env.RECAPTCHA_ENTERPRISE_PROJECT_ID;
  const siteKey = params.siteKey || process.env.RECAPTCHA_ENTERPRISE_SITE_KEY;

  if (!projectId) {
    throw new Error("RECAPTCHA_ENTERPRISE_PROJECT_ID não configurado.");
  }
  if (!siteKey) {
    throw new Error("RECAPTCHA_ENTERPRISE_SITE_KEY não configurado.");
  }
  if (!params.token) {
    throw new Error("Token reCAPTCHA ausente.");
  }

  const recaptchaClient = getClient();
  const projectPath = recaptchaClient.projectPath(projectId);

  const request = {
    assessment: {
      event: {
        token: params.token,
        siteKey,
      },
    },
    parent: projectPath,
  };

  const [response] = await recaptchaClient.createAssessment(request);

  if (!response.tokenProperties?.valid) {
    const reason = response.tokenProperties?.invalidReason || "invalid";
    throw new Error(`Token reCAPTCHA inválido (${reason}).`);
  }

  const action = response.tokenProperties?.action || "";
  if (action !== params.expectedAction) {
    throw new Error("Ação do reCAPTCHA não corresponde.");
  }

  const score = response.riskAnalysis?.score;
  if (typeof score !== "number") {
    throw new Error("Pontuação reCAPTCHA ausente.");
  }

  const minScoreEnv = process.env.RECAPTCHA_ENTERPRISE_SCORE_THRESHOLD;
  const minScore = minScoreEnv ? Number(minScoreEnv) : 0.5;
  if (!Number.isFinite(minScore)) {
    throw new Error("RECAPTCHA_ENTERPRISE_SCORE_THRESHOLD inválido.");
  }
  if (score < minScore) {
    throw new Error("Pontuação de risco reCAPTCHA insuficiente.");
  }

  return { score, action };
}
