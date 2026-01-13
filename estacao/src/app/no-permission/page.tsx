"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle } from "lucide-react";
import { useAuth } from "@/hooks/authHook";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import BreadcrumbsVoltar from "@/components/BreadcrumbsVoltar";
import PainelHeader from "@/components/PainelHeader";
import PainelFooter from "@/components/PainelFooter";

export default function NoPermissionPage() {
    const router = useRouter();
    const { user, fetchUser } = useAuth();
    const [isLoading, setIsLoading] = useState(true);

    // Busca o usuário se não estiver disponível
    useEffect(() => {
        if (!user) {
            fetchUser().finally(() => setIsLoading(false));
        } else {
            setIsLoading(false);
        }
    }, [user, fetchUser]);

    // Define rota de acordo com o tipo de usuário
    const getBackRoute = () => {
        if (!user) return "/login";
        if (user.Role === "Patient") return "/painel";
        if (user.Role === "Psychologist") return "/painel-psicologo";
        if (user.Role === "Admin") return "/adm-estacao";
        return "/login";
    };

    const handleBack = () => {
        router.replace(getBackRoute());
    };

    // Mostra loading enquanto busca o usuário
    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#F7F8FA]">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#6D75C0]"></div>
            </div>
        );
    }

    // Se não houver usuário, mostra layout simples sem header/footer
    if (!user) {
        return (
            <div className="min-h-screen flex flex-col bg-[#F7F8FA]">
                <main className="flex-1 flex items-center justify-center px-4 py-12">
                    <Card className="w-full max-w-md shadow-lg border-0">
                        <CardHeader className="text-center pb-4">
                            <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-red-50 flex items-center justify-center">
                                <AlertCircle className="w-8 h-8 text-red-600" />
                            </div>
                            <CardTitle className="text-2xl font-bold text-red-600">
                                Acesso Negado
                            </CardTitle>
                            <CardDescription className="text-base mt-2 text-gray-600">
                                Você não tem permissão para acessar esta página
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <p className="text-sm text-gray-500 text-center">
                                Entre em contato com o administrador caso precise de acesso.
                            </p>
                            <Button
                                onClick={() => router.replace("/login")}
                                className="w-full bg-[#6D75C0] hover:bg-[#5a62a8] text-white font-semibold h-11"
                                size="lg"
                            >
                                Voltar para Login
                            </Button>
                        </CardContent>
                    </Card>
                </main>
            </div>
        );
    }

    // Se houver usuário, mostra com header e footer apropriados
    // O PainelHeader busca o usuário do store automaticamente
    return (
        <div className="min-h-screen flex flex-col bg-[#F7F8FA]">
            <PainelHeader />
            <main className="flex-1 flex items-center justify-center px-4 py-12 md:py-16 pb-24 md:pb-16">
                <Card className="w-full max-w-lg shadow-xl border-0 bg-white">
                    <CardHeader className="text-center pb-4 pt-8">
                        <div className="mx-auto mb-6 w-20 h-20 rounded-full bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center shadow-lg">
                            <AlertCircle className="w-10 h-10 text-red-600" strokeWidth={2} />
                        </div>
                        <CardTitle className="text-3xl font-bold text-[#23264A] mb-2">
                            Acesso Negado
                        </CardTitle>
                        <CardDescription className="text-lg mt-3 text-gray-600 font-medium">
                            Você não tem permissão para acessar esta página
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6 pb-8">
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                            <p className="text-sm text-amber-800 text-center leading-relaxed">
                                Entre em contato com o administrador caso precise de acesso a esta funcionalidade.
                            </p>
                        </div>
                        <BreadcrumbsVoltar 
                            onClick={handleBack} 
                            label="Voltar"
                            className="w-full justify-center"
                        />
                    </CardContent>
                </Card>
            </main>
            <PainelFooter />
        </div>
    );
}
