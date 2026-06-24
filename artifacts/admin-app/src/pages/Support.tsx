import { useState } from "react";
import { 
  useAdminListTickets, 
  useAdminReplyTicket,
  useAdminCloseTicket,
  getAdminListTicketsQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { CheckCircle2, MessageSquare, Clock } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

export default function Support() {
  const [filterStatus, setFilterStatus] = useState<string>("open");
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [replyText, setReplyText] = useState("");
  
  const { data: tickets, isLoading } = useAdminListTickets({ 
    status: filterStatus !== "all" ? filterStatus : undefined
  });
  
  const replyMutation = useAdminReplyTicket();
  const closeMutation = useAdminCloseTicket();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleReply = () => {
    if (!selectedTicket || !replyText) return;
    
    replyMutation.mutate(
      { id: selectedTicket.id, data: { reply: replyText } },
      {
        onSuccess: () => {
          toast({ title: "Reply sent successfully" });
          setReplyText("");
          setSelectedTicket(null);
          queryClient.invalidateQueries({ queryKey: getAdminListTicketsQueryKey() });
        },
        onError: (err) => {
          toast({ title: "Failed to send reply", description: err.message, variant: "destructive" });
        }
      }
    );
  };

  const handleClose = (id: number) => {
    closeMutation.mutate(
      { id },
      {
        onSuccess: () => {
          toast({ title: "Ticket closed" });
          if (selectedTicket?.id === id) setSelectedTicket(null);
          queryClient.invalidateQueries({ queryKey: getAdminListTicketsQueryKey() });
        },
        onError: (err) => {
          toast({ title: "Failed to close ticket", description: err.message, variant: "destructive" });
        }
      }
    );
  };

  return (
    <div className="flex-1 overflow-auto bg-background p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Support</h1>
          <p className="text-muted-foreground mt-2">Manage customer support tickets.</p>
        </div>

        <Tabs value={filterStatus} onValueChange={setFilterStatus} className="w-full">
          <TabsList>
            <TabsTrigger value="open">Open Tickets</TabsTrigger>
            <TabsTrigger value="closed">Closed Tickets</TabsTrigger>
            <TabsTrigger value="all">All</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="space-y-4">
          {isLoading ? (
            Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-32 w-full" />)
          ) : tickets?.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground border border-dashed border-border rounded-lg">
              No tickets found.
            </div>
          ) : (
            tickets?.map((ticket) => (
              <Card key={ticket.id} className={`cursor-pointer hover:border-primary/50 transition-colors ${ticket.status === 'closed' ? 'opacity-75' : ''}`} onClick={() => setSelectedTicket(ticket)} data-testid={`ticket-card-${ticket.id}`}>
                <CardContent className="p-6">
                  <div className="flex justify-between items-start gap-4">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2">
                        <Badge variant={ticket.status === 'open' ? 'default' : 'secondary'}>
                          {ticket.status === 'open' ? <Clock className="w-3 h-3 mr-1 inline" /> : <CheckCircle2 className="w-3 h-3 mr-1 inline" />}
                          {ticket.status}
                        </Badge>
                        <span className="text-sm text-muted-foreground">Ticket #{ticket.id} • {ticket.userName} ({ticket.userEmail})</span>
                      </div>
                      <h3 className="font-semibold text-lg">{ticket.subject}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-2">{ticket.message}</p>
                    </div>
                    <div className="text-xs text-muted-foreground whitespace-nowrap text-right">
                      {format(new Date(ticket.createdAt), "PP p")}
                      {ticket.repliedAt && <div className="mt-1 text-primary">Replied {format(new Date(ticket.repliedAt), "PP")}</div>}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        <Dialog open={!!selectedTicket} onOpenChange={(open) => !open && setSelectedTicket(null)}>
          <DialogContent className="max-w-2xl">
            {selectedTicket && (
              <>
                <DialogHeader>
                  <div className="flex items-center justify-between mt-2">
                    <Badge variant={selectedTicket.status === 'open' ? 'default' : 'secondary'}>{selectedTicket.status}</Badge>
                    <span className="text-sm text-muted-foreground">{format(new Date(selectedTicket.createdAt), "PP p")}</span>
                  </div>
                  <DialogTitle className="text-xl mt-4">{selectedTicket.subject}</DialogTitle>
                  <DialogDescription>From: {selectedTicket.userName} ({selectedTicket.userEmail})</DialogDescription>
                </DialogHeader>
                
                <div className="space-y-6 py-4 max-h-[60vh] overflow-y-auto pr-2">
                  <div className="bg-secondary/50 p-4 rounded-lg text-sm whitespace-pre-wrap">
                    {selectedTicket.message}
                  </div>
                  
                  {selectedTicket.adminReply ? (
                    <div className="bg-primary/10 border border-primary/20 p-4 rounded-lg space-y-2">
                      <div className="flex items-center gap-2 font-medium text-primary">
                        <MessageSquare className="w-4 h-4" /> Admin Reply
                        <span className="text-xs font-normal text-muted-foreground ml-auto">
                          {selectedTicket.repliedAt ? format(new Date(selectedTicket.repliedAt), "PP p") : ""}
                        </span>
                      </div>
                      <div className="text-sm whitespace-pre-wrap text-foreground">{selectedTicket.adminReply}</div>
                    </div>
                  ) : selectedTicket.status === 'open' ? (
                    <div className="space-y-3">
                      <label className="text-sm font-medium">Write Reply</label>
                      <Textarea 
                        placeholder="Type your response here... This will be sent to the user and close the ticket."
                        rows={6}
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        data-testid="input-ticket-reply"
                      />
                    </div>
                  ) : null}
                </div>
                
                <DialogFooter className="flex gap-2 sm:justify-between border-t border-border pt-4">
                  <Button variant="ghost" onClick={() => setSelectedTicket(null)}>Close Window</Button>
                  <div className="flex gap-2">
                    {selectedTicket.status === 'open' && (
                      <>
                        <Button 
                          variant="secondary" 
                          onClick={() => handleClose(selectedTicket.id)}
                          disabled={closeMutation.isPending}
                          data-testid="btn-close-ticket-only"
                        >
                          Close without reply
                        </Button>
                        <Button 
                          onClick={handleReply}
                          disabled={!replyText || replyMutation.isPending}
                          data-testid="btn-send-reply"
                        >
                          Send Reply & Close
                        </Button>
                      </>
                    )}
                  </div>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
