"use client";
import BreadcrumbsVoltar from "@/components/BreadcrumbsVoltar";
import { useConsultasAgendadas } from "@/hooks/consulta";
import ConsultasRealizadas from "@/components/ConsultasRealizadas";
import { ProximaConsulta } from "@/lib/consultas/ProximaConsulta";
import { extrairConsultasArray } from "@/lib/consultas/extrair-consultas-array";

export default function ConsultasPage() {
  const { consultasAgendadas, isLoading: isLoadingAgendadas } = useConsultasAgendadas();
  
  // Extrai todas as consultas usando a função utilitária da lib
  const consultasExtraidas = extrairConsultasArray(consultasAgendadas);
  
  // Mostra loading enquanto os dados estão carregando
  const isLoading = isLoadingAgendadas;
  
  return (
    <div className="w-full bg-[#FCFBF6] min-h-[calc(100vh-64px)] mb-8">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 md:p-8 mb-6">
        <div className="flex items-start mb-4 sm:mb-6">
          <BreadcrumbsVoltar />
        </div>
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#6D75C0] mb-4"></div>
            <p className="text-[#6B7280] text-sm font-medium">Carregando consultas...</p>
          </div>
        ) : (
          <>
            <div className="mb-6 sm:mb-8">
              <h3 className="fira-sans font-semibold text-lg sm:text-xl md:text-2xl leading-tight sm:leading-[40px] tracking-normal align-middle text-[#49525A] mb-4">
                Próximas consultas
              </h3>
              <ProximaConsulta consultas={consultasExtraidas ?? null} />
            </div>
            <ConsultasRealizadas />
          </>
        )}
      </div>
    </div>
  );
}
