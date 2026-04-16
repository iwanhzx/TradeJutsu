import { api } from "../../shared/lib/httpClient";
import type { CronScheduleResponse, CronScheduleUpdate, JobCreated } from "../../shared/types/api";

export const cronJobsApi = {
  list: () => api.get<CronScheduleResponse[]>("/cron-jobs"),
  update: (actionId: string, body: CronScheduleUpdate) =>
    api.patch<CronScheduleResponse>(`/cron-jobs/${actionId}`, body),
  trigger: (actionId: string) =>
    api.post<JobCreated>(`/cron-jobs/${actionId}/run`),
};
