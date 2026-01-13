"use client";
import BreadcrumbsVoltar from "@/components/BreadcrumbsVoltar";
import { useConsultasAgendadas } from "@/hooks/consulta";
import ConsultasRealizadas from "@/components/ConsultasRealizadas";
import { ProximaConsulta } from "@/lib/consultas/ProximaConsulta";
import { extrairConsultasArray } from "@/lib/consultas/extrair-consultas-array";

export default function ConsultasPage() {
  const { consultasAgendadas } = useConsultasAgendadas();
  
  // Extrai todas as consultas usando a função utilitária da lib
  const consultasExtraidas = extrairConsultasArray(consultasAgendadas);
  
  return (
    <div className="w-full bg-[#FCFBF6] min-h-[calc(100vh-64px)] mb-8">
      <div className="max-w-7xl mx-auto p-4 md:p-8 mb-6">
        <div className="flex items-start">
          <BreadcrumbsVoltar />
        </div>
        <div>
          <h3 className="fira-sans font-semibold text-2xl leading-[40px] tracking-normal align-middle text-[#49525A] mb-4">
            Próximas consultas
          </h3>
          <ProximaConsulta consultas={consultasExtraidas ?? null} />
        </div>
        <ConsultasRealizadas />
      </div>
    </div>
  );
}
