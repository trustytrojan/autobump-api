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
					name: 'channel',
					description: 'channel to start autobumping in',
					required: true,
					autocomplete: true,
				},
			],
			...util.defaultSlashCommandOptions,
		});
	}

	override async autocomplete(ctx: sc.AutocompleteContext): Promise<sc.AutocompleteChoice[]> {
		if (ctx.focused !== 'channel') return [];
		return db.autocompleteChannels(ctx.user.id);
	}

	override async run(ctx: sc.CommandContext) {
		util.logInteraction(ctx);
		const { channel: id } = ctx.options;
		const msg: sc.MessageOptions = { ephemeral: true, content: '' };

		const c = await db.getChannelById(id);
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
