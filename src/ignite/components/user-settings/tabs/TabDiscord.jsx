import { useDiscordPreferencesStore } from '@/discord/store/discord-preferences.store';
import { Switch } from '@/components/ui/switch';

const TabDiscord = () => {
  const showHiddenChannels = useDiscordPreferencesStore((s) => s.showHiddenChannels);
  const setShowHiddenChannels = useDiscordPreferencesStore((s) => s.setShowHiddenChannels);
  const chatFontSize = useDiscordPreferencesStore((s) => s.chatFontSize);
  const setChatFontSize = useDiscordPreferencesStore((s) => s.setChatFontSize);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white">Discord</h2>
        <p className="mt-1 text-sm text-gray-400">Manage Discord integration settings.</p>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between rounded-lg bg-white/5 p-4">
          <div>
            <p className="font-medium text-gray-200">Show Hidden Channels</p>
            <p className="text-sm text-gray-400">
              Display channels you don't have permission to view. You won't be able to read their messages.
            </p>
          </div>
          <Switch
            checked={showHiddenChannels}
            onCheckedChange={setShowHiddenChannels}
          />
        </div>

        <div className="rounded-lg bg-white/5 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-200">Chat Font Size</p>
              <p className="text-sm text-gray-400">
                Adjust the font size for Discord messages ({chatFontSize}px).
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-500">12px</span>
              <input
                type="range"
                min={12}
                max={24}
                value={chatFontSize}
                onChange={(e) => setChatFontSize(Number(e.target.value))}
                className="w-32 accent-[#5865f2]"
              />
              <span className="text-xs text-gray-500">24px</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TabDiscord;
