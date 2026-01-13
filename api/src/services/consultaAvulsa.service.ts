import prisma from "../prisma/client";
import { VindiService } from "../services/vindi.service";
import { ConsultaAvulsaStatus } from "../types/permission.types";
import { formatVindiErrorMessage, extractVindiErrorDetails } from "../utils/vindiErrorFormatter";

export class ConsultaAvulsaService {
    async CompraConsultaAvulsa(data: any): Promise<any> {
        // Validações iniciais
        if (data.quantidade <= 0) {
            throw new Error("A quantidade deve ser maior que zero.");
        }

        // Busca os dados do usuário (Paciente)
        const usuario = await prisma.user.findUnique({
            where: { Id: data.pacienteId || data.userId }
        });
        if (!usuario) {
            throw new Error("Usuário não encontrado.");
        }

        // 1. Gera fatura na Vindi conforme modelo solicitado
        if (!usuario.VindiCustomerId || isNaN(Number(usuario.VindiCustomerId))) {
            throw new Error("O usuário não possui um VindiCustomerId válido.");
        }

        let fatura;
        try {
            fatura = await VindiService.createBill({
                customer_id: Number(usuario.VindiCustomerId),
                payment_method_code: data.payment_method_code,
                bill_items: [
                    {
                        product_id: data.vindiProductId,
                        amount: data.preco || 0
                    }
                ]
            });
        } catch (error: any) {
            console.error('Erro ao criar fatura na Vindi para consulta avulsa:', error);
            const errorDetails = extractVindiErrorDetails(error);
            
            // Se a compra é proveniente de um agendamento, não deve redirecionar ou agendar
            if (data.fromAgendamento) {
                const errorMessage = formatVindiErrorMessage(
                    "Erro ao processar pagamento da consulta avulsa",
                    errorDetails,
                    'consulta_avulsa'
                );
                throw new Error(errorMessage);
            }
            
            // Para compras normais, também retorna erro detalhado
            const errorMessage = formatVindiErrorMessage(
                "Erro ao processar pagamento da consulta avulsa",
                errorDetails,
                'consulta_avulsa'
            );
            throw new Error(errorMessage);
        }

        // Verifica se a fatura foi criada com sucesso e se o status é válido
        if (!fatura || !fatura.id) {
            const errorMessage = data.fromAgendamento 
                ? "Falha ao criar fatura na Vindi. O agendamento não foi realizado."
                : "Falha ao criar fatura na Vindi. Tente novamente.";
            throw new Error(errorMessage);
        }

        // Busca detalhes do bill ANTES de criar registros no banco para verificar erros do gateway
        // Aguarda um pequeno delay para garantir que os charges foram processados
        let billDetails: any = {};
        try {
            // Aguarda 1 segundo para garantir que os charges foram processados pela Vindi
            await new Promise(resolve => setTimeout(resolve, 1000));
            billDetails = await VindiService.getBillById(Number(fatura.id));
            
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
                    
                    // Prioriza mensagem do gateway se disponível
                    if (gatewayMessage) {
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
                    
                    if (data.fromAgendamento) {
                        errorMessage += ' O agendamento não foi realizado.';
                    }
                    
                    throw new Error(errorMessage);
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
                            
                            if (data.fromAgendamento) {
                                errorMessage += ' O agendamento não foi realizado.';
                            }
                            
                            throw new Error(errorMessage);
                        }
                }
            }
        } catch (err: any) {
            // Se o erro já foi lançado acima (erro do gateway), propaga
            if (err.message && (
                err.message.includes('não autorizado') ||
                err.message.includes('rejeitado') ||
                err.message.includes('falhou') ||
                err.message.includes('inválido') ||
                err.message.includes('insuficiente') ||
                err.message.includes('vencido') ||
                err.message.includes('restrição') ||
                err.message.includes('referida') ||
                err.message.includes('não permitida') ||
                err.message.includes('desbloqueado') ||
                err.message.includes('comunicação')
            )) {
                throw err;
            }
            console.error('Erro ao buscar detalhes do bill:', err);
            // Continua o processo mesmo se não conseguir buscar detalhes
        }

        // Verifica status da fatura - se for failed, rejected ou canceled, não deve criar consulta avulsa
        const billStatus = fatura.status?.toLowerCase();
        const statusInvalidos = ['failed', 'rejected', 'canceled'];
        if (billStatus && statusInvalidos.includes(billStatus)) {
            const errorDetails = extractVindiErrorDetails({ bill: fatura });
            const errorMessage = formatVindiErrorMessage(
                data.fromAgendamento 
                    ? "Pagamento não aprovado. O agendamento não foi realizado."
                    : "Pagamento não aprovado. Verifique os dados do cartão e tente novamente.",
                errorDetails,
                'consulta_avulsa'
            );
            throw new Error(errorMessage);
        }

        // 2. Registra a consulta avulsa no banco apenas se o pagamento foi processado com sucesso
        // Status inicial depende do status da fatura
        let statusInicial = ConsultaAvulsaStatus.Ativa;
        if (billStatus === 'pending') {
            statusInicial = ConsultaAvulsaStatus.Pendente;
        }

        console.log('🔍 [ConsultaAvulsaService] CompraConsultaAvulsa: Criando ConsultaAvulsa', {
            pacienteId: data.pacienteId || data.userId,
            psicologoId: data.psicologoId,
            statusInicial,
            codigoFatura: fatura.id,
            billStatus
        });

        const consulta = await prisma.consultaAvulsa.create({
            data: {
                PacienteId: data.pacienteId || data.userId,
                PsicologoId: data.psicologoId,
                Status: statusInicial,
                DataCriacao: new Date(),
                CodigoFatura: String(fatura.id), // IMPORTANTE: Vincula com o CodigoFatura para o webhook atualizar
                Quantidade: data.quantidade || 1
            }
        });

        console.log('✅ [ConsultaAvulsaService] CompraConsultaAvulsa: ConsultaAvulsa criada', {
            consultaId: consulta.Id,
            codigoFatura: consulta.CodigoFatura,
            status: consulta.Status
        });

        // 3. Criar Fatura e Financeiro se necessário (ajuste conforme sua lógica)
        // Exemplo:
        // const novaFatura = await prisma.fatura.create({
        //     data: {
        //         CodigoFatura: String(fatura.id),
        //         Valor: data.preco || 0,
        //         Status: FaturaStatus.Pending,
        //         DataEmissao: new Date(),
        //         DataVencimento: data.dataVencimento ? new Date(data.dataVencimento) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        //         Tipo: TipoFatura.ConsultaAvulsa
        //     }
        // });
        // await prisma.financeiro.create({
        //     data: {
        //         UserId: data.pacienteId,
        //         Valor: data.preco || 0,
        //         DataVencimento: novaFatura.DataVencimento,
        //         Status: "AguardandoPagamento",
        //         FaturaId: novaFatura.Id,
        //         Tipo: TipoFatura.ConsultaAvulsa
        //     }
        // });

        // Calcula dias restantes de validade (30 dias a partir da DataCriacao)
        const hoje = new Date();
        const dataCriacao = new Date(consulta.DataCriacao);
        const diffMs = dataCriacao ? (hoje.getTime() - dataCriacao.getTime()) : 0;
        const diffDias = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        const diasRestantes = Math.max(0, 30 - diffDias);
        return {
            ...consulta,
            diasRestantes
        };
    }
}