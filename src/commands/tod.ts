import { ApplicationCommandOptionType } from 'discord-api-types';

import type { Mutable, OptionType } from '../classes/OptionTypes';
import type Command from '../classes/Command';
import type Context from '../classes/Context';

const options = [
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
] as const;

const tod: Command = {
  name: 'tod',
  description: 'Gives a random truth or dare question.',
  category: 'question',
  options,
  perms: [],
  run: async (ctx: Context): Promise<void> => {
    const channelSettings = await ctx.channelSettings;
    const type = Math.random() < 0.5 ? 'TRUTH' : 'DARE';
    const rating = (ctx.getOption('rating') as OptionType<Mutable<typeof options[0]>>)?.value;
    const result = await ctx.client.database.getRandomQuestion(
      type,
      channelSettings.disabledRatings,
      rating
    );
    ctx.reply({
      embeds: [
        {
          title: result.question,
          color: ctx.client.COLORS.BLUE,
          footer: result.id
            ? {
                text: `Type: ${result.type} | Rating: ${result.rating} | ID: ${result.id}`,
              }
            : null,
        },
      ],
    });
  },
};

export default tod;
