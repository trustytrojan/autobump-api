import { app } from './express.ts';
import stripe from 'stripe';
import * as util from './util.ts';
import EventEmitter from 'node:events';
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
	`https://buy.stripe.com/bIY1530pP4gI4XCdQR?client_reference_id=${discordUserId}`;

// Define the event map interface
interface StripeEventMap {
	'payment_intent.succeeded': [stripe.PaymentIntent];
	'payment_intent.failed': [stripe.PaymentIntent];
	'charge.succeeded': [stripe.Charge];
	'charge.failed': [stripe.Charge];
	'checkout.session.completed': [stripe.Checkout.Session];
	// Add other Stripe event types as needed
}

export const events = new EventEmitter<StripeEventMap>();

app.post('/stripe', (req, res) => {
	const signature = req.headers['stripe-signature'];
	if (!signature) {
		util.log(`stripe webhook signature not present, returning 400`);
		return void res.sendStatus(400);
	}

	let event: stripe.Event;
	try {
		event = stripe.webhooks.constructEvent(req.body, signature, endpointSecret);
	} catch (err) {
		util.log(`stripe webhook signature verification failed: ${err.message}`);
		return void res.sendStatus(400);
	}

	util.log(`event received: ${event.type}`);
	events.emit(event.type as keyof StripeEventMap, event.data.object as any);
	res.json({ received: true });
});

util.log('Stripe webhook listener registered');
