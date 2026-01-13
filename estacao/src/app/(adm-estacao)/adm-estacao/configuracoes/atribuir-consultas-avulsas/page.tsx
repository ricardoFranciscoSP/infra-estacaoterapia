"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/axios";
import toast from "react-hot-toast";
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
import { useAdmPaciente } from "@/hooks/admin/useAdmPaciente";
import { planoService } from "@/services/planoService";

interface Paciente {
  Id: string;
  Nome: string;
  Email?: string;
  Status?: string;
}

interface PlanoAssinatura {
  Id: string;
  Nome: string;
  Preco: number;
  Duracao: number;
  Tipo: string;
  Status: string;
}

interface AtribuirConsultaAvulsaRequest {
  pacienteId: string;
  planoAssinaturaId?: string;
  quantidade: number;
  status: string;
}

const STATUS_OPTIONS = [
  { value: "Ativa", label: "Ativa" },
  { value: "Pendente", label: "Pendente" },
  { value: "Concluida", label: "Concluída" },
];

export default function AtribuirConsultasAvulsasPage() {
  const [selectedPaciente, setSelectedPaciente] = useState<string>("");
  const [selectedPlano, setSelectedPlano] = useState<string>("");
  const [quantidade, setQuantidade] = useState<number>(1);
  const [status, setStatus] = useState<string>("Ativa");
  const [pacienteSearchOpen, setPacienteSearchOpen] = useState(false);
  const [pacienteSearchQuery, setPacienteSearchQuery] = useState("");
  const queryClient = useQueryClient();

  // Buscar pacientes ativos
  const { pacientes, isLoading: isLoadingPacientes } = useAdmPaciente();

  // Filtrar apenas pacientes ativos
  const pacientesAtivos = useMemo(() => {
    if (!pacientes) return [];
    return pacientes.filter((p: Paciente) => p.Status === "Ativo" && p.Id);
  }, [pacientes]);

  // Filtrar pacientes por busca
  const filteredPacientes = useMemo(() => {
    if (!pacienteSearchQuery) return pacientesAtivos;
    const query = pacienteSearchQuery.toLowerCase();
    return pacientesAtivos.filter(
      (p: Paciente) =>
        p.Nome?.toLowerCase().includes(query) ||
        p.Email?.toLowerCase().includes(query)
    );
  }, [pacientesAtivos, pacienteSearchQuery]);

  // Buscar planos ativos
  const { data: planos, isLoading: isLoadingPlanos } = useQuery({
    queryKey: ["planos-ativos"],
    queryFn: async () => {
      const response = await planoService().getPlanos();
      return (response.data as PlanoAssinatura[]).filter(
        (p) => p.Status === "ativo"
      );
    },
  });

  // Buscar consultas avulsas (planos com Tipo "Unica" ou "Avulsa")
  const { data: consultasAvulsas, isLoading: isLoadingConsultasAvulsas } = useQuery({
    queryKey: ["consultas-avulsas"],
    queryFn: async () => {
      const response = await planoService().getPlanos();
      return (response.data as PlanoAssinatura[]).filter(
        (p) => p.Status === "ativo" && (p.Tipo === "Unica" || p.Tipo === "Avulsa")
      );
    },
  });

  // Combinar planos e consultas avulsas
  const opcoesDisponiveis = useMemo(() => {
    const todos: Array<{ Id: string; Nome: string; Tipo: string; Preco: number }> = [];
    
    if (planos) {
      planos.forEach((p) => {
        todos.push({
          Id: p.Id,
          Nome: `${p.Nome} (${p.Tipo})`,
          Tipo: p.Tipo,
          Preco: p.Preco,
        });
      });
    }
    
    if (consultasAvulsas) {
      consultasAvulsas.forEach((c) => {
        todos.push({
          Id: c.Id,
          Nome: `${c.Nome} (Consulta Avulsa)`,
          Tipo: c.Tipo,
          Preco: c.Preco,
        });
      });
    }
    
    return todos;
  }, [planos, consultasAvulsas]);

  const selectedPacienteNome = useMemo(() => {
    if (!selectedPaciente) return "";
    const paciente = pacientesAtivos.find((p: Paciente) => p.Id === selectedPaciente);
    return paciente ? `${paciente.Nome}${paciente.Email ? ` (${paciente.Email})` : ""}` : "";
  }, [selectedPaciente, pacientesAtivos]);

  // Mutation para atribuir consultas avulsas
  const atribuirConsultaAvulsaMutation = useMutation({
    mutationFn: async (data: AtribuirConsultaAvulsaRequest) => {
      const response = await api.post("/admin/atribuir-consulta-avulsa", data);
      return response.data;
    },
    onSuccess: () => {
      toast.success("Consultas avulsas atribuídas com sucesso!");
      // Limpar formulário
      setSelectedPaciente("");
      setSelectedPlano("");
      setQuantidade(1);
      setStatus("Ativa");
      setPacienteSearchQuery("");
      setPacienteSearchOpen(false);
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: ["pacientes"] });
      queryClient.invalidateQueries({ queryKey: ["planos-ativos"] });
    },
    onError: (error: { response?: { data?: { error?: string; message?: string } } }) => {
      const errorMessage =
        error?.response?.data?.error || error?.response?.data?.message || "Erro ao atribuir consultas avulsas";
      toast.error(errorMessage);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedPaciente) {
      toast.error("Selecione um paciente");
      return;
    }

    if (!selectedPlano) {
      toast.error("Selecione um plano ou consulta avulsa");
      return;
    }

    if (quantidade < 1) {
      toast.error("A quantidade deve ser maior que zero");
      return;
    }

    atribuirConsultaAvulsaMutation.mutate({
      pacienteId: selectedPaciente,
      planoAssinaturaId: selectedPlano,
      quantidade,
      status,
    });
  };

  const handleLimpar = () => {
    setSelectedPaciente("");
    setSelectedPlano("");
    setQuantidade(1);
    setStatus("Ativa");
    setPacienteSearchQuery("");
    setPacienteSearchOpen(false);
  };

  return (
    <main className="w-full p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-[#4B5AEF]">
              Atribuir Consultas Avulsas
            </CardTitle>
            <CardDescription>
              Atribua consultas avulsas a um paciente específico. O saldo será criado como &quot;Ativa&quot; nas tabelas ConsultaAvulsa e CreditoAvulso.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Seleção de Paciente com Busca */}
              <div className="space-y-2">
                <Label htmlFor="paciente">Paciente *</Label>
                <Popover open={pacienteSearchOpen} onOpenChange={setPacienteSearchOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={pacienteSearchOpen}
                      className="w-full justify-between"
                      disabled={isLoadingPacientes}
                    >
                      {selectedPacienteNome || "Selecione um paciente"}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                    <div className="p-2">
                      <input
                        type="text"
                        placeholder="Buscar paciente por nome ou email..."
                        value={pacienteSearchQuery}
                        onChange={(e) => setPacienteSearchQuery(e.target.value)}
                        className="w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2"
                        autoFocus
                      />
                    </div>
                    <div className="max-h-[300px] overflow-auto">
                      {isLoadingPacientes ? (
                        <div className="flex items-center justify-center p-4">
                          <Loader2 className="h-4 w-4 animate-spin" />
                        </div>
                      ) : filteredPacientes.length > 0 ? (
                        filteredPacientes.map((paciente: Paciente) => (
                          <div
                            key={paciente.Id}
                            className={cn(
                              "relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground",
                              selectedPaciente === paciente.Id && "bg-accent"
                            )}
                            onClick={() => {
                              setSelectedPaciente(paciente.Id);
                              setPacienteSearchOpen(false);
                              setPacienteSearchQuery("");
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                selectedPaciente === paciente.Id
                                  ? "opacity-100"
                                  : "opacity-0"
                              )}
                            />
                            <div className="flex flex-col">
                              <span className="font-medium">{paciente.Nome}</span>
                              {paciente.Email && (
                                <span className="text-xs text-muted-foreground">
                                  {paciente.Email}
                                </span>
                              )}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="p-4 text-sm text-center text-muted-foreground">
                          Nenhum paciente encontrado
                        </div>
                      )}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Seleção de Plano/Consulta Avulsa */}
              <div className="space-y-2">
                <Label htmlFor="plano">Plano/Consulta Avulsa *</Label>
                <Select
                  value={selectedPlano}
                  onValueChange={setSelectedPlano}
                  disabled={isLoadingPlanos || isLoadingConsultasAvulsas}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um plano ou consulta avulsa" />
                  </SelectTrigger>
                  <SelectContent>
                    {isLoadingPlanos || isLoadingConsultasAvulsas ? (
                      <div className="flex items-center justify-center p-4">
                        <Loader2 className="h-4 w-4 animate-spin" />
                      </div>
                    ) : opcoesDisponiveis.length > 0 ? (
                      opcoesDisponiveis.map((opcao) => (
                        <SelectItem key={opcao.Id} value={opcao.Id}>
                          {opcao.Nome} - R$ {opcao.Preco.toFixed(2)}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="no-options" disabled>
                        Nenhuma opção disponível
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Status */}
              <div className="space-y-2">
                <Label htmlFor="status">Status *</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Quantidade */}
              <div className="space-y-2">
                <Label htmlFor="quantidade">Quantidade *</Label>
                <input
                  type="number"
                  id="quantidade"
                  min="1"
                  value={quantidade}
                  onChange={(e) => setQuantidade(parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2"
                  required
                />
              </div>

              {/* Botões */}
              <div className="flex gap-4 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleLimpar}
                  disabled={atribuirConsultaAvulsaMutation.isPending}
                >
                  Limpar
                </Button>
                <Button
                  type="submit"
                  disabled={
                    atribuirConsultaAvulsaMutation.isPending ||
                    !selectedPaciente ||
                    !selectedPlano ||
                    quantidade < 1
                  }
                >
                  {atribuirConsultaAvulsaMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Atribuindo...
                    </>
                  ) : (
                    "Atribuir Consultas Avulsas"
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

