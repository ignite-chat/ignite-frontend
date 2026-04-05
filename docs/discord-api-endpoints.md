# Discord API v9 — Endpoint Reference

Base URL: `https://discord.com/api/v9`

Extracted from Discord client source. Endpoints marked **[USED]** are already implemented in `discord-api.service.ts`.

---

## Table of Contents

1. [Authentication](#1-authentication)
2. [Users](#2-users)
3. [Relationships (Friends)](#3-relationships-friends)
4. [User Settings](#4-user-settings)
5. [User Channels (DMs)](#5-user-channels-dms)
6. [Guilds](#6-guilds)
7. [Guild Members](#7-guild-members)
8. [Guild Roles](#8-guild-roles)
9. [Guild Bans](#9-guild-bans)
10. [Guild Integrations & Applications](#10-guild-integrations--applications)
11. [Guild Onboarding](#11-guild-onboarding)
12. [Guild Join Requests](#12-guild-join-requests)
13. [Guild Templates](#13-guild-templates)
14. [Guild Analytics](#14-guild-analytics)
15. [Guild Discovery](#15-guild-discovery)
16. [Guild Welcome & Home](#16-guild-welcome--home)
17. [Guild Emojis](#17-guild-emojis)
18. [Guild Assets](#18-guild-assets)
19. [Guild Feed](#19-guild-feed)
20. [Guild Game Servers](#20-guild-game-servers)
21. [Guild Powerups](#21-guild-powerups)
22. [Channels](#22-channels)
23. [Messages](#23-messages)
24. [Reactions](#24-reactions)
25. [Threads & Forums](#25-threads--forums)
26. [Pins](#26-pins)
27. [Typing](#27-typing)
28. [Invites](#28-invites)
29. [Webhooks](#29-webhooks)
30. [Permissions](#30-permissions)
31. [Voice](#31-voice)
32. [Search](#32-search)
33. [Read States / Ack](#33-read-states--ack)
34. [MFA](#34-mfa)
35. [Remote Auth (QR Login)](#35-remote-auth-qr-login)
36. [OAuth2](#36-oauth2)
37. [Connections (Linked Accounts)](#37-connections-linked-accounts)
38. [Notes](#38-notes)
39. [Mentions](#39-mentions)
40. [Interactions](#40-interactions)
41. [Applications](#41-applications)
42. [Store & Billing](#42-store--billing)
43. [Gifts & Promotions](#43-gifts--promotions)
44. [Collectibles & Shop](#44-collectibles--shop)
45. [Subscriptions & Boosts](#45-subscriptions--boosts)
46. [Entitlements](#46-entitlements)
47. [GIFs](#47-gifs)
48. [AI Features](#48-ai-features)
49. [Gravity (Recommendations)](#49-gravity-recommendations)
50. [Captcha & Age Verification](#50-captcha--age-verification)
51. [Tracking & Metrics](#51-tracking--metrics)
52. [Misc](#52-misc)
53. [Channel Summaries](#53-channel-summaries)
54. [Channel Store Listings](#54-channel-store-listings)
55. [Phone Verification](#55-phone-verification)
56. [User Devices](#56-user-devices)
57. [Email Notifications](#57-email-notifications)
58. [User Activity](#58-user-activity)
59. [User Library](#59-user-library)
60. [Application Branches & Builds](#60-application-branches--builds)
61. [Application External Assets](#61-application-external-assets)
62. [Application Disclosures](#62-application-disclosures)
63. [Store Listings & Directory](#63-store-listings--directory)
64. [Storefront (Partner SDK)](#64-storefront-partner-sdk)
65. [Message Logging](#65-message-logging)
66. [Billing (Extended)](#66-billing-extended)
67. [Orders](#67-orders)
68. [Premium Group (Family Plan)](#68-premium-group-family-plan)
69. [User Trial & Offers](#69-user-trial--offers)
70. [Apple & Google Billing](#70-apple--google-billing)
71. [Gifts (Extended)](#71-gifts-extended)
72. [Collectibles (Extended)](#72-collectibles-extended)
73. [Wishlists](#73-wishlists)
74. [CMS Layouts & Templates](#74-cms-layouts--templates)
75. [Guild Roles (Extended)](#75-guild-roles-extended)
76. [Guild Onboarding (Extended)](#76-guild-onboarding-extended)
77. [Guild Join Requests (Extended)](#77-guild-join-requests-extended)
78. [Channel Followers & Stats](#78-channel-followers--stats)
79. [Channel Safety](#79-channel-safety)
80. [Channel Recipient Batch](#80-channel-recipient-batch)
81. [Forum Tags (Extended)](#81-forum-tags-extended)
82. [Thread Members (Extended)](#82-thread-members-extended)
83. [Invite Friend Members](#83-invite-friend-members)
84. [User Friend Invites](#84-user-friend-invites)
85. [Tutorial Indicators](#85-tutorial-indicators)
86. [Integrations (Global)](#86-integrations-global)
87. [User Unclaimed Games](#87-user-unclaimed-games)
88. [User Custom Themes](#88-user-custom-themes)
89. [Platform Application & Roblox](#89-platform-application--roblox)
90. [User Meaningfully Online](#90-user-meaningfully-online)
91. [User Pomelo (Username)](#91-user-pomelo-username)
92. [Quests](#92-quests)
93. [Account Revert](#93-account-revert)
94. [User Program Rewards](#94-user-program-rewards)
95. [Partner Requirements](#95-partner-requirements)
96. [SSO](#96-sso)
97. [WebAuthn (Extended)](#97-webauthn-extended)
98. [MFA SMS](#98-mfa-sms)
99. [TOTP (Extended)](#99-totp-extended)
100. [OAuth2 (Extended)](#100-oauth2-extended)
101. [Connections (Extended)](#101-connections-extended)
102. [Xbox](#102-xbox)
103. [Billing Popup Bridge](#103-billing-popup-bridge)
104. [Changelogs](#104-changelogs)
105. [Reports (Extended)](#105-reports-extended)
106. [Data Harvest (GDPR)](#106-data-harvest-gdpr)
107. [Storefront Interactions](#107-storefront-interactions)
108. [Generated Pools](#108-generated-pools)
109. [Gravity (Extended)](#109-gravity-extended)
110. [Age Verification (Extended)](#110-age-verification-extended)
111. [Debug Logs](#111-debug-logs)
112. [Metrics (Extended)](#112-metrics-extended)
113. [Networking](#113-networking)
114. [Guild Pincode](#114-guild-pincode)
115. [Guild MFA](#115-guild-mfa)
116. [Guild Prune](#116-guild-prune)
117. [DM Settings Upsell](#117-dm-settings-upsell)
118. [Scheduled Events](#118-scheduled-events)
119. [Unverified Applications](#119-unverified-applications)
120. [Game Notification Settings](#120-game-notification-settings)
121. [User Consent & Agreements](#121-user-consent--agreements)

---

## 1. Authentication

### `POST /auth/login`

Login with credentials.

**Request:**
```json
{
  "login": "email@example.com",
  "password": "password",
  "undelete": false,
  "login_source": null,
  "gift_code_sku_id": null
}
```

**Response `200`:**
```json
{
  "user_id": "123456789",
  "token": "user_token_here",
  "user_settings": { "locale": "en-US", "theme": "dark" }
}
```

**Response `400` (MFA required):**
```json
{
  "mfa": true,
  "sms": false,
  "ticket": "mfa_ticket_string",
  "backup": true,
  "totp": true,
  "webauthn": null
}
```

**Response `400` (Captcha required):**
```json
{
  "captcha_key": ["captcha-required"],
  "captcha_sitekey": "sitekey",
  "captcha_service": "hcaptcha",
  "captcha_rqdata": "...",
  "captcha_rqtoken": "..."
}
```

---

### `POST /auth/mfa/{type}` **[USED indirectly via gateway]**

Submit MFA verification. `{type}` can be `totp`, `sms`, or `backup`.

**Request:**
```json
{
  "code": "123456",
  "ticket": "mfa_ticket_string",
  "login_source": null,
  "gift_code_sku_id": null
}
```

**Response `200`:**
```json
{
  "token": "user_token_here",
  "user_id": "123456789"
}
```

---

### `POST /auth/mfa/sms/send`

Send an SMS MFA code.

**Request:**
```json
{
  "ticket": "mfa_ticket_string"
}
```

**Response `204`:** No content.

---

### `POST /auth/logout` **[USED]**

Invalidate the current token.

**Request:**
```json
{
  "provider": null,
  "voip_provider": null
}
```

**Response `204`:** No content.

---

### `POST /auth/register`

Register a new account.

**Request:**
```json
{
  "username": "newuser",
  "email": "email@example.com",
  "password": "password",
  "date_of_birth": "2000-01-01",
  "consent": true,
  "captcha_key": "optional_captcha_solution",
  "gift_code_sku_id": null,
  "invite": null
}
```

**Response `200`:**
```json
{
  "token": "user_token_here"
}
```

---

### `POST /auth/forgot`

Request a password reset email.

**Request:**
```json
{
  "login": "email@example.com"
}
```

**Response `204`:** No content.

---

### `POST /auth/reset`

Reset password with token from email.

**Request:**
```json
{
  "password": "new_password",
  "token": "reset_token"
}
```

**Response `200`:**
```json
{
  "token": "new_user_token"
}
```

---

### `POST /auth/verify`

Verify email address.

**Request:**
```json
{
  "token": "verification_token",
  "captcha_key": null
}
```

**Response `200`:**
```json
{
  "token": "new_user_token"
}
```

---

### `POST /auth/verify/resend`

Resend verification email.

**Request:** Empty body `{}`.

**Response `204`:** No content.

---

### `POST /auth/authorize-ip`

Authorize a new IP address.

**Request:**
```json
{
  "token": "ip_auth_token"
}
```

**Response `204`:** No content.

---

### `POST /auth/handoff`

Create a handoff token for cross-domain auth.

**Request:**
```json
{
  "key": "handoff_key"
}
```

**Response `200`:**
```json
{
  "handoff_token": "token_here"
}
```

---

### `POST /auth/handoff/exchange`

Exchange a handoff token for a session token.

**Request:**
```json
{
  "handoff_token": "token_here"
}
```

**Response `200`:**
```json
{
  "token": "user_token_here"
}
```

---

### `POST /auth/one-time-login`

One-time login link.

**Request:**
```json
{
  "token": "one_time_token"
}
```

**Response `200`:**
```json
{
  "token": "user_token_here"
}
```

---

### `POST /auth/password/validate`

Check password strength.

**Request:**
```json
{
  "password": "candidate_password"
}
```

**Response `200`:**
```json
{
  "password_strength": 3
}
```

---

### `GET /auth/location-metadata`

Get location-based metadata for auth (country, etc.).

**Response `200`:**
```json
{
  "consent_required": false,
  "country_code": "US",
  "promotional_email_opt_in": { "required": true, "pre_checked": false }
}
```

---

## 2. Users

### `GET /users/@me` **[USED]**

Get the current authenticated user.

**Response `200`:**
```json
{
  "id": "123456789",
  "username": "user",
  "discriminator": "0",
  "global_name": "Display Name",
  "avatar": "avatar_hash",
  "avatar_decoration_data": {
    "sku_id": "123",
    "expires_at": null,
    "asset": "decoration_hash"
  },
  "bot": false,
  "public_flags": 0,
  "email": "email@example.com",
  "verified": true,
  "phone": "+1234567890",
  "mfa_enabled": true,
  "premium_type": 2,
  "locale": "en-US",
  "nsfw_allowed": true
}
```

---

### `PATCH /users/@me`

Modify current user (username, avatar, etc.).

**Request:**
```json
{
  "username": "new_username",
  "avatar": "data:image/png;base64,...",
  "password": "current_password"
}
```

**Response `200`:** Updated `DiscordUser` object.

---

### `GET /users/{userId}` 

Get a user by ID (limited info for non-friends).

**Response `200`:**
```json
{
  "id": "123456789",
  "username": "user",
  "discriminator": "0",
  "global_name": "Display Name",
  "avatar": "avatar_hash",
  "public_flags": 0,
  "avatar_decoration_data": null
}
```

---

### `GET /users/{userId}/profile` **[USED]**

Get a user's full profile (banner, bio, mutual guilds/friends, connected accounts).

**Query params:** `with_mutual_guilds=true`, `with_mutual_friends_count=true`, `with_mutual_friends=true`, `guild_id=optional`

**Response `200`:**
```json
{
  "user": { "id": "...", "username": "...", "avatar": "...", "..." : "..." },
  "user_profile": {
    "bio": "About me text",
    "accent_color": 16711680,
    "banner": "banner_hash",
    "theme_colors": [16711680, 255],
    "pronouns": "they/them"
  },
  "guild_member_profile": {
    "guild_id": "guild_id",
    "bio": "Server-specific bio",
    "banner": "server_banner_hash",
    "accent_color": null,
    "theme_colors": null,
    "pronouns": ""
  },
  "mutual_guilds": [{ "id": "guild_id", "nick": "nickname" }],
  "mutual_friends": [{ "id": "...", "username": "..." }],
  "mutual_friends_count": 5,
  "connected_accounts": [
    { "type": "spotify", "id": "...", "name": "...", "verified": true }
  ],
  "premium_since": "2020-01-01T00:00:00.000Z",
  "premium_type": 2,
  "premium_guild_since": "2020-06-01T00:00:00.000Z"
}
```

---

### `GET /users/{userId}/application-identities` **[USED]**

Get linked game profiles for a user.

**Query params:** `with_profiles=true`

**Response `200`:**
```json
{
  "identities": [
    {
      "application_id": "app_id",
      "provider_issued_user_id": "ext_id",
      "profile": {
        "username": "GameUsername",
        "metadata": "{}",
        "data": {},
        "data_trusted": true,
        "connection_visible": true
      },
      "profiles": []
    }
  ]
}
```

---

### `POST /users/@me/delete`

Delete account.

**Request:**
```json
{
  "password": "current_password"
}
```

**Response `204`:** No content.

---

### `POST /users/@me/disable`

Disable account.

**Request:**
```json
{
  "password": "current_password"
}
```

**Response `204`:** No content.

---

### `GET /users/@me/avatars`

Get recent avatar history.

**Response `200`:** Array of avatar objects.

---

### `DELETE /users/@me/avatars/{avatarId}`

Delete a recent avatar.

**Response `204`:** No content.

---

## 3. Relationships (Friends)

### `GET /users/@me/relationships`

Get all relationships (friends, blocked, pending incoming/outgoing).

**Response `200`:**
```json
[
  {
    "id": "user_id",
    "user_id": "user_id",
    "type": 1,
    "nickname": null,
    "since": "2020-01-01T00:00:00.000Z",
    "is_spam_request": false,
    "user_ignored": false
  }
]
```

**Relationship types:** `1` = Friend, `2` = Blocked, `3` = Incoming request, `4` = Outgoing request

---

### `PUT /users/@me/relationships/{userId}` **[USED]**

Add friend, accept request, or block user.

**Request (friend request):**
```json
{ "type": 1 }
```

**Request (accept incoming):**
```json
{}
```

**Request (block):**
```json
{ "type": 2 }
```

**Response `204`:** No content.

---

### `DELETE /users/@me/relationships/{userId}` **[USED]**

Remove friend, decline request, cancel outgoing request, or unblock.

**Response `204`:** No content.

---

### `POST /users/@me/relationships` **[USED]**

Send friend request by username.

**Request:**
```json
{
  "username": "user#0000"
}
```

**Response `204`:** No content.

---

### `POST /users/@me/relationships/bulk`

Bulk relationship operations.

**Request:**
```json
{
  "user_ids": ["id1", "id2"],
  "type": 1
}
```

**Response `204`:** No content.

---

### `GET /friend-suggestions`

Get friend suggestions (from connected accounts, contacts).

**Response `200`:** Array of user suggestion objects.

---

### `DELETE /friend-suggestions/{userId}`

Dismiss a friend suggestion.

**Response `204`:** No content.

---

### `POST /friend-finder/find-friends`

Find friends from phone contacts.

**Request:**
```json
{
  "phone_numbers": ["+1234567890"]
}
```

**Response `200`:** Array of matched users.

---

## 4. User Settings

### `GET /users/@me/settings`

Get user settings (locale, theme, status, etc.).

**Response `200`:**
```json
{
  "locale": "en-US",
  "theme": "dark",
  "status": "online",
  "custom_status": { "text": "Playing", "expires_at": null, "emoji_id": null, "emoji_name": null },
  "inline_embed_media": true,
  "inline_attachment_media": true,
  "render_embeds": true,
  "message_display_compact": false,
  "developer_mode": true,
  "guild_positions": ["guild_id_1", "guild_id_2"],
  "guild_folders": [{ "guild_ids": ["..."], "id": 1, "name": "Folder", "color": null }],
  "restricted_guilds": [],
  "animate_emoji": true,
  "animate_stickers": 0,
  "enable_tts_command": true,
  "explicit_content_filter": 1
}
```

---

### `PATCH /users/@me/settings` **[USED]**

Update user settings.

**Request (channel overrides example):**
```json
{
  "channel_overrides": {
    "channel_id": {
      "muted": true,
      "message_notifications": 3
    }
  }
}
```

**Response `200`:** Updated settings object.

---

### `GET /users/@me/settings-proto/{type}`

Get settings protobuf. Type `1` = PreloadedUserSettings, `2` = FrecencyUserSettings.

**Response `200`:**
```json
{
  "settings": "base64_encoded_protobuf"
}
```

---

### `PATCH /users/@me/settings-proto/1` **[USED]**

Update settings proto (guild folder ordering, status, etc.).

**Request:**
```json
{
  "settings": "base64_encoded_protobuf"
}
```

**Response `200`:**
```json
{
  "settings": "updated_base64_protobuf"
}
```

---

### `PATCH /users/@me/guilds/settings` **[USED]**

Bulk update guild notification settings.

**Request:**
```json
{
  "guilds": {
    "guild_id": {
      "muted": true,
      "message_notifications": 1,
      "suppress_everyone": true,
      "suppress_roles": false,
      "mute_config": { "selected_time_window": -1, "end_time": null },
      "channel_overrides": {}
    }
  }
}
```

**Response `200`:**
```json
{
  "entries": { "guild_id": { "...": "..." } },
  "partial": false,
  "version": 12345
}
```

---

### `PATCH /users/@me/guilds/{guildId}/settings`

Update single guild notification settings.

**Request:** Same as individual guild entry above.

**Response `200`:** Updated guild settings object.

---

## 5. User Channels (DMs)

### `POST /users/@me/channels` **[USED]**

Create or open a DM channel with one or more users.

**Request (1-on-1 DM):**
```json
{
  "recipients": ["user_id"]
}
```

**Request (Group DM):**
```json
{
  "recipients": ["user_id_1", "user_id_2"]
}
```

**Response `200`:**
```json
{
  "id": "channel_id",
  "type": 1,
  "last_message_id": "message_id",
  "recipients": [{ "id": "user_id", "username": "...", "avatar": "..." }],
  "is_message_request": false,
  "is_message_request_timestamp": null,
  "is_spam": false,
  "safety_warnings": []
}
```

**Channel types:** `1` = DM, `3` = Group DM

---

### `GET /users/@me/channels`

Get all open DM channels.

**Response `200`:** Array of `DiscordChannel` objects (type 1 and 3).

---

## 6. Guilds

### `POST /guilds`

Create a guild.

**Request:**
```json
{
  "name": "My Server",
  "icon": "data:image/png;base64,...",
  "channels": [],
  "system_channel_id": null,
  "guild_template_code": null
}
```

**Response `200`:** Full `DiscordGuild` object.

---

### `GET /guilds/{guildId}` **[USED]**

Get a guild by ID.

**Query params:** `with_counts=true` (optional, includes member/online counts)

**Response `200`:**
```json
{
  "id": "guild_id",
  "name": "Server Name",
  "icon": "icon_hash",
  "owner_id": "user_id",
  "afk_channel_id": null,
  "afk_timeout": 300,
  "features": ["COMMUNITY", "NEWS"],
  "description": "A cool server",
  "roles": [{ "id": "...", "name": "...", "permissions": "..." }],
  "emojis": [],
  "member_count": 150,
  "premium_subscription_count": 5,
  "premium_tier": 1,
  "system_channel_id": "channel_id",
  "rules_channel_id": "channel_id",
  "vanity_url_code": "cool-server",
  "banner": "banner_hash",
  "splash": "splash_hash",
  "nsfw_level": 0,
  "mfa_level": 0,
  "verification_level": 2,
  "channels": []
}
```

---

### `PATCH /guilds/{guildId}` **[USED]**

Modify a guild.

**Request:**
```json
{
  "name": "New Name",
  "icon": "data:image/png;base64,...",
  "afk_channel_id": "channel_id",
  "afk_timeout": 300,
  "system_channel_id": "channel_id",
  "description": "Updated description"
}
```

**Response `200`:** Updated `DiscordGuild` object.

---

### `POST /guilds/{guildId}/delete`

Delete a guild (must be owner).

**Request:**
```json
{
  "password": "current_password"
}
```

**Response `204`:** No content.

---

### `GET /guilds/{guildId}/basic`

Get basic guild info (minimal payload).

**Response `200`:** Partial guild object with `id`, `name`, `icon`, `features`.

---

### `GET /guilds/{guildId}/channels`

Get all channels in a guild.

**Response `200`:** Array of `DiscordChannel` objects.

---

### `GET /guilds/{guildId}/profile` **[USED]**

Get a guild's public profile (used for clan tag popovers).

**Response `200`:**
```json
{
  "id": "guild_id",
  "name": "Server Name",
  "icon_hash": "icon_hash",
  "member_count": 1500,
  "online_count": 300,
  "description": "Server description",
  "banner_hash": "banner_hash",
  "custom_banner_hash": null,
  "game_application_ids": ["app_id_1"],
  "game_activity": {
    "app_id_1": { "activity_level": 3, "activity_score": 85 }
  },
  "tag": "CLAN",
  "badge": 1,
  "badge_color_primary": "#5865f2",
  "badge_color_secondary": "#ffffff",
  "badge_hash": "badge_hash",
  "traits": ["gaming"],
  "features": ["COMMUNITY"],
  "visibility": 1,
  "premium_subscription_count": 10,
  "premium_tier": 2
}
```

---

### `GET /guilds/{guildId}/widget`

Get guild widget settings.

**Response `200`:**
```json
{
  "enabled": true,
  "channel_id": "channel_id"
}
```

---

### `GET /guilds/{guildId}/vanity-url`

Get guild vanity URL info.

**Response `200`:**
```json
{
  "code": "vanity-code",
  "uses": 42
}
```

---

### `GET /guilds/{guildId}/regions`

Get voice regions for a guild.

**Response `200`:**
```json
[
  { "id": "us-west", "name": "US West", "optimal": true, "deprecated": false, "custom": false }
]
```

---

### `GET /voice/regions`

Get all available voice regions.

**Response `200`:** Same format as above.

---

### `DELETE /users/@me/guilds/{guildId}`

Leave a guild.

**Response `204`:** No content.

---

### `GET /users/@me/guilds`

Get all guilds the user is in.

**Response `200`:** Array of partial `DiscordGuild` objects (id, name, icon, owner, permissions, features).

---

## 7. Guild Members

### `GET /guilds/{guildId}/members` **[USED]**

Get guild members.

**Query params:** `limit=1000` (max 1000), `after=user_id` (pagination)

**Response `200`:**
```json
[
  {
    "user": {
      "id": "user_id",
      "username": "user",
      "discriminator": "0",
      "global_name": "Display Name",
      "avatar": "avatar_hash"
    },
    "nick": "nickname",
    "roles": ["role_id_1", "role_id_2"],
    "joined_at": "2020-01-01T00:00:00.000Z",
    "premium_since": null,
    "deaf": false,
    "mute": false,
    "pending": false,
    "communication_disabled_until": null
  }
]
```

---

### `GET /guilds/{guildId}/members/{userId}`

Get a specific guild member.

**Response `200`:** Single `DiscordMember` object (same shape as above).

---

### `PATCH /guilds/{guildId}/members/{userId}` **[USED]**

Modify a guild member.

**Request (timeout):**
```json
{
  "communication_disabled_until": "2024-01-01T00:00:00.000Z"
}
```

**Request (nickname):**
```json
{
  "nick": "new_nickname"
}
```

**Request (roles):**
```json
{
  "roles": ["role_id_1", "role_id_2"]
}
```

**Response `200`:** Updated `DiscordMember` object.

---

### `DELETE /guilds/{guildId}/members/{userId}` **[USED]**

Kick a member from the guild.

**Response `204`:** No content.

---

### `PATCH /guilds/{guildId}/members/@me`

Update own guild member (nickname).

**Request:**
```json
{
  "nick": "my_nickname"
}
```

**Response `200`:** Updated member object.

---

### `PUT /guilds/{guildId}/members/@me`

Join a guild (requires an invite or discovery).

**Response `200` or `204`.**

---

## 8. Guild Roles

### `GET /guilds/{guildId}/roles`

Get all roles in a guild.

**Response `200`:**
```json
[
  {
    "id": "role_id",
    "name": "@everyone",
    "color": 0,
    "hoist": false,
    "position": 0,
    "permissions": "1071698529857",
    "managed": false,
    "mentionable": false,
    "icon": null,
    "unicode_emoji": null,
    "flags": 0
  }
]
```

---

### `POST /guilds/{guildId}/roles`

Create a role.

**Request:**
```json
{
  "name": "New Role",
  "permissions": "0",
  "color": 3447003,
  "hoist": false,
  "mentionable": false,
  "icon": null,
  "unicode_emoji": null
}
```

**Response `200`:** Created role object.

---

### `PATCH /guilds/{guildId}/roles/{roleId}`

Modify a role.

**Request:** Same fields as create (all optional).

**Response `200`:** Updated role object.

---

### `DELETE /guilds/{guildId}/roles/{roleId}`

Delete a role.

**Response `204`:** No content.

---

### `GET /guilds/{guildId}/roles/member-counts`

Get member count per role.

**Response `200`:**
```json
{
  "role_id_1": 42,
  "role_id_2": 15
}
```

---

### `GET /guilds/{guildId}/roles/{roleId}/member-ids`

Get all member IDs with a specific role.

**Response `200`:** `["user_id_1", "user_id_2"]`

---

## 9. Guild Bans

### `GET /guilds/{guildId}/bans`

Get all bans.

**Response `200`:**
```json
[
  {
    "reason": "Spam",
    "user": { "id": "user_id", "username": "banned_user", "avatar": "..." }
  }
]
```

---

### `GET /guilds/{guildId}/bans/search`

Search bans.

**Query params:** `query=username` (partial match)

**Response `200`:** Array of ban objects.

---

### `PUT /guilds/{guildId}/bans/{userId}` **[USED]**

Ban a member.

**Request:**
```json
{
  "delete_message_seconds": 604800
}
```

`delete_message_seconds`: `0` (none), `3600` (1h), `86400` (1d), `604800` (7d)

**Response `204`:** No content.

---

### `DELETE /guilds/{guildId}/bans/{userId}`

Unban a member.

**Response `204`:** No content.

---

## 10. Guild Integrations & Applications

### `GET /guilds/{guildId}/integrations`

Get guild integrations (bots, webhooks, etc.).

**Response `200`:** Array of integration objects.

---

### `DELETE /guilds/{guildId}/integrations/{integrationId}`

Remove an integration.

**Response `204`:** No content.

---

### `POST /guilds/{guildId}/integrations/{integrationId}/sync`

Sync an integration.

**Response `204`:** No content.

---

### `GET /guilds/{guildId}/applications`

Get applications installed in a guild.

**Response `200`:** Array of application objects.

---

### `GET /guilds/{guildId}/application-command-index` **[USED]**

Get all slash commands available in a guild.

**Response `200`:**
```json
{
  "application_commands": [
    {
      "id": "cmd_id",
      "application_id": "app_id",
      "name": "command",
      "description": "Does something",
      "type": 1,
      "options": []
    }
  ],
  "version": "12345"
}
```

---

### `POST /guilds/{guildId}/migrate-command-scope`

Migrate bot command scope permissions.

**Response `204`:** No content.

---

## 11. Guild Onboarding

### `GET /guilds/{guildId}/onboarding`

Get onboarding config (prompts, default channels).

**Response `200`:**
```json
{
  "guild_id": "guild_id",
  "prompts": [
    {
      "id": "prompt_id",
      "type": 0,
      "title": "What are you interested in?",
      "options": [
        { "id": "opt_id", "title": "Gaming", "channel_ids": ["ch_id"], "role_ids": ["role_id"], "emoji": {} }
      ],
      "single_select": false,
      "required": true,
      "in_onboarding": true
    }
  ],
  "default_channel_ids": ["channel_id"],
  "enabled": true,
  "mode": 0
}
```

---

### `PUT /guilds/{guildId}/onboarding`

Update onboarding config.

**Request:** Same shape as response above.

**Response `200`:** Updated onboarding object.

---

### `POST /guilds/{guildId}/onboarding-responses`

Submit onboarding responses.

**Request:**
```json
{
  "onboarding_responses": ["option_id_1", "option_id_2"],
  "onboarding_prompts_seen": { "prompt_id": true }
}
```

**Response `200`:** Updated member object with new roles.

---

## 12. Guild Join Requests

### `GET /guilds/{guildId}/requests`

Get pending join requests.

**Response `200`:** Array of join request objects.

---

### `PUT /guilds/{guildId}/requests/@me`

Submit a join request (for guilds requiring application).

**Request:**
```json
{
  "form_responses": [
    { "field_id": "field_id", "response": "My answer" }
  ]
}
```

**Response `200`:** Join request object.

---

### `GET /guilds/{guildId}/requests/{userId}`

Get a specific join request.

**Response `200`:** Join request object.

---

### `POST /guilds/{guildId}/requests/{userId}/ack`

Acknowledge (approve/deny) a join request.

**Request:**
```json
{
  "action": "APPROVE"
}
```

**Response `204`:** No content.

---

## 13. Guild Templates

### `GET /guilds/templates/{code}`

Resolve a guild template.

**Response `200`:**
```json
{
  "code": "template_code",
  "name": "Template Name",
  "description": "A template",
  "usage_count": 42,
  "creator": { "id": "...", "username": "..." },
  "serialized_source_guild": { "name": "...", "channels": [], "roles": [] }
}
```

---

### `POST /guilds/templates/{code}`

Create a guild from a template.

**Request:**
```json
{
  "name": "My Server",
  "icon": null
}
```

**Response `200`:** Full `DiscordGuild` object.

---

### `GET /guilds/{guildId}/templates`

Get templates for a guild.

**Response `200`:** Array of template objects.

---

## 14. Guild Analytics

### `GET /guilds/{guildId}/audit-logs`

Get guild audit log.

**Query params:** `user_id`, `action_type`, `before`, `limit=50`

**Response `200`:**
```json
{
  "audit_log_entries": [
    {
      "id": "entry_id",
      "user_id": "actor_id",
      "target_id": "target_id",
      "action_type": 25,
      "changes": [{ "key": "name", "old_value": "old", "new_value": "new" }],
      "reason": "Reason text"
    }
  ],
  "users": [],
  "webhooks": [],
  "integrations": []
}
```

---

### `GET /guilds/{guildId}/analytics/overview`

Get guild analytics overview.

**Response `200`:** Analytics data with member/message counts over time.

---

### `GET /guilds/{guildId}/top-emojis` **[USED]**

Get top emojis by usage in a guild.

**Response `200`:**
```json
{
  "items": [
    { "emoji_id": "emoji_id", "emoji_rank": 1 },
    { "emoji_id": "emoji_id", "emoji_rank": 2 }
  ]
}
```

---

### `GET /guilds/{guildId}/top-games`

Top games played by guild members.

**Response `200`:** Array of game activity objects.

---

### `GET /guilds/{guildId}/top-read-channels`

Top read channels in the guild.

**Response `200`:** Array of channel activity objects.

---

## 15. Guild Discovery

### `GET /guilds/{guildId}/discovery-checklist`

Get discovery eligibility checklist.

**Response `200`:**
```json
{
  "items": [
    { "code": "NAME_TOO_SHORT", "pass": true },
    { "code": "DESCRIPTION_TOO_SHORT", "pass": false }
  ]
}
```

---

### `GET /guilds/{guildId}/discovery-requirements`

Get discovery requirements.

**Response `200`:** Requirements object.

---

## 16. Guild Welcome & Home

### `GET /guilds/{guildId}/welcome-screen`

Get welcome screen.

**Response `200`:**
```json
{
  "description": "Welcome!",
  "welcome_channels": [
    { "channel_id": "ch_id", "description": "Rules", "emoji_id": null, "emoji_name": "📜" }
  ]
}
```

---

### `PATCH /guilds/{guildId}/welcome-screen`

Update welcome screen.

**Request:** Same shape as response.

**Response `200`:** Updated welcome screen.

---

### `GET /guilds/{guildId}/member-verification`

Get member verification form (rules screening).

**Response `200`:**
```json
{
  "version": "2024-01-01T00:00:00.000Z",
  "description": "Please agree to the rules",
  "form_fields": [
    { "field_type": "TERMS", "label": "I agree to the rules", "required": true }
  ]
}
```

---

## 17. Guild Emojis

### `GET /guilds/{guildId}/emojis`

Get all custom emojis.

**Response `200`:**
```json
[
  {
    "id": "emoji_id",
    "name": "emoji_name",
    "roles": [],
    "require_colons": true,
    "managed": false,
    "animated": false,
    "available": true
  }
]
```

---

### `POST /guilds/{guildId}/emojis`

Create a custom emoji.

**Request:**
```json
{
  "name": "my_emoji",
  "image": "data:image/png;base64,...",
  "roles": []
}
```

**Response `200`:** Created emoji object.

---

### `PATCH /guilds/{guildId}/emojis/{emojiId}`

Modify an emoji (name, roles).

**Request:**
```json
{
  "name": "new_name",
  "roles": ["role_id"]
}
```

**Response `200`:** Updated emoji object.

---

### `DELETE /guilds/{guildId}/emojis/{emojiId}`

Delete an emoji.

**Response `204`:** No content.

---

## 18. Guild Assets

Static asset URLs (CDN, not API calls):

| Asset | URL Pattern |
|-------|-------------|
| Guild Icon | `/guilds/{guildId}/icons/{hash}.{jpg\|png\|gif\|webp}` |
| Guild Splash | `/guilds/{guildId}/splashes/{hash}.jpg` |
| Discovery Splash | `/guilds/{guildId}/discovery-splashes/{hash}.jpg` |
| Guild Banner | `/guilds/{guildId}/banners/{hash}.{jpg\|png\|gif\|webp}` |
| Home Header | `/guilds/{guildId}/home-headers/{hash}.jpg` |
| Template Icon | `/templates/{code}/icons/{hash}.{format}` |
| Member Avatar | `/guilds/{guildId}/users/{userId}/avatars/{hash}.{format}` |
| Member Banner | `/guilds/{guildId}/users/{userId}/banners/{hash}.{format}` |
| Resource Channel Icon | `/guilds/{guildId}/avatars/{hash}.{format}` |

---

## 19. Guild Feed

### `POST /guilds/{guildId}/guild-feed/preference`

Set guild feed preference.

**Request:**
```json
{
  "preference": 1
}
```

**Response `204`:** No content.

---

### `POST /guilds/{guildId}/guild-feed/feature`

Feature an item in the guild feed.

**Request:**
```json
{
  "message_id": "message_id",
  "channel_id": "channel_id"
}
```

**Response `204`:** No content.

---

### `POST /guilds/{guildId}/guild-feed/mark-seen`

Mark guild feed as seen.

**Response `204`:** No content.

---

## 20. Guild Game Servers

### `GET /guilds/{guildId}/game-servers`

Get game servers for a guild.

**Response `200`:** Array of game server objects.

---

### `GET /guilds/{guildId}/game-server-regions`

Get available game server regions.

**Response `200`:** Array of region objects.

---

### `POST /guilds/{guildId}/game-servers/{serverId}/wake`

Wake a sleeping game server.

**Response `200`:** Game server status.

---

## 21. Guild Powerups

### `GET /guilds/{guildId}/powerups`

Get guild powerups.

**Response `200`:** Array of powerup objects.

---

### `PATCH /guilds/{guildId}/skus/{skuId}`

Toggle a powerup SKU.

**Response `200`:** Updated SKU.

---

### `PATCH /guilds/{guildId}/entitlements/{entitlementId}`

Update powerup entitlement.

**Response `200`:** Updated entitlement.

---

## 22. Channels

### `POST /channels`

Create a channel (usually via `/guilds/{guildId}/channels`).

**Request:**
```json
{
  "name": "new-channel",
  "type": 0,
  "parent_id": "category_id",
  "permission_overwrites": [],
  "topic": null,
  "nsfw": false
}
```

**Channel types:** `0` = Text, `2` = Voice, `4` = Category, `5` = Announcement, `13` = Stage, `15` = Forum, `16` = Media

**Response `200`:** Created `DiscordChannel` object.

---

### `GET /channels/{channelId}` **[USED]**

Get a channel by ID.

**Response `200`:**
```json
{
  "id": "channel_id",
  "type": 0,
  "guild_id": "guild_id",
  "name": "general",
  "position": 0,
  "parent_id": "category_id",
  "topic": "Channel topic",
  "last_message_id": "message_id",
  "rate_limit_per_user": 0,
  "nsfw": false,
  "permission_overwrites": [
    { "id": "role_id", "type": 0, "allow": "0", "deny": "1024" }
  ]
}
```

---

### `PATCH /channels/{channelId}`

Modify a channel.

**Request:**
```json
{
  "name": "renamed",
  "topic": "New topic",
  "position": 3,
  "parent_id": "new_category_id",
  "nsfw": false,
  "rate_limit_per_user": 5
}
```

**Response `200`:** Updated `DiscordChannel` object.

---

### `DELETE /channels/{channelId}` **[USED]**

Delete or close a channel. For DMs, this hides the channel from the list.

**Response `200`:** The deleted channel object.

---

### `PUT /channels/{channelId}/recipients/{userId}`

Add a recipient to a group DM.

**Response `204`:** No content.

---

### `DELETE /channels/{channelId}/recipients/{userId}`

Remove a recipient from a group DM.

**Response `204`:** No content.

---

### `PUT /channels/{channelId}/recipients/@me` **[USED]**

Accept a message request (DM from non-friend).

**Request:**
```json
{
  "consent_status": 2
}
```

**Response `204`:** No content.

---

### `DELETE /channels/{channelId}/recipients/@me` **[USED]**

Decline a message request.

**Response `204`:** No content.

---

### `POST /channels/{channelId}/convert`

Convert a channel type (e.g., text to announcement).

**Request:**
```json
{
  "type": 5
}
```

**Response `200`:** Updated channel.

---

### `POST /channels/{channelId}/followers`

Follow an announcement channel (crosspost to another channel).

**Request:**
```json
{
  "webhook_channel_id": "target_channel_id"
}
```

**Response `200`:**
```json
{
  "channel_id": "source_channel_id",
  "webhook_id": "webhook_id"
}
```

---

### `PATCH /channels/{channelId}/voice-status`

Update voice channel status text.

**Request:**
```json
{
  "status": "Chilling 🎵"
}
```

**Response `204`:** No content.

---

## 23. Messages

### `GET /channels/{channelId}/messages` **[USED]**

Get messages in a channel.

**Query params:** `limit=50` (max 100), `before=message_id`, `after=message_id`, `around=message_id`

**Response `200`:**
```json
[
  {
    "id": "message_id",
    "channel_id": "channel_id",
    "author": {
      "id": "user_id",
      "username": "user",
      "discriminator": "0",
      "global_name": "Display Name",
      "avatar": "avatar_hash"
    },
    "content": "Hello world!",
    "timestamp": "2024-01-01T00:00:00.000Z",
    "edited_timestamp": null,
    "tts": false,
    "mention_everyone": false,
    "mentions": [],
    "mention_roles": [],
    "attachments": [
      {
        "id": "att_id",
        "filename": "image.png",
        "size": 12345,
        "url": "https://cdn.discordapp.com/...",
        "proxy_url": "https://media.discordapp.net/...",
        "width": 800,
        "height": 600,
        "content_type": "image/png"
      }
    ],
    "embeds": [
      {
        "type": "rich",
        "title": "Embed Title",
        "description": "Embed text",
        "url": "https://...",
        "color": 5793266,
        "fields": [{ "name": "Field", "value": "Value", "inline": true }],
        "thumbnail": { "url": "...", "width": 100, "height": 100 },
        "image": { "url": "...", "width": 400, "height": 300 },
        "footer": { "text": "Footer" },
        "author": { "name": "Author" }
      }
    ],
    "reactions": [
      { "emoji": { "id": null, "name": "👍" }, "count": 3, "me": true }
    ],
    "pinned": false,
    "type": 0,
    "flags": 0,
    "referenced_message": null,
    "components": [],
    "sticker_items": []
  }
]
```

**Message types:** `0` = Default, `1` = RecipientAdd, `2` = RecipientRemove, `3` = Call, `4` = ChannelNameChange, `5` = ChannelIconChange, `6` = ChannelPinnedMessage, `7` = GuildMemberJoin, `8` = PremiumGuildSubscription, `19` = Reply, `20` = ChatInputCommand, `21` = ThreadStarterMessage, `23` = ContextMenuCommand

---

### `POST /channels/{channelId}/messages` **[USED]**

Send a message.

**Request (simple text):**
```json
{
  "content": "Hello!",
  "nonce": "unique_nonce_string",
  "tts": false
}
```

**Request (with reply):**
```json
{
  "content": "Reply text",
  "nonce": "unique_nonce",
  "message_reference": { "message_id": "original_msg_id" },
  "allowed_mentions": { "replied_user": true }
}
```

**Request (with attachments, after `prepareAttachments`):**
```json
{
  "content": "Check this out",
  "nonce": "unique_nonce",
  "tts": false,
  "flags": 0,
  "mobile_network_type": "unknown",
  "attachments": [
    {
      "id": "0",
      "filename": "image.png",
      "uploaded_filename": "attachments/channel_id/file_hash/image.png",
      "original_content_type": "image/png"
    }
  ]
}
```

**Response `200`:** The created `DiscordMessage` object.

---

### `POST /channels/{channelId}/attachments` **[USED]**

Request upload URLs for file attachments.

**Request:**
```json
{
  "files": [
    {
      "filename": "image.png",
      "file_size": 12345,
      "id": "0",
      "is_clip": false,
      "original_content_type": "image/png"
    }
  ]
}
```

**Response `200`:**
```json
{
  "attachments": [
    {
      "id": 0,
      "upload_url": "https://discord-attachments-uploads-prd.storage.googleapis.com/...",
      "upload_filename": "attachments/channel_id/file_hash/image.png"
    }
  ]
}
```

After receiving upload URLs, `PUT` the file bytes to each `upload_url` with `Content-Type: application/octet-stream`.

---

### `PATCH /channels/{channelId}/messages/{messageId}`

Edit a message.

**Request:**
```json
{
  "content": "Edited content"
}
```

**Response `200`:** Updated `DiscordMessage` object.

---

### `DELETE /channels/{channelId}/messages/{messageId}` **[USED]**

Delete a message.

**Response `204`:** No content.

---

### `POST /channels/{channelId}/messages/{messageId}/crosspost`

Crosspost (publish) a message in an announcement channel.

**Response `200`:** The crossposted message.

---

## 24. Reactions

### `PUT /channels/{channelId}/messages/{messageId}/reactions/{emoji}/@me` **[USED]**

Add a reaction. `{emoji}` is URL-encoded: `👍` for Unicode, `name:emoji_id` for custom.

**Response `204`:** No content.

---

### `DELETE /channels/{channelId}/messages/{messageId}/reactions/{emoji}/@me` **[USED]**

Remove own reaction.

**Response `204`:** No content.

---

### `GET /channels/{channelId}/messages/{messageId}/reactions/{emoji}`

Get users who reacted with this emoji.

**Query params:** `limit=100`, `after=user_id`

**Response `200`:** Array of `DiscordUser` objects.

---

### `DELETE /channels/{channelId}/messages/{messageId}/reactions/{emoji}/{userId}`

Remove another user's reaction (requires MANAGE_MESSAGES).

**Response `204`:** No content.

---

### `DELETE /channels/{channelId}/messages/{messageId}/reactions`

Remove all reactions from a message.

**Response `204`:** No content.

---

### `DELETE /channels/{channelId}/messages/{messageId}/reactions/{emoji}`

Remove all reactions of a specific emoji.

**Response `204`:** No content.

---

## 25. Threads & Forums

### `GET /channels/{channelId}/threads/search` **[USED]**

Search threads in a forum channel.

**Query params:** `sort_by=last_message_time`, `sort_order=desc`, `limit=25`, `offset=0`, `tag_setting=match_some`

**Response `200`:**
```json
{
  "threads": [
    {
      "id": "thread_id",
      "type": 11,
      "name": "Thread Title",
      "guild_id": "guild_id",
      "parent_id": "forum_channel_id",
      "owner_id": "user_id",
      "message_count": 42,
      "member_count": 10,
      "thread_metadata": {
        "archived": false,
        "auto_archive_duration": 4320,
        "archive_timestamp": "2024-01-01T00:00:00.000Z",
        "locked": false,
        "create_timestamp": "2024-01-01T00:00:00.000Z"
      },
      "applied_tags": ["tag_id_1"],
      "total_message_sent": 42
    }
  ],
  "members": [],
  "total_results": 100,
  "has_more": true,
  "first_messages": {
    "thread_id": { "id": "msg_id", "content": "First post content", "..." : "..." }
  }
}
```

---

### `POST /channels/{channelId}/post-data` **[USED]**

Get forum post data (thread metadata + first messages).

**Request:**
```json
{
  "thread_ids": ["thread_id_1", "thread_id_2"]
}
```

**Response `200`:**
```json
{
  "threads": [{ "id": "thread_id", "..." : "..." }],
  "first_messages": [{ "id": "msg_id", "content": "...", "..." : "..." }]
}
```

---

### `PUT /channels/{channelId}/thread-members/@me`

Join a thread.

**Response `204`:** No content.

---

### `DELETE /channels/{channelId}/thread-members/@me`

Leave a thread.

**Response `204`:** No content.

---

### `GET /channels/{channelId}/threads/archived/{type}`

Get archived threads. `{type}` = `public` or `private`.

**Query params:** `limit=25`, `before=ISO_timestamp`

**Response `200`:**
```json
{
  "threads": [],
  "members": [],
  "has_more": false
}
```

---

### `GET /channels/{channelId}/tags`

Get forum tags.

**Response `200`:**
```json
[
  {
    "id": "tag_id",
    "name": "Bug",
    "moderated": false,
    "emoji_id": null,
    "emoji_name": "🐛"
  }
]
```

---

## 26. Pins

### `GET /channels/{channelId}/messages/pins`

Get pinned messages.

**Response `200`:** Array of `DiscordMessage` objects.

---

### `PUT /channels/{channelId}/messages/pins/{messageId}`

Pin a message.

**Response `204`:** No content.

---

### `DELETE /channels/{channelId}/messages/pins/{messageId}`

Unpin a message.

**Response `204`:** No content.

---

### `POST /channels/{channelId}/pins/ack`

Acknowledge pins (dismiss "new pins" indicator).

**Response `204`:** No content.

---

## 27. Typing

### `POST /channels/{channelId}/typing` **[USED]**

Send a typing indicator (lasts ~10 seconds, re-send to maintain).

**Request:** Empty body `{}`.

**Response `204`:** No content.

---

## 28. Invites

### `GET /invites/{code}`

Resolve an invite.

**Query params:** `with_counts=true`, `with_expiration=true`

**Response `200`:**
```json
{
  "code": "abc123",
  "guild": { "id": "guild_id", "name": "Server", "icon": "hash", "..." : "..." },
  "channel": { "id": "channel_id", "name": "general", "type": 0 },
  "inviter": { "id": "user_id", "username": "..." },
  "approximate_member_count": 150,
  "approximate_presence_count": 42,
  "expires_at": "2024-12-31T00:00:00.000Z"
}
```

---

### `POST /invites/{code}`

Accept an invite and join the guild.

**Response `200`:** Invite object with guild info.

---

### `DELETE /invites/{code}`

Delete/revoke an invite (requires MANAGE_CHANNELS).

**Response `200`:** Deleted invite object.

---

### `POST /channels/{channelId}/invites`

Create a channel invite.

**Request:**
```json
{
  "max_age": 86400,
  "max_uses": 0,
  "temporary": false,
  "unique": false
}
```

**Response `200`:** Created invite object.

---

### `GET /channels/{channelId}/invites`

Get all invites for a channel.

**Response `200`:** Array of invite objects.

---

### `GET /guilds/{guildId}/invites`

Get all invites for a guild.

**Response `200`:** Array of invite objects.

---

## 29. Webhooks

### `GET /channels/{channelId}/webhooks`

Get webhooks for a channel.

**Response `200`:**
```json
[
  {
    "id": "webhook_id",
    "type": 1,
    "guild_id": "guild_id",
    "channel_id": "channel_id",
    "name": "Webhook Name",
    "avatar": "avatar_hash",
    "token": "webhook_token",
    "user": { "id": "creator_id", "username": "..." }
  }
]
```

---

### `POST /channels/{channelId}/webhooks`

Create a webhook.

**Request:**
```json
{
  "name": "My Webhook",
  "avatar": null
}
```

**Response `200`:** Created webhook object.

---

### `GET /webhooks/{webhookId}`

Get a webhook.

**Response `200`:** Webhook object.

---

### `PATCH /webhooks/{webhookId}`

Modify a webhook.

**Request:**
```json
{
  "name": "New Name",
  "channel_id": "new_channel_id"
}
```

**Response `200`:** Updated webhook object.

---

### `DELETE /webhooks/{webhookId}`

Delete a webhook.

**Response `204`:** No content.

---

## 30. Permissions

### `PUT /channels/{channelId}/permissions/{overwriteId}`

Create or update a permission overwrite.

**Request:**
```json
{
  "allow": "1024",
  "deny": "2048",
  "type": 0
}
```

`type`: `0` = role, `1` = member. Values are permission bitfield strings.

**Response `204`:** No content.

---

### `DELETE /channels/{channelId}/permissions/{overwriteId}`

Delete a permission overwrite.

**Response `204`:** No content.

---

## 31. Voice

### `POST /channels/{channelId}/call`

Start a call in a DM/group DM.

**Request:**
```json
{
  "recipients": null
}
```

**Response `200`:** Call object with `voice_states`.

---

### `POST /channels/{channelId}/call/ring`

Ring recipients in a call.

**Request:**
```json
{
  "recipients": ["user_id"]
}
```

**Response `204`:** No content.

---

### `POST /channels/{channelId}/call/stop-ringing`

Stop ringing.

**Request:**
```json
{
  "recipients": ["user_id"]
}
```

**Response `204`:** No content.

---

## 32. Search

### `GET /guilds/{guildId}/messages/search` **[USED]**

Search messages in a guild.

**Query params:** `content=search_text`, `author_id=user_id`, `channel_id=channel_id`, `has=link|embed|file|video|image|sound|sticker`, `min_id=snowflake`, `max_id=snowflake`, `sort_by=timestamp`, `sort_order=desc`, `offset=0`

**Response `200`:**
```json
{
  "messages": [
    [
      { "id": "msg_id", "content": "...", "hit": true, "..." : "..." }
    ]
  ],
  "total_results": 42,
  "analytics_id": "analytics_id"
}
```

Note: `messages` is an array of arrays — each inner array contains the matching message plus surrounding context messages (the hit message has `"hit": true`).

---

### `GET /channels/{channelId}/messages/search`

Search messages in a specific channel.

**Query params:** Same as guild search.

**Response `200`:** Same format as guild search.

---

### `GET /guilds/{guildId}/messages/search/tabs`

Get search result tabs/categories.

**Response `200`:** Tab metadata for the search UI.

---

## 33. Read States / Ack

### `POST /channels/{channelId}/messages/{messageId}/ack` **[USED]**

Mark a channel as read up to a specific message.

**Request:**
```json
{
  "token": null
}
```

**Response `200`:**
```json
{
  "token": "ack_token_or_null"
}
```

---

### `POST /read-states/ack-bulk` **[USED]**

Bulk acknowledge multiple channels.

**Request:**
```json
{
  "read_states": [
    { "channel_id": "ch_1", "message_id": "msg_1", "read_state_type": 0 },
    { "channel_id": "ch_2", "message_id": "msg_2", "read_state_type": 0 }
  ]
}
```

**Response `204`:** No content.

---

### `POST /channels/{channelId}/messages/ack`

Ack entire channel (without specific message ID).

**Response `204`:** No content.

---

### `POST /guilds/{guildId}/ack/{type}/{featureId}`

Ack a guild feature (e.g., events, scheduled events).

**Response `204`:** No content.

---

### `POST /users/@me/background-sync`

Background sync of read states.

**Response `200`:** Sync data.

---

## 34. MFA

### `POST /users/@me/mfa/totp/enable`

Enable TOTP MFA.

**Request:**
```json
{
  "password": "current_password",
  "secret": "totp_secret",
  "code": "123456"
}
```

**Response `200`:**
```json
{
  "token": "new_token",
  "backup_codes": [{ "code": "abc-123", "consumed": false }]
}
```

---

### `POST /users/@me/mfa/totp/disable`

Disable TOTP MFA.

**Request:**
```json
{
  "code": "123456"
}
```

**Response `200`:**
```json
{
  "token": "new_token"
}
```

---

### `POST /users/@me/mfa/codes-verification`

Get backup codes.

**Request:**
```json
{
  "key": "mfa_nonce",
  "regenerate": false
}
```

**Response `200`:**
```json
{
  "backup_codes": [{ "code": "abc-123", "consumed": false }]
}
```

---

### `GET /users/@me/mfa/webauthn/credentials`

Get registered WebAuthn (security key) credentials.

**Response `200`:** Array of WebAuthn credential objects.

---

## 35. Remote Auth (QR Login)

### `POST /users/@me/remote-auth`

Initialize remote auth session (for QR code login on another device).

**Request:**
```json
{
  "fingerprint": "qr_fingerprint"
}
```

**Response `200`:**
```json
{
  "handshake_token": "token"
}
```

---

### `POST /users/@me/remote-auth/cancel`

Cancel a remote auth session.

**Response `204`:** No content.

---

### `POST /users/@me/remote-auth/login`

Approve a remote auth login from the mobile app.

**Request:**
```json
{
  "fingerprint": "qr_fingerprint",
  "handshake_token": "token"
}
```

**Response `204`:** No content.

---

### `POST /users/@me/remote-auth/finish`

Finish remote auth (get token on the requesting device).

**Response `200`:**
```json
{
  "encrypted_token": "encrypted_token_string"
}
```

---

## 36. OAuth2

### `POST /oauth2/authorize`

Authorize an application.

**Request:**
```json
{
  "authorize": true,
  "permissions": "0",
  "guild_id": "guild_id",
  "webhook_channel_id": null
}
```

**Response `200`:**
```json
{
  "location": "https://redirect_uri?code=auth_code"
}
```

---

### `GET /oauth2/@me`

Get current OAuth2 authorization info.

**Response `200`:**
```json
{
  "application": { "id": "app_id", "name": "...", "icon": "..." },
  "scopes": ["identify", "guilds"],
  "expires": "2024-12-31T00:00:00.000Z",
  "user": { "id": "...", "username": "..." }
}
```

---

### `GET /oauth2/tokens`

Get all authorized applications.

**Response `200`:** Array of authorized application objects.

---

### `DELETE /oauth2/tokens/{tokenId}`

Revoke an application's access.

**Response `204`:** No content.

---

## 37. Connections (Linked Accounts)

### `GET /users/@me/connections`

Get all linked connections (Spotify, GitHub, etc.).

**Response `200`:**
```json
[
  {
    "type": "spotify",
    "id": "spotify_user_id",
    "name": "SpotifyUsername",
    "verified": true,
    "friend_sync": false,
    "show_activity": true,
    "visibility": 1,
    "revoked": false,
    "integrations": []
  }
]
```

---

### `GET /connections/{platform}/authorize`

Get the OAuth URL to link a new connection.

**Response `200`:**
```json
{
  "url": "https://accounts.spotify.com/authorize?..."
}
```

---

### `POST /connections/{platform}/callback`

Complete the connection OAuth flow.

**Request:**
```json
{
  "code": "oauth_code",
  "state": "state_param"
}
```

**Response `200`:** Connection object.

---

### `DELETE /users/@me/connections/{platform}/{accountId}`

Remove a linked connection.

**Response `204`:** No content.

---

### `POST /users/@me/connections/{platform}/{accountId}/refresh`

Refresh a connection's data.

**Response `204`:** No content.

---

## 38. Notes

### `GET /users/@me/notes/{userId}`

Get your note on a user.

**Response `200`:**
```json
{
  "note": "This person is cool"
}
```

---

### `PUT /users/@me/notes/{userId}`

Set a note on a user.

**Request:**
```json
{
  "note": "New note text"
}
```

**Response `204`:** No content.

---

## 39. Mentions

### `GET /users/@me/mentions`

Get recent mentions across all channels.

**Query params:** `limit=25`, `before=message_id`, `roles=true`, `everyone=true`

**Response `200`:** Array of `DiscordMessage` objects.

---

### `DELETE /users/@me/mentions/{messageId}`

Dismiss a mention.

**Response `204`:** No content.

---

## 40. Interactions

### `POST /interactions` **[USED]**

Send a message component interaction (button click, select menu, slash command, context menu).

**Request:**
```json
{
  "type": 3,
  "application_id": "app_id",
  "channel_id": "channel_id",
  "guild_id": "guild_id",
  "data": {
    "component_type": 2,
    "custom_id": "button_custom_id"
  },
  "message_flags": 0,
  "message_id": "message_id",
  "nonce": "unique_nonce",
  "session_id": "gateway_session_id"
}
```

**Interaction types:** `2` = Application Command, `3` = Message Component, `4` = Application Command Autocomplete, `5` = Modal Submit

**Response `204`:** No content (response comes via gateway dispatch).

---

## 41. Applications

### `GET /applications/{appId}/rpc` **[USED]**

Get application info (name, icon, description).

**Response `200`:**
```json
{
  "id": "app_id",
  "name": "Bot Name",
  "icon": "icon_hash",
  "description": "A cool bot",
  "bot_public": true,
  "bot_require_code_grant": false,
  "verify_key": "...",
  "flags": 0
}
```

---

### `GET /applications/{appId}/public`

Get public application info.

**Response `200`:** Similar to above with additional public fields.

---

### `GET /applications/trending/global`

Get trending applications.

**Response `200`:** Array of application objects.

---

### `GET /applications/{appId}/skus`

Get SKUs (purchasable items) for an application.

**Response `200`:** Array of SKU objects.

---

### `GET /games/detectable`

Get all detectable games.

**Response `200`:** Array of game objects with `id`, `name`, `executables`.

---

## 42. Store & Billing

### `GET /users/@me/billing/payment-sources`

Get saved payment methods.

**Response `200`:** Array of payment source objects.

---

### `GET /users/@me/billing/subscriptions`

Get active subscriptions (Nitro, etc.).

**Response `200`:**
```json
[
  {
    "id": "sub_id",
    "type": 1,
    "status": 1,
    "payment_source_id": "source_id",
    "plan_id": "plan_id",
    "current_period_start": "2024-01-01T00:00:00.000Z",
    "current_period_end": "2024-02-01T00:00:00.000Z",
    "canceled_at": null,
    "trial_id": null,
    "trial_ends_at": null
  }
]
```

---

### `GET /users/@me/billing/payments`

Get payment history.

**Query params:** `limit=20`, `before=payment_id`

**Response `200`:** Array of payment objects.

---

### `GET /users/@me/billing/country-code`

Get billing country code.

**Response `200`:**
```json
{
  "country_code": "US"
}
```

---

## 43. Gifts & Promotions

### `GET /entitlements/gift-codes/{code}`

Resolve a gift code.

**Response `200`:**
```json
{
  "code": "gift_code",
  "sku_id": "sku_id",
  "application_id": "app_id",
  "uses": 0,
  "max_uses": 1,
  "redeemed": false,
  "expires_at": "2024-12-31T00:00:00.000Z"
}
```

---

### `POST /entitlements/gift-codes/{code}/redeem`

Redeem a gift code.

**Response `200`:** Entitlement object.

---

### `POST /users/@me/entitlements/gift-codes`

Create a gift code.

**Request:**
```json
{
  "sku_id": "sku_id",
  "subscription_plan_id": "plan_id",
  "gift_style": null
}
```

**Response `200`:** Gift code object.

---

## 44. Collectibles & Shop

### `GET /collectibles-categories`

Get collectible categories.

**Response `200`:** Array of category objects.

---

### `GET /shop/search`

Search the collectibles shop.

**Query params:** `query=search_term`

**Response `200`:** Search results.

---

### `POST /users/@me/claim-premium-collectibles-product`

Claim a free premium collectible.

**Request:**
```json
{
  "sku_id": "sku_id"
}
```

**Response `200`:** Claim result.

---

## 45. Subscriptions & Boosts

### `GET /guilds/{guildId}/premium/subscriptions`

Get applied boosts for a guild.

**Response `200`:** Array of boost subscription objects.

---

### `GET /users/@me/guilds/premium/subscription-slots`

Get user's boost slots.

**Response `200`:**
```json
[
  {
    "id": "slot_id",
    "subscription_id": "sub_id",
    "premium_guild_subscription": {
      "id": "boost_id",
      "guild_id": "guild_id",
      "ended": false
    },
    "canceled": false,
    "cooldown_ends_at": null
  }
]
```

---

## 46. Entitlements

### `GET /users/@me/entitlements`

Get all user entitlements (owned games, items).

**Response `200`:** Array of entitlement objects.

---

### `GET /users/@me/applications/{appId}/entitlements`

Get entitlements for a specific application.

**Response `200`:** Array of entitlement objects.

---

## 47. GIFs

### `GET /gifs/search`

Search for GIFs.

**Query params:** `q=search_term`, `media_format=gif`, `provider=tenor`, `locale=en-US`

**Response `200`:**
```json
[
  {
    "id": "gif_id",
    "title": "Funny GIF",
    "url": "https://tenor.com/...",
    "src": "https://media.tenor.com/....gif",
    "gif_src": "https://media.tenor.com/....gif",
    "width": 320,
    "height": 240,
    "preview": "https://media.tenor.com/....png"
  }
]
```

---

### `GET /gifs/trending`

Get trending GIF categories.

**Response `200`:** Array of category objects.

---

### `GET /gifs/trending-gifs`

Get trending GIFs.

**Response `200`:** Array of GIF objects.

---

### `POST /gifs/select`

Track a GIF selection (analytics).

**Request:**
```json
{
  "id": "gif_id",
  "q": "search_term"
}
```

**Response `204`:** No content.

---

### `GET /gifs/suggest`

Get GIF suggestions based on message text.

**Query params:** `q=partial_text`

**Response `200`:** Array of suggestion strings.

---

## 48. AI Features

### `POST /ai/title`

Generate a title using AI.

**Request:**
```json
{
  "messages": [{ "content": "..." }]
}
```

**Response `200`:**
```json
{
  "title": "Generated Title"
}
```

---

### `POST /ai/translate`

Translate text using AI.

**Request:**
```json
{
  "messages": [{ "content": "Hello" }],
  "target_language": "es"
}
```

**Response `200`:**
```json
{
  "translation": "Hola"
}
```

---

### `POST /ai/fix-grammar`

Fix grammar using AI.

**Request:**
```json
{
  "content": "text with grammer mistakes"
}
```

**Response `200`:**
```json
{
  "content": "text with grammar mistakes"
}
```

---

### `POST /ai/summarize-thread/{channelId}`

Summarize a thread using AI.

**Response `200`:**
```json
{
  "summary": "Thread summary text..."
}
```

---

## 49. Gravity (Recommendations)

### `GET /gravity-recommended-guilds`

Get recommended guilds.

**Response `200`:** Array of recommended guild objects.

---

### `POST /gravity-content`

Hydrate gravity (ICYMI) items with full content.

**Request:**
```json
{
  "item_ids": ["item_id_1", "item_id_2"]
}
```

**Response `200`:** Array of hydrated content items.

---

### `GET /gravity-topic-guilds`

Get guilds by topic for recommendations.

**Response `200`:** Categorized guild recommendations.

---

## 50. Captcha & Age Verification

### `POST /users/@me/captcha/verify`

Verify a captcha solution.

**Request:**
```json
{
  "captcha_key": "solution_string",
  "captcha_rqtoken": "request_token"
}
```

**Response `200`:** Verification result.

---

### `POST /age-verification/verify`

Verify age.

**Request:** Age verification payload (varies by method).

**Response `200`:** Verification result.

---

### `GET /age-verification/methods`

Get available age verification methods.

**Response `200`:** Array of verification method objects.

---

## 51. Tracking & Metrics

### `POST /science`

Submit analytics/tracking events.

**Request:**
```json
{
  "events": [
    {
      "type": "event_name",
      "properties": { "..." : "..." }
    }
  ],
  "token": "analytics_token"
}
```

**Response `204`:** No content.

---

### `POST /metrics`

Submit client metrics.

**Response `204`:** No content.

---

## 52. Misc

### `GET /experiments`

Get active experiments / feature flags.

**Response `200`:**
```json
{
  "fingerprint": "experiment_fingerprint",
  "assignments": [[123456, 0, 1, -1, 0, 0, 0]]
}
```

---

> **Note:** Many endpoints previously listed here now have their own dedicated sections (53–121). See the Table of Contents for the full list.

---

## 53. Channel Summaries

### `GET /channels/{guildId}/summaries`

Get AI-generated summaries for channels in a guild.

**Response `200`:**
```json
{
  "summaries": [
    {
      "id": "summary_id",
      "channel_id": "channel_id",
      "topic": "Topic Title",
      "content": "Summary of recent conversation...",
      "start_id": "start_message_id",
      "end_id": "end_message_id",
      "created_at": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

---

### `GET /channels/{guildId}/summaries/{summaryId}`

Get a specific channel summary.

**Response `200`:** Single summary object (same shape as above).

---

### `GET /users/@me/summaries`

Get the current user's summaries across all channels.

**Response `200`:** Array of summary objects.

---

## 54. Channel Store Listings

### `GET /channels/{channelId}/store-listing`

Get store listing for a channel.

**Response `200`:** Store listing object with SKU info.

---

### `GET /channels/{channelId}/store-listings/{skuId}`

Get a specific store listing in a channel.

**Response `200`:** Store listing object.

---

### `POST /channels/{channelId}/store-listing/entitlement-grant`

Grant entitlement from a channel store listing.

**Request:**
```json
{
  "sku_id": "sku_id"
}
```

**Response `200`:** Entitlement object.

---

## 55. Phone Verification

### `GET /users/@me/phone`

Get user's phone number.

**Response `200`:**
```json
{
  "phone": "+1234567890"
}
```

---

### `POST /users/@me/phone`

Set phone number.

**Request:**
```json
{
  "phone": "+1234567890",
  "password": "current_password"
}
```

**Response `200`:**
```json
{
  "phone": "+1234567890"
}
```

---

### `POST /users/@me/phone/verify`

Verify phone without password.

**Request:**
```json
{
  "code": "123456"
}
```

**Response `204`:** No content.

---

### `POST /users/@me/phone/reverify`

Re-verify phone number.

**Request:**
```json
{
  "phone": "+1234567890"
}
```

**Response `204`:** No content.

---

### `POST /phone-verifications/verify`

Verify phone verification code.

**Request:**
```json
{
  "phone": "+1234567890",
  "code": "123456"
}
```

**Response `200`:**
```json
{
  "token": "phone_token"
}
```

---

### `POST /phone-verifications/resend`

Resend phone verification code.

**Request:**
```json
{
  "phone": "+1234567890"
}
```

**Response `204`:** No content.

---

### `POST /phone-verifications/validate-support-ticket`

Verify phone for a support ticket.

**Request:**
```json
{
  "phone": "+1234567890",
  "code": "123456",
  "ticket_id": "ticket_id"
}
```

**Response `200`:** Validation result.

---

## 56. User Devices

### `GET /users/@me/devices`

Get registered devices.

**Response `200`:** Array of device objects.

---

### `POST /users/@me/devices`

Register a device for push notifications.

**Request:**
```json
{
  "provider": "gcm",
  "token": "device_push_token",
  "voip_provider": null,
  "voip_token": null
}
```

**Response `204`:** No content.

---

### `POST /users/@me/devices/sync-token`

Get a device sync token.

**Response `200`:**
```json
{
  "token": "sync_token"
}
```

---

### `POST /users/@me/devices/sync`

Sync device data.

**Request:**
```json
{
  "token": "sync_token"
}
```

**Response `200`:** Sync result.

---

## 57. Email Notifications

### `POST /users/disable-email-notifications`

Disable email notifications (from unsubscribe link).

**Request:**
```json
{
  "token": "unsubscribe_token"
}
```

**Response `204`:** No content.

---

### `POST /users/disable-server-highlight-notifications`

Disable server highlight email notifications.

**Request:**
```json
{
  "token": "unsubscribe_token"
}
```

**Response `204`:** No content.

---

## 58. User Activity

### `GET /users/@me/activities/statistics/applications`

Get user's activity statistics across applications.

**Response `200`:** Array of application activity objects with play time, last played, etc.

---

### `GET /activities/statistics/applications/{appId}`

Get activity statistics for a specific application.

**Response `200`:** Activity statistics object.

---

### `GET /activities`

Get current activities.

**Response `200`:** Array of activity objects.

---

### `POST /users/@me/activities/subscribe`

Subscribe to activity updates for an application.

**Request:**
```json
{
  "application_id": "app_id"
}
```

**Response `204`:** No content.

---

### `PUT /users/{userId}/sessions/{sessionId}/activities/{activityIndex}/metadata`

Update activity metadata.

**Request:** Activity metadata object.

**Response `204`:** No content.

---

### `POST /users/{userId}/sessions/{sessionId}/activities/{activityIndex}/1`

Join a user's activity.

**Response `200`:** Activity join data.

---

## 59. User Library

### `GET /users/@me/library`

Get user's game library.

**Response `200`:** Array of library entry objects.

---

### `DELETE /users/@me/library/{appId}`

Remove an application from library.

**Response `204`:** No content.

---

### `PUT /users/@me/library/{appId}/{branchId}`

Add application branch to library.

**Response `200`:** Library entry.

---

### `PUT /users/@me/library/{appId}/{branchId}/installed`

Mark an application as installed.

**Request:**
```json
{
  "platform": "win32",
  "install_path": "C:\\Games\\..."
}
```

**Response `204`:** No content.

---

## 60. Application Branches & Builds

### `GET /applications/{appId}/branches`

Get application branches.

**Response `200`:** Array of branch objects.

---

### `GET /applications/{appId}/branches/{branchId}/builds/live`

Get the live build for a branch.

**Response `200`:** Build object with manifests.

---

### `GET /applications/{appId}/branches/{branchId}/builds/{buildId}/size`

Get build size info.

**Response `200`:** Size information.

---

### `GET /applications/{appId}/branches/{branchId}/storage`

Get cloud storage for application.

**Response `200`:** Storage data.

---

### `GET /branches`

Get branches (bulk).

**Response `200`:** Array of branch objects.

---

## 61. Application External Assets

### `POST /applications/{appId}/external-assets`

Get external asset URLs for rich presence images.

**Request:**
```json
{
  "urls": ["https://example.com/image.png"]
}
```

**Response `200`:**
```json
[
  {
    "url": "https://example.com/image.png",
    "external_asset_path": "external/asset_id"
  }
]
```

---

## 62. Application Disclosures

### `GET /applications/{appId}/disclosures`

Get privacy/data disclosures for an application.

**Response `200`:** Array of disclosure objects.

---

## 63. Store Listings & Directory

### `GET /store/directory-layouts/{layoutId}`

Get store directory layout.

**Response `200`:** Layout configuration object.

---

### `GET /store/directory/{directoryId}`

Get store directory content.

**Response `200`:** Directory items.

---

### `POST /store/email/resend-payment-verification`

Resend payment verification email.

**Response `204`:** No content.

---

### `GET /store/published-listings/applications`

Get published application listings.

**Response `200`:** Array of listing objects.

---

### `GET /store/published-listings/applications/{appId}`

Get a specific application listing.

**Response `200`:** Listing object.

---

### `GET /store/published-listings/skus`

Get published SKU listings.

**Response `200`:** Array of SKU listing objects.

---

### `GET /store/published-listings/skus/{skuId}`

Get a specific SKU listing.

**Response `200`:** SKU listing object.

---

### `POST /store/published-listings/skus/{skuId}/guild/join`

Join the guild associated with a SKU listing.

**Response `200`:** Guild join result.

---

### `GET /store/published-listings/skus/{skuId}/subscription-plans`

Get subscription plans for a SKU.

**Response `200`:** Array of subscription plan objects.

---

### `GET /store/skus/{skuId}`

Get a specific SKU.

**Response `200`:** SKU object.

---

### `POST /store/skus/{skuId}/purchase`

Purchase a SKU.

**Request:**
```json
{
  "payment_source_id": "source_id",
  "expected_amount": 999,
  "expected_currency": "usd",
  "gift": false
}
```

**Response `200`:** Purchase result.

---

### `GET /store/listings/{listingId}`

Get a store listing.

**Response `200`:** Listing object.

---

### `GET /store/skus/{skuId}/listings`

Get all listings for a SKU.

**Response `200`:** Array of listing objects.

---

### `GET /store/eulas/{eulaId}`

Get an EULA document.

**Response `200`:** EULA object with content.

---

## 64. Storefront (Partner SDK)

### `GET /partner-sdk/guilds/{guildId}/application-storefront`

Get application storefront for a guild.

**Response `200`:** Storefront object.

---

### `GET /partner-sdk/guilds/{guildId}/application-storefront/skus/{skuId}`

Get a specific SKU from the storefront.

**Response `200`:** SKU object.

---

### `GET /partner-sdk/guilds/{guildId}/application-storefront/skus/{skuId}/eligibility`

Check eligibility to purchase a SKU.

**Response `200`:**
```json
{
  "eligible": true,
  "reason": null
}
```

---

### `GET /partner-sdk/guilds/{guildId}/application-storefront/announcement`

Get storefront announcement.

**Response `200`:** Announcement object.

---

### `GET /partner-sdk/storefront-config`

Get global storefront configuration.

**Response `200`:** Config object.

---

## 65. Message Logging

### `POST /messages-log/private-channels/get`

Get private channel message logs.

**Request:**
```json
{
  "channel_ids": ["channel_id_1", "channel_id_2"]
}
```

**Response `200`:** Message log data.

---

### `POST /messages-log/guild-channels/get`

Get guild channel message logs.

**Request:**
```json
{
  "guild_id": "guild_id",
  "channel_ids": ["channel_id_1"]
}
```

**Response `200`:** Message log data.

---

## 66. Billing (Extended)

### `POST /users/@me/billing/stripe/setup-intents`

Create a Stripe setup intent for adding a payment method.

**Response `200`:**
```json
{
  "client_secret": "seti_xxx_secret_xxx"
}
```

---

### `POST /users/@me/billing/stripe/payment-elements/setup-intents`

Create a Stripe setup intent for Payment Elements.

**Response `200`:** Same as above.

---

### `GET /users/@me/billing/adyen/payment-methods`

Get Adyen payment methods.

**Response `200`:** Array of Adyen payment method objects.

---

### `GET /users/@me/billing/payment-sources/{sourceId}`

Get a specific payment source.

**Response `200`:** Payment source object.

---

### `PATCH /users/@me/billing/payment-sources/{sourceId}`

Update a payment source.

**Request:**
```json
{
  "default": true
}
```

**Response `200`:** Updated payment source.

---

### `DELETE /users/@me/billing/payment-sources/{sourceId}`

Delete a payment source.

**Response `204`:** No content.

---

### `POST /users/@me/billing/payment-sources/validate-billing-address`

Validate a billing address.

**Request:**
```json
{
  "billing_address": {
    "name": "John Doe",
    "line_1": "123 Main St",
    "city": "San Francisco",
    "state": "CA",
    "postal_code": "94105",
    "country": "US"
  }
}
```

**Response `200`:** Validation result.

---

### `GET /users/@me/billing/wallet/{walletType}/information`

Get wallet information.

**Response `200`:** Wallet info object.

---

### `GET /users/@me/billing/payments/{paymentId}`

Get a specific payment.

**Response `200`:** Payment object.

---

### `POST /users/@me/billing/payments/{paymentId}/void`

Void a payment.

**Response `200`:** Updated payment object.

---

### `GET /users/@me/billing/invoice`

Get invoice PDF data.

**Response `200`:** Invoice data (or binary PDF).

---

### `GET /users/@me/billing/invoice/breakdown`

Get invoice breakdown.

**Response `200`:** Breakdown of charges.

---

### `GET /users/@me/billing/stripe/payment-intents/payments/{paymentId}`

Get Stripe payment intent for a payment.

**Response `200`:** Payment intent object.

---

### `GET /users/@me/billing/stripe/payment-intents/{intentId}`

Get Stripe payment intent by ID.

**Response `200`:** Payment intent object.

---

### `POST /users/@me/billing/paypal/billing-agreement-tokens`

Create PayPal billing agreement token.

**Response `200`:**
```json
{
  "token": "BA-xxx"
}
```

---

### `GET /users/@me/billing/subscriptions/{subId}`

Get a specific subscription.

**Response `200`:** Full subscription object.

---

### `PATCH /users/@me/billing/subscriptions/{subId}`

Update a subscription (change plan, cancel, etc.).

**Request:**
```json
{
  "plan_id": "new_plan_id",
  "payment_source_id": "source_id"
}
```

**Response `200`:** Updated subscription.

---

### `GET /users/@me/billing/subscriptions/preview`

Preview subscription changes.

**Response `200`:** Preview with prorated amounts.

---

### `GET /users/@me/billing/subscriptions/{subId}/preview`

Preview changes to a specific subscription.

**Response `200`:** Preview object.

---

### `GET /users/@me/billing/subscriptions/{subId}/invoices`

Get invoices for a subscription.

**Response `200`:** Array of invoice objects.

---

### `POST /users/@me/billing/subscriptions/{subId}/invoices/{invoiceId}/pay`

Manually pay an invoice.

**Response `200`:** Payment result.

---

### `GET /users/@me/billing/subscriptions/{subId}/rewards`

Get subscription rewards.

**Response `200`:** Array of reward objects.

---

### `GET /users/@me/billing/subscriptions/{subId}/promotion-reward`

Get promotion reward for subscription.

**Response `200`:** Promotion reward object.

---

### `GET /users/@me/billing/subscriptions/{subId}/reward-eligibility`

Check reward eligibility.

**Response `200`:**
```json
{
  "eligible": true
}
```

---

### `GET /users/@me/billing/subscriptions/{subId}/eligible-users`

Get eligible users for a subscription (family plan).

**Response `200`:** Array of eligible user objects.

---

### `GET /users/@me/billing/subscriptions/{subId}/invites`

Get subscription invites (family plan).

**Response `200`:** Array of invite objects.

---

### `POST /users/@me/billing/subscriptions/{subId}/members/{memberId}/invite`

Invite a member to a subscription.

**Response `200`:** Invite object.

---

### `DELETE /users/@me/billing/subscriptions/{subId}/members/{memberId}`

Remove a member from a subscription.

**Response `204`:** No content.

---

### `GET /users/@me/billing/subscriptions/{subId}/members`

Get subscription members.

**Response `200`:** Array of member objects.

---

### `GET /users/@me/billing/location-info`

Get billing location info.

**Response `200`:**
```json
{
  "country_code": "US",
  "region": "CA"
}
```

---

### `GET /users/@me/billing/localized-pricing-promo`

Get localized pricing promo.

**Response `200`:** Promo object.

---

### `GET /users/@me/billing/payment-source-creation-context`

Get payment source creation context.

**Response `200`:** Context object.

---

### `POST /billing/verify-purchase-request`

Verify a purchase request (authorize payment).

**Request:**
```json
{
  "token": "purchase_token"
}
```

**Response `200`:** Verification result.

---

### `GET /billing/store-country`

Get store country.

**Response `200`:**
```json
{
  "country_code": "US"
}
```

---

### `POST /billing/gift-card/view`

View gift card balance.

**Request:**
```json
{
  "code": "gift_card_code"
}
```

**Response `200`:** Gift card info.

---

### `POST /billing/gift-card/redeem`

Redeem a gift card.

**Request:**
```json
{
  "code": "gift_card_code"
}
```

**Response `200`:** Redemption result.

---

## 67. Orders

### `POST /billing/orders`

Create an order.

**Request:**
```json
{
  "items": [{ "sku_id": "sku_id", "quantity": 1 }],
  "payment_source_id": "source_id",
  "currency": "usd"
}
```

**Response `200`:** Order object.

---

### `GET /billing/orders`

List orders.

**Query params:** `limit=20`, `before=order_id`

**Response `200`:** Array of order objects.

---

### `GET /billing/orders/{orderId}`

Get a specific order.

**Response `200`:** Order object.

---

### `PATCH /billing/orders/{orderId}`

Update an order.

**Response `200`:** Updated order.

---

### `PATCH /billing/orders/{orderId}/line-items/{itemId}`

Update a line item in an order.

**Response `200`:** Updated order.

---

### `POST /billing/orders/{orderId}/sign`

Sign/confirm an order.

**Response `200`:** Signed order.

---

### `POST /billing/orders/{orderId}/discard`

Discard an order.

**Response `204`:** No content.

---

## 68. Premium Group (Family Plan)

### `GET /users/@me/premium-group/membership`

Get premium group membership.

**Response `200`:** Membership object.

---

### `GET /users/@me/premium-group/invites`

Get premium group invites.

**Response `200`:** Array of invite objects.

---

### `GET /users/@me/premium-group/invites/{inviteId}`

Get a specific premium group invite.

**Response `200`:** Invite object.

---

## 69. User Trial & Offers

### `GET /users/@me/billing/user-trial-offer`

Get available trial offer.

**Response `200`:** Trial offer object.

---

### `POST /users/@me/billing/user-trial-offer/{offerId}/ack`

Acknowledge a trial offer.

**Response `204`:** No content.

---

### `GET /users/@me/billing/user-offer`

Get current user offer.

**Response `200`:** Offer object.

---

### `POST /users/@me/billing/user-offer/ack`

Acknowledge a user offer.

**Response `204`:** No content.

---

### `GET /users/@me/billing/perks-relevance`

Get perks relevance scoring.

**Response `200`:** Relevance data.

---

### `GET /users/@me/billing/nitro-affinity`

Get Nitro affinity data.

**Response `200`:** Affinity data.

---

## 70. Apple & Google Billing

### `POST /billing/apple/apply-receipt`

Apply an Apple receipt.

**Request:**
```json
{
  "receipt": "base64_receipt_data"
}
```

**Response `200`:** Result.

---

### `GET /billing/apple/subscriptions/{subId}`

Get Apple subscription.

**Response `200`:** Subscription object.

---

### `POST /users/@me/billing/apple/trial-offer-signature`

Generate Apple trial offer signature.

**Response `200`:** Signature data.

---

### `POST /billing/apple/jwt-token`

Create Apple IAP JWT token.

**Response `200`:** JWT token.

---

### `POST /billing/apple/acom-subscriptions/migrate`

Migrate ACOM Apple subscription.

**Response `200`:** Migration result.

---

### `POST /google-play/verify-purchase-token`

Verify a Google Play purchase token.

**Request:**
```json
{
  "purchase_token": "token",
  "sku_id": "sku_id"
}
```

**Response `200`:** Verification result.

---

### `POST /google-play/downgrade-subscription`

Downgrade a Google Play subscription.

**Response `200`:** Result.

---

### `POST /google-play/validate-purchase`

Validate a Google Play purchase.

**Response `200`:** Validation result.

---

## 71. Gifts (Extended)

### `DELETE /users/@me/entitlements/gift-codes/{code}`

Revoke a gift code.

**Response `204`:** No content.

---

### `GET /users/@me/entitlements/gift-codes`

Get user's created gift codes.

**Response `200`:** Array of gift code objects.

---

### `GET /entitlements/partner-promotions/{promoId}`

Get partner promotion details.

**Response `200`:** Promotion object.

---

## 72. Collectibles (Extended)

### `GET /collectibles-categories/v2`

Get collectible categories v2.

**Response `200`:** Array of category objects.

---

### `POST /users/@me/claim-reward-category-product`

Claim a reward category product.

**Request:**
```json
{
  "sku_id": "sku_id"
}
```

**Response `200`:** Claim result.

---

### `GET /users/@me/collectibles-purchases`

Get collectibles purchase history.

**Response `200`:** Array of purchase objects.

---

### `GET /collectibles-products/{productId}`

Get collectible product details.

**Response `200`:** Product object.

---

### `GET /users/@me/valid-collectibles-gift-recipient`

Check if a user is a valid gift recipient.

**Query params:** `user_id=target_user_id`

**Response `200`:**
```json
{
  "valid": true
}
```

---

### `POST /users/@me/valid-collectibles-gift-recipients-batch`

Batch check gift recipients.

**Request:**
```json
{
  "user_ids": ["user_id_1", "user_id_2"]
}
```

**Response `200`:** Map of user ID to validity.

---

### `GET /users/@me/collectibles-marketing`

Get collectibles marketing info.

**Response `200`:** Marketing data.

---

### `GET /collectibles-shop`

Get collectibles shop data.

**Response `200`:** Shop layout and products.

---

### `GET /collectibles-shop-tab-layouts/{tabId}`

Get shop tab layout.

**Response `200`:** Tab layout object.

---

## 73. Wishlists

### `GET /wishlists/{userId}`

Get a user's wishlist.

**Response `200`:** Wishlist object.

---

### `PATCH /users/@me/wishlists/{wishlistId}`

Update a wishlist.

**Request:**
```json
{
  "name": "My Wishlist"
}
```

**Response `200`:** Updated wishlist.

---

### `GET /users/@me/wishlist/items`

Get wishlist items.

**Response `200`:** Array of wishlist item objects.

---

### `DELETE /users/@me/wishlists/{wishlistId}/items/{itemId}`

Remove item from wishlist.

**Response `204`:** No content.

---

### `GET /wishlist/gift-recommendations`

Get gift recommendations from wishlists.

**Response `200`:** Array of recommendation objects.

---

## 74. CMS Layouts & Templates

### `GET /layouts/{type}/{id}`

Get a CMS layout.

**Response `200`:** Layout object.

---

### `GET /templates/{type}/{id}`

Get a CMS template.

**Response `200`:** Template object.

---

## 75. Guild Roles (Extended)

### `PUT /guilds/{guildId}/roles/{roleId}/members`

Add members to a role (bulk).

**Request:**
```json
{
  "member_ids": ["user_id_1", "user_id_2"]
}
```

**Response `204`:** No content.

---

### `GET /guilds/{guildId}/roles/connections-configurations`

Get role connection configurations.

**Response `200`:** Array of connection config objects.

---

### `GET /guilds/{guildId}/roles/{roleId}/connections/eligibility`

Check role connection eligibility.

**Response `200`:** Eligibility result.

---

### `PUT /guilds/{guildId}/roles/{roleId}/connections/assign`

Assign role connection.

**Response `204`:** No content.

---

### `PUT /guilds/{guildId}/roles/{roleId}/connections/unassign`

Unassign role connection.

**Response `204`:** No content.

---

## 76. Guild Onboarding (Extended)

### `GET /guilds/{guildId}/onboarding/allowed-applications`

Get allowed applications for onboarding prompts.

**Response `200`:** Array of application IDs.

---

### `PATCH /guilds/{guildId}/onboarding-prompts/{promptId}`

Update a specific onboarding prompt.

**Request:**
```json
{
  "title": "Updated prompt title",
  "options": [],
  "single_select": false,
  "required": true,
  "in_onboarding": true
}
```

**Response `200`:** Updated prompt.

---

## 77. Guild Join Requests (Extended)

### `GET /join-requests/{requestId}`

Get a join request by ID (direct, not guild-scoped).

**Response `200`:** Join request object.

---

### `GET /join-requests/{requestId}/interview`

Get join request interview questions/responses.

**Response `200`:** Interview data.

---

### `GET /guilds/{guildId}/requests/id/{requestId}`

Get a join request by its ID within a guild.

**Response `200`:** Join request object.

---

### `GET /guilds/{guildId}/requests/@me/cooldown`

Check join request cooldown.

**Response `200`:**
```json
{
  "cooldown_ends_at": "2024-01-01T00:00:00.000Z"
}
```

---

### `GET /users/@me/join-request-guilds`

Get guilds with pending join requests.

**Response `200`:** Array of guild objects with request status.

---

## 78. Channel Followers & Stats

### `GET /channels/{channelId}/follower-stats`

Get follower statistics for an announcement channel.

**Response `200`:**
```json
{
  "total_followers": 42
}
```

---

### `GET /channels/{channelId}/follower-message-stats`

Get follower message statistics.

**Response `200`:** Message delivery stats.

---

## 79. Channel Safety

### `POST /channels/{channelId}/safety-warnings/ack`

Acknowledge a safety warning in a channel.

**Response `204`:** No content.

---

### `POST /channels/{channelId}/blocked-user-warning-dismissal`

Dismiss blocked user warning in a channel.

**Response `204`:** No content.

---

## 80. Channel Recipient Batch

### `POST /channels/recipients/@me/batch-reject`

Batch reject channel recipients (message requests).

**Request:**
```json
{
  "channel_ids": ["channel_id_1", "channel_id_2"]
}
```

**Response `204`:** No content.

---

## 81. Forum Tags (Extended)

### `POST /channels/{channelId}/tags`

Create a forum tag.

**Request:**
```json
{
  "name": "Bug",
  "moderated": false,
  "emoji_id": null,
  "emoji_name": "🐛"
}
```

**Response `200`:** Created tag object.

---

### `PATCH /channels/{channelId}/tags/{tagId}`

Update a forum tag.

**Request:** Same fields as create.

**Response `200`:** Updated tag.

---

### `DELETE /channels/{channelId}/tags/{tagId}`

Delete a forum tag.

**Response `204`:** No content.

---

## 82. Thread Members (Extended)

### `GET /channels/{channelId}/thread-members/{userId}`

Get a specific thread member.

**Response `200`:** Thread member object.

---

### `PATCH /channels/{channelId}/thread-members/@me/settings`

Update thread member settings.

**Request:**
```json
{
  "muted": true
}
```

**Response `200`:** Updated settings.

---

### `GET /channels/{channelId}/users/@me/threads/archived/private`

Get own archived private threads.

**Response `200`:**
```json
{
  "threads": [],
  "members": [],
  "has_more": false
}
```

---

## 83. Invite Friend Members

### `GET /invites/{code}/friend-members`

Get friends who are already in the invited server.

**Response `200`:** Array of member objects with friend info.

---

## 84. User Friend Invites

### `GET /users/@me/invites`

Get friend invite links.

**Response `200`:** Array of friend invite objects.

---

## 85. Tutorial Indicators

### `GET /tutorial/indicators`

Get tutorial indicator states.

**Response `200`:** Map of indicator IDs to states.

---

### `POST /tutorial/indicators/suppress`

Suppress all tutorial indicators.

**Response `204`:** No content.

---

### `PATCH /tutorial/indicators/{indicatorId}`

Update a tutorial indicator state.

**Request:**
```json
{
  "suppressed": true
}
```

**Response `204`:** No content.

---

## 86. Integrations (Global)

### `GET /integrations`

Get available integrations.

**Response `200`:** Array of integration objects.

---

### `PUT /integrations/{integrationId}/join`

Join an integration.

**Response `200`:** Integration membership.

---

### `GET /integrations/{integrationId}/search`

Search within an integration.

**Query params:** `query=search_term`

**Response `200`:** Search results.

---

## 87. User Unclaimed Games

### `GET /users/@me/unclaimed-games`

Get games available to claim (from Nitro).

**Response `200`:** Array of unclaimed game objects.

---

## 88. User Custom Themes

### `GET /users/@me/custom-themes`

Get custom themes.

**Response `200`:** Array of theme objects.

---

## 89. Platform Application & Roblox

### `GET /platform-application`

Get platform application info.

**Response `200`:** Platform application object.

---

### `GET /roblox-applications-supplemental-data`

Get Roblox supplemental application data.

**Response `200`:** Supplemental data.

---

### `GET /applications/non-games/detectable`

Get detectable non-game applications.

**Response `200`:** Array of application objects.

---

## 90. User Meaningfully Online

### `GET /users/@me/meaningfully-online`

Check if user has been meaningfully online.

**Response `200`:**
```json
{
  "meaningfully_online": true
}
```

---

## 91. User Pomelo (Username)

### `POST /users/@me/pomelo-suggestions`

Get username suggestions.

**Request:**
```json
{
  "global_name": "Display Name"
}
```

**Response `200`:**
```json
{
  "usernames": ["suggestion1", "suggestion2"]
}
```

---

### `POST /unique-username/username-suggestions-unauthed`

Get username suggestions (unauthenticated, during registration).

**Request:**
```json
{
  "global_name": "Display Name"
}
```

**Response `200`:** Same as above.

---

### `POST /users/@me/pomelo-attempt`

Attempt to claim a username (check availability).

**Request:**
```json
{
  "username": "desired_username"
}
```

**Response `200`:**
```json
{
  "taken": false
}
```

---

### `POST /unique-username/username-attempt-unauthed`

Check username availability (unauthenticated).

**Response `200`:** Same as above.

---

## 92. Quests

### `GET /quests/{questId}`

Get quest details.

**Response `200`:** Quest object with requirements, rewards, progress.

---

## 93. Account Revert

### `POST /wasntme/{token}`

Revert account compromise using token from email.

**Response `200`:** Revert result.

---

## 94. User Program Rewards

### `GET /users/@me/program-rewards`

Get program rewards.

**Response `200`:** Array of reward objects.

---

## 95. Partner Requirements

### `GET /partners/{guildId}/requirements`

Get Discord Partner requirements for a guild.

**Response `200`:** Requirements object.

---

## 96. SSO

### `POST /sso`

SSO login.

**Request:**
```json
{
  "ticket": "sso_ticket"
}
```

**Response `200`:** SSO redirect/token data.

---

### `POST /sso-token`

Get an SSO token.

**Response `200`:**
```json
{
  "token": "sso_token"
}
```

---

## 97. WebAuthn (Extended)

### `POST /users/@me/mfa/webauthn/credentials`

Register a new WebAuthn credential (security key).

**Response `200`:** Registration challenge.

---

### `DELETE /users/@me/mfa/webauthn/credentials/{credId}`

Delete a WebAuthn credential.

**Response `204`:** No content.

---

### `GET /auth/conditional/start`

Start a WebAuthn conditional UI challenge.

**Response `200`:** Challenge object.

---

### `POST /auth/conditional/finish`

Complete WebAuthn conditional UI login.

**Request:** Authenticator assertion response.

**Response `200`:**
```json
{
  "token": "user_token"
}
```

---

### `GET /auth/passwordless/start`

Start a passwordless authentication challenge.

**Response `200`:** Challenge object.

---

## 98. MFA SMS

### `POST /users/@me/mfa/sms/enable`

Enable SMS MFA.

**Request:**
```json
{
  "password": "current_password",
  "phone": "+1234567890"
}
```

**Response `200`:** Enable result.

---

### `POST /users/@me/mfa/sms/disable`

Disable SMS MFA.

**Request:**
```json
{
  "code": "123456"
}
```

**Response `200`:** Disable result.

---

### `POST /auth/verify/view-backup-codes-challenge`

Send a verification key to view backup codes.

**Response `200`:** Challenge result.

---

## 99. TOTP (Extended)

### `POST /users/@me/mfa/totp/enable/verify`

Verify TOTP enable step.

**Request:**
```json
{
  "code": "123456"
}
```

**Response `200`:** Verification result.

---

### `POST /users/@me/mfa/totp/enable/resend`

Resend TOTP enable verification.

**Response `204`:** No content.

---

## 100. OAuth2 (Extended)

### `POST /oauth2/authorize/samsung`

Samsung OAuth2 authorize.

**Response `200`:** Authorization URL.

---

### `POST /oauth2/authorize/samsung/callback`

Samsung OAuth2 callback.

**Response `200`:** Auth result.

---

### `GET /oauth2/authorize/webhook-channels`

Get channels eligible for webhook authorization.

**Response `200`:** Array of channel objects.

---

### `POST /oauth2/device/verify`

Verify a device code.

**Request:**
```json
{
  "user_code": "ABCD-1234"
}
```

**Response `200`:** Verification result.

---

### `POST /oauth2/device/finish`

Complete device authorization.

**Response `200`:** Auth result.

---

### `POST /oauth2/allowlist/accept`

Accept OAuth2 allowlist.

**Response `204`:** No content.

---

## 101. Connections (Extended)

### `GET /connections/{platform}/callback/session-handoff`

Session handoff callback for connections.

**Response `200`:** Session data.

---

### `GET /users/@me/connections/{platform}/{accountId}/access-token`

Get access token for a linked connection.

**Response `200`:**
```json
{
  "access_token": "token_here"
}
```

---

### `POST /connections/{platform}/link-dispatch-auth-callback`

Link dispatch auth callback.

**Response `200`:** Callback result.

---

### `POST /users/@me/connections/contacts/@me/external-friend-list-entries`

Sync external contacts (phone contacts).

**Request:**
```json
{
  "contacts": [{ "phone": "+1234567890", "name": "John" }]
}
```

**Response `200`:** Matched users.

---

## 102. Xbox

### `POST /consoles/xbox-handoff`

Xbox console handoff.

**Response `200`:** Handoff data.

---

## 103. Billing Popup Bridge

### `GET /billing/popup-bridge/{provider}`

Get billing popup bridge for a payment provider.

**Response `200`:** Bridge configuration.

---

### `POST /billing/popup-bridge/{provider}/callback`

Billing popup bridge callback.

**Response `200`:** Callback result.

---

## 104. Changelogs

### `GET /changelogs/@me/messages`

Get Discord changelog messages.

**Response `200`:** Array of changelog entry objects.

---

## 105. Reports (Extended)

### `POST /reports`

Report content (v2).

**Request:**
```json
{
  "channel_id": "channel_id",
  "message_id": "message_id",
  "reason": 1,
  "variant": "2"
}
```

**Response `200`:**
```json
{
  "id": "report_id"
}
```

---

### `POST /reports/channels/{channelId}/messages/{messageId}`

Report a stage/live message.

**Request:**
```json
{
  "reason": 1
}
```

**Response `200`:** Report object.

---

### `GET /report/options`

Get available report reasons/options.

**Response `200`:** Array of report option objects.

---

## 106. Data Harvest (GDPR)

### `GET /users/@me/harvest`

Request or check status of a data download.

**Response `200`:**
```json
{
  "created_at": "2024-01-01T00:00:00.000Z",
  "completed_at": null,
  "expires_at": null,
  "download_url": null
}
```

---

## 107. Storefront Interactions

### `POST /applications/storefront/interactions/premium-button/{appId}`

Track a premium button interaction in a storefront.

**Response `204`:** No content.

---

### `GET /storefront/collections/{collectionId}`

Get a storefront collection with products.

**Response `200`:** Collection with product array.

---

### `GET /storefront/products/sku/{skuId}`

Get a product by SKU ID.

**Response `200`:** Product object.

---

### `POST /storefront/products/skus`

Get multiple products by SKU IDs.

**Request:**
```json
{
  "sku_ids": ["sku_1", "sku_2"]
}
```

**Response `200`:** Array of product objects.

---

## 108. Generated Pools

### `GET /generated-pools/@me`

Get generated pools for current user.

**Response `200`:** Array of pool objects.

---

### `GET /generated-pools/{poolId}`

Get a specific generated pool.

**Response `200`:** Pool object.

---

### `POST /auth/login/generated-user/{poolId}`

Login as a generated user from a pool.

**Response `200`:**
```json
{
  "token": "user_token"
}
```

---

## 109. Gravity (Extended)

### `POST /users/@me/gravity-attachments`

Submit gravity attachments.

**Response `200`:** Attachment data.

---

### `POST /users/@me/gravity-attachments-upload`

Upload a gravity attachment.

**Response `200`:** Upload result.

---

### `GET /users/@me/gravity-icymi`

Get dehydrated gravity/ICYMI items.

**Response `200`:** Array of dehydrated item objects.

---

### `GET /users/@me/gravity-icymi-legacy`

Get legacy gravity items.

**Response `200`:** Array of legacy item objects.

---

### `POST /gravity-custom-guild-score`

Submit custom guild scores for recommendations.

**Request:**
```json
{
  "guild_scores": { "guild_id": 100 }
}
```

**Response `204`:** No content.

---

### `POST /gravity-custom-channel-scores`

Submit custom channel scores for recommendations.

**Request:**
```json
{
  "channel_scores": { "channel_id": 100 }
}
```

**Response `204`:** No content.

---

### `POST /guilds/gravity-join`

Join a guild via gravity recommendation.

**Request:**
```json
{
  "guild_id": "guild_id"
}
```

**Response `200`:** Join result.

---

## 110. Age Verification (Extended)

### `POST /users/@me/age-verification/check`

Reactive age verification check.

**Response `200`:**
```json
{
  "required": false
}
```

---

### `POST /users/@me/age-verification/reset`

Reset age verification.

**Response `204`:** No content.

---

## 111. Debug Logs

### `POST /debug-logs/{type}/{id}`

Submit a debug log entry.

**Request:** Debug log payload.

**Response `204`:** No content.

---

### `POST /debug-logs/multi/{type}`

Submit multiple debug log entries.

**Request:**
```json
{
  "entries": []
}
```

**Response `204`:** No content.

---

## 112. Metrics (Extended)

### `POST /metrics/v2`

Submit client metrics v2.

**Request:** Metrics payload.

**Response `204`:** No content.

---

## 113. Networking

### `GET /networking/token`

Get a networking token for WebRTC.

**Response `200`:**
```json
{
  "token": "networking_token",
  "ttl": 86400,
  "endpoint": "turn:xxx.discord.gg:443"
}
```

---

## 114. Guild Pincode

### `GET /guilds/{guildId}/pincode`

Get guild pincode (for parental controls).

**Response `200`:**
```json
{
  "pincode": "1234"
}
```

---

## 115. Guild MFA

### `POST /guilds/{guildId}/mfa`

Set guild MFA requirement level.

**Request:**
```json
{
  "level": 1
}
```

**Response `200`:** Updated guild object.

---

## 116. Guild Prune

### `GET /guilds/{guildId}/prune`

Get prune count (how many members would be removed).

**Query params:** `days=7`, `include_roles=role_id_1,role_id_2`

**Response `200`:**
```json
{
  "pruned": 42
}
```

---

### `POST /guilds/{guildId}/prune`

Begin guild prune.

**Request:**
```json
{
  "days": 7,
  "include_roles": ["role_id"],
  "compute_prune_count": true
}
```

**Response `200`:**
```json
{
  "pruned": 42
}
```

---

### `POST /guilds/{guildId}/prune/v2`

Begin guild prune v2.

**Request:** Same as above.

**Response `200`:** Same as above.

---

## 117. DM Settings Upsell

### `POST /users/@me/guilds/{guildId}/member/ack-dm-upsell-settings`

Acknowledge DM upsell settings.

**Response `204`:** No content.

---

## 118. Scheduled Events

### `GET /guilds/{guildId}/scheduled-events`

Get guild scheduled events.

**Response `200`:**
```json
[
  {
    "id": "event_id",
    "guild_id": "guild_id",
    "channel_id": "channel_id",
    "name": "Event Name",
    "description": "Event description",
    "scheduled_start_time": "2024-01-01T20:00:00.000Z",
    "scheduled_end_time": "2024-01-01T22:00:00.000Z",
    "privacy_level": 2,
    "status": 1,
    "entity_type": 1,
    "entity_metadata": null,
    "creator": { "id": "user_id", "username": "..." },
    "user_count": 42
  }
]
```

**Event status:** `1` = Scheduled, `2` = Active, `3` = Completed, `4` = Cancelled
**Entity type:** `1` = Stage, `2` = Voice, `3` = External

---

## 119. Unverified Applications

### `GET /unverified-applications`

Get unverified applications.

**Response `200`:** Array of unverified app objects.

---

### `POST /unverified-applications/icons`

Upload icon for an unverified application.

**Request:** Multipart form with icon data.

**Response `200`:** Upload result.

---

## 120. Game Notification Settings

### `GET /users/@me/settings/game-notifications`

Get game notification settings.

**Response `200`:** Game notification config.

---

### `PATCH /users/@me/settings/game-notifications/overrides`

Update game notification overrides.

**Request:**
```json
{
  "game_id": { "enabled": false }
}
```

**Response `200`:** Updated overrides.

---

### `PATCH /users/@me/notification-settings/muted-games`

Update muted games settings.

**Response `200`:** Updated settings.

---

### `PATCH /users/@me/notification-settings/muted-games/{gameId}`

Update a specific muted game setting.

**Response `200`:** Updated setting.

---

## 121. User Consent & Agreements

### `POST /users/@me/consent`

Update consent settings.

**Request:**
```json
{
  "grant": ["personalization"],
  "revoke": []
}
```

**Response `200`:** Updated consent.

---

### `GET /users/@me/agreements`

Get user agreements.

**Response `200`:** Agreement objects.

---

## Client Routes (Frontend Navigation)

These are frontend-only routes used for navigation, not API endpoints:

| Constant | Path |
|----------|------|
| `ME` / `FRIENDS` | `/channels/@me` |
| `CHANNEL` | `/channels/{guildId}/{channelId}/{threadId?}` |
| `LOGIN` | `/login` |
| `REGISTER` | `/register` |
| `INVITE` | `/invite/{code}` |
| `GUILD_CREATE` | `/guilds/create` |
| `GUILD_SETTINGS` | `/guilds/{guildId}/settings/{section?}` |
| `GUILD_DISCOVERY` | `/guild-discovery` |
| `GLOBAL_DISCOVERY` | `/discovery` |
| `SETTINGS` | `/settings/{section}` |
| `COLLECTIBLES_SHOP` | `/shop` |
| `NITRO_HOME` | `/store` |
| `APPLICATION_LIBRARY` | `/library` |
| `ACTIVITY` | `/activity` |
| `FAMILY_CENTER` | `/family-center` |
| `QUEST_HOME` | `/quest-home` |
| `MESSAGE_REQUESTS` | `/message-requests` |
