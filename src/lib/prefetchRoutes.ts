// Warms up the JS chunks a patient is most likely to open next.
// Runs only when the browser is idle and the connection isn't metered/slow-saving,
// so it never competes with the current page's critical requests.

type Importer = () => Promise<unknown>;

const PATIENT_ROUTES: Importer[] = [
  () => import("@/pages/Doctors"),
  () => import("@/pages/Pharmacies"),
  () => import("@/pages/Hospitals"),
  () => import("@/pages/Labs"),
  () => import("@/pages/Appointments"),
  () => import("@/pages/Cart"),
  () => import("@/pages/Profile"),
];

let started = false;

export const prefetchPatientRoutes = () => {
  if (started || typeof window === "undefined") return;
  started = true;

  const conn = (navigator as any).connection;
  if (conn?.saveData) return; // respect data-saver

  const idle: (cb: () => void) => void =
    (window as any).requestIdleCallback
      ? (cb) => (window as any).requestIdleCallback(cb, { timeout: 4000 })
      : (cb) => window.setTimeout(cb, 1500);

  // One chunk per idle slot so slow networks stay responsive.
  const queue = [...PATIENT_ROUTES];
  const next = () => {
    const load = queue.shift();
    if (!load) return;
    load()
      .catch(() => undefined)
      .finally(() => idle(next));
  };
  idle(next);
};
