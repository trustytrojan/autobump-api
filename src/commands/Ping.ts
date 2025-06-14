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

	override async run(ctx: sc.CommandContext) {
		util.logInteraction(ctx);
		return 'pong!';
	}
}
