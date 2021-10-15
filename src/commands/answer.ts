import {
  ApplicationCommandInteractionDataOptionString,
  ApplicationCommandOptionType,
} from 'discord-api-types';
import Context from '../classes/Context';
import Command from '../classes/Command';

const answer: Command = {
  name: 'answer',
  description: 'Answers a paranoia question sent to you',
  category: 'question',
  options: [
    {
      type: ApplicationCommandOptionType.String,
      name: 'answer',
      description: 'The answer to the paranoia question',
      required: true,
    },
  ],
  perms: [],
  run: async (ctx: Context): Promise<void> => {
    const paranoiaAnswer = (
      ctx.getOption('answer') as ApplicationCommandInteractionDataOptionString
    )?.value;

    if (ctx.guildId)
      return ctx.reply(
        `${ctx.client.EMOTES.xmark} Paranoia questions can only be answered in DMs.`
      );

    const paranoiaData = await ctx.client.database.getNextParanoia(ctx.user.id);
    if (!paranoiaData)
      return ctx.reply(`${ctx.client.EMOTES.xmark} You don't have any active paranoia questions.`);

    // send answer to the channel the question was sent from
    const message = await ctx.client.functions.sendMessage(
      {
        embeds: [
          {
            author: {
              name: `${ctx.user.username}#${ctx.user.discriminator}`,
              icon_url: ctx.client.functions.avatarURL(ctx.user),
            },
            title: `Paranoia Answer`,
            color: ctx.client.COLORS.BLUE,
            fields: [
              {
                name: 'Question:',
                value:
                  Math.random() < 0.5
                    ? paranoiaData.questionText
                    : `The user got lucky, question wasn't shared.`,
              },
              {
                name: `${ctx.user.username}'s Answer:`,
                value: paranoiaAnswer.slice(0, 1021) + (paranoiaAnswer.length > 1021 ? '...' : ''),
              },
            ],
          },
        ],
      },
      paranoiaData.channelId,
      ctx.client.token
    );
    if (!message)
      return ctx.reply({
        embeds: [
          ctx.client.functions.embed(
            `Message failed to send, please make sure I can send messages in <#${paranoiaData.channelId}> and then try again.`,
            ctx.user,
            true
          ),
        ],
      });

    const editedMessage = await ctx.client.functions.editMessage(
      {
        embeds: [
          {
            title: 'Question answered: ' + paranoiaData.questionText,
            color: ctx.client.COLORS.GREEN,
            description: `Check it out in <#${paranoiaData.channelId}>`,
            footer: {
              text: `Type: PARANOIA | Rating: ${paranoiaData.questionRating} | ID: ${paranoiaData.questionId}`,
            },
          },
        ],
      },
      ctx.channelId,
      paranoiaData.dmMessageId,
      ctx.client.token
    );
    if (!editedMessage)
      ctx.client.console.warn(
        `Paranoia message edit failed in channel: ${ctx.channelId} with user: ${ctx.user.id} on message: ${paranoiaData.dmMessageId}`
      );

    await ctx.client.database.removeParanoiaQuestion(paranoiaData.id);

    ctx.reply(`${ctx.client.EMOTES.checkmark} Answer sent!`);

    // fetch the next queued question, if there is one
    const nextQuestion = await ctx.client.database.getNextParanoia(ctx.user.id);
    if (!nextQuestion) return;

    const guild = await ctx.client.functions.fetchGuild(nextQuestion.guildId, ctx.client.token);
    if (!guild) ctx.client.console.warn(`Failed to fetch guild: ${nextQuestion.guildId}`);

    const nextMessage = await ctx.client.functions.sendMessage(
      {
        embeds: [
          {
            title: nextQuestion.questionText,
            color: ctx.client.COLORS.BLUE,
            description: `Use \`/answer\` to answer this question.\n\nQuestion sent from **${
              guild.name || `Unknown Guild (${nextQuestion.guildId})`
            }** <#${nextQuestion.channelId}>.`,
            footer: {
              text: `Type: PARANOIA | Rating: ${nextQuestion.questionRating} | ID: ${nextQuestion.questionId}`,
            },
          },
        ],
      },
      ctx.channelId,
      ctx.client.token
    );
    if (!nextMessage)
      return ctx.client.console.error(
        `Paranoia next question failed in channel: ${ctx.channelId} with user: ${ctx.user.id}`
      );

    await ctx.client.database.setParanoiaMessageId(nextQuestion.id, nextMessage.id);
  },
};

export default answer;