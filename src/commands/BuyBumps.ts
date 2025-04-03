import sc from 'slash-create';
import * as db from '../db.ts';
import * as util from '../util.ts';
import * as myStripe from '../stripe.ts';
import stripe from 'stripe';

const FIVE_MINUTES = 5 * 60;

export default class BuyBumps extends sc.SlashCommand {
	constructor(creator: sc.BaseSlashCreator) {
		super(creator, {
			name: 'buy_bumps',
			description: 'buy more bumps',
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

		const initialResp = await ctx.send({
			content: `you can buy 100 bumps for $1 here: ${myStripe.paymentLinkFor(ctx.user.id)}
this is a reusable link. do NOT share this payment link with anyone else, any purchases made with it count towards YOUR balance!`,
			ephemeral: true
		});

		let msg: sc.Message | undefined;
		if (initialResp === true) msg = await ctx.fetch();
		else if (initialResp instanceof sc.Message) msg = initialResp;
		else msg = initialResp.resource?.message;
		if (!msg) {
			return `something went wrong, please try again`;
		}

		const checkoutSessionCompletedHandler = (cs: stripe.Checkout.Session) => {
			if (cs.client_reference_id !== ctx.user.id)
				// we got someone else's checkout session, hopefully they have a handler for it...
				return;
			clearTimeout(timeout);
			if (!cs.line_items) {
				util.log(`cs.line_items is undefined`);
				return msg.edit('something went wrong... (nothing was purchased)');
			}
			const [lineItem] = cs.line_items.data.filter(li => li.price?.product === myStripe._100_BUMPS_PRODUCT_ID);
			if (!lineItem.quantity) {
				util.log(`lineItem.quantity is null`);
				return msg.edit('something went wrong... (nothing was purchased)');
			}
			const bumpsToAdd = lineItem.quantity * 100;
			msg.edit(`checkout completed! **${bumpsToAdd}** bumps added to your balance!`);
		};

		const timeout = setTimeout(() => {
			myStripe.events.off('checkout.session.completed', checkoutSessionCompletedHandler);
			ctx.send('checkout session timed out!');
		}, FIVE_MINUTES);

		myStripe.events.on('checkout.session.completed', checkoutSessionCompletedHandler);
		// the handler & timeout do the rest
	}
}
