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
	util.logError('SELFBOT_TOKEN env var required!');
	process.exit(1);
}

export const selfbot = new sb.Client({ presence: { status: 'invisible' } });
selfbot.login(process.env.SELFBOT_TOKEN).then(() =>
	util.log('selfbot logged in!')
);
selfbot.once('ready', () => util.log('selfbot ready!'));

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
			clearTimeout(handleStore[id][0]);
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
		if (userId === '239743430899531777')
			return ms;
		try {
			await db.deductBump(userId);
		} catch (err) {
			clearTimeout(handleStore[identifier][0]);
			delete handleStore[identifier];
			if (err === 'no bumps') {
				/* notify user that they ran out */
			} else {
				throw err;
			}
		}
		return ms;
	};

	const loop = (bumpDelayMs: number) => {
		assert(bumpDelayMs >= 1_000);
		handleStore[identifier] = [
			setTimeout(
				() =>
					bump(channel).then(deductBump).then(loop).catch(
						console.error,
					),
				bumpDelayMs,
			),
			Date.now() + bumpDelayMs, // timestamp of next bump
		];
	};

	loop(1_000);
	util.log(
		`started bumper for user=${userId} channel=${channelId} bumper=${bumperType}`,
	);
};
