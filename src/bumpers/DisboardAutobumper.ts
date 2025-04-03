import Autobumper from './Autobumper';
import { log, millis } from '../util.ts';
import assert from 'assert';
import { Message, Modal } from 'discord.js-selfbot-v13';

export default class DisboardAutobumper extends Autobumper {
	async bump(): Promise<number> {
		let msg: Message | Modal;

		try {
			msg = await this.channel.sendSlash('302050872383242240', 'bump');
		} catch {
			log(`Initial interaction failed, trying again in 1 minute`);
			return millis.fromMinutes(1);
		}

		assert(msg instanceof Message);

		if (msg.content.startsWith('The DISBOARD API')) {
			log(`DISBOARD API is down... waiting a minute to try again`);
			return millis.fromMinutes(1);
		}

		if (msg.embeds[0]?.description?.startsWith('Please wait')) {
			const match = msg.embeds[0].description.match(/\b\d+\b/);
			if (match) {
				log(`Need to wait ${match[0]} minutes until bumping again!`);
				// add 1 minute to be safe
				return millis.fromMinutes(parseInt(match[0]) + 1);
			} else throw new Error('DISBOARD cooldown message changed!');
		}

		log('Bumped!');
		return millis.fromHours(2) + millis.fromMinutes(1);
	}
}
