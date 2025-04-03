import sc from 'slash-create';
import * as db from '../db.ts';
import * as util from '../util.ts';

export default class CheckBalance extends sc.SlashCommand {
	constructor(creator: sc.BaseSlashCreator) {
		super(creator, {
			name: 'check_balance',
			description: 'check your bump balance',
			...util.defaultSlashCommandOptions
		});
	}

	async run(ctx: sc.CommandContext) {
		util.log(`user=${ctx.user.id} channel=${ctx.channelID}`);
		const user = await db.getUser(ctx.user.id);
		if (!user) {
			await db.registerUser(ctx.user.id);
			return this.run(ctx);
		}
		util.log(`User retrieved: ${user}`);
		return `you have ${user.bumps} bumps`;
	}
}
