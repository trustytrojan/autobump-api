import sc from 'slash-create';
import * as db from '../db.ts';
import * as util from '../util.ts';
import * as myStripe from '../stripe.ts';

const FIVE_MINUTES = util.millisFrom({ minutes: 5 });

export default class BuyBumps extends sc.SlashCommand {
	constructor(creator: sc.BaseSlashCreator) {
		super(creator, {
			name: 'buy_bumps',
			description: 'buy more bumps',
			...util.defaultSlashCommandOptions,
		});
	}

	override async run(ctx: sc.CommandContext) {
		util.logInteraction(ctx);

		// call this to ensure the user is registered, otherwise the
		// handler in stripe.ts might break
		await db.getUserByDiscordId(ctx.user.id);

		const initialResp = await ctx.send({
			content: `you can buy 100 bumps for $1 here: ${
				myStripe.paymentLinkFor(
					ctx.user.id,
				)
			}
this is a reusable link. do NOT share this payment link with anyone else, any purchases made with it count towards YOUR balance!`,
			ephemeral: true,
		});

		let msg: sc.Message | undefined;
		if (initialResp === true)
			msg = await ctx.fetch();
		else if (initialResp instanceof sc.Message)
			msg = initialResp;
		else
			msg = initialResp.resource?.message;
		if (!msg)
			return `something went wrong, please try again`;

		const completedHandler = (
			bumps: number,
			discordUserId: string,
		) => {
			if (discordUserId !== ctx.user.id)
				return;
			msg.edit(
				`checkout completed! **${bumps}** bumps added to your balance!`,
			);
			clearTimeout(timeout);
		};

		const timeout = setTimeout(() => {
			myStripe.events.off(
				'bumps',
				completedHandler,
			);
			ctx.send(`checkout session timed out for user ${ctx.user.id}`);
		}, FIVE_MINUTES);

		myStripe.events.on(
			'bumps',
			completedHandler,
		);
	}
}
