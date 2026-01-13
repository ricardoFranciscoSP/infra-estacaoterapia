import prisma from '../prisma/client';
import { DateTime } from 'luxon';
import { IPrimeiraConsultaService } from '../interfaces/primeiraConsulta.interface';
import { PrimeiraConsultaData, PrimeiraConsultaResponse, VerificarCompraParams } from '../types/primeiraConsulta.type';
import { VindiService } from './vindi.service';
import { FaturaStatus, TipoFatura } from '../types/permissions.types';

export class PrimeiraConsultaService implements IPrimeiraConsultaService {
    async verificarSeJaComprouPrimeiraConsulta({
        email,
        telefone,
        cpf,
    }: {
        email: string;
        telefone: string;
        cpf: string;
    }): Promise<boolean> {
        // Busca usuário pelo email/telefone/cpf e verifica se existe algum Financeiro relacionado a uma Fatura do tipo PrimeiraConsulta
        const usuarioExistente = await prisma.user.findFirst({
            where: {
                OR: [
                    { Email: email },
                    { Telefone: telefone },
                    { Cpf: cpf },
                ],
                FinanceiroEntries: {
                    some: {
                        Fatura: {
                            Tipo: 'PrimeiraConsulta',
                        }
                    }
                }
            },
            include: {
                FinanceiroEntries: {
                    include: {
                        Fatura: true
                    }
                }
            }
        });

        return !!usuarioExistente;
    }

    private async cadastrarEnderecosSeNecessario(usuario: any, endereco: any, userId: string) {
        // Se não há endereço na requisição, retorna null
        if (!endereco || !userId) {
            return null;
        }

        // Valida se o endereço tem os campos obrigatórios
        if (!endereco.rua || !endereco.numero || !endereco.bairro || !endereco.cidade || !endereco.estado || !endereco.cep) {
            return null;
        }

        // Verifica se o usuário já tem endereço cadastrado
        // usuario.Address pode ser boolean (do GetUserBasicService) ou array
        const temEndereco = usuario?.Address === true ||
            (Array.isArray(usuario?.Address) && usuario.Address.length > 0);

        // Se não tem endereço, cria novo
        if (!temEndereco) {
            const addressCreated = await prisma.address.create({
                data: {
                    UserId: userId,
                    Rua: endereco.rua,
                    Numero: endereco.numero,
                    Complemento: endereco.complemento ?? '',
                    Bairro: endereco.bairro,
                    Cidade: endereco.cidade,
                    Estado: endereco.estado,
                    Cep: endereco.cep
                }
            });

            // Verifica se já existe billingAddress antes de criar
            const existingBilling = await prisma.billingAddress.findFirst({
                where: { UserId: userId }
            });

            if (!existingBilling) {
                await prisma.billingAddress.create({
                    data: {
                        UserId: userId,
                        Rua: endereco.rua,
                        Numero: endereco.numero,
                        Complemento: endereco.complemento ?? '',
                        Bairro: endereco.bairro,
                        Cidade: endereco.cidade,
                        Estado: endereco.estado,
                        Cep: endereco.cep
                    }
                });
            } else {
                // Atualiza o endereço de cobrança existente
                await prisma.billingAddress.update({
                    where: { Id: existingBilling.Id },
                    data: {
                        Rua: endereco.rua,
                        Numero: endereco.numero,
                        Complemento: endereco.complemento ?? '',
                        Bairro: endereco.bairro,
                        Cidade: endereco.cidade,
                        Estado: endereco.estado,
                        Cep: endereco.cep,
                        UpdatedAt: new Date()
                    }
                });
            }

            return addressCreated;
        } else {
            // Se já tem endereço, atualiza o endereço de cobrança se necessário
            const existingBilling = await prisma.billingAddress.findFirst({
                where: { UserId: userId }
            });

            if (existingBilling) {
                await prisma.billingAddress.update({
                    where: { Id: existingBilling.Id },
                    data: {
                        Rua: endereco.rua,
                        Numero: endereco.numero,
                        Complemento: endereco.complemento ?? '',
                        Bairro: endereco.bairro,
                        Cidade: endereco.cidade,
                        Estado: endereco.estado,
                        Cep: endereco.cep,
                        UpdatedAt: new Date()
                    }
                });
            } else {
                await prisma.billingAddress.create({
                    data: {
                        UserId: userId,
                        Rua: endereco.rua,
                        Numero: endereco.numero,
                        Complemento: endereco.complemento ?? '',
                        Bairro: endereco.bairro,
                        Cidade: endereco.cidade,
                        Estado: endereco.estado,
                        Cep: endereco.cep
                    }
                });
            }

            // Retorna o endereço principal existente ou cria um novo se não existir
            const existingAddress = await prisma.address.findFirst({
                where: { UserId: userId }
            });

            if (existingAddress) {
                return existingAddress;
            } else {
                return await prisma.address.create({
                    data: {
                        UserId: userId,
                        Rua: endereco.rua,
                        Numero: endereco.numero,
                        Complemento: endereco.complemento ?? '',
                        Bairro: endereco.bairro,
                        Cidade: endereco.cidade,
                        Estado: endereco.estado,
                        Cep: endereco.cep
                    }
                });
            }
        }
    }

    private async criarPaymentProfileVindi(data: PrimeiraConsultaData) {
        try {
            return await VindiService.createPaymentProfile({
                customer_id: Number(data.usuario?.VindiCustomerId),
                card_number: data.cartao?.numeroCartao ?? '',
                holder_name: data.cartao?.nomeTitular ?? '',
                card_expiration: data.cartao?.validade ?? '',
                card_cvv: data.cartao?.cvv ?? '',
                payment_method_code: data.cartao?.paymentMethodCode ?? 'credit_card',
                payment_company_code: data.cartao?.payment_company_code ?? '',
            });
        } catch (err: any) {
            if (err?.details && Array.isArray(err.details)) {
                const vindiErrors = err.details.map((e: any) => `${e.parameter}: ${e.message}`).join(' | ');
                return {
                    error: true,
                    message: vindiErrors
                } as any;
            }
            return {
                error: true,
                message: err?.message || 'Erro ao criar perfil de pagamento.'
            } as any;
        }
    }

    private async atualizarCustomerVindi(usuario: any, vindiAddress: any, phones: any[], userId: string) {
        return await VindiService.updateCustomer(
            usuario?.VindiCustomerId ?? '',
            {
                name: usuario?.Nome,
                email: usuario?.Email,
                registry_code: usuario?.Cpf,
                code: String(userId),
                notes: '',
                metadata: {},
                address: vindiAddress,
                phones: phones
            }
        );
    }

    private montarVindiAddress(enderecoCriado: any, endereco: any) {
        if (enderecoCriado) {
            return {
                street: enderecoCriado.Rua,
                number: enderecoCriado.Numero,
                additional_details: enderecoCriado.Complemento ?? undefined,
                zipcode: enderecoCriado.Cep,
                neighborhood: enderecoCriado.Bairro,
                city: enderecoCriado.Cidade,
                state: enderecoCriado.Estado,
                country: 'BR'
            };
        } else if (endereco) {
            return {
                street: endereco.rua,
                number: endereco.numero,
                additional_details: endereco.complemento ?? undefined,
                zipcode: endereco.cep,
                neighborhood: endereco.bairro,
                city: endereco.cidade,
                state: endereco.estado,
                country: 'BR'
            };
        } else {
            return undefined;
        }
    }

    private montarPhonesVindi(usuario: any) {
        return [
            {
                phone_type: 'mobile',
                number: usuario?.telefone ?? '',
            }
        ];
    }

    private async criarPagamentoVindi(data: PrimeiraConsultaData) {
        try {
            return await VindiService.createPayment({
                customer_id: Number(data.usuario?.VindiCustomerId),
                payment_method_code: data.cartao?.paymentMethodCode ?? 'credit_card',
                bill_items: [
                    {
                        product_id: Number(data.planoId),
                        amount: data.valor ?? 0,
                    }
                ]
            });
        } catch (err: any) {
            if (err?.details && Array.isArray(err.details)) {
                const vindiErrors = err.details.map((e: any) => `${e.parameter}: ${e.message}`).join(' | ');
                return {
                    error: true,
                    message: vindiErrors
                } as any;
            }
            return {
                error: true,
                message: err?.message || 'Erro ao criar cobrança.'
            } as any;
        }
    }

    private async criarFatura(bill: { bill_id?: string | number }, valor: number, agora: Date, dataFim: Date, userId: string, VindiCustomerId: string, planoTipo: string) {
        // Valida se bill e bill.bill_id existem
        if (!bill || !bill.bill_id) {
            throw new Error('Bill ou bill_id não encontrado. Não é possível criar Fatura.');
        }

        const codigoFatura = String(bill.bill_id);

        // Verifica se a fatura já existe antes de criar
        const faturaExistente = await prisma.fatura.findUnique({
            where: { CodigoFatura: codigoFatura }
        });

        if (faturaExistente) {
            console.log(`[PrimeiraConsulta] Fatura com CodigoFatura ${codigoFatura} já existe. Retornando fatura existente.`);
            return faturaExistente;
        }

        // Cria a fatura apenas se não existir
        return await prisma.fatura.create({
            data: {
                CodigoFatura: codigoFatura,
                Valor: valor,
                Status: FaturaStatus.Pending,
                DataEmissao: agora,
                DataVencimento: dataFim,
                Tipo: planoTipo === 'Avulsa' ? TipoFatura.ConsultaAvulsa : TipoFatura.PrimeiraConsulta,
                UserId: String(userId),
                CustomerId: String(VindiCustomerId)
            },
        });
    }

    private async criarFinanceiro(userId: string, valor: number, dataFim: Date, fatura: any, planoTipo: string) {
        // Verifica se já existe um financeiro vinculado a esta fatura
        const financeiroExistente = await prisma.financeiro.findFirst({
            where: { FaturaId: fatura.Id }
        });

        if (financeiroExistente) {
            console.log(`[PrimeiraConsulta] Financeiro com FaturaId ${fatura.Id} já existe. Retornando financeiro existente.`);
            return financeiroExistente;
        }

        // Garante que o tipo seja apenas 'PrimeiraConsulta' ou 'Avulsa'
        const tipo: TipoFatura = planoTipo === 'Avulsa' ? TipoFatura.ConsultaAvulsa : TipoFatura.PrimeiraConsulta;
        return await prisma.financeiro.create({
            data: {
                UserId: userId,
                Valor: valor,
                DataVencimento: dataFim,
                Status: 'AguardandoPagamento',
                Tipo: tipo,
                FaturaId: fatura.Id
            },
        });
    }

    private async criarTransaction(bill: any, usuario: any) {
        // Valida se bill existe
        if (!bill) {
            throw new Error('Bill não encontrado. Não é possível criar Transaction.');
        }

        const vindiBillId = typeof bill.bill_id === 'number' ? bill.bill_id : Number(bill.bill_id) || 0;

        // Verifica se já existe uma transaction com este VindiBillId
        const transactionExistente = await prisma.transaction.findFirst({
            where: { VindiBillId: vindiBillId }
        });

        if (transactionExistente) {
            console.log(`[PrimeiraConsulta] Transaction com VindiBillId ${vindiBillId} já existe. Retornando transaction existente.`);
            return transactionExistente;
        }

        return await prisma.transaction.create({
            data: {
                VindiBillId: vindiBillId,
                Amount: typeof bill.amount === 'number' ? bill.amount : Number(bill.amount) || 0,
                Status: bill.status ?? 'Pendente',
                QrCode: bill.pix?.qr_code || '',
                QrCodeText: bill.pix?.qr_code_text || '',
                CustomerId: String(usuario?.vindiCustomerId),
            },
        });
    }

    private async criarCreditoAvulso(userId: string, agora: Date, quantidade: number, valor: number, bill: any, tipo: string = 'PrimeiraConsulta') {
        // Valida se bill e bill.bill_id existem
        if (!bill || !bill.bill_id) {
            throw new Error('Bill ou bill_id não encontrado. Não é possível criar CreditoAvulso.');
        }

        const billId = bill.bill_id?.toString() || String(bill.bill_id);

        // Verifica se já existe um crédito com este CodigoFatura
        const creditoExistentePorFatura = await prisma.creditoAvulso.findFirst({
            where: { CodigoFatura: billId }
        });

        if (creditoExistentePorFatura) {
            console.log(`[PrimeiraConsulta] CreditoAvulso com CodigoFatura ${billId} já existe. Retornando crédito existente.`);
            return creditoExistentePorFatura;
        }

        // Usa luxon para garantir fuso horário de Brasília
        const dataBrasilia = DateTime.now().setZone('America/Sao_Paulo');
        const validUntil = dataBrasilia.plus({ days: 30 });
        
        // Busca TODOS os créditos existentes com Status Ativa para somar
        const creditosExistentes = await prisma.creditoAvulso.findMany({
            where: {
                UserId: userId,
                Status: 'Ativa',
                ValidUntil: { gt: agora }, // Ainda válido
            },
            orderBy: { ValidUntil: 'asc' }, // Ordena por validade
        });
        
        if (creditosExistentes.length > 0) {
            // Soma todas as quantidades e valores existentes
            const quantidadeTotalExistente = creditosExistentes.reduce((sum, credito) => sum + credito.Quantidade, 0);
            const valorTotalExistente = creditosExistentes.reduce((sum, credito) => sum + credito.Valor, 0);
            
            // Calcula os novos totais
            const novaQuantidade = quantidadeTotalExistente + quantidade;
            const novoValor = valorTotalExistente + valor;
            
            // Pega o crédito que vence primeiro (ou o primeiro se todos tiverem a mesma validade)
            const creditoPrincipal = creditosExistentes[0];
            
            // Atualiza o crédito principal com os valores somados
            const creditoAtualizado = await prisma.creditoAvulso.update({
                where: { Id: creditoPrincipal.Id },
                data: {
                    Quantidade: novaQuantidade,
                    Valor: novoValor,
                    // Mantém o ValidUntil do crédito principal (ou atualiza se necessário)
                    // Atualiza o CodigoFatura para o mais recente
                    CodigoFatura: billId,
                },
            });
            
            // Remove os outros créditos (já foram somados no principal)
            if (creditosExistentes.length > 1) {
                const outrosIds = creditosExistentes.slice(1).map(c => c.Id);
                await prisma.creditoAvulso.deleteMany({
                    where: {
                        Id: { in: outrosIds },
                    },
                });
            }
            
            return creditoAtualizado;
        }
        
        // Se não existe crédito ativo, cria um novo
        // Converte a string para o enum TipoFatura baseado no tipo do plano
        let tipoFatura: TipoFatura = TipoFatura.ConsultaAvulsa; // Default
        
        const tipoLower = tipo?.toLowerCase() || '';
        if (tipoLower === 'unico' || tipoLower === 'avulsa' || tipoLower === 'consultaavulsa') {
            tipoFatura = TipoFatura.ConsultaAvulsa;
        } else if (tipoLower === 'primeiraconsulta' || tipoLower === 'primeira consulta') {
            tipoFatura = TipoFatura.PrimeiraConsulta;
        } else if (tipoLower === 'mensal' || tipoLower === 'trimestral' || tipoLower === 'semestral') {
            // Para planos recorrentes, se não tem PlanoAssinaturaId, é consulta avulsa
            tipoFatura = TipoFatura.ConsultaAvulsa;
        }
        
        return await prisma.creditoAvulso.create({
            data: {
                UserId: userId,
                Status: 'Pendente',
                Valor: valor,
                Quantidade: quantidade,
                Data: dataBrasilia.toJSDate(),
                ValidUntil: validUntil.toJSDate(),
                CodigoFatura: billId,
                Tipo: tipoFatura // Usa o enum TipoFatura convertido baseado no tipo do plano
            },
        });
    }

    private async consultaAvulsa(userId: string, bill: any, tipo: string = 'PrimeiraConsulta') {
        // Valida se bill e bill.bill_id existem
        if (!bill || !bill.bill_id) {
            throw new Error('Bill ou bill_id não encontrado. Não é possível criar ConsultaAvulsa.');
        }

        const billId = bill.bill_id?.toString() || String(bill.bill_id);

        // Verifica se já existe uma consulta avulsa com este CodigoFatura
        const consultaExistente = await prisma.consultaAvulsa.findFirst({
            where: { CodigoFatura: billId }
        });

        if (consultaExistente) {
            console.log(`[PrimeiraConsulta] ConsultaAvulsa com CodigoFatura ${billId} já existe. Retornando consulta existente.`);
            return consultaExistente;
        }
        
        // Converte a string para o enum TipoFatura baseado no tipo do plano
        let tipoFatura: TipoFatura = TipoFatura.ConsultaAvulsa; // Default
        
        const tipoLower = tipo?.toLowerCase() || '';
        if (tipoLower === 'unico' || tipoLower === 'avulsa' || tipoLower === 'consultaavulsa') {
            tipoFatura = TipoFatura.ConsultaAvulsa;
        } else if (tipoLower === 'primeiraconsulta' || tipoLower === 'primeira consulta') {
            tipoFatura = TipoFatura.PrimeiraConsulta;
        } else if (tipoLower === 'mensal' || tipoLower === 'trimestral' || tipoLower === 'semestral') {
            // Para planos recorrentes, se não tem PlanoAssinaturaId, é consulta avulsa
            tipoFatura = TipoFatura.ConsultaAvulsa;
        }
        
        return await prisma.consultaAvulsa.create({
            data: {
                PacienteId: userId,
                Status: 'Pendente',
                DataCriacao: DateTime.now().setZone('America/Sao_Paulo').toJSDate(),
                Quantidade: 1,
                Tipo: tipoFatura, // Usa o enum TipoFatura convertido baseado no tipo do plano
                CodigoFatura: billId
            },
        });
    }

    async comprarPrimeiraConsulta(data: PrimeiraConsultaData): Promise<PrimeiraConsultaResponse> {
        // Validação inicial rápida
        const jaComprou = await this.verificarSeJaComprouPrimeiraConsulta({
            email: data.usuario?.Email ?? '',
            telefone: data.usuario?.Telefone ?? '',
            cpf: data.usuario?.Cpf ?? '',
        });

        const plano = await prisma.planoAssinatura.findFirst({
            where: { ProductId: data.planoId }
        });

        // Se já comprou primeira consulta e o plano é único, trata como consulta avulsa
        const planoTipo = (jaComprou && plano?.Tipo === 'Unica') ? 'Avulsa' : (plano?.Tipo ?? 'PrimeiraConsulta');

        if (jaComprou && plano?.Tipo === 'Unica') {
            console.log(`[PrimeiraConsulta] Usuário já comprou primeira consulta. Tratando como ConsultaAvulsa.`);
        }

        // Cadastro de endereço e montagem de dados para Vindi em paralelo
        const enderecoPromise = this.cadastrarEnderecosSeNecessario(data.usuario, data.endereco, data.userId);
        const phones = this.montarPhonesVindi(data.usuario);

        // Aguarda endereço criado para montar vindiAddress
        const enderecoCriado = await enderecoPromise;
        const vindiAddress = this.montarVindiAddress(enderecoCriado, data.endereco);

        // Atualização do customer e criação do payment profile em paralelo
        const [_, paymentProfile] = await Promise.all([
            this.atualizarCustomerVindi(data.usuario, vindiAddress, phones, data.userId),
            this.criarPaymentProfileVindi(data)
        ]);

        // Criação do pagamento (bill)
        const bill = await this.criarPagamentoVindi(data);

        // Verifica se houve erro na criação do pagamento
        if (bill?.error) {
            return {
                error: true,
                message: bill.message || 'Erro ao processar pagamento na Vindi.'
            } as any;
        }

        // Valida se o bill foi criado corretamente
        if (!bill || !bill.bill_id) {
            return {
                error: true,
                message: 'Falha ao criar pagamento na Vindi. Bill não foi criado corretamente.'
            } as any;
        }

        // Busca detalhes do bill ANTES de criar registros no banco para verificar erros do gateway
        // Aguarda um pequeno delay para garantir que os charges foram processados
        let billDetails: any = {};
        if (bill && bill.bill_id && !isNaN(Number(bill.bill_id))) {
            try {
                // Aguarda 1 segundo para garantir que os charges foram processados pela Vindi
                await new Promise(resolve => setTimeout(resolve, 1000));
                billDetails = await VindiService.getBillById(bill.bill_id);
                
                // Verifica se há charges com erro do gateway
                if (billDetails?.charges && Array.isArray(billDetails.charges) && billDetails.charges.length > 0) {
                    const charge = billDetails.charges[0];
                    const chargeStatus = charge.status?.toLowerCase();
                    const statusInvalidos = ['failed', 'rejected', 'unauthorized', 'voided'];
                    
                    // Verifica status do charge
                    if (chargeStatus && statusInvalidos.includes(chargeStatus)) {
                        const lastTransaction = charge.last_transaction;
                        const gatewayMessage = lastTransaction?.gateway_message || charge.gateway_message || lastTransaction?.message || '';
                        const errorCode = lastTransaction?.gateway_response_code || charge.gateway_response_code || lastTransaction?.gateway_return_code || lastTransaction?.return_code || '';
                        
                        // Mapeia códigos e mensagens para mensagens amigáveis
                        const codeMessages: Record<string, string> = {
                            '01': 'Não foi possível processar o pagamento. Entre em contato com o banco emissor do cartão.',
                            '04': 'Seu cartão possui uma restrição. Entre em contato com o banco emissor.',
                            '05': 'Pagamento não autorizado. Verifique os dados do cartão e tente novamente.',
                            '51': 'Saldo insuficiente no cartão. Verifique o limite disponível.',
                            '54': 'Seu cartão está vencido. Utilize outro cartão ou atualize a validade.',
                            '57': 'Transação não permitida para este cartão. Tente com outro cartão.',
                            '78': 'Seu cartão precisa ser desbloqueado. Entre em contato com o banco.',
                            'N7': 'Código de segurança (CVV) inválido. Verifique os 3 ou 4 dígitos no verso do cartão.'
                        };
                        
                        let errorMessage = 'Não foi possível processar o pagamento. Verifique os dados do cartão e tente novamente.';
                        
                        // Prioriza mensagem do gateway se disponível
                        if (gatewayMessage) {
                            // Mapeia mensagens conhecidas para versões mais amigáveis
                            const messageMap: Record<string, string> = {
                                'transação não permitida': 'Transação não permitida para este cartão. Tente com outro cartão.',
                                'cartão não foi desbloqueado': 'Seu cartão precisa ser desbloqueado. Entre em contato com o banco.',
                                'código de segurança inválido': 'Código de segurança (CVV) inválido. Verifique os 3 ou 4 dígitos no verso do cartão.',
                                'erro de comunicação': 'Erro ao comunicar com o banco. Tente novamente em alguns instantes.',
                                'transação referida': 'Não foi possível processar o pagamento. Entre em contato com o banco emissor do cartão.',
                                'cartão com restrição': 'Seu cartão possui uma restrição. Entre em contato com o banco emissor.',
                                'transação não autorizada': 'Pagamento não autorizado. Verifique os dados do cartão e tente novamente.',
                                'saldo insuficiente': 'Saldo insuficiente no cartão. Verifique o limite disponível.',
                                'cartão vencido': 'Seu cartão está vencido. Utilize outro cartão ou atualize a validade.'
                            };
                            
                            const messageLower = gatewayMessage.toLowerCase();
                            const mappedMessage = Object.keys(messageMap).find(key => messageLower.includes(key));
                            errorMessage = mappedMessage ? messageMap[mappedMessage] : gatewayMessage;
                        } else if (errorCode && codeMessages[errorCode]) {
                            errorMessage = codeMessages[errorCode];
                        } else if (chargeStatus === 'failed') {
                            errorMessage = 'Falha no processamento do pagamento. Tente novamente ou utilize outro cartão.';
                        } else if (chargeStatus === 'rejected') {
                            errorMessage = 'Pagamento rejeitado. Verifique os dados do cartão e tente novamente.';
                        } else if (chargeStatus === 'unauthorized') {
                            errorMessage = 'Pagamento não autorizado. Verifique os dados do cartão e tente novamente.';
                        }
                        
                        return {
                            error: true,
                            message: errorMessage
                        } as any;
                    }
                    
                    // Verifica se há mensagem de erro do gateway mesmo com status pending
                    if (chargeStatus === 'pending' || chargeStatus === 'waiting' || !chargeStatus) {
                        const lastTransaction = charge.last_transaction;
                        const gatewayMessage = lastTransaction?.gateway_message || charge.gateway_message || lastTransaction?.message || '';
                        const errorCode = lastTransaction?.gateway_response_code || charge.gateway_response_code || lastTransaction?.gateway_return_code || lastTransaction?.return_code || '';
                        
                        // Lista de palavras-chave que indicam erro do gateway
                        const errorKeywords = [
                            'não autorizado', 'não permitida', 'não permitido',
                            'rejeitado', 'rejeitada',
                            'falhou', 'falha',
                            'inválido', 'inválida',
                            'insuficiente',
                            'vencido', 'vencida',
                            'restrição', 'restrito',
                            'referida', 'referido',
                            'desbloqueado', 'desbloqueada',
                            'comunicação',
                            'transação não permitida',
                            'cartão não foi desbloqueado',
                            'código de segurança inválido',
                            'erro de comunicação',
                            'transação referida',
                            'cartão com restrição',
                            'transação não autorizada',
                            'saldo insuficiente',
                            'cartão vencido'
                        ];
                        
                        // Verifica se a mensagem contém alguma palavra-chave de erro
                        const hasErrorKeyword = errorKeywords.some(keyword => 
                            gatewayMessage.toLowerCase().includes(keyword.toLowerCase())
                        );
                        
                        // Se houver código de erro ou mensagem de erro, trata como erro
                        if (hasErrorKeyword || (errorCode && errorCode !== '' && errorCode !== '00')) {
                            const codeMessages: Record<string, string> = {
                                '01': 'Não foi possível processar o pagamento. Entre em contato com o banco emissor do cartão.',
                                '04': 'Seu cartão possui uma restrição. Entre em contato com o banco emissor.',
                                '05': 'Pagamento não autorizado. Verifique os dados do cartão e tente novamente.',
                                '51': 'Saldo insuficiente no cartão. Verifique o limite disponível.',
                                '54': 'Seu cartão está vencido. Utilize outro cartão ou atualize a validade.',
                                '57': 'Transação não permitida para este cartão. Tente com outro cartão.',
                                '78': 'Seu cartão precisa ser desbloqueado. Entre em contato com o banco.',
                                'N7': 'Código de segurança (CVV) inválido. Verifique os 3 ou 4 dígitos no verso do cartão.'
                            };
                            
                            const messageMap: Record<string, string> = {
                                'transação não permitida': 'Transação não permitida para este cartão. Tente com outro cartão.',
                                'cartão não foi desbloqueado': 'Seu cartão precisa ser desbloqueado. Entre em contato com o banco.',
                                'código de segurança inválido': 'Código de segurança (CVV) inválido. Verifique os 3 ou 4 dígitos no verso do cartão.',
                                'erro de comunicação': 'Erro ao comunicar com o banco. Tente novamente em alguns instantes.',
                                'transação referida': 'Não foi possível processar o pagamento. Entre em contato com o banco emissor do cartão.',
                                'cartão com restrição': 'Seu cartão possui uma restrição. Entre em contato com o banco emissor.',
                                'transação não autorizada': 'Pagamento não autorizado. Verifique os dados do cartão e tente novamente.',
                                'saldo insuficiente': 'Saldo insuficiente no cartão. Verifique o limite disponível.',
                                'cartão vencido': 'Seu cartão está vencido. Utilize outro cartão ou atualize a validade.'
                            };
                            
                            let errorMessage = 'Não foi possível processar o pagamento. Verifique os dados do cartão e tente novamente.';
                            
                            if (gatewayMessage) {
                                const messageLower = gatewayMessage.toLowerCase();
                                const mappedMessage = Object.keys(messageMap).find(key => messageLower.includes(key));
                                errorMessage = mappedMessage ? messageMap[mappedMessage] : gatewayMessage;
                            } else if (errorCode && codeMessages[errorCode]) {
                                errorMessage = codeMessages[errorCode];
                            }
                            
                            return {
                                error: true,
                                message: errorMessage
                            } as any;
                        }
                    }
                }
            } catch (err) {
                console.error('Erro ao buscar detalhes do bill:', err);
                // Continua o processo mesmo se não conseguir buscar detalhes
            }
        }

        // Busca detalhes da fatura e gravações no banco em paralelo
        const agora = DateTime.now().setZone('America/Sao_Paulo').toJSDate();
        const dataFim = DateTime.now().setZone('America/Sao_Paulo').plus({ days: 15 }).toJSDate();

        // Cria a fatura primeiro, depois usa o ID dela para criar o financeiro
        const fatura = await this.criarFatura(bill, data.valor ?? 0, agora, dataFim, data.userId, data.usuario?.VindiCustomerId ?? '', planoTipo);

        const [
            financeiro,
            transaction,
            CreditoAvulso
        ] = await Promise.all([
            this.criarFinanceiro(data.userId, data?.valor ?? 0, dataFim, fatura, planoTipo),
            this.criarTransaction(bill, data.usuario),
            this.criarCreditoAvulso(data.userId, agora, data.quantidade ?? 1, data.valor ?? 0, bill, planoTipo)
        ]);

        // Preenche dados da ConsultaAvulsa após billDetails
        let consultaAvulsa;
        try {
            // Mapeia o tipo do plano para o tipo correto
            const tipoConsulta = planoTipo === 'Avulsa' || planoTipo?.toLowerCase() === 'unico' 
                ? 'ConsultaAvulsa' 
                : planoTipo?.toLowerCase() === 'primeiraconsulta' || planoTipo?.toLowerCase() === 'primeira consulta'
                ? 'PrimeiraConsulta'
                : 'PrimeiraConsulta'; // Default
            
            const consulta = await this.consultaAvulsa(
                data.userId, bill, tipoConsulta
            );
            consultaAvulsa = {
                Status: consulta.Status as import("../types/permissions.types").ConsultaAvulsaStatus,
                Quantidade: consulta.Quantidade,
                DataCriacao: consulta.DataCriacao,
                PacienteId: consulta.PacienteId,
            };
        } catch (err) {
            console.error('Erro ao criar ConsultaAvulsa:', err);
            consultaAvulsa = {
                Status: 'Pendente' as import("../types/permissions.types").ConsultaAvulsaStatus,
                Quantidade: 1,
                DataCriacao: DateTime.now().setZone('America/Sao_Paulo').toJSDate(),
                PacienteId: data.userId,
            };
        }

        // Extrai dados do billDetails (se houver charges)
        let gateway_message = '';
        let qrcode_path = '';
        let qrcode_original_path = '';
        if (
            billDetails &&
            Array.isArray(billDetails.charges) &&
            billDetails.charges.length > 0 &&
            billDetails.charges[0].last_transaction
        ) {
            const lastTransaction = billDetails.charges[0].last_transaction;
            gateway_message = lastTransaction.gateway_message || '';
            if (lastTransaction.gateway_response_fields) {
                qrcode_path = lastTransaction.gateway_response_fields.qrcode_path || '';
                qrcode_original_path = lastTransaction.gateway_response_fields.qrcode_original_path || '';
            }
        }

        return {
            email: data.email,
            telefone: data.telefone,
            cpf: data.cpf,
            userId: data.userId,
            vindiProductId: data.vindiProductId,
            quantidade: data.quantidade ?? 1,
            valor: data.valor ?? 0,
            payment_method_code: data.payment_method_code ?? '',
            payment_company_code: data.payment_company_code ?? '',
            controleFatura: {
                CodigoFatura: fatura.CodigoFatura ?? '',
                Valor: fatura.Valor,
                Status: fatura.Status as FaturaStatus,
                DataEmissao: fatura.DataEmissao,
                DataVencimento: fatura.DataVencimento,
                Tipo: fatura.Tipo as TipoFatura,
                vindiProductId: data.vindiProductId ?? '',
                vindiBillId: String(bill.bill_id),
            },
            transactionId: String(transaction.Id),
            financeiro: {
                id: financeiro.Id,
                valor: financeiro.Valor,
                status: financeiro.Status,
                dataVencimento: financeiro.DataVencimento,
                tipo: financeiro.Tipo,
                faturaId: financeiro.FaturaId || '',
                userId: financeiro.UserId
            },
            CreditoAvulso: {
                id: CreditoAvulso.Id,
                valor: CreditoAvulso.Valor,
                status: CreditoAvulso.Status,
                quantidade: CreditoAvulso.Quantidade,
                userId: CreditoAvulso.UserId
            },
            ConsultaAvulsa: consultaAvulsa,
            qrCode: (qrcode_path || bill.pix?.qr_code) ?? '',
            qrCodeText: (qrcode_original_path || bill.pix?.qr_code_text) ?? '',
            pagamentoVindi: {
                bill_id: String(bill.bill_id),
                bill_code: bill.bill_code ?? '',
                amount: bill.amount,
                status: gateway_message || bill.status,
                payment_method_code: bill.payment_method_code ?? '',
                pix: bill.pix
                    ? {
                        qr_code: bill.pix.qr_code,
                        pix: bill.pix
                    }
                    : undefined
            },
            billDetails,
        };
    }

    async getPrimeiraConsulta(userId: string): Promise<VerificarCompraParams> {
        // Busca se o usuário possui algum Financeiro relacionado a uma Fatura do tipo PrimeiraConsulta
        const financeiro = await prisma.financeiro.findFirst({
            where: {
                UserId: userId,
                Fatura: {
                    Tipo: 'PrimeiraConsulta'
                }
            }
        });

        return {
            jaComprou: !!financeiro,
        };
    }
}