import assert from 'node:assert';
import sb from 'discord.js-selfbot-v13';
import * as util from '../util.ts';

/**
 * Sends `/bump` to DISBOARD in `channel`.
 * @returns The time in milliseconds until we can `/bump` again.
 */
export default async function disboard(
	channel: sb.TextChannel,
): Promise<number> {
	let msg: sb.Message | sb.Modal;

	try {
		msg = await channel.sendSlash('302050872383242240', 'bump');
	} catch {
		util.log(`Initial interaction failed, trying again in 1 minute`);
		return util.millisFrom({ minutes: 1 });
	}

	assert(msg instanceof sb.Message);

	if (msg.content.startsWith('The DISBOARD API')) {
		util.log(`DISBOARD API is down... waiting a minute to try again`);
		return util.millisFrom({ minutes: 1 });
	}

	if (msg.embeds[0]?.description?.startsWith('Please wait')) {
		const match = msg.embeds[0].description.match(/(\d+) minutes/);
		if (!match)
			throw new Error('cooldown message changed');
		const minutesUntilNextBump = parseInt(match[1]);
		if (isNaN(minutesUntilNextBump))
			throw new Error('time parse failed');
		util.log(
			`Need to wait ${minutesUntilNextBump} minutes until bumping again!`,
		);
		// add 1 minute to be safe
		return util.millisFrom({ minutes: minutesUntilNextBump + 1 });
	}

	util.log('Bumped!');
	return util.millisFrom({ hours: 2, minutes: 1 });
}
