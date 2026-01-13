"use client";
import React, { useState } from "react";

const pacientes = [
  { nome: "Lucas Martins", plano: "Premium" },
  { nome: "Juliana Costa", plano: "Básico" },
  { nome: "Pedro Henrique", plano: "Premium" },
  { nome: "Amanda Rocha", plano: "Básico" },
  { nome: "Bruno Silva", plano: "Premium" },
];

export default function ProvisionamentoPacientesPage() {
  const [provisionados, setProvisionados] = useState<string[]>([]);

  function provisionar(nome: string) {
    if (!provisionados.includes(nome)) {
      setProvisionados([...provisionados, nome]);
    }
  }

  return (
    <main className="w-full p-6">
      <h1 className="text-2xl font-bold mb-6">Provisionamento de Pacientes</h1>
      <div className="bg-white rounded-lg shadow p-4 border border-[#E5E9FA]">
        <table className="w-full min-w-[400px] text-left">
          <thead>
            <tr>
              <th className="py-2 px-2 text-[#8494E9] font-medium">Paciente</th>
              <th className="py-2 px-2 text-[#8494E9] font-medium">Plano</th>
              <th className="py-2 px-2 text-[#8494E9] font-medium">Provisionar</th>
            </tr>
          </thead>
          <tbody>
            {pacientes.map((p, i) => (
              <tr key={i} className="border-b border-[#F2F4FD]">
                <td className="py-2 px-2">{p.nome}</td>
                <td className="py-2 px-2">{p.plano}</td>
                <td className="py-2 px-2">
                  <button
                    className={`px-3 py-1 rounded ${provisionados.includes(p.nome) ? "bg-green-200 text-green-700" : "bg-[#8494E9] text-white"}`}
                    disabled={provisionados.includes(p.nome)}
                    onClick={() => provisionar(p.nome)}
                  >
                    {provisionados.includes(p.nome) ? "Provisionado" : "Provisionar"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
