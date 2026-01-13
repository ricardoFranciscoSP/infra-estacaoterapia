import { useCallback } from "react";
import { InfoSimplesNomePayload } from "@/services/infoSimples";
import { useInfoSimplesStore } from "@/store/infoSimplesStore";

export function useInfoSimplesConsulta() {
    const { resultado, situacao, header, loading, error, consultarPorNome, reset } = useInfoSimplesStore();

    const consultarPorNomeNormalizado = useCallback(
        async (payload: InfoSimplesNomePayload) =>
            consultarPorNome({
                ...payload,
                nome: payload.nome.trim(),
                uf: payload.uf.trim().toUpperCase(),
                registro: payload.registro?.trim(),
            }),
        [consultarPorNome]
    );

    return {
        resultado,
        situacao,
        header,
        isLoading: loading,
        error,
        consultarPorNome: consultarPorNomeNormalizado,
        reset,
    };
}
