import { useState } from "react";
import { useLocation } from "wouter";
import { useGetKYC, useSubmitKYC } from "@workspace/api-client-react";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Camera, UploadCloud, CheckCircle2, Clock, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { useQueryClient } from "@tanstack/react-query";

export default function KYC() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: kyc, isLoading } = useGetKYC();
  const submitMutation = useSubmitKYC();

  const handleSubmit = () => {
    submitMutation.mutate({ 
      data: {
        documentType: "Passport",
        documentFrontUrl: "https://example.com/doc.jpg",
        selfieUrl: "https://example.com/selfie.jpg",
        proofOfAddressUrl: "https://example.com/address.jpg"
      }
    }, {
      onSuccess: () => {
        toast({ title: "KYC Submitted", description: "Your documents are under review." });
        queryClient.invalidateQueries({ queryKey: ["/api/profile/kyc"] });
      },
      onError: (err: any) => {
        toast({ title: "Submission failed", description: err.message, variant: "destructive" });
      }
    });
  };

  const isEditable = !kyc || kyc.status.toLowerCase() === 'unverified' || kyc.status.toLowerCase() === 'rejected';

  return (
    <Layout>
      <div className="p-5 pb-8 space-y-6">
        <div className="flex items-center gap-3">
          <button onClick={() => setLocation("/profile")} className="w-10 h-10 flex items-center justify-center rounded-xl bg-card">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold tracking-tight">KYC Verification</h1>
        </div>

        <div className="mb-6">
          <h2 className="text-2xl font-bold mb-1.5">Verify your identity</h2>
          <p className="text-sm text-muted-foreground">Complete KYC to unlock all features and higher limits</p>
        </div>

        {isLoading ? (
          <Skeleton className="h-16 w-full rounded-xl" />
        ) : kyc?.status !== 'unverified' && kyc ? (
          <div className={`p-4 rounded-xl flex items-center gap-3 ${
            kyc.status.toLowerCase() === 'approved' ? 'bg-green-500/10 text-green-500' :
            kyc.status.toLowerCase() === 'rejected' ? 'bg-red-500/10 text-red-500' :
            'bg-yellow-500/10 text-yellow-500'
          }`}>
            {kyc.status.toLowerCase() === 'approved' ? <CheckCircle2 className="w-5 h-5 shrink-0" /> :
             kyc.status.toLowerCase() === 'rejected' ? <XCircle className="w-5 h-5 shrink-0" /> :
             <Clock className="w-5 h-5 shrink-0" />}
            <span className="font-semibold text-sm capitalize">{kyc.status === 'pending' ? 'Under Review' : kyc.status}</span>
          </div>
        ) : null}

        {isEditable && (
          <div className="space-y-4">
            <div className="bg-card border-none border-border border-dashed rounded-2xl p-5 flex flex-col items-center justify-center gap-2 border-[1.5px] border-dashed border-muted-foreground/20">
              <div className="w-12 h-12 bg-background rounded-full flex items-center justify-center mb-1">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M4 6C4 4.89543 4.89543 4 6 4H18C19.1046 4 20 4.89543 20 6V18C20 19.1046 19.1046 20 18 20H6C4.89543 20 4 19.1046 4 18V6Z" stroke="#7C3AED" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M14 8H16" stroke="#7C3AED" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M10 16H16" stroke="#7C3AED" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M10 12H16" stroke="#7C3AED" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <circle cx="7" cy="12" r="1" fill="#7C3AED"/>
                  <circle cx="7" cy="16" r="1" fill="#7C3AED"/>
                  <circle cx="10" cy="8" r="2" stroke="#7C3AED" strokeWidth="2"/>
                </svg>
              </div>
              <h3 className="font-semibold text-sm">Identity Document</h3>
              <Button variant="outline" size="sm" className="mt-2 h-9 rounded-lg bg-background border-border text-xs"><UploadCloud className="w-3.5 h-3.5 mr-2" /> Upload</Button>
            </div>

            <div className="bg-card border-none border-border border-dashed rounded-2xl p-5 flex flex-col items-center justify-center gap-2 border-[1.5px] border-dashed border-muted-foreground/20">
              <div className="w-12 h-12 bg-background rounded-full flex items-center justify-center mb-1">
                <Camera className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold text-sm">Selfie</h3>
              <Button variant="outline" size="sm" className="mt-2 h-9 rounded-lg bg-background border-border text-xs"><UploadCloud className="w-3.5 h-3.5 mr-2" /> Upload</Button>
            </div>

            <div className="bg-card border-none border-border border-dashed rounded-2xl p-5 flex flex-col items-center justify-center gap-2 border-[1.5px] border-dashed border-muted-foreground/20">
              <div className="w-12 h-12 bg-background rounded-full flex items-center justify-center mb-1">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M14 2H6C4.89543 2 4 2.89543 4 4V20C4 21.1046 4.89543 22 6 22H18C19.1046 22 20 21.1046 20 20V8L14 2Z" stroke="#7C3AED" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M14 2V8H20" stroke="#7C3AED" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M16 13H8" stroke="#7C3AED" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M16 17H8" stroke="#7C3AED" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M10 9H8" stroke="#7C3AED" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <h3 className="font-semibold text-sm">Proof of Address</h3>
              <Button variant="outline" size="sm" className="mt-2 h-9 rounded-lg bg-background border-border text-xs"><UploadCloud className="w-3.5 h-3.5 mr-2" /> Upload</Button>
            </div>

            <Button 
              className="w-full h-14 rounded-xl text-lg font-medium shadow-none mt-4" 
              onClick={handleSubmit}
              disabled={submitMutation.isPending}
            >
              {submitMutation.isPending ? "Submitting..." : "Submit for Review"}
            </Button>
          </div>
        )}
      </div>
    </Layout>
  );
}
