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

	override async autocomplete(ctx: sc.AutocompleteContext) {
		if (ctx.focused !== 'channel')
			return [];
		return db.autocompleteChannels(ctx.user.id);
	}

	override async run(ctx: sc.CommandContext) {
		util.logInteraction(ctx);
		const { channel: id } = ctx.options;
		const msg: sc.MessageOptions = { ephemeral: true };

		const c = await db.getChannelById(id);
		if (!c) {
			msg.content = 'channel does not exist! did you run /add_channel?\n';
			return 'channel does not exist! did you run /add_channel?\n';
		}

		try {
			await autobump.startBumper(
				ctx.user.id,
				c.discordChannelId,
				c.bumper,
			);
		} catch (err) {
			msg.content = `failed to start bumper! error: ${err}\n`;
			return msg;
		}

		const stopChannelCommandId = this.creator.commands.get(
			'1:global:stop_channel',
		)!.ids.get('global');
		msg.content =
			`successfully started bumper! you can stop it with </stop_channel:${stopChannelCommandId}>!`;
		return msg;
	}
}
