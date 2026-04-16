import { useJobs } from "./hooks";
import { JobProgressBar } from "./JobProgressBar";
import { LoadingSpinner } from "../../shared/components/LoadingSpinner";

export function JobsPage() {
  const { data: jobs, isLoading } = useJobs();

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Jobs & Tasks</h2>
      {isLoading && <LoadingSpinner />}
      {jobs && jobs.length === 0 && (
        <p className="text-slate-400">No jobs yet. Trigger a fetch or calculation to see jobs here.</p>
      )}
      <div className="space-y-3">
        {jobs?.map((job) => <JobProgressBar key={job.job_id} job={job} />)}
      </div>
    </div>
  );
}
