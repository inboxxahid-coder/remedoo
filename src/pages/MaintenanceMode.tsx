import { Wrench } from "lucide-react";
import remedooLogo from "@/assets/remedoo-logo.png";

export default function MaintenanceMode() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 text-center">
      <img src={remedooLogo} alt="Remedoo" className="h-10 mb-8 opacity-80" />
      <div className="p-4 rounded-full bg-primary/10 mb-6">
        <Wrench className="w-12 h-12 text-primary" />
      </div>
      <h1 className="text-2xl font-bold text-foreground mb-3">We'll Be Right Back</h1>
      <p className="text-muted-foreground max-w-md mb-6">
        Remedoo is currently undergoing scheduled maintenance to improve your experience. Please check back shortly.
      </p>
      <button
        onClick={() => window.location.reload()}
        className="px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium text-sm hover:opacity-90 transition-opacity"
      >
        Refresh Page
      </button>
    </div>
  );
}
