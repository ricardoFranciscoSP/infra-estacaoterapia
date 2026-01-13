"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { psicologoService } from "@/services/psicologo";
import { api } from "@/lib/axios";
import toast from "react-hot-toast";
import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Loader2, Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface Psicologo {
  Id: string;
  Nome: string;
  Email?: string;
}

interface HorarioQuebradoRequest {
  psicologoId: string;
  data: string;
  horario: string;
  status: string;
}

const AGENDA_STATUS = [
  { value: "Disponivel", label: "Disponível" },
  { value: "Indisponivel", label: "Indisponível" },
  { value: "Bloqueado", label: "Bloqueado" },
  { value: "Reservado", label: "Reservado" },
  { value: "Cancelado", label: "Cancelado" },
  { value: "Andamento", label: "Em Andamento" },
  { value: "Concluido", label: "Concluído" },
  { value: "Cancelled_by_patient", label: "Cancelado pelo Paciente" },
  { value: "Cancelled_by_psychologist", label: "Cancelado pelo Psicólogo" },
  { value: "Cancelled_no_show", label: "Cancelado - Não Compareceu" },
  { value: "Reagendada", label: "Reagendada" },
];

export default function GerarAgendaManualPage() {
  const [selectedPsicologo, setSelectedPsicologo] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [selectedStatus, setSelectedStatus] = useState<string>("Disponivel");
  const [psicologoSearchOpen, setPsicologoSearchOpen] = useState(false);
  const [psicologoSearchQuery, setPsicologoSearchQuery] = useState("");
  const queryClient = useQueryClient();

  // Buscar psicólogos ativos
  const { data: psicologos, isLoading: isLoadingPsicologos } = useQuery({
    queryKey: ["psicologos-ativos"],
    queryFn: async () => {
      const response = await psicologoService().getPsicologoAtivos();
      return response.data as Psicologo[];
    },
  });

  // Mutation para criar horário quebrado
  const criarHorarioQuebradoMutation = useMutation({
    mutationFn: async (data: HorarioQuebradoRequest) => {
      const response = await api.post("/agenda/horario-quebrado", data);
      return response.data;
    },
    onSuccess: () => {
      toast.success("Horário criado com sucesso!");
      // Limpar formulário
      setSelectedPsicologo("");
      setSelectedDate(undefined);
      setSelectedTime("");
      setSelectedStatus("Disponivel");
      setPsicologoSearchQuery("");
      setPsicologoSearchOpen(false);
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: ["agendas"] });
    },
    onError: (error: { response?: { data?: { error?: string } } }) => {
      const errorMessage =
        error?.response?.data?.error || "Erro ao criar horário";
      toast.error(errorMessage);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedPsicologo) {
      toast.error("Selecione um psicólogo");
      return;
    }

    if (!selectedDate) {
      toast.error("Selecione uma data");
      return;
    }

    if (!selectedTime) {
      toast.error("Selecione um horário");
      return;
    }

    // Formatar data como YYYY-MM-DD
    const formattedDate = selectedDate.toISOString().split("T")[0];

    criarHorarioQuebradoMutation.mutate({
      psicologoId: selectedPsicologo,
      data: formattedDate,
      horario: selectedTime,
      status: selectedStatus,
    });
  };

  // Filtrar psicólogos baseado na busca
  const filteredPsicologos = useMemo(() => {
    if (!psicologos) return [];
    if (!psicologoSearchQuery) return psicologos;
    
    const query = psicologoSearchQuery.toLowerCase();
    return psicologos.filter(
      (psicologo) =>
        psicologo.Nome.toLowerCase().includes(query) ||
        psicologo.Email?.toLowerCase().includes(query)
    );
  }, [psicologos, psicologoSearchQuery]);

  // Obter nome do psicólogo selecionado
  const selectedPsicologoNome = useMemo(() => {
    if (!selectedPsicologo || !psicologos) return "";
    const psicologo = psicologos.find((p) => p.Id === selectedPsicologo);
    return psicologo?.Nome || "";
  }, [selectedPsicologo, psicologos]);

  // Gerar opções de horário (00:00 até 23:30, intervalos de 30 minutos)
  const timeOptions = [];
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const timeString = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
      timeOptions.push(timeString);
    }
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-[#23253a] mb-2">
            Gerar Agenda Manual
          </h1>
          <p className="text-[#6C757D]">
            Crie horários individuais na agenda de um psicólogo
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Novo Horário</CardTitle>
            <CardDescription>
              Preencha os campos abaixo para criar um horário na agenda
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Calendário e Campos lado a lado */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Calendário - Lado Esquerdo */}
                <div className="space-y-2">
                  <Label>Data *</Label>
                  <div className="border rounded-md p-4 flex justify-center">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={setSelectedDate}
                      disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                      className="rounded-md border-0"
                    />
                  </div>
                  {selectedDate && (
                    <p className="text-sm text-[#6C757D] text-center lg:text-left">
                      Data selecionada:{" "}
                      {selectedDate.toLocaleDateString("pt-BR", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                      })}
                    </p>
                  )}
                </div>

                {/* Psicólogo, Horário e Status - Lado Direito */}
                <div className="space-y-4 flex flex-col justify-center">
                  {/* Seleção de Psicólogo com Busca */}
                  <div className="space-y-2">
                    <Label htmlFor="psicologo">Psicólogo *</Label>
                    <Popover open={psicologoSearchOpen} onOpenChange={setPsicologoSearchOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={psicologoSearchOpen}
                          className="w-full justify-between"
                          disabled={isLoadingPsicologos}
                        >
                          {selectedPsicologoNome || "Selecione um psicólogo"}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[350px] p-0" align="start">
                        <div className="p-2">
                          <input
                            type="text"
                            placeholder="Buscar psicólogo..."
                            value={psicologoSearchQuery}
                            onChange={(e) => setPsicologoSearchQuery(e.target.value)}
                            className="w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2"
                            autoFocus
                          />
                        </div>
                        <div className="max-h-[300px] overflow-auto">
                          {isLoadingPsicologos ? (
                            <div className="flex items-center justify-center p-4">
                              <Loader2 className="h-4 w-4 animate-spin" />
                            </div>
                          ) : filteredPsicologos.length > 0 ? (
                            filteredPsicologos.map((psicologo) => (
                              <div
                                key={psicologo.Id}
                                className={cn(
                                  "relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground",
                                  selectedPsicologo === psicologo.Id && "bg-accent"
                                )}
                                onClick={() => {
                                  setSelectedPsicologo(psicologo.Id);
                                  setPsicologoSearchOpen(false);
                                  setPsicologoSearchQuery("");
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    selectedPsicologo === psicologo.Id
                                      ? "opacity-100"
                                      : "opacity-0"
                                  )}
                                />
                                {psicologo.Nome}
                              </div>
                            ))
                          ) : (
                            <div className="px-2 py-1.5 text-sm text-muted-foreground text-center">
                              {psicologoSearchQuery
                                ? "Nenhum psicólogo encontrado"
                                : "Nenhum psicólogo ativo encontrado"}
                            </div>
                          )}
                        </div>
                      </PopoverContent>
                    </Popover>
                    {selectedPsicologoNome && (
                      <p className="text-sm text-[#6C757D]">
                        Psicólogo selecionado: <span className="font-medium">{selectedPsicologoNome}</span>
                      </p>
                    )}
                  </div>
                  {/* Seleção de Horário */}
                  <div className="space-y-2">
                    <Label htmlFor="horario">Horário *</Label>
                    <Select
                      value={selectedTime}
                      onValueChange={setSelectedTime}
                      disabled={!selectedDate}
                    >
                      <SelectTrigger id="horario">
                        <SelectValue placeholder="Selecione um horário" />
                      </SelectTrigger>
                      <SelectContent className="max-h-[300px]">
                        {timeOptions.map((time) => (
                          <SelectItem key={time} value={time}>
                            {time}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {!selectedDate && (
                      <p className="text-sm text-[#6C757D]">
                        Selecione uma data primeiro
                      </p>
                    )}
                    {selectedTime && selectedDate && (
                      <p className="text-sm text-[#6C757D]">
                        Horário selecionado: <span className="font-medium">{selectedTime}</span>
                      </p>
                    )}
                  </div>

                  {/* Seleção de Status */}
                  <div className="space-y-2">
                    <Label htmlFor="status">Status *</Label>
                    <Select
                      value={selectedStatus}
                      onValueChange={setSelectedStatus}
                    >
                      <SelectTrigger id="status">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {AGENDA_STATUS.map((status) => (
                          <SelectItem key={status.value} value={status.value}>
                            {status.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {selectedStatus && (
                      <p className="text-sm text-[#6C757D]">
                        Status selecionado: <span className="font-medium">
                          {AGENDA_STATUS.find((s) => s.value === selectedStatus)?.label || selectedStatus}
                        </span>
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Botão de Submit */}
              <div className="flex justify-end gap-4 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setSelectedPsicologo("");
                    setSelectedDate(undefined);
                    setSelectedTime("");
                    setSelectedStatus("Disponivel");
                    setPsicologoSearchQuery("");
                    setPsicologoSearchOpen(false);
                  }}
                >
                  Limpar
                </Button>
                <Button
                  type="submit"
                  disabled={criarHorarioQuebradoMutation.isPending}
                >
                  {criarHorarioQuebradoMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Criando...
                    </>
                  ) : (
                    "Criar Horário"
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

