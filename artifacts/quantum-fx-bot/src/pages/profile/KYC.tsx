import { useLocation } from "wouter";
import { useGetKYC, useCreateKycSession } from "@workspace/api-client-react";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { ChevronLeft, CheckCircle2, Clock, XCircle, ShieldCheck, Loader2, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { useQueryClient } from "@tanstack/react-query";

const STEPS = [
  { icon: "📄", label: "Document scan", desc: "ID, passport or driving licence" },
  { icon: "🤳", label: "Liveness selfie", desc: "Quick face scan to confirm it's you" },
  { icon: "✅", label: "Instant result", desc: "Usually approved in under 30 seconds" },
];

export default function KYC() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: kyc, isLoading } = useGetKYC();
  const sessionMutation = useCreateKycSession();

  const status = kyc?.status ?? "not_submitted";
  const isVerified = status === "verified" || status === "approved";
  const isPending = status === "pending" || status === "submitted" || status === "under_review";
  const isRejected = status === "rejected";
  const canStart = !isVerified && !isPending;

  const handleStart = () => {
    sessionMutation.mutate(undefined, {
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: ["/api/profile/kyc"] });
        window.location.href = data.url;
      },
      onError: (err: any) => {
        toast({
          title: "Could not start verification",
          description: err?.message ?? "Please try again later.",
          variant: "destructive",
        });
      },
    });
  };

  return (
    <Layout>
      <div className="p-5 pb-10 space-y-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setLocation("/profile")}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-card"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold tracking-tight">KYC Verification</h1>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-20 w-full rounded-2xl" />
            <Skeleton className="h-40 w-full rounded-2xl" />
          </div>
        ) : (
          <>
            {isVerified && (
              <div className="p-5 rounded-2xl bg-green-500/10 flex items-center gap-4">
                <CheckCircle2 className="w-10 h-10 text-green-500 shrink-0" />
                <div>
                  <p className="font-bold text-green-500">Identity Verified</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Your account is fully verified. All features and limits are unlocked.</p>
                </div>
              </div>
            )}

            {isPending && (
              <div className="p-5 rounded-2xl bg-yellow-500/10 flex items-center gap-4">
                <Clock className="w-10 h-10 text-yellow-500 shrink-0 animate-pulse" />
                <div>
                  <p className="font-bold text-yellow-500">Verification In Progress</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Didit is reviewing your documents. This usually takes under 2 minutes.</p>
                </div>
              </div>
            )}

            {isRejected && (
              <div className="p-5 rounded-2xl bg-red-500/10 flex items-center gap-4">
                <XCircle className="w-10 h-10 text-red-500 shrink-0" />
                <div>
                  <p className="font-bold text-red-500">Verification Failed</p>
                  {kyc?.rejectionReason && (
                    <p className="text-xs text-muted-foreground mt-0.5">{kyc.rejectionReason}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-0.5">You can try again below.</p>
                </div>
              </div>
            )}

            {canStart && (
              <div className="space-y-5">
                <div>
                  <h2 className="text-2xl font-bold mb-1">Verify your identity</h2>
                  <p className="text-sm text-muted-foreground">Powered by Didit — takes under 2 minutes</p>
                </div>

                <div className="space-y-3">
                  {STEPS.map((step, i) => (
                    <div key={i} className="flex items-start gap-4 bg-card rounded-2xl p-4">
                      <span className="text-2xl">{step.icon}</span>
                      <div>
                        <p className="font-semibold text-sm">{step.label}</p>
                        <p className="text-xs text-muted-foreground">{step.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex items-start gap-2 text-xs text-muted-foreground bg-card/60 rounded-xl p-3">
                  <ShieldCheck className="w-4 h-4 shrink-0 text-primary mt-0.5" />
                  <span>Your data is processed securely by Didit and is never stored on our servers. 220+ countries supported.</span>
                </div>

                <Button
                  className="w-full h-14 rounded-xl text-lg font-semibold shadow-none"
                  onClick={handleStart}
                  disabled={sessionMutation.isPending}
                >
                  {sessionMutation.isPending ? (
                    <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Starting…</>
                  ) : (
                    "Start Verification"
                  )}
                </Button>
              </div>
            )}

            {isPending && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground bg-card/60 rounded-xl p-3">
                <AlertTriangle className="w-4 h-4 shrink-0 text-yellow-500" />
                <span>If you already completed verification, your status will update automatically once Didit finishes processing.</span>
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}
