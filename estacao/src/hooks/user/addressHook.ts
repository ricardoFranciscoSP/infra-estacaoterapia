import { useMutation, useQuery } from "@tanstack/react-query";
import { createOrUpdateAddress, fetchAddresses } from "@/store/api/addressStore";

export function useCreateOrUpdateAddress() {
    const mutation = useMutation({
        mutationFn: createOrUpdateAddress,
    });
    return {
        mutate: mutation.mutate,
        isPending: mutation.isPending,
        isError: mutation.isError,
        reset: mutation.reset,
    };
}

export function useAddresses(userId: string) {
    const query = useQuery({
        queryKey: ["addresses", userId],
        queryFn: () => fetchAddresses(userId),
        enabled: !!userId,
    });
    return {
        addresses: query.data,
        isLoading: query.isLoading,
        isError: query.isError,
        refetch: query.refetch,
    };
}
