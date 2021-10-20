import {
  ApplicationCommandInteractionDataOptionString,
  ApplicationCommandOptionType,
} from 'discord-api-types';
import type { Rating } from '.prisma/client';

import type Command from '../classes/Command';
import type Context from '../classes/Context';

const dare: Command = {
  name: 'dare',
  description: 'Gives a dare that has to be completed.',
  category: 'question',
  options: [
    {
      type: ApplicationCommandOptionType.String,
      name: 'rating',
      description: 'The maturity level of the topics the question can relate to.',
      choices: [
        { name: 'PG', value: 'PG' },
        { name: 'PG13', value: 'PG13' },
        { name: 'R', value: 'R' },
      ],
    },
  ],
  perms: [],
  run: async (ctx: Context): Promise<void> => {
    const channelSettings = await ctx.channelSettings;
    const rating = (ctx.getOption('rating') as ApplicationCommandInteractionDataOptionString)
      ?.value;
    const dare = await ctx.client.database.getRandomQuestion(
      'DARE',
      channelSettings.disabledRatings,
      rating as Rating
    );
    ctx.reply({
      embeds: [
        {
          title: dare.question,
          color: ctx.client.COLORS.BLUE,
          footer: dare.id
            ? {
                text: `Type: ${dare.type} | Rating: ${dare.rating} | ID: ${dare.id}`,
              }
            : null,
        },
      ],
    });
  },
};

export default dare;
