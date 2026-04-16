import { useCronSchedules, useUpdateCronSchedule, useTriggerCronAction } from "./hooks";
import { LoadingSpinner } from "../../shared/components/LoadingSpinner";
import type { CronScheduleResponse } from "../../shared/types/api";

function formatDateTime(iso: string | null): string {
  if (!iso) return "Never";
  const d = new Date(iso);
  return d.toLocaleString();
}

function ScheduleRow({ schedule }: { schedule: CronScheduleResponse }) {
  const update = useUpdateCronSchedule();
  const trigger = useTriggerCronAction();

  return (
    <div className="grid grid-cols-6 items-center gap-4 bg-slate-800 border border-slate-700 rounded-lg px-4 py-3">
      <div className="flex items-center gap-3">
        <button
          onClick={() => update.mutate({ actionId: schedule.action_id, body: { enabled: !schedule.enabled } })}
          disabled={update.isPending}
          className={`relative inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full transition-colors ${
            schedule.enabled ? "bg-blue-600" : "bg-slate-600"
          }`}
        >
          <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${
            schedule.enabled ? "translate-x-[18px]" : "translate-x-0.5"
          }`} />
        </button>
        <span className="text-sm font-medium">{schedule.label}</span>
      </div>

      <input
        type="time"
        value={schedule.run_time}
        onChange={(e) => update.mutate({ actionId: schedule.action_id, body: { run_time: e.target.value } })}
        className="bg-slate-900 border border-slate-600 rounded px-2 py-1 text-sm text-slate-200 w-fit"
      />

      <div className="text-sm text-slate-400">
        {schedule.enabled ? formatDateTime(schedule.next_run_at) : "Disabled"}
      </div>

      <div className="text-sm text-slate-400">
        {formatDateTime(schedule.last_run_at)}
      </div>

      <div className="text-sm">
        <span className={`px-2 py-0.5 rounded text-xs ${schedule.enabled ? "bg-green-900/50 text-green-400" : "bg-slate-700 text-slate-400"}`}>
          {schedule.enabled ? "Active" : "Off"}
        </span>
      </div>

      <div className="flex justify-end">
        <button
          onClick={() => trigger.mutate(schedule.action_id)}
          disabled={trigger.isPending}
          className="px-3 py-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded text-sm transition-colors"
        >
          {trigger.isPending ? "Running..." : "Run Now"}
        </button>
      </div>
    </div>
  );
}

export function CronJobsPage() {
  const { data: schedules, isLoading } = useCronSchedules();

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Cron Jobs</h2>
      {isLoading && <LoadingSpinner />}
      <div className="grid grid-cols-6 gap-4 px-4 mb-2 text-xs uppercase tracking-wider text-slate-500">
        <span>Action</span>
        <span>Time</span>
        <span>Next Run</span>
        <span>Last Run</span>
        <span>Status</span>
        <span className="text-right">Trigger</span>
      </div>
      <div className="space-y-2">
        {schedules?.map((s) => <ScheduleRow key={s.action_id} schedule={s} />)}
      </div>
    </div>
  );
}
