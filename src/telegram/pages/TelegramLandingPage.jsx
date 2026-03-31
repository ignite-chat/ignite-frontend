import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTelegramStore } from '../store/telegram.store';
import { useTelegramChatsStore } from '../store/telegram-chats.store';
import { TelegramService } from '../services/telegram.service';
import PageTitle from '@/ignite/components/PageTitle';

const TelegramLandingPage = () => {
  const navigate = useNavigate();
  const session = useTelegramStore((s) => s.session);
  const isConnected = useTelegramStore((s) => s.isConnected);
  const isConnecting = useTelegramStore((s) => s.isConnecting);
  const { chats } = useTelegramChatsStore();

  // Auto-connect if session exists
  useEffect(() => {
    if (session && !isConnected && !isConnecting) {
      TelegramService.connect();
    }
  }, [session, isConnected, isConnecting]);

  // Redirect to first chat once loaded
  useEffect(() => {
    if (isConnected && chats.length > 0) {
      navigate(`/telegram/${chats[0].id}`, { replace: true });
    }
  }, [isConnected, chats, navigate]);

  // No session
  if (!session) {
    return (
      <div className="flex h-full items-center justify-center text-gray-500">
        <p className="text-sm">No Telegram account connected.</p>
      </div>
    );
  }

  return (
    <>
      <PageTitle title="Telegram" />
      <div className="flex h-full items-center justify-center text-gray-500">
        <div className="flex flex-col items-center gap-2">
          <div className="size-8 animate-spin rounded-full border-2 border-solid border-[#2AABEE] border-t-transparent" />
          <p className="text-sm">Connecting to Telegram...</p>
        </div>
      </div>
    </>
  );
};

export default TelegramLandingPage;
