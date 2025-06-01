import { useState, useCallback } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { nanoid } from "nanoid";

interface Message {
  id: string;
  conversationId: string;
  role: "user" | "assistant" | "system";
  content: string;
  metadata?: any;
  createdAt: string;
}

interface Conversation {
  id: string;
  sessionId: string;
  language: string;
  status: string;
  userProfile?: any;
  createdAt: string;
}

export function useChat() {
  const [conversationId, setConversationId] = useState<string>("");
  const [sessionId] = useState(() => nanoid());
  const [isInitialized, setIsInitialized] = useState(false);

  // Fetch messages for current conversation
  const { data: messages = [], refetch: refetchMessages } = useQuery({
    queryKey: ["/api/chat", conversationId, "messages"],
    enabled: !!conversationId,
    refetchInterval: false,
  });

  // Start conversation mutation
  const startConversationMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/chat/start", {
        sessionId,
        language: "nl",
      });
      return response.json() as Promise<Conversation>;
    },
    onSuccess: (conversation) => {
      setConversationId(conversation.id);
      setIsInitialized(true);
    },
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async ({ message, userProfile }: { message: string; userProfile?: any }) => {
      if (!conversationId) {
        throw new Error("No conversation started");
      }

      const response = await apiRequest("POST", `/api/chat/${conversationId}/message`, {
        content: message,
        userProfile,
      });
      return response.json();
    },
    onSuccess: () => {
      refetchMessages();
    },
  });

  const startConversation = useCallback(() => {
    if (!isInitialized && !startConversationMutation.isPending) {
      startConversationMutation.mutate();
    }
  }, [isInitialized, startConversationMutation]);

  const sendMessage = useCallback(
    (message: string, userProfile?: any) => {
      if (conversationId) {
        sendMessageMutation.mutate({ message, userProfile });
      }
    },
    [conversationId, sendMessageMutation]
  );

  return {
    conversationId,
    sessionId,
    messages,
    isLoading: sendMessageMutation.isPending,
    isInitialized,
    startConversation,
    sendMessage,
    refetchMessages,
  };
}
