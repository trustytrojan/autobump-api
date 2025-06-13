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

const selfbot = new sb.Client({ presence: { status: 'invisible' } });
await selfbot.login(process.env.SELFBOT_TOKEN);
util.log('selfbot logged in!');
selfbot.once('ready', () => util.log('selfbot ready!'));

const handleStore: Record<
	string,
	'Deno' extends keyof typeof globalThis ? number : NodeJS.Timeout
> = {};

export const stopBumper = (channelId: string, bumperType?: string) => {
	if (!bumperType) {
		for (const btype of db.bumperTypes) {
			const id = `${channelId}-${btype}`;
			clearTimeout(handleStore[id]);
			delete handleStore[id];
		}
		return;
	}

	const identifier = `${channelId}-${bumperType}`;
	clearTimeout(handleStore[identifier]);
	delete handleStore[identifier];
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
		try {
			await db.deductBump(userId);
		} catch (err) {
			clearTimeout(handleStore[identifier]);
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
		handleStore[identifier] = setTimeout(
			() =>
				bump(channel).then(deductBump).then(loop).catch(console.error),
			bumpDelayMs,
		);
	};

	loop(1_000);
};
