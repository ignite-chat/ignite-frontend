declare module '*.wav' {
  const src: string;
  export default src;
}

declare module '*.mp3' {
  const src: string;
  export default src;
}

interface Window {
  IgniteNative?: {
    isRenderer: boolean;
    isElectron: boolean;
    electronVersion: string;
    getAppVersion: () => Promise<string>;
    minimize: () => Promise<void>;
    maximize: () => Promise<void>;
    close: () => Promise<void>;
    getDesktopSources: () => Promise<any[]>;
    openExternal: (url: string) => Promise<void>;
    setBadgeCount: (count: number) => Promise<void>;
    showNotification: (opts: { title: string; body: string }) => Promise<void>;
    getDiscordLocalTokens: () => Promise<Array<{ source: string; token: string }>>;
    solveDiscordCaptcha: (challenge: { sitekey: string; rqdata?: string }) => Promise<string>;
    // Message log file storage (Electron only)
    saveMessageLogAttachment?: (channelId: string, messageId: string, filename: string, data: Uint8Array) => Promise<string>;
    loadMessageLogAttachment?: (channelId: string, messageId: string, filename: string) => Promise<Buffer | null>;
    saveMessageLogMessages?: (channelId: string, jsonData: string) => Promise<string>;
    loadMessageLogMessages?: (channelId: string) => Promise<string | null>;
    getMessageLogBasePath?: () => Promise<string>;
    onWindowOpen: (callback: (url: string) => void) => () => void;
  };
  Echo: any;
}
