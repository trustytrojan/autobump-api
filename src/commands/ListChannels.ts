import sc from 'slash-create';
import * as db from '../db.ts';
import * as util from '../util.ts';
import * as autobump from '../autobump.ts';
import AutobumpSlashCommand from '../AutobumpSlashCommand.ts';

export default class ListChannels extends AutobumpSlashCommand {
	constructor(creator: sc.BaseSlashCreator) {
		super(creator, {
			name: 'list_channels',
			description: 'list your autobump channels',
			...util.defaultSlashCommandOptions,
		});
	}

	override async run(ctx: sc.CommandContext) {
		util.logInteraction(ctx);

		const embed: sc.MessageEmbedOptions = {
			fields: [
				{ name: 'Channel', value: '', inline: true },
				{ name: 'Bumper', value: '', inline: true },
				{ name: 'Next bump', value: '', inline: true },
			],
		};

		const msg: sc.MessageOptions = { ephemeral: true, embeds: [embed] };
		const channelsCursor = db.getChannelsForUser(ctx.user.id);

		if (!(await channelsCursor.hasNext()))
			return 'you have not added any channels!';

		for await (const c of channelsCursor) {
			embed.fields![0].value += `\n<#${c.discordChannelId}>`;
			embed.fields![1].value += `\n${c.bumper}`;
			const nextBumpTime = autobump.getNextBumpTime(
				c.discordChannelId,
				c.bumper,
			);
			embed.fields![2].value += (nextBumpTime === -1)
				? `\nnot bumping`
				: `\n<t:${Math.floor(nextBumpTime / 1e3)}:R>`;
		}

		return msg;
	}
}
