import React from "react";
import Image from "next/image";
import Link from "next/link";

interface AlertCompletarPerfilProps {
  show: boolean;
}

const AlertCompletarPerfil: React.FC<AlertCompletarPerfilProps> = ({ show }) => {
  if (!show) return null;

  return (
    <div className="flex flex-col sm:flex-row sm:items-center bg-yellow-100 border border-yellow-300 rounded px-4 py-3 mb-4 gap-3">
      <div className="flex items-start sm:items-center text-sm text-yellow-900 flex-1 min-w-0">
        <Image
          src="/icons/icon-exclamacao.svg"
          alt="Atenção"
          width={20}
          height={20}
          className="mr-2 flex-shrink-0 mt-0.5 sm:mt-0"
        />
        <span className="break-words">
          Para que seu perfil seja visto pelos pacientes e você consiga atender
          na plataforma, é importante que finalize seu perfil.
        </span>
      </div>
      <Link
        href="/painel-psicologo/pos-cadastro"
        className="px-3 py-2 bg-[#8494E9] text-white rounded font-bold text-xs sm:text-sm hover:bg-[#6B7DD8] transition whitespace-nowrap self-start sm:self-auto"
        style={{ flexShrink: 0 }}
      >
        Fazer isso agora
      </Link>
    </div>
  );
};

export default AlertCompletarPerfil;
