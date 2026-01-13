// Tenta importar do Prisma Client customizado, senão usa o padrão
let PrismaClient: any;
let PrismaPg: any;
let pg: any;

try {
    // Tenta usar o Prisma Client customizado
    const customClient = require('../src/generated/prisma/client');
    PrismaClient = customClient.PrismaClient;
    PrismaPg = require('@prisma/adapter-pg').PrismaPg;
    pg = require('pg');
} catch {
    // Fallback para Prisma Client padrão
    PrismaClient = require('@prisma/client').PrismaClient;
    PrismaPg = require('@prisma/adapter-pg').PrismaPg;
    pg = require('pg');
}

const { hash } = require('bcryptjs');
const { faker } = require('@faker-js/faker');
require('dotenv').config();

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set');
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

    // Admin 1: Renan Barela
    const admin1Password = await hash('senhaSegura123', 10);
    const admin1 = await prisma.user.create({
        data: {
            Nome: 'Renan Barela',
            Email: 'admin@estacaoterapia.com.br',
            Telefone: '(11) 94442-8812',
            Password: admin1Password,
            DataNascimento: new Date('1980-01-22T20:51:15.489Z'),
            Sexo: 'Masculino',
            Role: 'Admin',
            Cpf: '059.496.520-96',
            IsOnboard: true,
            TermsAccepted: true,
            PrivacyAccepted: true,
            Status: 'Ativo'
        }
    });
    console.log(`Administrador criado: ${admin1.Nome} (${admin1.Email})`);

    // Admin 2: Ricardo Francisco
    const admin2Password = await hash('senhaSegura123', 10);
    const admin2 = await prisma.user.create({
        data: {
            Nome: 'Ricardo Francisco',
            Email: 'ricardo@maneiraweb.com.br',
            Telefone: '(11) 974249091',
            Password: admin2Password,
            DataNascimento: new Date('1980-01-22T00:00:00.000Z'),
            Sexo: 'Masculino',
            Role: 'Admin',
            Cpf: '009.255.139-46',
            IsOnboard: true,
            TermsAccepted: true,
            PrivacyAccepted: true,
            Status: 'Ativo'
        }
    });
    console.log(`Administrador criado: ${admin2.Nome} (${admin2.Email})`);

    // Admin 3: Matheus (Management)
    const managementPassword = await hash('senhaSegura123', 10);
    const managementTelefone = faker.phone.number({ style: 'national' });
    const admin3 = await prisma.user.create({
        data: {
            Nome: 'Matheus',
            Email: 'suporte@estacaoterapia.com.br',
            Telefone: managementTelefone,
            Password: managementPassword,
            Role: 'Management',
            Cpf: '383.281.630-55',
            IsOnboard: true,
            TermsAccepted: true,
            PrivacyAccepted: true,
            Status: 'Ativo'
        }
    });
    console.log(`Administrador Management criado: ${admin3.Nome} (${admin3.Email})`);

    // Admin 4: Matheus (Finance)
    const financePassword = await hash('senhaSegura123', 10);
    const financeTelefone = faker.phone.number({ style: 'national' });
    // Gerando CPF único para Finance (Management já usa 383.281.630-55)
    const financeCpf = faker.helpers.replaceSymbols('###.###.###-##');
    const admin4 = await prisma.user.create({
        data: {
            Nome: 'Matheus',
            Email: 'financeiro@estacaoterapia.com.br',
            Telefone: financeTelefone,
            Password: financePassword,
            Role: 'Finance',
            Cpf: financeCpf,
            IsOnboard: true,
            TermsAccepted: true,
            PrivacyAccepted: true,
            Status: 'Ativo'
        }
    });
    console.log(`Administrador Finance criado: ${admin4.Nome} (${admin4.Email})`);

    console.log('Seed concluído com sucesso!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });