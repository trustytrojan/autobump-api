import sb from 'discord.js-selfbot-v13';
import * as util from './util.ts';
import process from 'node:process';
import * as db from './db.ts';
import assert from 'node:assert';

/**
 * A function that performs a bump on a bumper bot and returns
 * the time needed to wait until the next bump.
 */
export type AutobumpFunction = (channel: sb.TextChannel) => Promise<number>;

if (!process.env.SELFBOT_TOKEN) {
	throw new Error('SELFBOT_TOKEN env var required!');
}

let adminUser: sb.User | undefined;

export const selfbot = new sb.Client({ presence: { status: 'invisible' } });
selfbot.login(process.env.SELFBOT_TOKEN)
	.then(() => util.log('selfbot logged in!'));
selfbot.once('ready', (selfbot) => {
	util.log('selfbot ready!');
	if (process.env.AUTOBUMP_ADMIN) {
		util.log('admin user will be notified of errors!');
		selfbot.users.fetch(process.env.AUTOBUMP_ADMIN).then((user) => {
			adminUser = user;
			process.on('uncaughtExceptionMonitor', (err) => {
				adminUser?.send(
					`**UNCAUGHT EXCEPTION** \`\`\`js\n${
						err.stack ?? err
					}\`\`\``,
				).catch((err) => console.error('failed to notify admin:', err));
			});
		}).catch(() => console.error('AUTOBUMP_ADMIN not provided'));
	}
});

export const notifyAdminOfError = (err: Error) =>
	adminUser?.send(
		`\`\`\`js\n${err.stack ?? err}\`\`\``,
	).catch((err) => console.error('failed to notify admin:', err));

type Timeout = 'Deno' extends keyof typeof globalThis ? number : NodeJS.Timeout;

const handleStore: Record<
	string, // 'channelid-bumper'
	[Timeout, number] // [timeout object, timestamp (ms) of next bump]
> = {};

// returns -1 if bumper not found
export const getNextBumpTime = (
	channelId: string,
	bumperType: db.BumperType,
) => {
	const identifier = `${channelId}-${bumperType}`;
	if (!(identifier in handleStore))
		return -1;
	return handleStore[identifier][1];
};

export const stopBumper = (channelId: string, bumperType?: db.BumperType) => {
	if (!bumperType) {
		for (const btype of db.bumperTypes) {
			const id = `${channelId}-${btype}`;
			clearTimeout(handleStore[id]?.[0]);
			delete handleStore[id];
		}
		util.log(`stopped all bumpers in channelId=${channelId}`);
		return;
	}

	const identifier = `${channelId}-${bumperType}`;
	clearTimeout(handleStore[identifier][0]);
	delete handleStore[identifier];
	util.log(`stopped bumper for channel=${channelId} bumper=${bumperType}`);
};

export const startBumper = async (
	userId: string,
	channelId: string,
	bumperType: db.BumperType,
) => {
	if (!selfbot.isReady())
		throw 'selfbot is not ready!';

	const channel = await selfbot.channels.fetch(channelId);

	if (!channel)
		throw 'channel does not exist!';

	if (!(channel instanceof sb.TextChannel))
		throw 'channel is not a guild text channel!';

	const identifier = `${channelId}-${bumperType}`;

	if (identifier in handleStore)
		throw `a ${bumperType} bumper is already running in this channel!`;

	const bump = await util.importBumper(bumperType);

	const deductBump = async (ms: number) => {
		if (userId === process.env.AUTOBUMP_ADMIN || process.env.DISABLE_STRIPE)
			return ms;

		try {
			await db.deductBump(userId);
		} catch (err) {
			assert(err instanceof Error);
			clearTimeout(handleStore[identifier][0]);
			delete handleStore[identifier];

			// notify user that they ran out of bumps
			if (err.message === 'user has no bumps')
				notifyUserNoBumps();

			// throw the error so that `loop` isn't called again
			throw err;
		}

		return ms;
	};

	const notifyUserNoBumps = () =>
		selfbot.users.fetch(userId).then((user) =>
			user.send(
				'**autobump: you ran out of bumps!** top up with the `/buy_bumps` command!',
			)
		).catch((err) =>
			console.error(
				`failed to notify user ${userId} that they ran out of bumps:`,
				err,
			)
		);

	const errorHandler = (err: unknown) => {
		assert(err instanceof Error);

		console.error(
			`autobump error: bumper=${bumperType} user=${userId} channel=${channelId}:`,
			err,
		);

		adminUser?.send(
			`\`\`\`js\n${err.stack ?? err}\`\`\``,
		).catch((err) => console.error('failed to notify admin:', err));

		// no need to notify user of "no bumps" error again
		if (err.message === 'user has no bumps')
			return;

		selfbot.users.fetch(userId).then((user) =>
			user.send(
				'**autobump error:** an error has occurred when trying to bump '
					+ `**${bumperType}** in <#${channelId}>: \`${err.message}\``
					+ '\nthe devs have been notified and will work on a fix soon.',
			)
		).catch((err) =>
			console.error(
				`failed to notify user ${userId} of error:`,
				err,
			)
		);
	};

	const autobumpChain = () =>
		bump(channel)
			.then(deductBump)
			.then(loop)
			.catch(errorHandler);

	/**
	 * Recursively calls `bump` and `deductBump` unless an error is thrown from either of them.
	 * @param bumpDelayMs Time until next bump in milliseconds
	 */
	const loop = (bumpDelayMs: number) => {
		assert(bumpDelayMs >= 1_000);
		handleStore[identifier] = [
			setTimeout(autobumpChain, bumpDelayMs),
			Date.now() + bumpDelayMs, // timestamp of next bump
		];
	};

	loop(1_000);
	util.log(
		`started bumper for user=${userId} channel=${channelId} bumper=${bumperType}`,
	);
};
