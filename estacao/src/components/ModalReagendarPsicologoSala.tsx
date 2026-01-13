"use client";
import React, { useState, useRef, useCallback } from "react";
import { useEscapeKey } from "@/hooks/useEscapeKey";
import toast from "react-hot-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Upload, FileCheck, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ModalReagendarPsicologoSalaProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: {
    motivo: string;
    documento?: File | null;
    observacao?: string;
  }) => Promise<void>;
  consultationId: string;
}

// Motivos específicos para reagendamento (problema do psicólogo)
const MOTIVOS_REAGENDAMENTO = [
  { value: "instabilidade_conexao", label: "Instabilidade de conexão" },
  { value: "interrupcao_energia", label: "Interrupção de energia elétrica" },
  { value: "problemas_equipamento", label: "Problemas com equipamento" },
  { value: "imprevistos_diversos", label: "Imprevistos diversos" },
];

const ModalReagendarPsicologoSala: React.FC<ModalReagendarPsicologoSalaProps> = ({
  isOpen,
  onClose,
  onConfirm,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  consultationId: _consultationId, // Mantido para compatibilidade com interface, não usado atualmente
}) => {
  useEscapeKey(isOpen, onClose);

  const [motivo, setMotivo] = useState("");
  const [documento, setDocumento] = useState<File | null>(null);
  const [observacao, setObservacao] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
      const maxSize = 2 * 1024 * 1024; // 2MB

      if (!allowedTypes.includes(file.type)) {
        toast.error("Tipo de arquivo não permitido. Use PDF, PNG ou JPG.");
        return;
      }

      if (file.size > maxSize) {
        toast.error("Arquivo excede o tamanho máximo de 2MB.");
        return;
      }

      setDocumento(file);
    }
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
      const maxSize = 2 * 1024 * 1024; // 2MB

      if (!allowedTypes.includes(file.type)) {
        toast.error("Tipo de arquivo não permitido. Use PDF, PNG ou JPG.");
        return;
      }

      if (file.size > maxSize) {
        toast.error("Arquivo excede o tamanho máximo de 2MB.");
        return;
      }

      setDocumento(file);
    }
  }, []);

  const handleClickUpload = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleRemoveFile = useCallback(() => {
    setDocumento(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const handleConfirm = async () => {
    if (!motivo) {
      toast.error("Por favor, selecione um motivo para o reagendamento.");
      return;
    }

    setIsLoading(true);
    try {
      await onConfirm({
        motivo,
        documento,
        observacao: observacao.trim() || undefined,
      });
      toast.success("Sessão reagendada com sucesso!");
      // Reset form
      setMotivo("");
      setDocumento(null);
      setObservacao("");
      onClose();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Erro ao reagendar sessão";
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (isLoading) return;
    setMotivo("");
    setDocumento(null);
    setObservacao("");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open: boolean) => !open && !isLoading && handleClose()}>
      <DialogContent className="max-w-[700px] max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 py-4 bg-[#232A5C] text-white rounded-t-lg">
          <DialogTitle className="text-white">Reagendar Sessão</DialogTitle>
          <DialogDescription className="text-white/80">
            Reagendamento por problema do psicólogo
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 px-8 py-6 overflow-y-auto">
          <Alert className="mb-6 bg-blue-50 border-blue-200">
            <AlertTitle className="text-gray-800">Reagendamento por problema do psicólogo</AlertTitle>
            <AlertDescription className="text-gray-700">
              Esta ação irá devolver a sessão ao saldo do paciente. O reagendamento não gerará repasse financeiro.
            </AlertDescription>
          </Alert>

          <div className="mb-5 space-y-2">
            <Label htmlFor="motivo" className="text-gray-800 font-semibold">
              Motivo do reagendamento <span className="text-red-500">*</span>
            </Label>
            <Select value={motivo} onValueChange={setMotivo}>
              <SelectTrigger id="motivo" className="w-full">
                <SelectValue placeholder="Selecione um motivo" />
              </SelectTrigger>
              <SelectContent>
                {MOTIVOS_REAGENDAMENTO.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="mb-5 space-y-2">
            <Label htmlFor="documento" className="text-gray-800 font-semibold">
              Upload de comprovação (opcional)
            </Label>
            <input
              ref={fileInputRef}
              type="file"
              id="documento"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={handleFileSelect}
              className="hidden"
            />
            <div
              ref={dropZoneRef}
              onClick={handleClickUpload}
              onDragEnter={handleDragEnter}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={cn(
                "w-full border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all",
                isDragging && "border-[#8494E9] bg-[#F2F4FD]",
                documento && "border-green-400 bg-green-50",
                !documento && !isDragging && "border-gray-300 bg-gray-50 hover:border-[#8494E9] hover:bg-[#F9FAFF]"
              )}
            >
              <div className="flex flex-col items-center justify-center">
                {documento ? (
                  <FileCheck className="w-10 h-10 mb-3 text-green-500" />
                ) : (
                  <Upload className={cn("w-10 h-10 mb-3", isDragging ? "text-[#8494E9]" : "text-gray-400")} />
                )}
                <p className="text-gray-700 mb-1.5 text-sm">
                  <span className="text-[#8494E9] underline font-medium">Clique aqui ou Arraste o arquivo</span>
                  <span className="text-gray-600"> para importar o documento</span>
                </p>
                <p className="text-xs text-gray-500">
                  PDF, PNG ou JPG (max 2 MB)
                </p>
                {documento && (
                  <div className="mt-3 p-2.5 bg-white rounded border border-green-300 flex items-center gap-2">
                    <div className="flex-1 text-left">
                      <p className="text-xs text-gray-700 font-medium">
                        {documento.name}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {(documento.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveFile();
                      }}
                      className="h-6 w-6"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="mb-5 space-y-2">
            <Label htmlFor="observacao" className="text-gray-800 font-semibold">
              Observação complementar (opcional)
            </Label>
            <Textarea
              id="observacao"
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              rows={4}
              placeholder="Descreva detalhes adicionais sobre o motivo do reagendamento..."
              className="resize-none"
            />
          </div>
        </div>

        <DialogFooter className="px-8 py-5 border-t bg-white rounded-b-lg">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!motivo || isLoading}
            className="bg-[#8494E9] hover:bg-[#6D75C0] text-white"
          >
            {isLoading ? "Processando..." : "Confirmar Reagendamento"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ModalReagendarPsicologoSala;
