import sc from 'slash-create';
import * as util from './util.ts';
import * as autobump from './autobump.ts';

export default abstract class AutobumpSlashCommand extends sc.SlashCommand {
	// deno-lint-ignore require-await
	override async onError(err: Error, ctx: sc.CommandContext) {
		util.logError(err);
		autobump.notifyAdminOfError(err);
		return ctx.send({
			content: `**command error:** \`${err.message}\``
				+ '\nthe devs have been notified and will work on a fix soon.',
			ephemeral: true,
		});
	}
}
