import sc from 'slash-create';
import * as db from '../db.ts';
import * as util from '../util.ts';

export default class ListChannels extends sc.SlashCommand {
	constructor(creator: sc.BaseSlashCreator) {
		super(creator, {
			name: 'list_channels',
			description: 'list your autobump channels',
			...util.defaultSlashCommandOptions,
		});
	}

	override async run(ctx: sc.CommandContext) {
		util.log(`user=${ctx.user.id} channel=${ctx.channelID}`);

		const channelsCursor = db.getChannelsForUser(ctx.user.id);

		const embed: sc.MessageEmbedOptions = {
			title: `Channels for @${ctx.user.username}`,
			description: '',
		};

		const msg: sc.MessageOptions = { ephemeral: true, embeds: [embed] };

		if (!(await channelsCursor.hasNext())) {
			embed.description = 'No channels found';
			return msg;
		}

		for await (const c of channelsCursor) {
			embed.description +=
				`\`${c._id}\` <#${c.discordChannelId}> \`${c.bumper}\`\n`;
		}

		return msg;
	}
}
