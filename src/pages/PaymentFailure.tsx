import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, AlertTriangle, RefreshCw, Home, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

const PaymentFailure = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const reason = searchParams.get("reason") || "Something went wrong with your payment";
  const returnTo = searchParams.get("return") || "/appointments";

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="gradient-emergency px-5 pt-10 pb-6 rounded-b-[1.5rem]">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-emergency-foreground"><ArrowLeft className="w-6 h-6" /></button>
          <h1 className="text-xl font-bold text-emergency-foreground">Payment Failed</h1>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-5 text-center">
        <div className="w-24 h-24 rounded-full bg-destructive/10 flex items-center justify-center mb-6">
          <AlertTriangle className="w-12 h-12 text-destructive" />
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Payment Unsuccessful</h2>
        <p className="text-muted-foreground text-sm max-w-xs mb-8">{reason}</p>

        <div className="w-full max-w-sm space-y-3">
          <Button
            onClick={() => navigate(returnTo)}
            className="w-full h-12 rounded-2xl gradient-primary text-primary-foreground gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate("/dashboard")}
            className="w-full h-12 rounded-2xl gap-2"
          >
            <Home className="w-4 h-4" />
            Go to Dashboard
          </Button>
          <button
            onClick={() => navigate("/settings")}
            className="flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mx-auto mt-4"
          >
            <HelpCircle className="w-4 h-4" />
            Need help? Contact Support
          </button>
        </div>

        <div className="mt-8 bg-card rounded-2xl border border-border p-4 w-full max-w-sm">
          <h3 className="text-sm font-semibold text-foreground mb-2">Common reasons for failure</h3>
          <ul className="text-xs text-muted-foreground space-y-1.5">
            <li>• Insufficient balance in your account</li>
            <li>• Bank server timeout or maintenance</li>
            <li>• Incorrect UPI PIN or card details</li>
            <li>• Transaction limit exceeded</li>
          </ul>
          <p className="text-xs text-primary font-medium mt-3">
            💡 No money has been deducted. If debited, it will be refunded within 5-7 business days.
          </p>
        </div>
      </div>
    </div>
  );
};

export default PaymentFailure;
