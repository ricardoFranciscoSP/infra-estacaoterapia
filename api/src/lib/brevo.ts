import SibApiV3Sdk from "sib-api-v3-sdk";

const client = SibApiV3Sdk.ApiClient.instance;

// Autenticação
const apiKey = client.authentications["api-key"];

// Valida a chave de API
const brevoApiKey = process.env.BREVO_API_KEY;
if (!brevoApiKey) {
  throw new Error('BREVO_API_KEY não está configurada. Configure a variável de ambiente antes de usar a API de emails transacionais.');
}

apiKey.apiKey = brevoApiKey;

// API de emails transacionais
export const transactionalEmailApi = new SibApiV3Sdk.TransactionalEmailsApi();

// Validação da configuração da API na inicialização
console.log('[Brevo] API de emails transacionais inicializada com sucesso');
