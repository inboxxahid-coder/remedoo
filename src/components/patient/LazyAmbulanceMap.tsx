import { lazy, Suspense, ComponentProps } from "react";

const AmbulanceMap = lazy(() => import("./AmbulanceMap"));

type Props = ComponentProps<typeof AmbulanceMap>;

const MapFallback = () => (
  <div className="w-full h-full min-h-[200px] rounded-2xl bg-muted animate-pulse" />
);

const LazyAmbulanceMap = (props: Props) => (
  <Suspense fallback={<MapFallback />}>
    <AmbulanceMap {...props} />
  </Suspense>
);

export default LazyAmbulanceMap;
