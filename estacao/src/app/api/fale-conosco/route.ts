import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

/**
 * Sanitiza strings para prevenir XSS e injection attacks
 */
function sanitizeString(input: string | undefined | null): string {
  if (!input || typeof input !== 'string') return '';
  return input
    .trim()
    .replace(/[<>"'`/\\{}\[\];]/g, '')
    .substring(0, 1000); // Limita tamanho máximo
}

/**
 * Valida formato de email
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    // Validação básica
    const token = body.recaptchaToken || body.token;
    if (!body.nome || !body.email || !body.assunto || !body.mensagem || !token) {
      return NextResponse.json({ error: 'Campos obrigatórios ausentes.' }, { status: 400 });
    }

    // Sanitiza e valida entrada
    const nome = sanitizeString(body.nome);
    const email = sanitizeString(body.email);
    const assunto = sanitizeString(body.assunto);
    const mensagem = sanitizeString(body.mensagem);
    const telefone = body.telefone ? sanitizeString(body.telefone) : undefined;
    const sanitizedToken = sanitizeString(token);

    // Validações adicionais
    if (!nome || nome.length < 2) {
      return NextResponse.json({ error: 'Nome inválido.' }, { status: 400 });
    }

    if (!isValidEmail(email)) {
      return NextResponse.json({ error: 'Email inválido.' }, { status: 400 });
    }

    if (!assunto || assunto.length < 3) {
      return NextResponse.json({ error: 'Assunto inválido.' }, { status: 400 });
    }

    if (!mensagem || mensagem.length < 10) {
      return NextResponse.json({ error: 'Mensagem muito curta.' }, { status: 400 });
    }

    if (!sanitizedToken) {
      return NextResponse.json({ error: 'Token de captcha ausente.' }, { status: 400 });
    }

    // Verifica o captcha do Google
    const captchaSecret = process.env.RECAPTCHA_SECRET_KEY;
    if (!captchaSecret) {
      console.error('[fale-conosco] RECAPTCHA_SECRET_KEY não configurada');
      return NextResponse.json({ error: 'Configuração de segurança ausente.' }, { status: 500 });
    }

    // Usa POST com body ao invés de query string para proteger a secret key
    const captchaVerify = await axios.post(
      'https://www.google.com/recaptcha/api/siteverify',
      new URLSearchParams({
        secret: captchaSecret,
        response: sanitizedToken
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    if (!captchaVerify.data.success) {
      return NextResponse.json({ error: 'Captcha inválido.' }, { status: 400 });
    }

    // Envia para a API backend
    // Detecta se está usando placeholder e substitui pela URL correta
    let apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
    if (!apiUrl || apiUrl.includes('__PLACEHOLDER_') || apiUrl.trim() === '') {
      // Fallback baseado no ambiente
      // Para API routes, não temos acesso ao window, então usamos NODE_ENV
      // Mas em pré-produção, NODE_ENV pode ser 'development', então usamos fallback seguro
      // Prioriza variável de ambiente, senão usa fallback
      if (process.env.NODE_ENV === 'production') {
        apiUrl = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_URL_PROD || 'https://api-prd.estacaoterapia.com.br';
      } else {
        apiUrl = 'https://api.pre.estacaoterapia.com.br'; // Fallback para pré-produção/desenvolvimento
      }
    } else {
      // Remove barra final se houver
      apiUrl = apiUrl.replace(/\/$/, '');
    }

    // Envia dados sanitizados para a API
    await axios.post(`${apiUrl}/contato`, {
      nome,
      email,
      telefone,
      assunto,
      mensagem
    }, {
      timeout: 10000, // Timeout de 10 segundos
      headers: {
        'Content-Type': 'application/json'
      }
    });

    return NextResponse.json({ message: 'Contato enviado com sucesso.' });
  } catch (error) {
    // Não expõe detalhes do erro para o cliente
    console.error('[fale-conosco] Erro ao processar contato:', error);
    return NextResponse.json({ error: 'Erro ao enviar contato. Tente novamente mais tarde.' }, { status: 500 });
  }
}
