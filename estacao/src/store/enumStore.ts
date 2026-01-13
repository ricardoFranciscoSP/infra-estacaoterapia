import { create } from 'zustand';
import { EnumsResponse } from '@/types/enumsType';
import { enumService } from '@/services/enumService';

interface EnumStoreState {
    enums: EnumsResponse | null;
    setEnums: (enums: EnumsResponse) => void;
    fetchEnums: () => Promise<EnumsResponse>;
}

export const useEnumStore = create<EnumStoreState>((set) => ({
    enums: null,
    setEnums: (enums) => {
        set({ enums });
    },

    fetchEnums: async () => {
        const data = await enumService.getEnums();
        set({ enums: data });
        return data;
    },
}));
