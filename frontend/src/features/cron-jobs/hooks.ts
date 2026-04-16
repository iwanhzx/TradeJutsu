import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { cronJobsApi } from "./api";
import type { CronScheduleUpdate } from "../../shared/types/api";

export function useCronSchedules() {
  return useQuery({
    queryKey: ["cron-schedules"],
    queryFn: cronJobsApi.list,
    refetchInterval: 30_000,
  });
}

export function useUpdateCronSchedule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ actionId, body }: { actionId: string; body: CronScheduleUpdate }) =>
      cronJobsApi.update(actionId, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cron-schedules"] }),
  });
}

export function useTriggerCronAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (actionId: string) => cronJobsApi.trigger(actionId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cron-schedules"] });
      qc.invalidateQueries({ queryKey: ["jobs"] });
    },
  });
}
