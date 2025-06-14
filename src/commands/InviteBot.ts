import sc from 'slash-create';
import sb from 'discord.js-selfbot-v13';
import * as util from '../util.ts';
import * as autobump from '../autobump.ts'

export default class Ping extends sc.SlashCommand {
	constructor(creator: sc.BaseSlashCreator) {
		super(creator, {
			name: 'invite_bot',
			description: 'invite the autobump bot to your server',
			options: [
				{
					type: sc.CommandOptionType.STRING,
					name: 'invite_link',
					description: 'invite link to your server',
					required: true,
				}
			],
			...util.defaultSlashCommandOptions,
		});
	}

	override async run(ctx: sc.CommandContext) {
		util.logInteraction(ctx);
		const { invite_link } = ctx.options;

		const guild = await autobump.selfbot.acceptInvite(invite_link, { bypassOnboarding: true, bypassVerify: true });
		if (!(guild instanceof sb.Guild)) {
			await guild.delete();
			return `this is not a server invite link!`;
		}

		return `the bot has joined your server **${guild.name}**!`;
	}
}
