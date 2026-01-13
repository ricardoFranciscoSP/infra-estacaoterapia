import { maskCardNumber, maskCardExpiry, isMainFormValid, isAddressComplete } from '@/config/checkoutConfig';
import React from 'react';

// Tipos
export type MainFormType = {
    descricao: string;
    numeroCartao: string;
    nomeTitular: string;
    validade: string;
    cvv: string;
    cep: string;
    endereco: string;
    numero?: string;
    complemento: string;
    bairro: string;
    cidade: string;
    estado: string;
};

export type AddressType = {
    cep: string;
    endereco: string;
    numero?: string;
    complemento: string;
    bairro: string;
    cidade: string;
    estado: string;
};

export type UserType = {
    Id?: string;
    Address?: AddressType[];
    // Adicione propriedades extras explicitamente se necessário
};

// Máscaras
export { maskCardNumber, maskCardExpiry, isMainFormValid, isAddressComplete };

// Manipulação do formulário principal
export function handleMainFormChange(
    e: React.ChangeEvent<HTMLInputElement>,
    setMainForm: React.Dispatch<React.SetStateAction<MainFormType>>,
    setMainFormTouched: React.Dispatch<React.SetStateAction<Partial<Record<keyof MainFormType, boolean>>>>
) {
    const { name, value } = e.target;
    let newValue = value;
    if (name === "numeroCartao") newValue = maskCardNumber(value);
    if (name === "validade") newValue = maskCardExpiry(value);
    setMainForm((prev) => ({ ...prev, [name]: newValue }));
    setMainFormTouched((prev) => ({ ...prev, [name]: true }));
}

// Card flip
export function handleCvvFocus(setIsCardFlipped: React.Dispatch<React.SetStateAction<boolean>>) {
    setIsCardFlipped(true);
}
export function handleCvvBlur(setIsCardFlipped: React.Dispatch<React.SetStateAction<boolean>>) {
    setIsCardFlipped(false);
}

// Endereço checkbox
export function handleAddressCheckbox(
    e: React.ChangeEvent<HTMLInputElement> | undefined,
    user: UserType,
    userAddress: AddressType,
    setMainForm: React.Dispatch<React.SetStateAction<MainFormType>>,
    setAddressCheckboxChecked: React.Dispatch<React.SetStateAction<boolean>>,
    setShowAddressModal: React.Dispatch<React.SetStateAction<boolean>>
) {
    if (e && !e.target.checked) {
        setMainForm((prev) => ({
            ...prev,
            cep: "",
            endereco: "",
            numero: "",
            complemento: "",
            bairro: "",
            cidade: "",
            estado: "",
        }));
        setAddressCheckboxChecked(false);
        return;
    }
    if (Array.isArray(user?.Address) && user.Address.length > 0) {
        const addr = user.Address[0];
        setMainForm((prev) => ({
            ...prev,
            cep: addr.cep || "",
            endereco: addr.endereco || "",
            numero: addr.numero || "",
            complemento: addr.complemento || "",
            bairro: addr.bairro || "",
            cidade: addr.cidade || "",
            estado: addr.estado || "",
        }));
        setAddressCheckboxChecked(true);
    } else if (isAddressComplete({
        ...userAddress,
        numero: userAddress.numero ?? ""
    })) {
        setMainForm((prev) => ({
            ...prev,
            cep: userAddress.cep,
            endereco: userAddress.endereco,
            numero: userAddress.numero ?? "",
            complemento: userAddress.complemento ?? "",
            bairro: userAddress.bairro,
            cidade: userAddress.cidade,
            estado: userAddress.estado,
        }));
        setAddressCheckboxChecked(true);
    } else {
        setShowAddressModal(true);
        setAddressCheckboxChecked(true);
    }
}

export function handleCloseAddressModal(
    setShowAddressModal: React.Dispatch<React.SetStateAction<boolean>>,
    setAddressCheckboxChecked: React.Dispatch<React.SetStateAction<boolean>>
) {
    setShowAddressModal(false);
    setAddressCheckboxChecked(false);
}

export function handleConcluirCadastro(
    e: React.MouseEvent<HTMLButtonElement>,
    userAddress: AddressType,
    user: UserType,
    updateUser: (
        userData: {
            id: string; Address: Array<{
                cep: string;
                rua: string;
                numero: string;
                complemento: string;
                bairro: string;
                cidade: string;
                estado: string;
            }>
        },
        options: { onSuccess: () => void }
    ) => void,
    setMainForm: React.Dispatch<React.SetStateAction<MainFormType>>,
    setShowAddressModal: React.Dispatch<React.SetStateAction<boolean>>,
    setAddressCheckboxChecked: React.Dispatch<React.SetStateAction<boolean>>,
    setAddressTouched: React.Dispatch<React.SetStateAction<boolean>>
) {
    e.preventDefault();
    setAddressTouched(true);
    if (isAddressComplete({
        ...userAddress,
        numero: userAddress.numero ?? ""
    }) && user?.Id) {
        updateUser(
            {
                id: user.Id,
                Address: [
                    {
                        cep: userAddress.cep,
                        rua: userAddress.endereco,
                        numero: userAddress.numero ?? "",
                        complemento: userAddress.complemento ?? "",
                        bairro: userAddress.bairro,
                        cidade: userAddress.cidade,
                        estado: userAddress.estado,
                    }
                ]
            },
            {
                onSuccess: () => {
                    setMainForm((prev) => ({
                        ...prev,
                        cep: userAddress.cep,
                        endereco: userAddress.endereco,
                        numero: userAddress.numero ?? "",
                        complemento: userAddress.complemento ?? "",
                        bairro: userAddress.bairro,
                        cidade: userAddress.cidade,
                        estado: userAddress.estado,
                    }));
                    setShowAddressModal(false);
                    setAddressCheckboxChecked(true);
                }
            }
        );
    }
}

export function handleAddressChange(
    e: React.ChangeEvent<HTMLInputElement>,
    setUserAddress: React.Dispatch<React.SetStateAction<AddressType>>
) {
    setUserAddress((prev) => ({ ...prev, [e.target.name]: e.target.value }));
}

// Helpers de cartão
export function getPaymentCompanyInfo(numeroCartao: string): { payment_company_code: string; payment_company_id: number | null } {
    const digits = numeroCartao.replace(/\D/g, "");
    if (digits.startsWith("4")) return { payment_company_code: "visa", payment_company_id: 13 };
    if (/^5[1-5]/.test(digits)) return { payment_company_code: "mastercard", payment_company_id: 12 };
    if (/^3[47]/.test(digits)) return { payment_company_code: "american_express", payment_company_id: 14 };
    if (/^(4011(78|79)|431274|438935|451416|457393|504175|5067[0-6][0-9]|50677[0-8]|509[0-9]{3}|627780|636297|636368|6500(31|32|33|34|35|36|37|38|39)|6504(03|04|05|06|07|08|09)|6504(10|11|12|13|14|15|16|17|18|19)|6507(01|02|03|04|05|06|07|08|09)|6516(52|53|54|55|56|57|58|59)|6550(00|01|02|03|04|05|06|07|08|09))/.test(digits)) return { payment_company_code: "elo", payment_company_id: null };
    // Default para mastercard se não identificar
    if (digits.startsWith("5")) return { payment_company_code: "mastercard", payment_company_id: 12 };
    return { payment_company_code: "", payment_company_id: null };
}

export function getLast4Digits(numero: string): string {
    const digits = numero.replace(/\D/g, "");
    return digits.length >= 4 ? digits.slice(-4) : "0000";
}

export function getCardLogo(mainForm: MainFormType): string {
    const digits = mainForm.numeroCartao.replace(/\D/g, "");
    if (digits.startsWith("4")) return "/assets/icons/visa.svg";
    if (digits.startsWith("5")) return "/assets/icons/mastercard.svg";
    if (digits.startsWith("3")) return "/assets/icons/amex.svg";
    return "/assets/icons/logos_mastercard.svg";
}
