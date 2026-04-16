import { api } from "../../shared/lib/httpClient";
import type { JobResponse } from "../../shared/types/api";

export const jobsApi = {
  list: () => api.get<JobResponse[]>("/jobs"),
  get: (jobId: string) => api.get<JobResponse>(`/jobs/${jobId}`),
};
