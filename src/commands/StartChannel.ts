import sc from 'slash-create';
import * as db from '../db.ts';
import * as util from '../util.ts';
import * as autobump from '../autobump.ts';

export default class StartChannel extends sc.SlashCommand {
	constructor(creator: sc.BaseSlashCreator) {
		super(creator, {
			name: 'start_channel',
			description: 'start an autobumper on a channel',
			options: [
				{
					type: sc.CommandOptionType.STRING,
					name: 'id',
					description: 'id of an autobump channel to start',
					required: true,
				},
				{
					type: sc.CommandOptionType.STRING,
					name: 'token',
					description:
						'token of a discord USER account to use for bumping. tokens are NOT STORED.',
				},
			],
			...util.defaultSlashCommandOptions,
		});
	}

	override async run(ctx: sc.CommandContext) {
		util.log(`user=${ctx.user.id} channel=${ctx.channelID}`);

		const { id, token } = ctx.options;

		const msg: sc.MessageOptions = { ephemeral: true, content: '' };

		if (!id || !token) {
			msg.content += 'a required option is missing!\n';
			return msg;
		}

		const c = await db.getChannel(ctx.user.id, id);

		if (!c) {
			msg.content +=
				'channel does not exist! did you run /add_channel?\n';
			return msg;
		}

		try {
			await autobump.startBumper(
				ctx.user.id,
				c.discordChannelId,
				c.bumper,
			);
		} catch (err) {
			msg.content += `failed to start bumper! error: ${err}\n`;
			return msg;
		}

		msg.content += 'successfully started bumper!\n';
		return msg;
	}
}
