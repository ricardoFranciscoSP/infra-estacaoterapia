/**
 * EXEMPLO: Como integrar o middleware de manutenção na API
 * 
 * Este arquivo mostra diferentes formas de usar o middleware
 * em uma aplicação Express ou Fastify
 * 
 * 📍 Coloque este arquivo em: api/src/examples/maintenance-integration.ts
 */

// ============================================
// EXEMPLO 1: Express - Aplicar globalmente
// ============================================

/*
import express from 'express';
import { maintenanceMiddleware } from '@/middlewares/maintenance';

const app = express();

// Aplicar middleware ANTES de todas as rotas
app.use(maintenanceMiddleware);

// Suas rotas normais
app.get('/api/consultas', (req, res) => {
  // Se manutenção estiver ativa e usuário não for admin,
  // o middleware bloqueará antes de chegar aqui
  res.json({ consultas: [] });
});

app.listen(3333, () => {
  console.log('API rodando na porta 3333');
});
*/

// ============================================
// EXEMPLO 2: Express - Aplicar em rota específica
// ============================================

/*
import express from 'express';
import { requireNotInMaintenance } from '@/middlewares/maintenance';

const router = express.Router();

// Apenas esta rota é protegida
router.get(
  '/api/consultas',
  requireNotInMaintenance,  // Proteção
  async (req, res) => {
    // Seu handler
    res.json({ consultas: [] });
  }
);

// Esta rota NÃO é protegida
router.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

export default router;
*/

// ============================================
// EXEMPLO 3: Fastify - Aplicar globalmente
// ============================================

/*
import Fastify from 'fastify';
import { maintenanceMiddlewareFastify } from '@/middlewares/maintenance';

const fastify = Fastify();

// Registrar hook antes de processar requisições
fastify.addHook('preHandler', maintenanceMiddlewareFastify);

// Suas rotas normais
fastify.get('/api/consultas', async (request, reply) => {
  return { consultas: [] };
});

await fastify.listen({ port: 3333 });
*/

// ============================================
// EXEMPLO 4: Verificar manutenção no controller
// ============================================

/*
import { Request, Response } from 'express';
import { isSystemInMaintenance } from '@/middlewares/maintenance';

export async function getConsultas(req: Request, res: Response) {
  // Verificar manutenção dentro do handler
  if (await isSystemInMaintenance(req)) {
    return res.status(503).json({
      error: 'Sistema em Manutenção',
      message: 'Este serviço está temporariamente indisponível',
    });
  }

  // Sua lógica normal
  const consultas = await database.getConsultas();
  res.json(consultas);
}
*/

// ============================================
// EXEMPLO 5: Controller com múltiplas verificações
// ============================================

/*
import { Request, Response } from 'express';
import { 
  isSystemInMaintenance, 
  checkMaintenanceMode,
  isAdminUser 
} from '@/middlewares/maintenance';

export async function updateConfiguracao(req: Request, res: Response) {
  // Verificação 1: Admin é obrigatório
  if (!isAdminUser(req)) {
    return res.status(403).json({ error: 'Acesso negado' });
  }

  // Verificação 2: Se em manutenção, apenas rotas específicas funcionam
  const maintenanceActive = await checkMaintenanceMode();
  if (maintenanceActive && req.path !== '/api/configuracoes/manutencao') {
    return res.status(503).json({ error: 'Sistema em manutenção' });
  }

  // Sua lógica
  const config = await updateInDatabase(req.body);
  res.json(config);
}
*/

// ============================================
// EXEMPLO 6: Endpoint para controlar manutenção
// ============================================

/*
import { Request, Response } from 'express';
import { isAdminUser } from '@/middlewares/maintenance';
import prisma from '@/prisma';

// 🔓 APENAS ADMIN PODE ACESSAR

export async function toggleMaintenance(req: Request, res: Response) {
  // Verificar se é admin
  if (!isAdminUser(req)) {
    return res.status(403).json({ error: 'Acesso restrito' });
  }

  const { enabled } = req.body;

  try {
    // Salvar no banco de dados
    const config = await prisma.configuracao.upsert({
      where: { chave: 'manutencao' },
      update: { valor: enabled ? 'true' : 'false' },
      create: { 
        chave: 'manutencao', 
        valor: enabled ? 'true' : 'false' 
      },
    });

    // Opcional: Notificar slack/email
    if (enabled) {
      await notifySlack('🚧 MODO MANUTENÇÃO ATIVADO');
    } else {
      await notifySlack('✅ MODO MANUTENÇÃO DESATIVADO');
    }

    res.json({
      message: enabled ? 'Manutenção ativada' : 'Manutenção desativada',
      manutencao: config.valor === 'true',
    });
  } catch (error) {
    console.error('Erro ao atualizar manutenção:', error);
    res.status(500).json({ error: 'Erro ao atualizar' });
  }
}

// GET endpoint para verificar status
export async function getMaintenanceStatus(req: Request, res: Response) {
  try {
    const config = await prisma.configuracao.findUnique({
      where: { chave: 'manutencao' },
    });

    res.json({
      manutencao: config?.valor === 'true' ?? false,
      timestamp: new Date(),
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao verificar status' });
  }
}

// Routes
router.post('/api/admin/maintenance/toggle', toggleMaintenance);
router.get('/api/configuracoes/manutencao', getMaintenanceStatus);
*/

// ============================================
// EXEMPLO 7: Agendar manutenção (com cron)
// ============================================

/*
import cron from 'node-cron';
import { prisma } from '@/prisma';

// Agendar manutenção para segunda-feira às 2 da manhã
cron.schedule('0 2 * * 1', async () => {
  console.log('🔧 Iniciando manutenção agendada...');
  
  await prisma.configuracao.update({
    where: { chave: 'manutencao' },
    data: { valor: 'true' },
  });

  // Enviar notificação
  await notifyUsers('Manutenção será iniciada em 1 hora');

  // Desativar manutenção após 2 horas
  setTimeout(async () => {
    await prisma.configuracao.update({
      where: { chave: 'manutencao' },
      data: { valor: 'false' },
    });
    console.log('✅ Manutenção concluída');
  }, 2 * 60 * 60 * 1000);
});
*/

// ============================================
// EXEMPLO 8: Testes automatizados
// ============================================

/*
import request from 'supertest';
import { app } from '@/server';

describe('Middleware de Manutenção', () => {
  test('Bloqueia acesso durante manutenção', async () => {
    // Ativar manutenção
    process.env.MAINTENANCE_MODE = 'true';

    const response = await request(app)
      .get('/api/consultas');

    expect(response.status).toBe(503);
    expect(response.body.code).toBe('MAINTENANCE_MODE');

    // Desativar
    process.env.MAINTENANCE_MODE = 'false';
  });

  test('Permite admin durante manutenção', async () => {
    process.env.MAINTENANCE_MODE = 'true';

    const response = await request(app)
      .get('/api/consultas')
      .set('Cookie', 'role=Admin');  // Simular cookie de admin

    expect(response.status).toBe(200);

    process.env.MAINTENANCE_MODE = 'false';
  });
});
*/

// ============================================
// DICAS E BOAS PRÁTICAS
// ============================================

/**
 * ✅ DO's (Faça)
 * 
 * 1. Aplicar middleware ANTES de autenticação (para que funcione globalmente)
 * 2. Usar na API e Frontend (defesa em profundidade)
 * 3. Testar com e sem manutenção
 * 4. Notificar usuários antes de ativar manutenção
 * 5. Ter plano de desativação (máximo 2-4 horas)
 * 
 * ❌ DON'Ts (Não faça)
 * 
 * 1. Confiar apenas no frontend
 * 2. Esquecer de testar a rota de admin
 * 3. Deixar manutenção ligada sem supervisão
 * 4. Não avisar os usuários
 * 5. Usar manutenção como "desculpa" para downtime longo
 */

export default {};
