/**
 * Discord connection icon URLs, extracted from Discord's webpack bundle.
 * Each entry maps an account.type string (as returned by the Discord API) to
 * the hashed asset URL Discord uses internally.
 *
 * Variants: light = for light backgrounds, dark = for dark backgrounds, white = monochrome white.
 * We default to the dark variant since the app uses a dark theme.
 *
 * These hashes are stable across Discord deploys for a given asset revision;
 * update them if icons ever appear broken.
 */

const BASE = 'https://discord.com/assets/';

type ConnectionIconSet = {
  light: string;
  dark: string;
  white: string;
};

const png = (light: string, dark: string, white: string): ConnectionIconSet => ({
  light: BASE + light,
  dark: BASE + dark,
  white: BASE + white,
});

export const CONNECTION_ICONS: Record<string, ConnectionIconSet> = {
  'twitch':         png('45900de231038a6d.png', '45900de231038a6d.png', '55f646919c7eb534.png'),
  'youtube':        png('c569f6e10f1fa390.png', 'c569f6e10f1fa390.png', '0239886372d77d66.png'),
  'spotify':        png('40518c6ced9fed93.png', '40518c6ced9fed93.png', 'f3288e96c3ab30d5.png'),
  'github':         png('1cc92a6d139af44d.png', '732989e3c998e808.png', '732989e3c998e808.png'),
  'twitter':        png('90d18081c2eb2ea3.png', 'afaf5671c31d4941.png', 'a212eba7ad371a00.png'),
  'reddit':         png('afc3f4fa75178004.png', 'afc3f4fa75178004.png', '66949f02754cd137.png'),
  'steam':          png('b68f2f4df4af9085.png', '07ca603d9273b502.png', '07ca603d9273b502.png'),
  'xbox':           png('8cea2073e188eabe.png', '09781ebf5509f48e.png', '09781ebf5509f48e.png'),
  'playstation':    png('ae74d3de4958bf78.png', '46a23515a87620b9.png', '46a23515a87620b9.png'),
  'facebook':       png('bda550439e2a1af0.png', 'bda550439e2a1af0.png', '55ca7707425e42e3.png'),
  'battlenet':      png('0e1a419c00a471a2.png', '0e1a419c00a471a2.png', '326a57b7fdf2308a.png'),
  'bluesky':        png('8a42ef6bc4dd4e0d.png', '8a42ef6bc4dd4e0d.png', 'ceaab85e3eb71d26.png'),
  'bungie':         png('9b762e8a42709cc4.png', 'a35b652323167799.png', 'a35b652323167799.png'),
  'leagueoflegends':png('fc30b78cd5e1db04.png', 'fc30b78cd5e1db04.png', '47b764b847a73432.png'),
  'epicgames':      png('e87d94bf0041b63e.png', 'ecf035f3cf08a860.png', 'ecf035f3cf08a860.png'),
  'riotgames':      png('fa9e14fc0fd3680f.png', 'fa9e14fc0fd3680f.png', 'ee5f981c3c32cc4f.png'),
  'roblox':         png('268c81933d752854.png', '5d078bf414a0124c.png', '5d078bf414a0124c.png'),
  'tiktok':         png('b4002d11fb3b5c1c.png', 'd585ec74cbd4c723.png', 'd585ec74cbd4c723.png'),
  'instagram':      png('ea0692691904fca9.png', 'ea0692691904fca9.png', 'c6d0f6e1ddd38c81.png'),
  'paypal':         png('81a39a4672d62d60.png', '81a39a4672d62d60.png', 'b13a242021b9a71c.png'),
  'ebay':           png('d0f7fa72a2ca6388.png', 'd0f7fa72a2ca6388.png', '51f41d99e4436442.png'),
  'mastodon':       png('53fcd6d102d44c2b.png', '53fcd6d102d44c2b.png', '11ecabee61ee2418.png'),
  'crunchyroll':    png('4e56bb1ecb9b9dc3.png', '4e56bb1ecb9b9dc3.png', '4e56bb1ecb9b9dc3.png'),
  'skype':          png('4f2cb7753e5d5e61.png', '4f2cb7753e5d5e61.png', '381eeae55b7ef780.png'),
  'samsung':        png('d50e7459b395e5d0.png', 'd50e7459b395e5d0.png', 'a6475d71846512c8.png'),
  'domain':         png('8d54a5919eb645f9.png', 'fe9b03f9b097e2a9.png', 'fe9b03f9b097e2a9.png'),
  'amazon-music':   png('cda6fb74e92e32f1.png', 'cda6fb74e92e32f1.png', 'cda6fb74e92e32f1.png'),
};

/** Returns the dark-variant icon URL for a connection type, or null if unknown. */
export function getConnectionIconUrl(type: string): string | null {
  return CONNECTION_ICONS[type]?.dark ?? null;
}
