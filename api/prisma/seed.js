const { PrismaClient } = require('../generated/prisma');
const { PrismaPg } = require('@prisma/adapter-pg');
const pg = require('pg');
const { hash } = require('bcryptjs');
const { faker } = require('@faker-js/faker');
require('dotenv').config();

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set');
}

// Função para criar o banco de dados se não existir
async function ensureDatabaseExists() {
  try {
    // Parse da DATABASE_URL para extrair informações
    const url = new URL(process.env.DATABASE_URL);
    // Remove a barra inicial e qualquer parâmetro de query
    const dbName = url.pathname.slice(1).split('?')[0];
    const host = url.hostname;
    const port = url.port || 5432;
    const user = url.username;
    const password = url.password;

    // Conecta ao banco 'postgres' (banco padrão) para criar o banco necessário
    const adminPool = new Pool({
      host: host,
      port: parseInt(port),
      user: user,
      password: password,
      database: 'postgres', // Conecta ao banco padrão
    });

    // Verifica se o banco existe
    const result = await adminPool.query(`SELECT 1 FROM pg_database WHERE datname = $1`, [dbName]);

    if (result.rows.length === 0) {
      console.log(`🔹 Criando banco de dados '${dbName}'...`);
      await adminPool.query(`CREATE DATABASE "${dbName}"`);
      console.log(`✅ Banco de dados '${dbName}' criado com sucesso!`);
    } else {
      console.log(`✅ Banco de dados '${dbName}' já existe.`);
    }

    await adminPool.end();
  } catch (error) {
    // Se der erro ao criar, pode ser que o banco já exista ou não tenha permissão
    // Continua tentando usar o banco normalmente
    if (error.code === '42P04') {
      console.log('✅ Banco de dados já existe.');
    } else if (error.code === '3D000') {
      console.log('⚠️  Não foi possível verificar/criar o banco. Tentando continuar...');
    } else {
      console.log(`⚠️  Erro ao verificar banco: ${error.message}. Tentando continuar...`);
    }
  }
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({
  adapter,
});

async function main() {
  console.log('Iniciando seed de administradores...');

  // Garante que o banco existe antes de continuar
  await ensureDatabaseExists();

  // Admin 1: Renan Barela
  const admin1Email = 'admin@estacaoterapia.com.br';
  let admin1 = await prisma.user.findUnique({ where: { Email: admin1Email } });

  if (!admin1) {
    const admin1Password = await hash('senhaSegura123', 10);
    admin1 = await prisma.user.create({
      data: {
        Nome: 'Renan Barela',
        Email: admin1Email,
        Telefone: '(11) 94442-8812',
        Password: admin1Password,
        DataNascimento: new Date('1980-01-22T20:51:15.489Z'),
        Sexo: 'Masculino',
        Role: 'Admin',
        Cpf: '059.496.520-96',
        IsOnboard: true,
        TermsAccepted: true,
        PrivacyAccepted: true,
        Status: 'Ativo',
      },
    });
    console.log(`Administrador criado: ${admin1.Nome} (${admin1.Email})`);
  } else {
    console.log(`Administrador já existe: ${admin1.Nome} (${admin1.Email})`);
  }

  // Admin 2: Ricardo Francisco
  const admin2Email = 'ricardo@maneiraweb.com.br';
  let admin2 = await prisma.user.findUnique({ where: { Email: admin2Email } });

  if (!admin2) {
    const admin2Password = await hash('senhaSegura123', 10);
    admin2 = await prisma.user.create({
      data: {
        Nome: 'Ricardo Francisco',
        Email: admin2Email,
        Telefone: '(11) 974249091',
        Password: admin2Password,
        DataNascimento: new Date('1980-01-22T00:00:00.000Z'),
        Sexo: 'Masculino',
        Role: 'Admin',
        Cpf: '009.255.139-46',
        IsOnboard: true,
        TermsAccepted: true,
        PrivacyAccepted: true,
        Status: 'Ativo',
      },
    });
    console.log(`Administrador criado: ${admin2.Nome} (${admin2.Email})`);
  } else {
    console.log(`Administrador já existe: ${admin2.Nome} (${admin2.Email})`);
  }

  // Admin 3: Matheus (Management)
  const admin3Email = 'suporte@estacaoterapia.com.br';
  let admin3 = await prisma.user.findUnique({ where: { Email: admin3Email } });

  if (!admin3) {
    const managementPassword = await hash('senhaSegura123', 10);
    const managementTelefone = faker.phone.number({ style: 'national' });
    admin3 = await prisma.user.create({
      data: {
        Nome: 'Matheus',
        Email: admin3Email,
        Telefone: managementTelefone,
        Password: managementPassword,
        Role: 'Management',
        Cpf: '383.281.630-55',
        IsOnboard: true,
        TermsAccepted: true,
        PrivacyAccepted: true,
        Status: 'Ativo',
      },
    });
    console.log(`Administrador Management criado: ${admin3.Nome} (${admin3.Email})`);
  } else {
    console.log(`Administrador Management já existe: ${admin3.Nome} (${admin3.Email})`);
  }

  // Admin 4: Matheus (Finance)
  const admin4Email = 'financeiro@estacaoterapia.com.br';
  let admin4 = await prisma.user.findUnique({ where: { Email: admin4Email } });

  if (!admin4) {
    const financePassword = await hash('senhaSegura123', 10);
    const financeTelefone = faker.phone.number({ style: 'national' });
    // Gerando CPF único para Finance (Management já usa 383.281.630-55)
    const financeCpf = faker.helpers.replaceSymbols('###.###.###-##');
    admin4 = await prisma.user.create({
      data: {
        Nome: 'Matheus',
        Email: admin4Email,
        Telefone: financeTelefone,
        Password: financePassword,
        Role: 'Finance',
        Cpf: financeCpf,
        IsOnboard: true,
        TermsAccepted: true,
        PrivacyAccepted: true,
        Status: 'Ativo',
      },
    });
    console.log(`Administrador Finance criado: ${admin4.Nome} (${admin4.Email})`);
  } else {
    console.log(`Administrador Finance já existe: ${admin4.Nome} (${admin4.Email})`);
  }

  console.log('Seed concluído com sucesso!');
}

main()
  .catch((e) => {
    if (e.code === 'P1003' || e.message?.includes('does not exist')) {
      console.error('\n❌ Erro: Banco de dados não existe!');
      console.error('💡 Soluções:');
      console.error('   1. Certifique-se de que o PostgreSQL está rodando');
      console.error('   2. Crie o banco manualmente: CREATE DATABASE estacaoterapia;');
      console.error('   3. Ou execute as migrações primeiro: npx prisma migrate deploy');
      console.error('\nDetalhes do erro:', e.message);
    } else {
      console.error('❌ Erro ao executar seed:', e);
    }
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
