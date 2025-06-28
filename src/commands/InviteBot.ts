import sc from 'slash-create';
import sb from 'discord.js-selfbot-v13';
import * as util from '../util.ts';
import * as autobump from '../autobump.ts';
import AutobumpSlashCommand from '../AutobumpSlashCommand.ts';

export default class Ping extends AutobumpSlashCommand {
	constructor(creator: sc.BaseSlashCreator) {
		super(creator, {
			name: 'invite_bot',
			description: 'invite the autobump bot to your server',
			options: [
				{
					type: sc.CommandOptionType.STRING,
					name: 'invite_link',
					description:
						'invite link to your server (make sure it bypasses join applications!)',
					required: true,
				},
			],
			...util.defaultSlashCommandOptions,
		});
	}

	override async run(ctx: sc.CommandContext) {
		util.logInteraction(ctx);
		const { invite_link } = ctx.options;
		const msg: sc.MessageOptions = { ephemeral: true };

		const guild = await autobump.selfbot.acceptInvite(invite_link, {
			bypassOnboarding: true,
			bypassVerify: true,
		});

		if (!(guild instanceof sb.Guild)) {
			await guild.delete();
			msg.content = `this is not a server invite link!`;
			return msg;
		}

		msg.content =
			`the bot has joined your server **${guild.name}**! make sure you give it the permissions necessary to use application commands!`;
		return msg;
	}
}
