import { ReactNode } from 'react';

interface PainelLayoutProps {
    children: ReactNode;
    className?: string;
    id?: string;
}

/**
 * Componente de layout reutilizável para seções do painel
 */
export function PainelLayout({ children, className = '', id }: PainelLayoutProps) {
    return (
        <div 
            id={id}
            className={`flex flex-col md:flex-row w-full gap-6 md:gap-8 items-start justify-start ${className}`}
        >
            <div className="w-full md:flex-1 flex flex-col gap-6 items-start justify-start">
                <div className="w-full md:max-w-[580px] md:px-0">
                    {children}
                </div>
            </div>
            <div className="w-full md:w-[384px] flex-shrink-0">
                {/* Espaço reservado para manter alinhamento */}
            </div>
        </div>
    );
}

