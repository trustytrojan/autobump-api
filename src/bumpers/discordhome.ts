import assert from 'node:assert';
import sb from 'discord.js-selfbot-v13';
import * as util from '../util.ts';

/**
 * Sends `/bump` to DH Bump in `channel`, and responds to the challenge.
 * @returns The time in milliseconds until we can `/bump` again.
 */
export default async function discordhome(
	channel: sb.TextChannel,
): Promise<number> {
	let msg: sb.Message | sb.Modal;

	try {
		msg = await channel.sendSlash('826100334534328340', 'bump');
	} catch {
		util.log(`/bump interaction failed, trying again in 1 minute`);
		return util.millisFrom({ minutes: 1 });
	}

	assert(msg instanceof sb.Message);
	const embed = msg.embeds[0];

	if (embed) {
		const { description, title } = embed;

		if (description?.includes('Unfortunately, ')) {
			const match = description.match(
				/(\d+)\s*hours?\s*(\d+)\s*minutes?/,
			);
			if (!match)
				throw new Error('DH Bump cooldown message has changed!');
			const hours = parseInt(match[1]),
				minutes = parseInt(match[2]) + 1;
			if (isNaN(hours) || isNaN(minutes))
				throw new Error('failed to parse time');
			util.log(`Need to wait ${hours}h ${minutes}m until bumping again!`);
			return util.millisFrom({ hours, minutes });
		}

		if (title === 'Bump Error!')
			throw new Error(embed.description!);

		// Sometimes it doesn't give a math challenge.
		if (
			description?.startsWith('Your server has been bumped successfully!')
		) {
			util.log('Bumped!');
			return util.millisFrom({ hours: 2, minutes: 1 });
		}
	}

	if (msg.content.includes('Please answer the question below')) {
		const mathExpression = msg.content
			.split('\n')[2]
			.replaceAll('*', '')
			.replaceAll('x', '*');

		if (!/^[0-9+\-*/()\s]+$/.test(mathExpression))
			throw new Error('Invalid math expression!');

		const result = eval(mathExpression);
		assert(typeof result === 'number');
		const buttonCustomId = msg.components[0].components.find(
			(b) => b.type === 'BUTTON' && b.label == result.toString(),
		)?.customId;
		assert(buttonCustomId);

		// sometimes the button click fails... gonna have to keep trying
		let attempts = 0;
		while (true) {
			try {
				await msg.clickButton(buttonCustomId);
				break;
			} catch (err) {
				++attempts;

				if (
					err instanceof Error
					&& !err.message.includes('INTERACTION_FAILED')
				) {
					util.log(
						'Unknown error occurred when trying to click button!',
					);
					throw err;
				}

				if (attempts < 5)
					await util.wait(1_000);
				else {
					util.log(
						`Failed 5 times trying to press the math quiz buttons. Will start a new /bump in 2 minutes`,
					);
					return util.millisFrom({ minutes: 2 });
				}
			}
		}

		// 2/27/25 - THEY FIXED THEIR BOT: interaction doesnt fail but updates the message.
		// Now we need to check it for a success message
		if (msg.embeds[0].description?.includes('bumped successfully')) {
			util.log('Bumped after math quiz!');
			return util.millisFrom({ hours: 2, minutes: 1 });
		}

		throw new Error('we screwed up');
	}

	throw new Error('None of the possible cases were hit!');
}
