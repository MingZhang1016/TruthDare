import {
  RESTPostAPICurrentUserCreateDMChannelResult,
  APIInteractionResponseCallbackData,
  RESTPostAPIChannelMessageJSONBody,
  RESTPatchAPIChannelMessageResult,
  RESTPostAPIChannelMessageResult,
  RESTGetAPIGuildChannelsResult,
  RESTGetAPIChannelResult,
  RESTGetAPIGuildResult,
  PermissionFlagsBits,
  ComponentType,
  ButtonStyle,
  APIEmbed,
  RESTPatchAPIInteractionFollowupJSONBody,
} from 'discord-api-types/v9';
import superagent from 'superagent';

import { RESTGetAPIApplicationEntitlementsResult } from '../types/premium';
import type Command from './Command';
import type Context from './Context';
import Client from './Client';

export type Permission =
  | keyof typeof PermissionFlagsBits
  | typeof PermissionFlagsBits[keyof typeof PermissionFlagsBits];

// bad design with side effect & return type
export function checkPerms(command: Command, ctx: Context) {
  if (!ctx.member) return true;
  const required = command.perms
    .map(perm => (typeof perm === 'bigint' ? perm : PermissionFlagsBits[perm]))
    .reduce((a, c) => a | c, 0n);
  const missing = required & ~BigInt(ctx.member.permissions);
  const missingNames = Object.keys(PermissionFlagsBits).filter(
    key => PermissionFlagsBits[key as keyof typeof PermissionFlagsBits] & missing
  );
  if (missing) {
    ctx.reply({
      embeds: [
        embed(
          `You are missing the following required permissions: ${missingNames
            .map(p => '`' + p.replaceAll(/([a-z])([A-Z])/g, '$1 $2') + '`')
            .join(', ')}`,
          ctx.user,
          true
        ),
      ],
      flags: 1 << 6,
    });
    return false;
  }
  return true;
}

export function hasPermission(permission: Permission, permissions?: string) {
  if (!permissions) return true;
  const required = typeof permission === 'bigint' ? permission : PermissionFlagsBits[permission];
  const missing = required & ~BigInt(permissions);
  return !missing;
}

export function avatarURL({
  id,
  avatar,
  discriminator,
}: {
  id: string;
  avatar: string | null;
  discriminator: string;
}) {
  return (
    'https://cdn.discordapp.com/' +
    (avatar
      ? `avatars/${id}/${avatar}.${avatar.startsWith('_a') ? 'gif' : 'png'}`
      : `/embed/avatars/${Number(discriminator) % 5}.png`)
  );
}

export function embed(
  description: string,
  user?: { id: string; username: string; avatar: string | null; discriminator: string },
  fail: boolean | null = null
): APIEmbed {
  return {
    description: `${
      fail ? Client.EMOTES.xmark : fail !== null ? Client.EMOTES.checkmark : ''
    } ${description}`,
    author: user
      ? {
          name: `${user.username}#${user.discriminator}`,
          icon_url: avatarURL(user),
        }
      : undefined,
    color: fail ? Client.COLORS.RED : fail === null ? Client.COLORS.BLUE : Client.COLORS.GREEN,
  };
}

export function deepEquals(obj1: any, obj2: any, ignoreList: string[] = []): boolean {
  return (
    typeof obj1 === typeof obj2 &&
    Array.isArray(obj1) === Array.isArray(obj2) &&
    (obj1 !== null && typeof obj1 === 'object'
      ? Array.isArray(obj1)
        ? obj1.length === obj2.length && obj1.every((a, i) => deepEquals(a, obj2[i], ignoreList))
        : Object.keys(obj1).every(key => {
            return (
              ignoreList.includes(key) ||
              (key in obj2 && deepEquals(obj1[key], obj2[key], ignoreList))
            );
          })
      : obj1 === obj2)
  );
}

export function deepCopy<T>(obj: T): T {
  return (
    Array.isArray(obj)
      ? obj.map(a => deepCopy(a))
      : typeof obj === 'object' && obj !== null
      ? Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, deepCopy(v)]))
      : obj
  ) as T;
}

export function titleCase(str: string): string {
  return str.slice(0, 1).toUpperCase() + str.slice(1).toLowerCase();
}

export function legacyPremiumAd(): APIInteractionResponseCallbackData {
  return {
    content:
      'This command requires Truth or Dare Premium! Upgrade now to get access to these features!',
    components: [
      {
        type: ComponentType.ActionRow,
        components: [
          {
            label: 'Upgrade',
            type: ComponentType.Button,
            url: 'https://truthordarebot.xyz/premium',
            style: ButtonStyle.Link,
          },
        ],
      },
    ],
  };
}

export function promoMessage(client: Client, isPremium?: boolean) {
  if (isPremium) return '';

  const promoMessages = [
    `${client.EMOTES.earth} You can now play Truth or Dare in [7 languages](https://docs.truthordarebot.xyz/setting-question-language)!`,
    `${client.EMOTES.arrowUp} Enjoying the bot? Consider [upvoting me](https://top.gg/bot/692045914436796436/vote)!`,
    `${client.EMOTES.sparkles} Want to stop repeating questions? Repeat prevention is a premium feature. Tap the "Upgrade" button on our profile on the desktop app for more.`,
    `${client.EMOTES.shushing_face} psst.. hide these messages with premium. tap the "Upgrade" button on our profile on the desktop app for more.`,
    `${client.EMOTES.running} Help us keep the bot up and running with premium! Tap the "Upgrade" button on our profile on the desktop app for more.`,
    `${client.EMOTES.technologist} Having fun? Support the development of new features with premium! Tap the "Upgrade" button on our profile on the desktop app for more.`,
    `${client.EMOTES.heart} Love the bot? You'll love it even more with premium! Tap the "Upgrade" button on our profile on the desktop app for more.`,
    `${client.EMOTES.bank} We run off donations, not your data. Get some awesome perks when you donate! Tap the "Upgrade" button on our profile on the desktop app for more.`,
    `${client.EMOTES.earth} You can play Truth or Dare in [7 languages](https://docs.truthordarebot.xyz/setting-question-language)!`,
  ];

  return Math.random() < 0.08
    ? promoMessages[Math.floor(Math.random() * promoMessages.length)]
    : '';
}

export async function sendMessage(
  data: RESTPostAPIChannelMessageJSONBody,
  channelId: string,
  token: string
): Promise<RESTPostAPIChannelMessageResult | null> {
  return await superagent
    .post(
      `${process.env.DISCORD_API_URL || 'https://discord.com'}/api/channels/${channelId}/messages`
    )
    .send(data)
    .set('Authorization', `Bot ${token}`)
    .then(res => res.body);
}

export async function editMessage(
  data: RESTPostAPIChannelMessageJSONBody,
  channelId: string,
  messageId: string,
  token: string
): Promise<RESTPatchAPIChannelMessageResult | null> {
  return await superagent
    .patch(
      `${
        process.env.DISCORD_API_URL || 'https://discord.com'
      }/api/channels/${channelId}/messages/${messageId}`
    )
    .send(data)
    .set('Authorization', `Bot ${token}`)
    .then(res => res.body);
}

export async function editInteractionResponse(
  data: RESTPatchAPIInteractionFollowupJSONBody,
  applicationId: string,
  interactionToken: string,
  messageId: string
): Promise<RESTPatchAPIChannelMessageResult | null> {
  return await superagent
    .patch(
      `${
        process.env.DISCORD_API_URL || 'https://discord.com'
      }/api/webhooks/${applicationId}/${interactionToken}/messages/${messageId}`
    )
    .send(data)
    .then(res => res.body);
}

export async function createDMChannel(
  userId: string,
  token: string
): Promise<RESTPostAPICurrentUserCreateDMChannelResult | null> {
  return await superagent
    .post(`${process.env.DISCORD_API_URL || 'https://discord.com'}/api/users/@me/channels`)
    .send({ recipient_id: userId })
    .set('Authorization', `Bot ${token}`)
    .then(res => res.body)
    .catch(_ => null);
}

export async function fetchGuild(
  guildId: string,
  token: string
): Promise<RESTGetAPIGuildResult | null> {
  return await superagent
    .get(`${process.env.DISCORD_API_URL || 'https://discord.com'}/api/guilds/${guildId}`)
    .set('Authorization', `Bot ${token}`)
    .then(res => res.body)
    .catch(_ => null);
}

export async function fetchChannel(
  channelId: string,
  token: string
): Promise<RESTGetAPIChannelResult | null> {
  return await superagent
    .get(`${process.env.DISCORD_API_URL || 'https://discord.com'}/api/channels/${channelId}`)
    .set('Authorization', `Bot ${token}`)
    .then(res => res.body)
    .catch(_ => null);
}

export async function fetchGuildChannels(
  guildId: string,
  token: string
): Promise<RESTGetAPIGuildChannelsResult | null> {
  return await superagent
    .get(`${process.env.DISCORD_API_URL || 'https://discord.com'}/api/guilds/${guildId}/channels`)
    .set('Authorization', `Bot ${token}`)
    .then(res => res.body)
    .catch(console.log);
}

export async function fetchApplicationEntitlements(
  guildId?: string,
  excludeEnded = true
): Promise<RESTGetAPIApplicationEntitlementsResult | null> {
  return await superagent
    .get(
      `${process.env.DISCORD_API_URL || 'https://discord.com'}/api/applications/${
        process.env.APPLICATION_ID
      }/entitlements?${guildId ? `guild_id=${guildId}&` : ''}exclude_ended=${excludeEnded}`
    )
    .set('Authorization', `Bot ${process.env.TOKEN}`)
    .then(res => res.body)
    .catch(console.log);
}
