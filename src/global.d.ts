declare module '*.wav' {
  const src: string;
  export default src;
}

interface Window {
  IgniteNative?: {
    isRenderer: boolean;
    isElectron: boolean;
    minimize: () => Promise<void>;
    maximize: () => Promise<void>;
    close: () => Promise<void>;
    getDesktopSources: () => Promise<any[]>;
    openExternal: (url: string) => Promise<void>;
    setBadgeCount: (count: number) => Promise<void>;
    showNotification: (opts: { title: string; body: string }) => Promise<void>;
  };
  Echo: any;
}
