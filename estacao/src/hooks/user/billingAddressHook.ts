import { useMutation, useQuery } from "@tanstack/react-query";
import { createBillingAddress, updateBillingAddress, fetchBillingAddress, BillingAddressData } from "@/store/api/billingAddressStore";

export function useCreateBillingAddress() {
    const mutation = useMutation({
        mutationFn: createBillingAddress,
    });
    return {
        mutate: mutation.mutate,
        isPending: mutation.isPending,
        isError: mutation.isError,
        reset: mutation.reset,
    };
}

export function useUpdateBillingAddress() {
    const mutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: BillingAddressData }) => updateBillingAddress(id, data),
    });
    return {
        mutate: mutation.mutate,
        isPending: mutation.isPending,
        isError: mutation.isError,
        reset: mutation.reset,
    };
}

export function useBillingAddress(userId: string) {
    const query = useQuery({
        queryKey: ["billingAddress", userId],
        queryFn: () => fetchBillingAddress(userId),
        enabled: !!userId,
    });
    return {
        billingAddress: query.data,
        isLoading: query.isLoading,
        isError: query.isError,
        refetch: query.refetch,
    };
}
