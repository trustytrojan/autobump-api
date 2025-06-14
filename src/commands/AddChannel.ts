import sc from 'slash-create';
import * as db from '../db.ts';
import * as util from '../util.ts';

export default class AddChannel extends sc.SlashCommand {
	constructor(creator: sc.BaseSlashCreator) {
		super(creator, {
			name: 'add_channel',
			description: 'create an autobump channel',
			options: [
				{
					type: sc.CommandOptionType.CHANNEL,
					name: 'channel',
					description: 'channel to add',
					channel_types: [sc.ChannelType.GUILD_TEXT],
					required: true,
				},
				{
					type: sc.CommandOptionType.STRING,
					name: 'bumper',
					description: 'the type of bump bot to automate',
					choices: [
						{ name: 'DISBOARD', value: 'disboard' },
						{ name: 'DiscordHome', value: 'discordhome' },
						{ name: 'Discodus', value: 'discodus' },
					],
					required: true,
				},
			],
			...util.defaultSlashCommandOptions,
		});
	}

	override async run(ctx: sc.CommandContext) {
		util.logInteraction(ctx);
		const { channel: channelId, bumper } = ctx.options;
		const msg: sc.MessageOptions = { ephemeral: true, content: '' };

		if (!channelId || !bumper) {
			msg.content += 'a required option is missing!\n';
			return msg;
		}

		const r = await db.addChannel({
			discordUserId: ctx.user.id,
			discordChannelId: channelId,
			bumper,
		});

		if (!r.acknowledged) {
			msg.content +=
				'an error occurred when creating a channel record, try again\n';
			return msg;
		}

		msg.content += 'successfully created channel record!\n';
		return msg;
	}
}
