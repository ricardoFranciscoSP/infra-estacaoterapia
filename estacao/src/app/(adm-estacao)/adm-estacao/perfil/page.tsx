"use client";
import React, { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import toast from "react-hot-toast";
import { FiX } from "react-icons/fi";
import { useAuthStore } from "@/store/authStore";
import { useDeleteUserImage, useUpdateUserImage, useUploadUserImage, useUserDetails } from "@/hooks/user/userHook";

type InfoItemProps = {
  label: string;
  value?: string | null;
};

const InfoItem: React.FC<InfoItemProps> = ({ label, value }) => (
  <div className="flex flex-col gap-1">
    <span className="text-xs font-semibold text-[#8494E9] uppercase tracking-wide">{label}</span>
    <span className="text-sm text-[#23253A]">{value && value.trim() !== "" ? value : "-"}</span>
  </div>
);

const ProfileAvatar: React.FC<{
  imagePreview: string | null;
  imageLoading: boolean;
  size: number;
  onLabelClick: () => void;
  onRemove?: () => void;
}> = ({ imagePreview, imageLoading, size, onLabelClick, onRemove }) => {
  const avatarUrl = imagePreview || "/assets/Profile.svg";
  const canRemove = Boolean(onRemove && imagePreview && imagePreview !== "/assets/Profile.svg");

  return (
    <label onClick={onLabelClick} className="cursor-pointer group relative">
      <div className="relative" style={{ width: size, height: size }}>
        <div
          className="flex items-center justify-center rounded-full border-[2px] border-[#CACFD4] overflow-hidden group-hover:border-indigo-400 transition-all bg-white"
          style={{ width: size, height: size }}
        >
          <Image
            src={avatarUrl}
            alt="Avatar"
            width={size}
            height={size}
            className="object-cover w-full h-full"
            unoptimized={avatarUrl !== "/assets/Profile.svg"}
          />
          {imageLoading && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center rounded-full z-10">
              <Image src="/assets/loading.svg" alt="Carregando" width={size / 2} height={size / 2} />
            </div>
          )}
          <span className="absolute inset-0 rounded-full bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
        {canRemove && (
          <button
            type="button"
            aria-label="Remover foto"
            className="absolute -top-1 -right-1 z-20 w-6 h-6 rounded-full bg-white text-[#E57373] border border-[#E57373] flex items-center justify-center shadow-sm hover:bg-[#FFE6E6] transition"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onRemove?.();
            }}
          >
            <FiX size={12} />
          </button>
        )}
      </div>
    </label>
  );
};

const formatDate = (value?: Date | string | null) => {
  if (!value) return "-";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("pt-BR");
};

export default function AdminPerfilPage() {
  const { user, refetch, isLoading } = useUserDetails();
  const refreshAuthUser = useAuthStore((state) => state.fetchUser);
  const uploadUserImage = useUploadUserImage();
  const updateUserImage = useUpdateUserImage();
  const deleteUserImage = useDeleteUserImage();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(false);

  const isUploading = uploadUserImage.isPending || updateUserImage.isPending || deleteUserImage.isPending;

  const currentImageUrl = useMemo(() => {
    const candidate = user?.Image?.Url;
    if (candidate && candidate.trim().length > 0) return candidate;
    return "/assets/Profile.svg";
  }, [user?.Image?.Url]);

  useEffect(() => {
    setImagePreview(currentImageUrl);
  }, [currentImageUrl]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const handleAvatarClick = () => fileInputRef.current?.click();

  const handleImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImagePreview(URL.createObjectURL(file));
    setImageLoading(true);

    if (user?.Image?.Id) {
      updateUserImage.mutate(
        { imageId: user.Image.Id, file },
        {
          onSuccess: async () => {
            toast.success("Imagem atualizada com sucesso!");
            await refetch();
            await refreshAuthUser();
            setImageLoading(false);
          },
          onError: () => {
            toast.error("Erro ao atualizar imagem.");
            setImageLoading(false);
          },
        }
      );
    } else {
      uploadUserImage.mutate(
        { userId: user?.Id ?? "", file },
        {
          onSuccess: async () => {
            toast.success("Imagem adicionada com sucesso!");
            await refetch();
            await refreshAuthUser();
            setImageLoading(false);
          },
          onError: () => {
            toast.error("Erro ao adicionar imagem.");
            setImageLoading(false);
          },
        }
      );
    }
  };

  const handleRemoveImage = () => {
    if (!user?.Image?.Id || imageLoading) return;
    setImageLoading(true);
    deleteUserImage.mutate(user.Image.Id, {
      onSuccess: async () => {
        toast.success("Imagem removida com sucesso!");
        setImagePreview("/assets/Profile.svg");
        await refetch();
        await refreshAuthUser();
        setImageLoading(false);
      },
      onError: () => {
        toast.error("Erro ao remover imagem.");
        setImageLoading(false);
      },
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-10">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#8494E9]" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="bg-white border border-[#E3E4F3] rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-xl font-semibold text-[#23253A]">Perfil do administrador</h1>
            <p className="text-sm text-[#6B7280]">Dados cadastrais do administrador da plataforma.</p>
          </div>
        </div>
        <div className="mt-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageChange}
          />
          <ProfileAvatar
            imagePreview={imagePreview}
            imageLoading={imageLoading}
            size={96}
            onLabelClick={handleAvatarClick}
            onRemove={handleRemoveImage}
          />
          <div className="flex flex-col gap-1">
            <span className="text-lg font-semibold text-[#23253A]">{user?.Nome || "Administrador"}</span>
            <span className="text-sm text-[#6B7280]">{user?.Email || "-"}</span>
            <button
              type="button"
              onClick={handleAvatarClick}
              disabled={isUploading}
              className="mt-2 w-fit text-xs font-semibold text-[#6D75C0] hover:underline disabled:opacity-60"
            >
              {isUploading ? "Atualizando foto..." : "Alterar foto"}
            </button>
          </div>
        </div>
      </section>

      <section className="bg-white border border-[#E3E4F3] rounded-2xl p-6 shadow-sm">
        <h2 className="text-base font-semibold text-[#23253A] mb-4">Dados do usuário</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <InfoItem label="ID" value={user?.Id} />
          <InfoItem label="Nome" value={user?.Nome} />
          <InfoItem label="E-mail" value={user?.Email} />
          <InfoItem label="CPF" value={user?.Cpf} />
          <InfoItem label="Telefone" value={user?.Telefone} />
          <InfoItem label="Data de Nascimento" value={formatDate(user?.DataNascimento)} />
          <InfoItem label="Sexo" value={user?.Sexo} />
          <InfoItem label="Status" value={user?.Status} />
          <InfoItem label="Perfil" value={user?.Role} />
          <InfoItem label="Data de aprovação" value={user?.DataAprovacao ?? "-"} />
          <InfoItem label="Vindi Customer" value={user?.VindiCustomerId ?? "-"} />
        </div>
      </section>

      <section className="bg-white border border-[#E3E4F3] rounded-2xl p-6 shadow-sm">
        <h2 className="text-base font-semibold text-[#23253A] mb-4">Endereços</h2>
        {user?.Address?.length ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {user.Address.map((address, index) => (
              <div key={address.Id ?? index} className="border border-[#E3E4F3] rounded-xl p-4 flex flex-col gap-3">
                <span className="text-sm font-semibold text-[#23253A]">Endereço {index + 1}</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <InfoItem label="CEP" value={address.Cep} />
                  <InfoItem label="Rua" value={address.Rua} />
                  <InfoItem label="Número" value={address.Numero} />
                  <InfoItem label="Complemento" value={address.Complemento ?? "-"} />
                  <InfoItem label="Bairro" value={address.Bairro} />
                  <InfoItem label="Cidade" value={address.Cidade} />
                  <InfoItem label="Estado" value={address.Estado} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-[#6B7280]">Nenhum endereço cadastrado.</p>
        )}
      </section>
    </div>
  );
}
