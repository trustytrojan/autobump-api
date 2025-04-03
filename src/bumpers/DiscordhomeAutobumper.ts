import Autobumper from './Autobumper.ts';
import { log, millis, wait } from '../util.ts';
import assert from 'assert';
import { Message, Modal } from 'discord.js-selfbot-v13';

export default class DiscordhomeAutobumper extends Autobumper {
	async bump(): Promise<number> {
		let msg: Message | Modal;

		try {
			msg = await this.channel.sendSlash('826100334534328340', 'bump');
		} catch {
			log(`/bump interaction failed, trying again in 1 minute`);
			return millis.fromMinutes(1);
		}

		assert(msg instanceof Message);
		const embed = msg.embeds[0];

		if (embed) {
			const { description, title } = embed;

			// already bumped
			if (description?.includes('Unfortunately, ')) {
				const match = description.match(/(\d+)\s*hours?\s*(\d+)\s*minutes?/);
				if (match) {
					log(`Need to wait ${match[1]}h ${match[2]}m until bumping again!`);
					return millis.fromHours(parseInt(match[1])) + millis.fromMinutes(parseInt(match[2]) + 1);
				} else throw new Error('DH Bump cooldown message has changed!');
			}

			// some other error
			if (title === 'Bump Error!') {
				throw new Error(embed.description!);
			}

			// bumped without math challenge
			if (description?.startsWith('Your server has been bumped successfully!')) {
				log('Bumped!');
				return millis.fromHours(2) + millis.fromMinutes(1);
			}
		}

		// math challenge
		if (msg.content.includes('Please answer the question below')) {
			const mathExpression = msg.content.split('\n')[2].replaceAll('*', '').replaceAll('x', '*');

			if (!/^[0-9+\-*/()\s]+$/.test(mathExpression)) {
				throw new Error('Invalid math expression!');
			}

			const result = eval(mathExpression);
			assert(typeof result === 'number');
			const buttonCustomId = msg.components[0].components.find(
				b => b.type === 'BUTTON' && b.label == result.toString()
			)?.customId;
			assert(buttonCustomId);

			// sometimes the button click fails... gonna have to keep trying
			let attempts = 0;
			while (true)
				try {
					await msg.clickButton(buttonCustomId);
					break;
				} catch (err) {
					++attempts;
					if (err instanceof Error && !err.message.includes('INTERACTION_FAILED')) {
						log('Unknown error occurred when trying to click button!');
						throw err;
					}
					if (attempts < 5) await wait(1_000);
					else throw new Error('gave up trying to click buttons!');
				}

			// 2/27/25 - THEY FIXED THEIR BOT: interaction doesnt fail but updates the message.
			// Now we need to check it for a success message
			if (msg.embeds[0].description?.includes('bumped successfully')) {
				log('Bumped after math quiz!');
				return millis.fromHours(2) + millis.fromMinutes(1);
			}

			throw new Error('we screwed up');
		}

		throw new Error('None of the possible cases were hit!');
	}
}
