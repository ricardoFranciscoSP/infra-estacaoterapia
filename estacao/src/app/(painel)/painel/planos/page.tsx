"use client";
import React from 'react';
import PlanosPacienteSection from '@/components/PlanosPaciente';
import { usePlanosPacienteQuery } from '@/store/planosPacienteStore';

export default function PlanosPage() {
  const { data, isLoading } = usePlanosPacienteQuery();
  const planos = Array.isArray(data) ? data : [];
  return (
    <PlanosPacienteSection planos={planos} loading={isLoading} />
  );
} 