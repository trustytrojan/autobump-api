import sc from 'slash-create';
import * as util from '../util.ts';

export default class Ping extends sc.SlashCommand {
	constructor(creator: sc.BaseSlashCreator) {
		super(creator, {
			name: 'ping',
			description: 'ping',
			...util.defaultSlashCommandOptions,
		});
	}

	override run(ctx: sc.CommandContext): any {
		util.log(`user=${ctx.user.id} channel=${ctx.channelID}`);
		return 'pong!';
	}
}
