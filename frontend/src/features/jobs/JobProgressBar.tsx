import type { JobResponse } from "../../shared/types/api";

interface Props { job: JobResponse; }

export function JobProgressBar({ job }: Props) {
  const statusColor: Record<string, string> = {
    pending: "bg-yellow-600", running: "bg-blue-600", done: "bg-green-600", failed: "bg-red-600",
  };

  return (
    <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <span className={`px-2 py-0.5 rounded text-xs text-white ${statusColor[job.status] || "bg-slate-600"}`}>
            {job.status.toUpperCase()}
          </span>
          <span className="text-sm font-medium">{job.job_type}</span>
          {job.symbol && <span className="text-sm text-slate-400">{job.symbol}</span>}
        </div>
        <span className="text-xs text-slate-500">{new Date(job.created_at).toLocaleTimeString()}</span>
      </div>
      {job.status === "running" && (
        <div className="mt-2">
          <div className="flex justify-between text-xs text-slate-400 mb-1">
            <span>{job.completed_items} / {job.total_items}</span>
            <span>{job.progress}%</span>
          </div>
          <div className="w-full bg-slate-700 rounded-full h-2">
            <div className="bg-blue-500 h-2 rounded-full transition-all duration-300" style={{ width: `${job.progress}%` }} />
          </div>
        </div>
      )}
      {job.error && <p className="mt-2 text-sm text-red-400">{job.error}</p>}
    </div>
  );
}
