import { createBrowserRouter } from "react-router-dom";
import { Layout } from "../shared/components/Layout";
import { SymbolsPage } from "../features/symbols/SymbolsPage";
import { PricesPage } from "../features/prices/PricesPage";
import { AtrPage } from "../features/analytics/AtrPage";
import { TurnoverPage } from "../features/analytics/TurnoverPage";
import { WtdPage } from "../features/analytics/WtdPage";
import { JobsPage } from "../features/jobs/JobsPage";
import { CronJobsPage } from "../features/cron-jobs/CronJobsPage";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Layout />,
    children: [
      { index: true, element: <SymbolsPage /> },
      { path: "symbols", element: <SymbolsPage /> },
      { path: "prices", element: <PricesPage /> },
      { path: "prices/:symbol", element: <PricesPage /> },
      { path: "analytics/atr", element: <AtrPage /> },
      { path: "analytics/turnover", element: <TurnoverPage /> },
      { path: "analytics/wtd", element: <WtdPage /> },
      { path: "jobs", element: <JobsPage /> },
      { path: "cron-jobs", element: <CronJobsPage /> },
    ],
  },
]);
