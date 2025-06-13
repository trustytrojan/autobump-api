import { app } from './express.ts';
import stripe from 'stripe';
import * as util from './util.ts';
import EventEmitter from 'node:events';
import process from 'node:process';
import * as db from './db.ts';
(await import('dotenv')).config();

const endpointSecret = process.env.STRIPE_SIG;
if (!endpointSecret) {
	util.logError('STRIPE_SIG env var required!');
	process.exit(1);
}

const apiKey = process.env.STRIPE_API;
if (!apiKey) {
	util.logError('STRIPE_API env var required!');
	process.exit(1);
}

export const api = new stripe(apiKey);

export const _100_BUMPS_PRODUCT_ID = 'prod_Rqr1U9gpvn0Too';

export const paymentLinkFor = (discordUserId: string) =>
	`https://buy.stripe.com/test_28odRf9ESfCAcxObII?client_reference_id=${discordUserId}`;

// Define the event map interface
interface StripeEventMap {
	'payment_intent.succeeded': [stripe.PaymentIntent];
	'payment_intent.failed': [stripe.PaymentIntent];
	'charge.succeeded': [stripe.Charge];
	'charge.failed': [stripe.Charge];
	'checkout.session.completed': [stripe.Checkout.Session];
	'bumps': [number]; // just for the command
}

export const events = new EventEmitter<StripeEventMap>();

app.post('/stripe', async (req, res) => {
	const rawBody = await util.readExpressRequest(req);

	const signature = req.headers['stripe-signature'];
	if (!signature) {
		util.log(`stripe webhook signature not present, returning 400`);
		return void res.sendStatus(400);
	}

	let event: stripe.Event;
	try {
		event = await stripe.webhooks.constructEventAsync(
			rawBody,
			signature,
			endpointSecret,
		);
	} catch (err) {
		util.log(
			`stripe webhook signature verification failed: ${
				(err as Error).message
			}`,
		);
		return void res.sendStatus(400);
	}

	util.log(`event received: ${event.type}`);
	events.emit(event.type as keyof StripeEventMap, event.data.object as any);
	res.json({ received: true });
});

events.on('checkout.session.completed', async (cs) => {
	const discordUserId = cs.client_reference_id!;

	cs = await api.checkout.sessions.retrieve(cs.id, {
		expand: ['line_items'],
	});

	if (!cs.line_items) {
		util.log(`cs.line_items is undefined`);
		return;
	}

	const [lineItem] = cs.line_items.data.filter(
		(li) => li.price?.product === _100_BUMPS_PRODUCT_ID,
	);

	if (!lineItem.quantity) {
		util.log(`lineItem.quantity is null`);
		return;
	}

	const bumpsToAdd = lineItem.quantity * 100;
	db.addBumps(discordUserId, bumpsToAdd);
	util.log(`user ${discordUserId} bought ${bumpsToAdd} bumps!`);
	events.emit('bumps', bumpsToAdd);
});

util.log('Stripe webhook listener registered');
