import { useState } from "react";
import {
  useAdminListTickets,
  useAdminReplyTicket,
  useAdminCloseTicket,
  getAdminListTicketsQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { CheckCircle2, MessageSquare, Clock, ChevronRight } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

const statusTabs = ["open", "closed", "all"] as const;

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
          toast({ title: "Reply sent" });
          setReplyText("");
          setSelectedTicket(null);
          queryClient.invalidateQueries({ queryKey: getAdminListTicketsQueryKey() });
        },
        onError: (err) => {
          toast({ title: "Failed to reply", description: err.message, variant: "destructive" });
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
          toast({ title: "Failed to close", description: err.message, variant: "destructive" });
        }
      }
    );
  };

  return (
    <div className="p-4 space-y-4 pb-2">
      <div className="pt-1">
        <h1 className="text-xl font-bold tracking-tight">Support</h1>
        <p className="text-xs text-muted-foreground">Customer tickets</p>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2">
        {statusTabs.map(tab => (
          <button
            key={tab}
            onClick={() => setFilterStatus(tab)}
            className={`px-4 py-1.5 rounded-full text-xs font-medium border transition-colors capitalize ${
              filterStatus === tab
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card text-muted-foreground border-border"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Ticket Cards */}
      <div className="space-y-2">
        {isLoading ? (
          Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-28 w-full rounded-2xl" />)
        ) : tickets?.length === 0 ? (
          <div className="text-center py-12 text-sm text-muted-foreground border border-dashed border-border rounded-2xl">
            No tickets found
          </div>
        ) : (
          tickets?.map(ticket => (
            <Card
              key={ticket.id}
              className={`rounded-2xl border-border/60 cursor-pointer hover:border-primary/40 transition-colors ${ticket.status === 'closed' ? 'opacity-60' : ''}`}
              onClick={() => setSelectedTicket(ticket)}
              data-testid={`ticket-card-${ticket.id}`}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className={`w-2 h-2 rounded-full mt-2 shrink-0 ${ticket.status === 'open' ? 'bg-primary shadow-[0_0_6px_hsl(var(--primary))]' : 'bg-muted-foreground'}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={ticket.status === 'open' ? 'default' : 'secondary'} className="text-[10px] h-4 px-1.5 capitalize">
                        {ticket.status === 'open' ? <Clock className="w-2.5 h-2.5 mr-1 inline" /> : <CheckCircle2 className="w-2.5 h-2.5 mr-1 inline" />}
                        {ticket.status}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground">#{ticket.id}</span>
                    </div>
                    <p className="text-sm font-semibold leading-snug truncate">{ticket.subject}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{ticket.userName}</p>
                    <p className="text-[11px] text-muted-foreground/60 line-clamp-1 mt-0.5">{ticket.message}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className="text-[10px] text-muted-foreground/60">{format(new Date(ticket.createdAt), "MMM d")}</span>
                    {ticket.repliedAt && <span className="text-[10px] text-primary">Replied</span>}
                    <ChevronRight className="w-3.5 h-3.5 text-muted-foreground mt-1" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Ticket Detail Dialog */}
      <Dialog open={!!selectedTicket} onOpenChange={open => !open && setSelectedTicket(null)}>
        <DialogContent className="max-w-[95vw] rounded-2xl">
          {selectedTicket && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant={selectedTicket.status === 'open' ? 'default' : 'secondary'} className="capitalize">{selectedTicket.status}</Badge>
                  <span className="text-xs text-muted-foreground">#{selectedTicket.id}</span>
                </div>
                <DialogTitle className="text-base mt-2 leading-snug">{selectedTicket.subject}</DialogTitle>
                <DialogDescription className="text-xs">{selectedTicket.userName} · {selectedTicket.userEmail}</DialogDescription>
              </DialogHeader>

              <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
                <div className="bg-secondary/50 p-3 rounded-xl text-sm whitespace-pre-wrap">
                  {selectedTicket.message}
                </div>

                {selectedTicket.adminReply ? (
                  <div className="bg-primary/10 border border-primary/20 p-3 rounded-xl">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-primary mb-1.5">
                      <MessageSquare className="w-3.5 h-3.5" /> Admin Reply
                      <span className="text-[10px] font-normal text-muted-foreground ml-auto">
                        {selectedTicket.repliedAt ? format(new Date(selectedTicket.repliedAt), "PP") : ""}
                      </span>
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{selectedTicket.adminReply}</p>
                  </div>
                ) : selectedTicket.status === 'open' ? (
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground">Write Reply</label>
                    <Textarea
                      placeholder="Type your response..."
                      rows={4}
                      value={replyText}
                      onChange={e => setReplyText(e.target.value)}
                      className="rounded-xl text-sm"
                      data-testid="input-ticket-reply"
                    />
                  </div>
                ) : null}
              </div>

              <DialogFooter className="flex-col sm:flex-row gap-2 border-t border-border pt-3">
                {selectedTicket.status === 'open' && (
                  <>
                    <Button variant="outline" size="sm" className="rounded-xl" onClick={() => handleClose(selectedTicket.id)} disabled={closeMutation.isPending} data-testid="btn-close-ticket-only">
                      Close without reply
                    </Button>
                    <Button size="sm" className="rounded-xl" onClick={handleReply} disabled={!replyText || replyMutation.isPending} data-testid="btn-send-reply">
                      Send Reply & Close
                    </Button>
                  </>
                )}
                {selectedTicket.status !== 'open' && (
                  <Button variant="outline" size="sm" className="rounded-xl" onClick={() => setSelectedTicket(null)}>
                    Close
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
