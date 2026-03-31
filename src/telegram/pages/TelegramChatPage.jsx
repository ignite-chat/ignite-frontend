import { useEffect, useMemo, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTelegramStore } from '../store/telegram.store';
import { useTelegramChatsStore } from '../store/telegram-chats.store';
import { useTelegramUsersStore } from '../store/telegram-users.store';
import { useLastChannelStore } from '@/store/last-channel.store';
import { TelegramService } from '../services/telegram.service';
import TelegramChatLayout from '../layouts/TelegramChatLayout';
import TelegramChatHeader from '../components/TelegramChatHeader';
import TelegramChatMessages from '../components/TelegramChatMessages';
import TelegramChatInput from '../components/TelegramChatInput';
import { getChatDisplayName } from '../utils/helpers';
import PageTitle from '@/ignite/components/PageTitle';

const TelegramChatPage = () => {
  const navigate = useNavigate();
  const { chatId } = useParams();
  const isConnected = useTelegramStore((s) => s.isConnected);
  const isConnecting = useTelegramStore((s) => s.isConnecting);
  const session = useTelegramStore((s) => s.session);
  const { chats } = useTelegramChatsStore();
  const users = useTelegramUsersStore((s) => s.users);

  const activeChat = useMemo(
    () => chats.find((c) => c.id === chatId),
    [chats, chatId],
  );

  // Auto-connect if not connected
  useEffect(() => {
    if (session && !isConnected && !isConnecting) {
      TelegramService.connect();
    }
  }, [session, isConnected, isConnecting]);

  // Redirect if no session
  useEffect(() => {
    if (!session) {
      const hasIgniteToken = !!localStorage.getItem('token');
      navigate(hasIgniteToken ? '/channels/@me' : '/login', { replace: true });
    }
  }, [session, navigate]);

  // Save last visited chat
  useEffect(() => {
    if (chatId) {
      useLastChannelStore.getState().setLastChannel('telegram', chatId);
    }
  }, [chatId]);

  // Redirect to first chat if none selected
  useEffect(() => {
    if (isConnected && chats.length > 0 && !chatId) {
      const lastChatId = useLastChannelStore.getState().getLastChannel('telegram');
      const lastChat = lastChatId && chats.find((c) => c.id === lastChatId);
      if (lastChat) {
        navigate(`/telegram/${lastChatId}`, { replace: true });
      } else {
        navigate(`/telegram/${chats[0].id}`, { replace: true });
      }
    }
  }, [isConnected, chats, chatId, navigate]);

  const [messageSentCount, setMessageSentCount] = useState(0);
  const onMessageSent = useCallback(() => setMessageSentCount((c) => c + 1), []);

  const displayName = activeChat ? getChatDisplayName(activeChat, users) : 'Telegram';

  return (
    <TelegramChatLayout>
      <PageTitle title={displayName} />
      {activeChat ? (
        <div className="flex h-full flex-col">
          <TelegramChatHeader chat={activeChat} />
          <TelegramChatMessages chatId={chatId} chatType={activeChat.type} messageSentCount={messageSentCount} />
          {activeChat.type !== 'channel' && (
            <TelegramChatInput
              chatId={chatId}
              chatName={displayName}
              onMessageSent={onMessageSent}
            />
          )}
        </div>
      ) : (
        <div className="flex h-full items-center justify-center text-gray-500">
          {!isConnected ? (
            <div className="flex flex-col items-center gap-2">
              <div className="size-8 animate-spin rounded-full border-2 border-solid border-[#2AABEE] border-t-transparent" />
              <p className="text-sm">Connecting to Telegram...</p>
            </div>
          ) : (
            <p className="text-sm">Select a chat from the sidebar</p>
          )}
        </div>
      )}
    </TelegramChatLayout>
  );
};

export default TelegramChatPage;
