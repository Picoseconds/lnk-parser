import fs from 'fs';
import ora from 'ora';
import prompts from 'prompts';
import yargs, { Argv } from 'yargs';
import { LNKParser } from './LNKParser';

interface ParseArgs extends Argv {
	lnkfile: string | undefined;
	prettify: boolean | undefined;
}

/**
 * A CLI command which parses a shell link (.lnk file).
 * @param argv the arguments
 */
async function parse(argv: ParseArgs) {
	const lnkPath =
		argv.lnkfile ||
		(
			await prompts({
				type: 'text',
				name: 'lnkPath',
				message: 'What is the path to the .lnk file you would like to parse?',
			})
		).lnkPath;

	try {
		let lnkBuffer = fs.readFileSync(lnkPath);
		let parser = new LNKParser(lnkBuffer);

		let spinner, parsed;

		if (process.stdin.isTTY) {
			spinner = ora({ text: 'Parsing .lnk file...' }).start();
			parsed = parser.parse();
			spinner.succeed('Parse complete!');
		} else {
			parsed = parser.parse();
		}

		if (argv.prettify) console.log(JSON.stringify(parsed, null, '  '));
		else console.log(JSON.stringify(parsed));
	} catch (err: unknown) {
		if (err instanceof Error && (err as any)['code']) {
			let fsError = err as NodeJS.ErrnoException;

			switch (fsError.code) {
				case 'ENOENT':
					console.error('The .lnk file does not exist!');
					break;

				case 'EISDIR':
					console.error('The specified path points to a directory!');
					break;

				case 'EPERM':
					console.error('Permission error.');
					break;

				default:
				case undefined:
					console.log('Error reading .lnk file: ' + fsError);
					break;
			}
		}
	}
}

if (require.main === module) {
	yargs
		.scriptName('lnk-parse')
		.usage('$0 <command> [args]')
		.command(
			['parse [lnk file] [prettify]', '$0 [lnk file] [prettify]'],
			'Parses a shell link (.lnk file)',
			(yargs) => {
				yargs.positional('lnkFile', {
					type: 'string',
					describe: 'The path to the shell link (.lnk file) to parse',
				});

				yargs.boolean('prettify');
			},
			parse
		)
		.help()
		.epilogue(
			'If you have any concerns or questions, make an issue at https://github.com/Picoseconds/lnk-parser/issues/new'
		).argv;
}
