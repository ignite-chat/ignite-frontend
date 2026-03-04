export const MessageType = {
  DEFAULT: 0,
  RECIPIENT_ADD: 1,
  RECIPIENT_REMOVE: 2,
  CALL: 3,
  CHANNEL_NAME_CHANGE: 4,
  CHANNEL_ICON_CHANGE: 5,
  CHANNEL_PINNED_MESSAGE: 6,
  USER_JOIN: 7,
  GUILD_BOOST: 8,
  GUILD_BOOST_TIER_1: 9,
  GUILD_BOOST_TIER_2: 10,
  GUILD_BOOST_TIER_3: 11,
  CHANNEL_FOLLOW_ADD: 12,
  GUILD_DISCOVERY_DISQUALIFIED: 14,
  GUILD_DISCOVERY_REQUALIFIED: 15,
  GUILD_DISCOVERY_GRACE_PERIOD_INITIAL_WARNING: 16,
  GUILD_DISCOVERY_GRACE_PERIOD_FINAL_WARNING: 17,
  THREAD_CREATED: 18,
  REPLY: 19,
  CHAT_INPUT_COMMAND: 20,
  THREAD_STARTER_MESSAGE: 21,
  GUILD_INVITE_REMINDER: 22,
  CONTEXT_MENU_COMMAND: 23,
  AUTO_MODERATION_ACTION: 24,
  ROLE_SUBSCRIPTION_PURCHASE: 25,
  INTERACTION_PREMIUM_UPSELL: 26,
  STAGE_START: 27,
  STAGE_END: 28,
  STAGE_SPEAKER: 29,
  STAGE_TOPIC: 31,
  GUILD_APPLICATION_PREMIUM_SUBSCRIPTION: 32,
  GUILD_INCIDENT_ALERT_MODE_ENABLED: 36,
  GUILD_INCIDENT_ALERT_MODE_DISABLED: 37,
  GUILD_INCIDENT_REPORT_RAID: 38,
  GUILD_INCIDENT_REPORT_FALSE_ALARM: 39,
  PURCHASE_NOTIFICATION: 44,
  POLL_RESULT: 46,
} as const;

/** Message types that render as normal chat messages */
export const NORMAL_MESSAGE_TYPES = new Set([
  MessageType.DEFAULT,
  MessageType.REPLY,
  MessageType.CHAT_INPUT_COMMAND,
  MessageType.CONTEXT_MENU_COMMAND,
]);

/** Discord's random welcome messages for USER_JOIN (type 7) */
const JOIN_MESSAGES = [
  '{user} joined the party.',
  '{user} is here.',
  'Welcome, {user}. We hope you brought pizza.',
  'A wild {user} appeared.',
  '{user} just landed.',
  '{user} just slid into {server}.',
  '{user} just showed up!',
  'Welcome {user}. Say hi!',
  '{user} hopped into {server}.',
  'Everyone welcome {user}!',
  "Glad you're here, {user}.",
  'Good to see you, {user}.',
  'Yay you made it, {user}!',
];

export function getSystemMessageText(message: any, guildName?: string): string {
  const authorRaw = message.author?.global_name || message.author?.username || 'Unknown';
  const author = `**${authorRaw}**`;
  const server = guildName ? `**${guildName}**` : 'the server';
  const type = message.type;

  switch (type) {
    case MessageType.RECIPIENT_ADD: {
      const target = message.mentions?.[0];
      const targetName = target?.global_name || target?.username || 'someone';
      return `${author} added ${targetName} to the group.`;
    }
    case MessageType.RECIPIENT_REMOVE: {
      const target = message.mentions?.[0];
      const targetName = target?.global_name || target?.username || 'someone';
      return target?.id === message.author?.id
        ? `${author} left the group.`
        : `${author} removed ${targetName} from the group.`;
    }
    case MessageType.CALL:
      return `${author} started a call.`;
    case MessageType.CHANNEL_NAME_CHANGE:
      return `${author} changed the channel name: **${message.content}**`;
    case MessageType.CHANNEL_ICON_CHANGE:
      return `${author} changed the channel icon.`;
    case MessageType.CHANNEL_PINNED_MESSAGE:
      return `${author} pinned a message to this channel.`;
    case MessageType.USER_JOIN: {
      const ts = new Date(message.timestamp).getTime();
      const idx = ts % JOIN_MESSAGES.length;
      return JOIN_MESSAGES[idx].replace('{user}', author).replace('{server}', server);
    }
    case MessageType.GUILD_BOOST: {
      const count = parseInt(message.content, 10);
      return count > 1
        ? `${author} just boosted ${server} **${count}** times!`
        : `${author} just boosted ${server}!`;
    }
    case MessageType.GUILD_BOOST_TIER_1: {
      const count = parseInt(message.content, 10);
      return count > 1
        ? `${author} just boosted ${server} **${count}** times! ${server} has achieved **Level 1!**`
        : `${author} just boosted ${server}! ${server} has achieved **Level 1!**`;
    }
    case MessageType.GUILD_BOOST_TIER_2: {
      const count = parseInt(message.content, 10);
      return count > 1
        ? `${author} just boosted ${server} **${count}** times! ${server} has achieved **Level 2!**`
        : `${author} just boosted ${server}! ${server} has achieved **Level 2!**`;
    }
    case MessageType.GUILD_BOOST_TIER_3: {
      const count = parseInt(message.content, 10);
      return count > 1
        ? `${author} just boosted ${server} **${count}** times! ${server} has achieved **Level 3!**`
        : `${author} just boosted ${server}! ${server} has achieved **Level 3!**`;
    }
    case MessageType.CHANNEL_FOLLOW_ADD:
      return `${author} has added **${message.content}** to this channel.`;
    case MessageType.GUILD_DISCOVERY_DISQUALIFIED:
      return `${server} has been removed from Server Discovery because it no longer passes all the requirements.`;
    case MessageType.GUILD_DISCOVERY_REQUALIFIED:
      return `${server} is eligible for Server Discovery again and has been automatically relisted!`;
    case MessageType.GUILD_DISCOVERY_GRACE_PERIOD_INITIAL_WARNING:
      return `${server} has failed Discovery activity requirements for 1 week.`;
    case MessageType.GUILD_DISCOVERY_GRACE_PERIOD_FINAL_WARNING:
      return `${server} has failed Discovery activity requirements for 3 weeks.`;
    case MessageType.THREAD_CREATED:
      return `${author} started a thread: **${message.content}**`;
    case MessageType.GUILD_INVITE_REMINDER:
      return 'Wondering who to invite? Start by inviting anyone who can hold a conversation.';
    case MessageType.AUTO_MODERATION_ACTION:
      return `AutoMod has blocked a message in #${message.content || 'channel'}.`;
    case MessageType.ROLE_SUBSCRIPTION_PURCHASE:
      return `${author} joined **${message.content || 'a role subscription'}**.`;
    case MessageType.STAGE_START:
      return `${author} started **${message.content}**.`;
    case MessageType.STAGE_END:
      return `${author} ended **${message.content}**.`;
    case MessageType.STAGE_SPEAKER:
      return `${author} is now a speaker.`;
    case MessageType.STAGE_TOPIC:
      return `${author} changed the Stage topic: **${message.content}**`;
    case MessageType.GUILD_APPLICATION_PREMIUM_SUBSCRIPTION:
      return `${author} upgraded **${message.content}** for ${server}!`;
    default:
      return `${author} did something.`;
  }
}
