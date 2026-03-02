import { useState, useEffect, useCallback, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useDiscordStore } from '../store/discord.store';
import { useDiscordRemoteAuth } from '../hooks/useDiscordRemoteAuth';
import { DiscordService } from '../services/discord.service';

function QrAuthContent({
  active,
  onAuthenticated,
}: {
  active: boolean;
  onAuthenticated: (token: string) => void;
}) {
  const { state, retry } = useDiscordRemoteAuth(active);
  const handledRef = useRef(false);

  useEffect(() => {
    if (!active) handledRef.current = false;
  }, [active]);

  useEffect(() => {
    if (state.status === 'authenticated' && !handledRef.current) {
      handledRef.current = true;
      onAuthenticated(state.token);
    }
  }, [state, onAuthenticated]);

  if (state.status === 'idle' || state.status === 'connecting') {
    return (
      <div className="flex flex-col items-center gap-3 py-4">
        <Skeleton className="size-[200px] rounded-lg" />
        <p className="text-sm text-gray-400">Generating QR code...</p>
      </div>
    );
  }

  if (state.status === 'qr_ready') {
    return (
      <div className="flex flex-col items-center gap-3 py-4">
        <div className="rounded-lg bg-white p-3">
          <QRCodeSVG value={state.qrUrl} size={176} />
        </div>
        <p className="text-sm text-gray-400">
          Scan with the Discord mobile app
        </p>
      </div>
    );
  }

  if (state.status === 'scanned') {
    const avatarUrl = DiscordService.getUserAvatarUrl(
      state.user.userId,
      state.user.avatarHash === '0' ? null : state.user.avatarHash,
    );
    return (
      <div className="flex flex-col items-center gap-3 py-6">
        <img
          src={avatarUrl}
          alt={state.user.username}
          className="size-16 rounded-full"
        />
        <p className="text-sm font-medium text-white">{state.user.username}</p>
        <p className="text-sm text-gray-400">Confirm login on your phone</p>
        <div className="mt-1 size-5 animate-spin rounded-full border-2 border-solid border-[#5865f2] border-t-transparent" />
      </div>
    );
  }

  if (state.status === 'authenticated') {
    return (
      <div className="flex flex-col items-center gap-3 py-6">
        <p className="text-sm font-medium text-green-500">Connected!</p>
      </div>
    );
  }

  if (state.status === 'timeout') {
    return (
      <div className="flex flex-col items-center gap-3 py-6">
        <p className="text-sm text-gray-400">QR code expired</p>
        <Button variant="outline" onClick={retry}>
          Generate New Code
        </Button>
      </div>
    );
  }

  if (state.status === 'cancelled') {
    return (
      <div className="flex flex-col items-center gap-3 py-6">
        <p className="text-sm text-gray-400">Login was cancelled</p>
        <Button variant="outline" onClick={retry}>
          Try Again
        </Button>
      </div>
    );
  }

  // error
  return (
    <div className="flex flex-col items-center gap-3 py-6">
      <p className="text-sm text-destructive">{state.message}</p>
      <Button variant="outline" onClick={retry}>
        Try Again
      </Button>
    </div>
  );
}

function TokenAuthContent({
  onAuthenticated,
  onCancel,
}: {
  onAuthenticated: (token: string) => void;
  onCancel: () => void;
}) {
  const [tokenInput, setTokenInput] = useState('');

  const handleSubmit = () => {
    if (tokenInput.trim()) {
      onAuthenticated(tokenInput.trim());
      setTokenInput('');
    }
  };

  return (
    <div className="flex flex-col gap-3 py-2">
      <Input
        type="password"
        name="ignite-discord-token"
        autoComplete="off"
        placeholder="Discord token"
        value={tokenInput}
        onChange={(e) => setTokenInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleSubmit();
        }}
      />
      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button disabled={!tokenInput.trim()} onClick={handleSubmit}>
          Connect
        </Button>
      </DialogFooter>
    </div>
  );
}

export default function ConnectDiscordDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [activeTab, setActiveTab] = useState('qr');

  const handleAuthenticated = useCallback((token: string) => {
    useDiscordStore.getState().setToken(token);
    onOpenChange(false);
  }, [onOpenChange]);

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) setActiveTab('qr');
      }}
    >
      <DialogContent className="!max-w-sm">
        <DialogHeader>
          <DialogTitle>Connect Discord</DialogTitle>
          <DialogDescription>
            Scan the QR code with your Discord mobile app, or enter your token.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full">
            <TabsTrigger value="qr">QR Code</TabsTrigger>
            <TabsTrigger value="token">Token</TabsTrigger>
          </TabsList>

          <TabsContent value="qr">
            <QrAuthContent
              active={open && activeTab === 'qr'}
              onAuthenticated={handleAuthenticated}
            />
          </TabsContent>

          <TabsContent value="token">
            <TokenAuthContent
              onAuthenticated={handleAuthenticated}
              onCancel={() => onOpenChange(false)}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
