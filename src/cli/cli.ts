// Purpose: Commander parsing, command dispatch, logging, and exit-code policy.

import {Command, CommanderError, InvalidArgumentError, Option} from 'commander';
import {createConnection} from 'vscode-languageserver/node';
import {configureLog, parseLogLevel} from '../base/log';
import {formatPos} from '../base/pos';
import {UnimplementedError} from '../base/unimplemented';
import {runCommand} from './execution';
import {buildCommand, parseCommand} from './compiler-tools';
import {cliFailure, type CliResult} from './result';
import {startDocsServer} from '../docs/server';
import {startLanguageServer} from '../lsp/server';

export type CliCommand =
  | {readonly kind: 'docs'; readonly port: number; readonly open: boolean}
  | {readonly kind: 'lsp'}
  | {
      readonly kind: 'run';
      readonly file: string;
      readonly input: string;
      readonly trace: boolean;
      readonly parameters: readonly string[];
    }
  | {readonly kind: 'build'; readonly file: string; readonly out?: string}
  | {
      readonly kind: 'parse';
      readonly file: string;
      readonly tokens: boolean;
      readonly ast: boolean;
      readonly ir: boolean;
    };

function parsePort(value: string): number {
  const port = Number(value);
  if (!Number.isInteger(port) || port < 0 || port > 65_535) {
    throw new InvalidArgumentError('port must be an integer from 0 to 65535');
  }
  return port;
}

const executionHost = {
  now: Date.now,
  print: (line: string) => console.log(line),
};

/**
 * The `tea` command tree. Each action hands its parsed command to `select`;
 * the reference documentation renders this same tree, so `--help` and the
 * published CLI page never disagree.
 */
export function cliProgram(select: (command: CliCommand) => void): Command {
  const tea = new Command('tea')
    .description('Tea language compiler and runner')
    .version('0.1.0')
    .exitOverride();

  tea
    .command('docs')
    .description('Serve the documentation website locally')
    .addOption(
      new Option('--port <number>', 'port to bind')
        .argParser(parsePort)
        .default(0, 'any available port'),
    )
    .option('--no-open', 'do not open the documentation in a browser')
    .action((options: {port: number; open: boolean}) => {
      select({kind: 'docs', port: options.port, open: options.open});
    });

  tea
    .command('lsp')
    .description('Serve the Language Server Protocol over stdin and stdout')
    .option('--stdio', 'accepted and ignored: stdio is the only transport')
    .action(() => {
      select({kind: 'lsp'});
    });

  tea
    .command('run')
    .usage('<file> --input <file> [--trace] [--<input name> <value>...]')
    .summary('Compile and execute a Tea script over a CSV dataset')
    .description(
      [
        'Compile and execute a Tea script over a CSV dataset, one bar per row, and print its outputs.',
        'CSV file: the first row holds unique column names. Each column feeds the series of the same name, such as close or volume, and every cell must be a number or empty, which reads as na. An optional time column holds integer epoch milliseconds that increase from row to row, with no empty cells; a script that reads time requires it. When the file has no hl2, hlc3, ohlc4 or hlcc4 column, that series is computed from the open, high, low and close columns it uses.',
        "Inputs: override an input with a flag after the file, such as --length 20 for length = input.int(14). An input is named after the variable it initializes at the top level of the script. An input inside a function, a block or an expression, one declared with var or varip, or one whose variable is reassigned is named after its position instead, such as input@7:5 for line 7, column 5. Inputs named i, h, V, help, trace or version clash with the command's own options, and the script cannot run.",
        'Output: a System table with the row count and timings, a Parameters table with the value of each input, and an Outputs table with one row per bar and one column per output. With --trace it prints a line declaring each output, then one line per output cell, instead of the tables.',
        'Exit status: 0 on success; 1 when the arguments, compilation, the CSV file or the run fails; 2 when the script uses a feature Tea does not implement yet.',
        'Limits: a script that calls request.* cannot run, because tea run binds no data for requests. syminfo.* and timeframe.* hold na, or false for the timeframe.is* flags. timenow reads the system clock.',
      ].join('\n\n'),
    )
    .argument('<file>', 'Tea source file')
    .requiredOption(
      '-i, --input <file>',
      'CSV file whose columns feed the series of the same name',
    )
    .option(
      '--trace',
      'print a line declaring each output, then one line per output cell (index, name, value), instead of tables',
    )
    .allowUnknownOption()
    .allowExcessArguments()
    .action(
      (
        file: string,
        options: {input: string; trace?: boolean},
        command: Command,
      ) => {
        select({
          kind: 'run',
          file,
          input: options.input,
          trace: options.trace === true,
          parameters: command.args.slice(1),
        });
      },
    );

  tea
    .command('build')
    .description('Compile a Tea script and emit TypeScript')
    .argument('<file>', 'Tea source file')
    .option(
      '-o, --out <file>',
      'write emitted TypeScript here instead of stdout',
    )
    .action((file: string, options: {out?: string}) => {
      select({
        kind: 'build',
        file,
        ...(options.out === undefined ? {} : {out: options.out}),
      });
    });

  tea
    .command('parse')
    .description('Run the frontend and dump intermediate artifacts')
    .argument('<file>', 'Tea source file')
    .option('--tokens', 'dump the token stream')
    .option('--ast', 'dump the syntax tree (default)')
    .option('--ir', 'dump the lowered IR')
    .action(
      (
        file: string,
        options: {tokens?: boolean; ast?: boolean; ir?: boolean},
      ) => {
        select({
          kind: 'parse',
          file,
          tokens: options.tokens === true,
          ast: options.ast === true,
          ir: options.ir === true,
        });
      },
    );

  return tea;
}

function parseArgs(argv: readonly string[]): CliCommand | null {
  let selected: CliCommand | null = null;
  cliProgram(command => {
    selected = command;
  }).parse(argv);
  return selected;
}

async function dispatch(command: CliCommand): Promise<CliResult> {
  switch (command.kind) {
    case 'docs':
      await startDocsServer({
        port: command.port,
        open: command.open,
        print: line => console.log(line),
        warn: line => console.error(line),
      });
      return {ok: true};

    case 'lsp':
      // Stdout carries protocol bytes only, so nothing on this path prints.
      // The streams are passed explicitly: left to itself the library wants
      // a transport flag in argv. The open stdin keeps the process alive, and
      // the library exits it on the `exit` notification or when stdin ends.
      startLanguageServer(createConnection(process.stdin, process.stdout));
      return {ok: true};

    case 'run':
      return runCommand(
        command.file,
        command.input,
        {trace: command.trace},
        command.parameters,
        executionHost,
      );

    case 'build': {
      return buildCommand(command.file, command.out);
    }

    case 'parse': {
      return parseCommand(command.file, command);
    }
  }
}

function printResult(result: CliResult): number {
  if (result.ok) return 0;
  if (result.kind === 'diagnostics') {
    for (const error of result.errors) {
      console.error(`${formatPos(error.pos)}: ${error.msg}`);
    }
  } else {
    console.error(`tea: ${result.message}`);
  }
  return 1;
}

export async function runCli(argv: readonly string[]): Promise<number> {
  const teaLogLevel = process.env['TEA_LOG'];
  if (teaLogLevel !== undefined && teaLogLevel !== '') {
    const level = parseLogLevel(teaLogLevel);
    if (level === null) {
      console.error(
        `tea: unknown TEA_LOG level '${teaLogLevel}' (debug|info|warn|error)`,
      );
    } else {
      configureLog({level});
    }
  }

  try {
    const command = parseArgs(argv);
    return command === null ? 0 : printResult(await dispatch(command));
  } catch (error) {
    if (error instanceof CommanderError) return error.exitCode;
    if (error instanceof UnimplementedError) {
      console.error(`tea: ${error.message}`);
      return 2;
    }
    const failure = cliFailure(error);
    if (failure !== null) return printResult(failure);
    throw error;
  }
}
