import sc from 'slash-create';
import * as db from '../db.ts';
import * as util from '../util.ts';
import * as autobump from '../autobump.ts';

export default class StopChannel extends sc.SlashCommand {
	constructor(creator: sc.BaseSlashCreator) {
		super(creator, {
			name: 'stop_channel',
			description: 'stop a running autobumper',
			options: [
				{
					type: sc.CommandOptionType.STRING,
					name: 'channel',
					description: 'channel to stop autobumping in',
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
		const { id, type } = ctx.options;
		const msg: sc.MessageOptions = { ephemeral: true, content: '' };

		if (!id) {
			msg.content += 'a required option is missing!\n';
			return msg;
		}

		const c = await db.getChannelById(id);
		if (!c) {
			msg.content +=
				'channel does not exist! did you run /add_channel?\n';
			return msg;
		}

		autobump.stopBumper(ctx.channelID, type);
		msg.content += `successfully stopped bumper${type ? '' : 's'}!\n`;
		return msg;
	}
}
