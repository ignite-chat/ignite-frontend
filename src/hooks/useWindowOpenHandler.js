import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { openExternalLinkModal } from '@/components/modals/ExternalLinkModal';
import { openAttachmentViewModal } from '@/components/modals/AttachmentViewModal';

/**
 * Handles intercepted window.open calls from Electron.
 * Discord URLs are routed in-app, attachments open in a viewer, everything else shows the external link modal.
 */
export const useWindowOpenHandler = () => {
  const navigate = useNavigate();

  useEffect(() => {
    if (!window.IgniteNative?.onWindowOpen) return;

    const cleanup = window.IgniteNative.onWindowOpen((url) => {
      const handled = tryHandleInApp(url, navigate);
      if (!handled) {
        if (isAttachmentUrl(url)) {
          openAttachmentViewModal(url);
        } else {
          openExternalLinkModal(url);
        }
      }
    });

    return cleanup;
  }, [navigate]);
};

const SNOWFLAKE_RE = /^\d{17,20}$/;
const IMAGE_EXT_RE = /\.(jpg|jpeg|png|gif|webp|avif|svg|bmp|ico)(\?|$)/i;

const ATTACHMENT_HOSTS = [
  'cdn.discordapp.com',
  'media.discordapp.net',
  'cdn.ignite-chat.com',
];

function isAttachmentUrl(url) {
  try {
    const parsed = new URL(url);
    return ATTACHMENT_HOSTS.includes(parsed.hostname) && IMAGE_EXT_RE.test(parsed.pathname);
  } catch {
    return false;
  }
}

function tryHandleInApp(url, navigate) {
  try {
    const parsed = new URL(url);

    // Discord channel URLs -> navigate to our Discord client
    if (
      (parsed.hostname === 'discord.com' || parsed.hostname === 'www.discord.com') &&
      parsed.pathname.startsWith('/channels/')
    ) {
      const segments = parsed.pathname.split('/').filter(Boolean);
      // segments: ["channels", guildId, channelId?, ...]
      if (segments.length >= 2) {
        const guildId = segments[1];
        const channelId = segments[2];

        if (guildId === '@me') {
          navigate(channelId ? `/channels/@me/${channelId}` : '/channels/@me');
          return true;
        }

        // Only navigate if IDs are valid snowflakes (not "guild-settings" etc.)
        if (SNOWFLAKE_RE.test(guildId) && (!channelId || SNOWFLAKE_RE.test(channelId))) {
          navigate(channelId ? `/discord/${guildId}/${channelId}` : `/discord/${guildId}`);
          return true;
        }
      }
    }
  } catch {
    // invalid URL, fall through to modal
  }

  return false;
}
