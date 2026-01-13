import React, { useEffect, useState } from "react";
import { useForm } from 'react-hook-form';
import { useUpdateUser, useUpdateUserImage, useUploadUserImage, useUserDetails } from '@/hooks/user/userHook';
import { fetchAddressByCep } from "@/services/viaCepService";
import toast from 'react-hot-toast';
import { formatDateToYYYYMMDD } from "@/utils/date";

type FormData = {
    nome: string;
    email: string;
    cpf: string;
    telefone: string;
    dataNascimento?: string;
    cep: string;
    rua: string;
    numero: string;
    complemento: string;
    bairro: string;
    cidade: string;
    estado: string;
};

export function useDadosPessoais() {
    const methods = useForm<FormData>();
    const { user, refetch } = useUserDetails();
    const { mutate: updateUser, isPending } = useUpdateUser();
    const updateUserImage = useUpdateUserImage();
    const uploadUserImage = useUploadUserImage();
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [imageLoading, setImageLoading] = useState(false);

    // Função para aplicar máscara de CEP
    const maskCep = (value: string) =>
        value
            .replace(/\D/g, "")
            .replace(/^(\d{5})(\d)/, "$1-$2")
            .slice(0, 9);

    // Função para buscar e preencher endereço pelo CEP
    const handleCepChangeOrBlur = async (value?: string) => {
        const cep = value || methods.getValues("cep") || "";
        const cleanCep = cep.replace(/\D/g, "");
        if (cleanCep.length === 8) {
            try {
                const address = await fetchAddressByCep(cleanCep);
                if (address) {
                    methods.setValue("rua", address.logradouro || "");
                    methods.setValue("bairro", address.bairro || "");
                    methods.setValue("cidade", address.localidade || "");
                    methods.setValue("estado", address.uf || "");
                }
            } catch {
                // Trate erro se necessário
            }
        }
    };

    // Carrega os dados do usuário nos campos do formulário
    useEffect(() => {
        if (user) {
            methods.reset({
                nome: user.Nome || "",
                email: user.Email || "",
                cpf: user.Cpf || "",
                telefone: user.Telefone || "",
                dataNascimento: user.DataNascimento
                    ? (typeof user.DataNascimento === "string"
                        ? (user.DataNascimento as string).substring(0, 10)
                        : user.DataNascimento instanceof Date
                            ? formatDateToYYYYMMDD(user.DataNascimento)
                            : "")
                    : "",
                cep: user.Address?.[0]?.Cep || "",
                rua: user.Address?.[0]?.Rua || "",
                numero: user.Address?.[0]?.Numero || "",
                complemento: user.Address?.[0]?.Complemento || "",
                bairro: user.Address?.[0]?.Bairro || "",
                cidade: user.Address?.[0]?.Cidade || "",
                estado: user.Address?.[0]?.Estado || "",
            });
        }
    }, [user, methods]);

    useEffect(() => {
        refetch();
    }, [refetch]);

    // Função para lidar com upload de imagem
    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setImageFile(file);
        setImagePreview(URL.createObjectURL(file));
        setImageLoading(true);

        // Atualiza imagem existente ou faz upload de nova imagem
        if (user?.Image?.UserId) {
            updateUserImage.mutate(
                { imageId: user.Image.Id, file }, // file será enviado como campo "file"
                {
                    onSuccess: async () => {
                        toast.success('Imagem atualizada com sucesso!');
                        await refetch();
                        setImageLoading(false);
                    },
                    onError: () => {
                        toast.error('Erro ao atualizar imagem.');
                        setImageLoading(false);
                    }
                }
            );
        } else {
            uploadUserImage.mutate(
                { userId: user?.Id ?? "", file }, // file será enviado como campo "file"
                {
                    onSuccess: async () => {
                        toast.success('Imagem adicionada com sucesso!');
                        await refetch();
                        setImageLoading(false);
                    },
                    onError: () => {
                        toast.error('Erro ao adicionar imagem.');
                        setImageLoading(false);
                    }
                }
            );
        }
    };

    const onSubmit = async (data: FormData) => {
        setIsSaving(true);
        try {
            // Monta o objeto no formato esperado pela API
            const payload = {
                id: user?.Id,
                nome: data.nome,
                email: data.email,
                cpf: data.cpf,
                telefone: data.telefone,
                dataNascimento: data.dataNascimento || "",
                status: user?.Status || "ATIVO",
                role: user?.Role || "PATIENT",
                Address: [
                    {
                        userId: user?.Id,
                        cep: data.cep,
                        rua: data.rua,
                        numero: data.numero,
                        complemento: data.complemento,
                        bairro: data.bairro,
                        cidade: data.cidade,
                        estado: data.estado,
                    }
                ],
            };

            // Atualiza dados do usuário (sem imagem)
            await new Promise<void>((resolve, reject) => {
                updateUser(payload, {
                    onSuccess: async () => {
                        toast.success('Dados atualizados com sucesso!');
                        await refetch();
                        resolve();
                    },
                    onError: () => {
                        toast.error('Erro ao atualizar dados.');
                        reject();
                    }
                });
            });

            // Se houver imagem nova, já foi tratada no handleImageChange
        } catch {
            // Erro já tratado nos callbacks
        } finally {
            setIsSaving(false);
        }
    };

    // Função para verificar se há campos obrigatórios pendentes (dados pessoais e endereço)
    const hasPendingFields = React.useCallback(() => {
        const values = methods.getValues();
        // Campos obrigatórios de dados pessoais
        const personalFields = [
            values.nome,
            values.email,
            values.cpf,
            values.telefone,
            values.dataNascimento,
        ];
        // Campos obrigatórios de endereço
        const addressFields = [
            values.cep,
            values.rua,
            values.numero,
            values.cidade,
            values.estado,
            values.bairro,
        ];
        // Só mostra atenção se algum campo obrigatório estiver vazio
        return personalFields.some(v => !v || v.trim() === "") || addressFields.some(v => !v || v.trim() === "");
    }, [methods]);

    const [showAttention, setShowAttention] = useState(false);
    useEffect(() => {
        // Só mostra atenção se realmente houver campos obrigatórios pendentes
        setShowAttention(hasPendingFields());
    }, [user, hasPendingFields]);
    useEffect(() => {
        const subscription = methods.watch(() => {
            setShowAttention(hasPendingFields());
        });
        return () => subscription.unsubscribe();
    }, [methods, hasPendingFields]);

    // Atualiza o preview da imagem quando o usuário muda ou faz upload
    useEffect(() => {
        if (imageFile) {
            setImagePreview(URL.createObjectURL(imageFile));
        } else if (user?.Image?.Url) {
            setImagePreview(user.Image.Url);
        } else {
            setImagePreview(null);
        }
    }, [user, imageFile]);

    return {
        methods,
        user,
        refetch,
        updateUser,
        updateUserImage,
        imageFile,
        setImageFile,
        imagePreview,
        setImagePreview,
        isSaving,
        setIsSaving,
        imageLoading,
        setImageLoading,
        maskCep,
        handleCepChangeOrBlur,
        handleImageChange,
        onSubmit,
        showAttention,
        isPending,
    };
}
