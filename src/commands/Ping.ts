import sc from 'slash-create';
import * as util from '../util.ts';
import AutobumpSlashCommand from '../AutobumpSlashCommand.ts';

export default class Ping extends AutobumpSlashCommand {
	constructor(creator: sc.BaseSlashCreator) {
		super(creator, {
			name: 'ping',
			description: 'ping',
			...util.defaultSlashCommandOptions,
		});
	}

	// deno-lint-ignore require-await
	override async run(ctx: sc.CommandContext) {
		util.logInteraction(ctx);
		return 'pong!';
	}
}
