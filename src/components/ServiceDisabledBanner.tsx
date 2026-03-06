import { AlertTriangle } from "lucide-react";

interface ServiceDisabledBannerProps {
  serviceName: string;
}

export default function ServiceDisabledBanner({ serviceName }: ServiceDisabledBannerProps) {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-2xl p-8 text-center max-w-md">
        <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
        <h2 className="text-lg font-bold text-foreground mb-2">{serviceName} Temporarily Unavailable</h2>
        <p className="text-sm text-muted-foreground">
          This service is currently disabled for maintenance. Please check back later.
        </p>
      </div>
    </div>
  );
}
