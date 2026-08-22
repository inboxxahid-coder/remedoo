import { lazy, Suspense, ComponentProps } from "react";

const LocationPicker = lazy(() => import("./LocationPicker"));

type Props = ComponentProps<typeof LocationPicker>;

const PickerFallback = () => (
  <div className="w-full h-64 rounded-2xl bg-muted animate-pulse" />
);

const LazyLocationPicker = (props: Props) => (
  <Suspense fallback={<PickerFallback />}>
    <LocationPicker {...props} />
  </Suspense>
);

export default LazyLocationPicker;
