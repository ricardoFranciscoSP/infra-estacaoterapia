import { api } from "@/lib/axios";
import { AxiosResponse } from "axios";

export interface BackupItem {
  name: string;
  size: number;
  createdAt: string;
  updatedAt: string;
}

export interface BackupSchedule {
  enabled: boolean;
  dayOfWeek: number;
  time: string;
}

export const backupService = {
  list: (): Promise<AxiosResponse<{ items: BackupItem[] }>> =>
    api.get("/admin/backups"),
  generate: (): Promise<AxiosResponse<{ backup: BackupItem }>> =>
    api.post("/admin/backups/generate"),
  delete: (fileName: string): Promise<AxiosResponse<{ message: string }>> =>
    api.delete(`/admin/backups/${encodeURIComponent(fileName)}`),
  download: (fileName: string): Promise<AxiosResponse<Blob>> =>
    api.get(`/admin/backups/${encodeURIComponent(fileName)}/download`, {
      responseType: "blob",
    }),
  restore: (file: File): Promise<AxiosResponse<{ message: string }>> => {
    const formData = new FormData();
    formData.append("file", file);
    return api.post("/admin/backups/restore", formData);
  },
  getSchedule: (): Promise<AxiosResponse<BackupSchedule>> =>
    api.get("/admin/backups/schedule"),
  updateSchedule: (
    schedule: BackupSchedule
  ): Promise<AxiosResponse<BackupSchedule>> =>
    api.put("/admin/backups/schedule", schedule),
};
