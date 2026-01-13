import { api } from "@/lib/axios";
import { PacienteUpdate } from "@/types/pacienteTypes";

export const admPacienteService = () => {
    return {
        getPacientes: () => api.get('/admin/pacientes'),
        getPacienteById: (id: string) => api.get(`/admin/pacientes/${id}`),
        updatePaciente: (id: string, paciente: PacienteUpdate) => api.put(`/admin/pacientes/${id}`, paciente),
        deletePaciente: (id: string) => api.delete(`/admin/pacientes/${id}`),
        // Upload de imagem usando rotas de usuário (paciente é um User)
        uploadImage: (id: string, file: File) => {
            const formData = new FormData();
            formData.append("file", file);
            return api.post(`/users/image`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
        },
        updateImage: (id: string, imageId: string, file: File) => {
            const formData = new FormData();
            formData.append("file", file);
            return api.put(`/users/image/${imageId}`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
        },
        deleteImage: (imageId: string) => api.delete(`/users/image/${imageId}`),
    };
}