import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageCircle, Send, User } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

interface MessageDialogProps {
  projectId: number;
  projectName: string;
  trigger?: React.ReactNode;
}

export function MessageDialog({ projectId, projectName, trigger }: MessageDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedRecipient, setSelectedRecipient] = useState<string>("");
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  // Fetch project stakeholders for recipient selection
  const { data: stakeholders = [] } = useQuery({
    queryKey: ["/api/projects", projectId, "stakeholders"],
    enabled: isOpen
  });

  // Fetch messages for the project
  const { data: messages = [], isLoading: messagesLoading } = useQuery({
    queryKey: ["/api/projects", projectId, "messages"],
    enabled: isOpen
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (messageData: any) => {
      return apiRequest(`/api/projects/${projectId}/messages`, "POST", messageData);
    },
    onSuccess: () => {
      toast({
        title: "Message sent",
        description: "Your message has been sent successfully."
      });
      setSelectedRecipient("");
      setSubject("");
      setContent("");
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "messages"] });
      if (user) {
        queryClient.invalidateQueries({ queryKey: ["/api/notifications", user.id] });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error sending message",
        description: error.message || "Failed to send message. Please try again.",
        variant: "destructive"
      });
    }
  });

  // Mark message as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: async (messageId: number) => {
      return apiRequest(`/api/messages/${messageId}/read`, "PATCH", {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "messages"] });
      if (user) {
        queryClient.invalidateQueries({ queryKey: ["/api/notifications", user.id] });
      }
    }
  });

  const handleMessageClick = (message: any) => {
    // Mark as read if user is the recipient and message is unread
    if (user && message.recipientId === user.id && !message.isRead) {
      markAsReadMutation.mutate(message.id);
    }
  };

  const handleSendMessage = () => {
    if (!selectedRecipient || !subject.trim() || !content.trim()) {
      toast({
        title: "Missing information",
        description: "Please fill in all fields before sending.",
        variant: "destructive"
      });
      return;
    }

    sendMessageMutation.mutate({
      recipientId: parseInt(selectedRecipient),
      subject: subject.trim(),
      content: content.trim(),
      messageType: "general"
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" data-testid="button-open-messages">
            <MessageCircle className="h-4 w-4 mr-2" />
            Messages
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Project Messages - {projectName}</DialogTitle>
        </DialogHeader>
        
        <div className="flex gap-4 flex-1 min-h-0">
          {/* Messages List */}
          <div className="flex-1 border rounded-lg p-4">
            <h3 className="font-semibold mb-3">Messages</h3>
            <ScrollArea className="h-[400px] pr-4">
              {messagesLoading ? (
                <div className="text-center py-4 text-muted-foreground">
                  Loading messages...
                </div>
              ) : (messages as any[]).length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No messages yet</p>
                  <p className="text-sm">Start a conversation with the team!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {(messages as any[]).map((message: any) => (
                    <div
                      key={message.id}
                      className="border rounded-lg p-3 hover:bg-muted/50 transition-colors cursor-pointer"
                      data-testid={`message-${message.id}`}
                      onClick={() => handleMessageClick(message)}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          <span className="font-medium text-sm">
                            {message.sender?.fullName || "Unknown User"}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {message.sender?.role || "User"}
                          </Badge>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}
                        </span>
                      </div>
                      <h4 className="font-medium text-sm mb-1">{message.subject}</h4>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {message.content}
                      </p>
                      {!message.isRead && (
                        <Badge variant="secondary" className="text-xs mt-2">
                          New
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Send Message Form */}
          <div className="w-80 border rounded-lg p-4">
            <h3 className="font-semibold mb-3">Send Message</h3>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium mb-1 block">To</label>
                <Select value={selectedRecipient} onValueChange={setSelectedRecipient}>
                  <SelectTrigger data-testid="select-message-recipient">
                    <SelectValue placeholder="Select recipient" />
                  </SelectTrigger>
                  <SelectContent>
                    {(stakeholders as any[]).map((stakeholder: any) => (
                      <SelectItem
                        key={stakeholder.userId}
                        value={stakeholder.userId.toString()}
                      >
                        {stakeholder.user?.fullName || "Unknown User"} 
                        <Badge variant="outline" className="ml-2 text-xs">
                          {stakeholder.user?.role || "User"}
                        </Badge>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Subject</label>
                <Input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Enter message subject"
                  data-testid="input-message-subject"
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Message</label>
                <Textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Enter your message..."
                  className="min-h-[120px]"
                  data-testid="textarea-message-content"
                />
              </div>

              <Button
                onClick={handleSendMessage}
                disabled={sendMessageMutation.isPending || !selectedRecipient || !subject.trim() || !content.trim()}
                className="w-full"
                data-testid="button-send-message"
              >
                <Send className="h-4 w-4 mr-2" />
                {sendMessageMutation.isPending ? "Sending..." : "Send Message"}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}