"use client";
import React from "react";
import { UseFormRegister, UseFormSetValue, UseFormWatch, FieldErrors, Path, FieldValues } from "react-hook-form";
import { fillFormAddressByCep } from "@/utils/cepUtils";
import { handleMaskedBackspace, maskCep } from "@/utils/masks";

export type AddressFormFields = {
    cep: string;
    endereco: string;
    numero?: string;
    complemento?: string;
    bairro: string;
    cidade: string;
    estado: string;
};

interface AddressFormProps<T extends AddressFormFields & FieldValues> {
    register: UseFormRegister<T>;
    setValue: UseFormSetValue<T>;
    watch: UseFormWatch<T>;
    errors: FieldErrors<T>;
    getValues: () => T;
    user?: {
        Address?: Array<{
            Cep?: string;
            Rua?: string;
            Numero?: string;
            Complemento?: string | null;
            Bairro?: string;
            Cidade?: string;
            Estado?: string;
        }>;
    } | null;
    addressCheckboxChecked: boolean;
    onAddressCheckboxChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    disabled?: boolean;
}

// Função para bloquear caracteres especiais
function blockSpecialChars(e: React.KeyboardEvent<HTMLInputElement>) {
    const allowed = /[0-9]/;
    if (!allowed.test(e.key) && e.key.length === 1) {
        e.preventDefault();
    }
}

// Helper para verificar se campo tem valor
function hasValue(value: unknown): value is string {
    return typeof value === "string" && value.length > 0;
}

// Helper para obter mensagem de erro de forma type-safe
function getErrorMessage<T extends FieldValues>(
    errors: FieldErrors<T>,
    field: Path<T>
): string | undefined {
    const error = errors[field];
    if (error && typeof error === "object" && "message" in error) {
        return typeof error.message === "string" ? error.message : undefined;
    }
    return undefined;
}

export default function AddressForm<T extends AddressFormFields & FieldValues>({
    register,
    setValue,
    watch,
    errors,
    getValues,
    user,
    addressCheckboxChecked,
    onAddressCheckboxChange,
    disabled = false,
}: AddressFormProps<T>) {
    const watchedFields = watch();

    const handleCepBlur = async () => {
        const currentValues = getValues();
        const cepValue = currentValues.cep;
        const cep = (typeof cepValue === "string" ? cepValue : "").replace(/\D/g, "");
        
        if (cep.length === 8) {
            try {
                const addressData = await fillFormAddressByCep(cep);
                if (addressData) {
                    setValue("endereco" as Path<T>, (addressData.logradouro || "") as T[Path<T>]);
                    setValue("bairro" as Path<T>, (addressData.bairro || "") as T[Path<T>]);
                    setValue("cidade" as Path<T>, (addressData.localidade || "") as T[Path<T>]);
                    setValue("estado" as Path<T>, (addressData.uf || "") as T[Path<T>]);
                    if (addressData.complemento) {
                        setValue("complemento" as Path<T>, addressData.complemento as T[Path<T>]);
                    }
                }
            } catch {
                // Silently fail on error
            }
        }
    };

    return (
        <div>
            <h2 className="font-medium text-xs leading-4 mt-6 mb-2">
                Endereço de cobrança
            </h2>
            {Array.isArray(user?.Address) && user.Address.length > 0 && (
                <label className="flex items-center gap-2 mb-4">
                    <input
                        type="checkbox"
                        className="accent-indigo-600 w-4 h-4"
                        checked={addressCheckboxChecked}
                        onChange={onAddressCheckboxChange}
                    />
                    <span className="font-normal text-xs leading-4">
                        Endereço de cobrança é o mesmo do cartão?
                    </span>
                </label>
            )}
            <div className="flex flex-col gap-3 mb-9">
                <div className="flex gap-3 mb-1">
                    <div className="w-1/2">
                        <label htmlFor="cep" className="block text-sm font-medium text-gray-700 mb-1">
                            CEP*
                        </label>
                        <input
                            id="cep"
                            {...register("cep" as Path<T>)}
                            className={`w-full border p-2 rounded ${
                                getErrorMessage(errors, "cep" as Path<T>)
                                    ? "border-red-500"
                                    : hasValue(watchedFields.cep)
                                        ? "border-green-500"
                                        : "border-gray-300"
                            }`}
                            placeholder="00000-000"
                            maxLength={9}
                            inputMode="numeric"
                            disabled={disabled}
                            value={watchedFields.cep || ""}
                            onChange={e => {
                                const masked = maskCep(e.target.value);
                                setValue("cep" as Path<T>, masked as T[Path<T>], { shouldValidate: true });
                            }}
                            onKeyDown={e => {
                                // Trata backspace/delete para permitir apagar através do hífen
                                handleMaskedBackspace(
                                    e,
                                    watchedFields.cep || "",
                                    maskCep,
                                    (newValue) => {
                                        setValue("cep" as Path<T>, newValue as T[Path<T>], { shouldValidate: true });
                                    }
                                );
                                // Bloqueia caracteres especiais (exceto backspace/delete que já foram tratados)
                                if (e.key !== 'Backspace' && e.key !== 'Delete' && e.key !== 'ArrowLeft' && e.key !== 'ArrowRight' && e.key !== 'Tab') {
                                    blockSpecialChars(e);
                                }
                            }}
                            onBlur={handleCepBlur}
                        />
                        {getErrorMessage(errors, "cep" as Path<T>) && (
                            <span className="text-red-500 text-xs mt-1 block min-h-[20px]">
                                {getErrorMessage(errors, "cep" as Path<T>)}
                            </span>
                        )}
                    </div>
                    <div className="w-1/2">
                        <label htmlFor="numero" className="block text-sm font-medium text-gray-700 mb-1">
                            Número
                        </label>
                        <input
                            id="numero"
                            {...register("numero" as Path<T>)}
                            className={`w-full border p-2 rounded ${
                                getErrorMessage(errors, "numero" as Path<T>)
                                    ? "border-red-500"
                                    : hasValue(watchedFields.numero)
                                        ? "border-green-500"
                                        : "border-gray-300"
                            }`}
                            placeholder="Ex: 123 ou s/n"
                            maxLength={10}
                            disabled={disabled}
                        />
                        {getErrorMessage(errors, "numero" as Path<T>) && (
                            <span className="text-red-500 text-xs mt-1 block min-h-[20px]">
                                {getErrorMessage(errors, "numero" as Path<T>)}
                            </span>
                        )}
                    </div>
                </div>
                <div className="flex gap-3 mb-1">
                    <div className="w-2/3">
                        <label htmlFor="endereco" className="block text-sm font-medium text-gray-700 mb-1">
                            Endereço*
                        </label>
                        <input
                            id="endereco"
                            {...register("endereco" as Path<T>)}
                            className={`w-full border p-2 rounded ${
                                getErrorMessage(errors, "endereco" as Path<T>)
                                    ? "border-red-500"
                                    : hasValue(watchedFields.endereco)
                                        ? "border-green-500"
                                        : "border-gray-300"
                            }`}
                            placeholder="Rua, Avenida, etc."
                            maxLength={60}
                            disabled={disabled}
                        />
                        {getErrorMessage(errors, "endereco" as Path<T>) && (
                            <span className="text-red-500 text-xs mt-1 block min-h-[20px]">
                                {getErrorMessage(errors, "endereco" as Path<T>)}
                            </span>
                        )}
                    </div>
                    <div className="w-1/3">
                        <label htmlFor="complemento" className="block text-sm font-medium text-gray-700 mb-1">
                            Complemento
                        </label>
                        <input
                            id="complemento"
                            {...register("complemento" as Path<T>)}
                            className="w-full border p-2 rounded border-gray-300"
                            placeholder="Apto, Bloco, etc."
                            maxLength={30}
                            disabled={disabled}
                        />
                    </div>
                </div>
                <div className="flex gap-3 mb-1">
                    <div className="w-1/3">
                        <label htmlFor="bairro" className="block text-sm font-medium text-gray-700 mb-1">
                            Bairro*
                        </label>
                        <input
                            id="bairro"
                            {...register("bairro" as Path<T>)}
                            className={`w-full border p-2 rounded ${
                                getErrorMessage(errors, "bairro" as Path<T>)
                                    ? "border-red-500"
                                    : hasValue(watchedFields.bairro)
                                        ? "border-green-500"
                                        : "border-gray-300"
                            }`}
                            placeholder="Nome do bairro"
                            maxLength={30}
                            disabled={disabled}
                        />
                        {getErrorMessage(errors, "bairro" as Path<T>) && (
                            <span className="text-red-500 text-xs mt-1 block min-h-[20px]">
                                {getErrorMessage(errors, "bairro" as Path<T>)}
                            </span>
                        )}
                    </div>
                    <div className="w-1/3">
                        <label htmlFor="cidade" className="block text-sm font-medium text-gray-700 mb-1">
                            Cidade*
                        </label>
                        <input
                            id="cidade"
                            {...register("cidade" as Path<T>)}
                            className={`w-full border p-2 rounded ${
                                getErrorMessage(errors, "cidade" as Path<T>)
                                    ? "border-red-500"
                                    : hasValue(watchedFields.cidade)
                                        ? "border-green-500"
                                        : "border-gray-300"
                            }`}
                            placeholder="Nome da cidade"
                            maxLength={30}
                            disabled={disabled}
                        />
                        {getErrorMessage(errors, "cidade" as Path<T>) && (
                            <span className="text-red-500 text-xs mt-1 block min-h-[20px]">
                                {getErrorMessage(errors, "cidade" as Path<T>)}
                            </span>
                        )}
                    </div>
                    <div className="w-1/3">
                        <label htmlFor="estado" className="block text-sm font-medium text-gray-700 mb-1">
                            Estado*
                        </label>
                        <input
                            id="estado"
                            {...register("estado" as Path<T>)}
                            className={`w-full border p-2 rounded ${
                                getErrorMessage(errors, "estado" as Path<T>)
                                    ? "border-red-500"
                                    : hasValue(watchedFields.estado)
                                        ? "border-green-500"
                                        : "border-gray-300"
                            }`}
                            placeholder="UF"
                            maxLength={2}
                            disabled={disabled}
                        />
                        {getErrorMessage(errors, "estado" as Path<T>) && (
                            <span className="text-red-500 text-xs mt-1 block min-h-[20px]">
                                {getErrorMessage(errors, "estado" as Path<T>)}
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
