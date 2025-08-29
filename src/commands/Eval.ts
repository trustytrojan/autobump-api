import node_util from 'node:util';
import sc from 'slash-create';
import process from 'node:process';
import * as util from '../util.ts';
import AutobumpSlashCommand from '../AutobumpSlashCommand.ts';
import { Buffer } from 'node:buffer';

/// imports for eval usage:
// deno-lint-ignore no-unused-vars
const autobump = await import('../autobump.ts');

export default class Eval extends AutobumpSlashCommand {
	constructor(creator: sc.BaseSlashCreator) {
		super(creator, {
			name: 'eval',
			description: 'eval',
			...util.defaultSlashCommandOptions,
			options: [
				{
					type: sc.CommandOptionType.STRING,
					name: 'code',
					description: 'code',
					required: true,
				},
				{
					type: sc.CommandOptionType.BOOLEAN,
					name: 'show_hidden',
					description: 'whether to show hidden object properties',
				},
				{
					type: sc.CommandOptionType.INTEGER,
					name: 'depth',
					description: 'object property recursion depth'
				}
			],
		});
	}

	override async run(ctx: sc.CommandContext) {
		util.logInteraction(ctx);
		if (ctx.user.id !== process.env.AUTOBUMP_ADMIN) {
			util.log(`user ${ctx.user.id} tried to use /eval`);
			return;
		}

		const msg: sc.MessageOptions = { ephemeral: true };

		// const code = options.getString('code', true);
		const code = ctx.options['code'];
		if (!code) {
			msg.content = 'code required';
			return msg;
		}

		let returnValue: unknown;
		try {
			returnValue = await eval(code);
		} catch (err) {
			msg.content = `\`\`\`js\n${(err as Error).stack ?? err}\`\`\``;
			return msg;
		}

		const output = node_util.inspect(
			returnValue,
			ctx.options['show_hidden'] ?? false,
			ctx.options['depth'] ?? 0,
		);
		const outputFormatted = `\`\`\`js\n${output}\`\`\``;

		if (outputFormatted.length <= 2_000)
			msg.content = outputFormatted;
		else if (
			outputFormatted.length > 2_000 && outputFormatted.length <= 4_096
		) {
			msg.embeds = [{ description: outputFormatted }];
		} else {
			msg.files = [{ file: Buffer.from(output), name: 'output.js' }];
		}

		return msg;
	}
}
