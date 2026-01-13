import { Request, Response } from 'express';
import { AddressService } from '../services/address.service';
import { Address } from '../interfaces/address.interface';
import axios from 'axios';

const addressService = new AddressService();

interface ViaCepResponse {
    logradouro: string;
    complemento: string;
    bairro: string;
    localidade: string;
    uf: string;
    erro?: boolean;
}

interface BrasilApiResponse {
    cep: string;
    state: string;
    city: string;
    neighborhood: string;
    street: string;
    service: string;
}

export class AddressController {
    async create(req: Request, res: Response) {
        try {
            const address: Address = req.body;
            const created = await addressService.createAddress(address);
            res.status(201).json(created);
        } catch (error) {
            res.status(500).json({ error: 'Erro ao cadastrar endereço' });
        }
    }

    async listByUser(req: Request, res: Response) {
        try {
            const { userId } = req.params;
            const addresses = await addressService.getAddressesByUser(userId);
            res.json(addresses);
        } catch (error) {
            res.status(500).json({ error: 'Erro ao buscar endereços' });
        }
    }

    async getAddressByCep(req: Request, res: Response) {
        try {
            const { cep } = req.params;
            const cleanCep = cep.replace(/\D/g, '');

            if (cleanCep.length !== 8) {
                return res.status(400).json({ error: 'CEP inválido. Deve conter 8 dígitos.' });
            }

            // Tentativa 1: ViaCEP
            try {
                const viaCepResponse = await axios.get<ViaCepResponse>(
                    `https://viacep.com.br/ws/${cleanCep}/json/`,
                    { timeout: 5000 }
                );

                if (viaCepResponse.data && !viaCepResponse.data.erro) {
                    return res.json({
                        logradouro: viaCepResponse.data.logradouro || '',
                        complemento: viaCepResponse.data.complemento || '',
                        bairro: viaCepResponse.data.bairro || '',
                        localidade: viaCepResponse.data.localidade || '',
                        uf: viaCepResponse.data.uf || '',
                    });
                }
            } catch (viaCepError) {
                console.log('[AddressController] ViaCEP falhou, tentando BrasilAPI...');
            }

            // Tentativa 2: BrasilAPI (fallback)
            try {
                const brasilApiResponse = await axios.get<BrasilApiResponse>(
                    `https://brasilapi.com.br/api/cep/v1/${cleanCep}`,
                    { timeout: 5000 }
                );

                if (brasilApiResponse.data) {
                    return res.json({
                        logradouro: brasilApiResponse.data.street || '',
                        complemento: '',
                        bairro: brasilApiResponse.data.neighborhood || '',
                        localidade: brasilApiResponse.data.city || '',
                        uf: brasilApiResponse.data.state || '',
                    });
                }
            } catch (brasilApiError) {
                console.log('[AddressController] BrasilAPI também falhou');
            }

            return res.status(404).json({ error: 'CEP não encontrado' });
        } catch (error) {
            console.error('[AddressController] Erro ao buscar CEP:', error);
            res.status(500).json({ error: 'Erro ao buscar endereço pelo CEP' });
        }
    }
}
