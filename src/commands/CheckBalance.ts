import sc from 'slash-create';
import * as db from '../db.ts';
import * as util from '../util.ts';
import AutobumpSlashCommand from '../AutobumpSlashCommand.ts';

export default class CheckBalance extends AutobumpSlashCommand {
	constructor(creator: sc.BaseSlashCreator) {
		super(creator, {
			name: 'check_balance',
			description: 'check your bump balance',
			...util.defaultSlashCommandOptions,
		});
	}

	override async run(ctx: sc.CommandContext) {
		util.logInteraction(ctx);
		const user = await db.getUserByDiscordId(ctx.user.id);
		return { ephemeral: true, content: `you have ${user.bumps} bumps` };
	}
}
