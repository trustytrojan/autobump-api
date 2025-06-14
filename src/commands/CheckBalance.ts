import sc from 'slash-create';
import * as db from '../db.ts';
import * as util from '../util.ts';

export default class CheckBalance extends sc.SlashCommand {
	constructor(creator: sc.BaseSlashCreator) {
		super(creator, {
			name: 'check_balance',
			description: 'check your bump balance',
			...util.defaultSlashCommandOptions,
		});
	}

	override async run(ctx: sc.CommandContext): Promise<string> {
		util.logInteraction(ctx);

		const user = await db.getUserByDiscordId(ctx.user.id);
		if (!user) {
			await db.registerUser(ctx.user.id);
			return this.run(ctx);
		}

		util.log('User retrieved:', user);
		return `you have ${user.bumps} bumps`;
	}
}
