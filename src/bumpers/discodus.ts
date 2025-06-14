import assert from 'node:assert';
import Discord from 'discord.js-selfbot-v13';
import { log, millisFrom } from '../util.ts';

/**
 * Sends `/bump` to DISCODUS in `channel`.
 * @returns The time in milliseconds until we can `/bump` again.
 */
export default async function discodus(
	channel: Discord.TextChannel,
): Promise<number> {
	let msg;

	try {
		msg = await channel.sendSlash('1159147139960676422', 'bump');
	} catch {
		log(`Initial interaction failed, trying again in 1 minute`);
		return millisFrom({ minutes: 1 });
	}

	assert(msg instanceof Discord.Message);

	if (msg.embeds[0]?.description?.includes('already bumped')) {
		const match = msg.embeds[0].description.match(/<t:(\d+):R>/);
		if (!match)
			throw new Error('no match on cooldown message');
		const nextBumpSeconds = parseInt(match[1]);
		if (isNaN(nextBumpSeconds))
			throw new Error('timestamp parse failed');
		const nextBumpMillis = nextBumpSeconds * 1e3;
		const millisUntilNextBump = nextBumpMillis - Date.now();
		const hoursUntilNextBump = (millisUntilNextBump / 3.6e6) << 0;
		const minutesUntilNextBump = ((millisUntilNextBump / 6e4) << 0) % 60;
		log(
			`Need to wait ${hoursUntilNextBump}h ${minutesUntilNextBump}m to bump again!`,
		);
		// add 1 minute to be safe
		return millisUntilNextBump + millisFrom({ minutes: 1 });
	}

	log('Bumped!');
	return millisFrom({ hours: 2, minutes: 1 });
}
