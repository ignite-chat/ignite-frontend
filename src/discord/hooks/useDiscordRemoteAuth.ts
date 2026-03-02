import { useState, useEffect, useCallback } from 'react';
import { DiscordRemoteAuthService, type RemoteAuthState } from '../services/discord-remote-auth.service';

export function useDiscordRemoteAuth(active: boolean) {
  const [state, setState] = useState<RemoteAuthState>({ status: 'idle' });

  useEffect(() => {
    if (!active) {
      setState({ status: 'idle' });
      return;
    }

    DiscordRemoteAuthService.onStateChange = (newState) => {
      setState(newState);
    };

    DiscordRemoteAuthService.start();

    return () => {
      DiscordRemoteAuthService.stop();
      DiscordRemoteAuthService.onStateChange = null;
    };
  }, [active]);

  const retry = useCallback(() => {
    setState({ status: 'idle' });
    DiscordRemoteAuthService.stop();
    DiscordRemoteAuthService.onStateChange = (newState) => {
      setState(newState);
    };
    DiscordRemoteAuthService.start();
  }, []);

  return { state, retry };
}
