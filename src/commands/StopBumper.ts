import sc from 'slash-create';
import * as db from '../db.ts';
import * as util from '../util.ts';
import * as autobump from '../autobump.ts';

export default class StopBumper extends sc.SlashCommand {
	constructor(creator: sc.BaseSlashCreator) {
		super(creator, {
			name: 'stop_bumper',
			description: 'stop a running autobumper',
			options: [
				{
					type: sc.CommandOptionType.STRING,
					name: 'id',
					description: 'id of an autobump channel record to stop',
					required: true,
				},
				{
					type: sc.CommandOptionType.STRING,
					name: 'type',
					description:
						'bumper type to stop in the channel (if unspecified, stops all bumpers)',
					choices: [
						{ name: 'DISBOARD', value: 'disboard' },
						{ name: 'DiscordHome', value: 'discordhome' },
						{ name: 'Discodus', value: 'discodus' },
					],
				},
			],
			...util.defaultSlashCommandOptions,
		});
	}

	override async run(ctx: sc.CommandContext) {
		util.log(`user=${ctx.user.id} channel=${ctx.channelID}`);

		const { id, type } = ctx.options;

		const msg: sc.MessageOptions = { ephemeral: true, content: '' };

		if (!id) {
			msg.content += 'a required option is missing!\n';
			return msg;
		}

		const c = await db.getChannel(ctx.user.id, id);

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
