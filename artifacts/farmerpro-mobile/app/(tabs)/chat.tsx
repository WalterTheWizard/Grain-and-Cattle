import { Feather } from "@expo/vector-icons";
import {
  useListMessages,
  useCreateMessage,
  getListMessagesQueryKey,
} from "@workspace/api-client-react";
import * as Haptics from "expo-haptics";
import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQueryClient } from "@tanstack/react-query";

import { useAuth } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/useColors";

interface Message {
  id: number;
  senderName: string;
  senderRole: string;
  content: string;
  createdAt: string;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function MessageBubble({ message, isMine }: { message: Message; isMine: boolean }) {
  const colors = useColors();
  return (
    <View style={{ alignItems: isMine ? "flex-end" : "flex-start", marginBottom: 12 }}>
      <View style={{ flexDirection: "row", gap: 6, marginBottom: 3, paddingHorizontal: 4 }}>
        <Text style={styles.senderName(colors)}>{message.senderName}</Text>
        <Text style={styles.timestamp(colors)}>{formatTime(message.createdAt)}</Text>
      </View>
      <View
        style={[
          styles.bubble(colors),
          { backgroundColor: isMine ? colors.primary : colors.muted, maxWidth: "80%" },
        ]}
      >
        <Text style={{ color: isMine ? "#fff" : colors.foreground, fontSize: 14, fontFamily: "Inter_400Regular" }}>
          {message.content}
        </Text>
      </View>
    </View>
  );
}

export default function ChatScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { me } = useAuth();
  const [content, setContent] = useState("");
  const listRef = useRef<FlatList>(null);

  const { data: messages = [], isLoading } = useListMessages({
    query: { queryKey: getListMessagesQueryKey(), refetchInterval: 5_000 },
  });

  const createMessage = useCreateMessage({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListMessagesQueryKey() });
        setContent("");
        Haptics.selectionAsync();
        setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
      },
    },
  });

  const myName = me?.role === "owner" ? "Owner" : me?.employeeName;

  function handleSend() {
    const trimmed = content.trim();
    if (!trimmed) return;
    createMessage.mutate({ data: { content: trimmed } });
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      <FlatList
        ref={listRef}
        data={messages as Message[]}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <MessageBubble message={item} isMine={item.senderName === myName} />
        )}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: Platform.OS === "web" ? 67 + 16 : 16,
          paddingBottom: 16,
          flexGrow: 1,
        }}
        ListEmptyComponent={
          <View style={{ alignItems: "center", paddingTop: 60, gap: 12 }}>
            {isLoading ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <>
                <Feather name="message-circle" size={40} color={colors.border} />
                <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 14 }}>
                  No messages yet. Say hello!
                </Text>
              </>
            )}
          </View>
        }
        showsVerticalScrollIndicator={false}
      />

      <View
        style={[
          styles.inputBar(colors),
          { paddingBottom: insets.bottom + 12 },
        ]}
      >
        <TextInput
          style={styles.input(colors)}
          value={content}
          onChangeText={setContent}
          placeholder="Type a message..."
          placeholderTextColor={colors.mutedForeground}
          multiline
        />
        <Pressable
          onPress={handleSend}
          disabled={!content.trim() || createMessage.isPending}
          style={[
            styles.sendBtn(colors),
            (!content.trim() || createMessage.isPending) && { opacity: 0.5 },
          ]}
        >
          {createMessage.isPending ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Feather name="send" size={16} color="#fff" />
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = {
  senderName: (c: ReturnType<typeof useColors>) =>
    StyleSheet.create({ t: { fontSize: 11, fontFamily: "Inter_500Medium", color: c.foreground } }).t,
  timestamp: (c: ReturnType<typeof useColors>) =>
    StyleSheet.create({ t: { fontSize: 10, fontFamily: "Inter_400Regular", color: c.mutedForeground } }).t,
  bubble: (c: ReturnType<typeof useColors>) =>
    StyleSheet.create({ b: { borderRadius: c.radius, paddingHorizontal: 12, paddingVertical: 8 } }).b,
  inputBar: (c: ReturnType<typeof useColors>) =>
    StyleSheet.create({
      bar: {
        flexDirection: "row" as const,
        alignItems: "flex-end" as const,
        gap: 8,
        paddingHorizontal: 16,
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: c.border,
        backgroundColor: c.background,
      },
    }).bar,
  input: (c: ReturnType<typeof useColors>) =>
    StyleSheet.create({
      i: {
        flex: 1,
        backgroundColor: c.card,
        borderRadius: c.radius,
        borderWidth: 1,
        borderColor: c.border,
        paddingHorizontal: 14,
        paddingVertical: 10,
        color: c.foreground,
        fontFamily: "Inter_400Regular",
        fontSize: 14,
        maxHeight: 100,
      },
    }).i,
  sendBtn: (c: ReturnType<typeof useColors>) =>
    StyleSheet.create({
      b: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: c.primary,
        alignItems: "center" as const,
        justifyContent: "center" as const,
      },
    }).b,
};
