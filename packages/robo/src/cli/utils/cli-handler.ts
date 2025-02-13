interface Option {
	alias: string
	name: string
	description: string
}

export class Command {
	private _name: string
	private _description: string
	private _handler: (args: string[], options: Record<string, unknown>) => Promise<void> | void
	private _options: Option[] = []
	private _commands: Command[] = []
	private _version?: string

	constructor(name: string) {
		this._name = name
		this._handler = () => {
			/* empty */
		}
	}

	/**
	 * Add a subcommand to the current command.
	 *
	 * @param {Command} command - Command object to be added as a subcommand.
	 * @returns {Command} - Returns the current Command object for chaining.
	 */
	public addCommand(command: Command): this {
		this._commands.push(command)
		return this
	}

	/**
	 * Set the description for the command.
	 *
	 * @param {string} desc - Description string.
	 * @returns {Command} - Returns the current Command object for chaining.
	 */
	public description(desc: string): this {
		this._description = desc
		return this
	}

	/**
	 * Add an option for the command.
	 *
	 * @param {string} alias - Option alias (short form).
	 * @param {string} name - Option name (long form).
	 * @param {string} description - Option description.
	 * @returns {Command} - Returns the current Command object for chaining.
	 */
	public option(alias: string, name: string, description: string): this {
		this._options.push({ alias, name, description })
		return this
	}

	/**
	 * Assign a handler function for the command.
	 *
	 * @param {(args: string[], options: Record<string, unknown>) => void} fn - Function to be executed when the command is called.
	 * @returns {Command} - Returns the current Command object for chaining.
	 */
	public handler(fn: (args: string[], options: Record<string, unknown>) => void): this {
		this._handler = fn
		return this
	}

	/**
	 * Parse the command line arguments and process the command.
	 */
	public parse(): void {
		this.processSubCommand(this, process.argv.slice(2))
	}

	/**
	 * Assign a version string to the command and adds an option to display the version.
	 *
	 * @param {string} versionString - Version string.
	 * @returns {Command} - Returns the current Command object for chaining.
	 */
	public version(versionString: string): Command {
		this._version = versionString
		this.option('-v', '--version', 'Display the current version')
		return this
	}

	private showHelp(): void {
		console.log(`\nCommand: ${this._name}`)
		console.log(`Description: ${this._description}`)

		if (this._options.length > 0) {
			console.log(`Options:`)
			this._options.forEach((opt) => {
				console.log(`  ${opt.alias}, ${opt.name}: ${opt.description}`)
			})
		}

		if (this._commands.length > 0) {
			console.log(`Subcommands:`)
			this._commands.forEach((cmd) => {
				console.log(`  ${cmd._name}: ${cmd._description}`)
			})
		}
	}

	/**
	 * Parses the options from the provided arguments array.
	 *
	 * @param {string[]} args - The arguments array.
	 * @returns {Record<string, unknown>} - Returns an object containing parsed options.
	 */
	private parseOptions(args: string[]): Record<string, unknown> {
		const options: Record<string, unknown> = {}

		for (let i = 0; i < args.length; i++) {
			const arg = args[i]
			const nextArg = args[i + 1]

			if (arg.startsWith('--')) {
				const option = this._options.find((opt) => opt.name === arg)

				if (option) {
					if (nextArg && !nextArg.startsWith('-')) {
						options[arg.slice(2)] = nextArg
						i++ // Skip value since we used it
					} else {
						options[arg.slice(2)] = true
					}
				}
			} else if (arg.startsWith('-')) {
				const option = this._options.find((opt) => opt.alias === arg)

				if (option) {
					if (nextArg && !nextArg.startsWith('-')) {
						options[option.name.slice(2)] = nextArg
						i++ // Skip value since we used it
					} else {
						options[option.name.slice(2)] = true
					}
				}
			}
		}

		return options
	}

	private async processSubCommand(command: Command, args: string[]) {
		// If there are no arguments provided, and the current command does not have a handler,
		// it means there's nothing to process further. Hence, return early.
		if (args.length === 0 && !command._handler) {
			return
		}

		const positionalArgs: string[] = []
		let optionsArgsStart = args.length

		for (let i = 0; i < args.length; i++) {
			const arg = args[i]

			// Check if arg is an option
			if (arg.startsWith('-')) {
				optionsArgsStart = i
				break
			}

			// If arg is prefixed with 'arg:', treat as a positional argument
			if (arg.startsWith('arg:')) {
				positionalArgs.push(arg.slice(4))
				continue
			}

			// Check if arg is a subcommand
			const subCommand = command._commands.find((cmd) => cmd._name === arg)
			if (subCommand) {
				const { positionalArgs: subPosArgs, optionsArgs: subOptArgs } = this.splitArgs(args.slice(i + 1))
				this.processSubCommand(subCommand, [...subPosArgs, ...subOptArgs])
				return
			}

			// If arg is not an option or a subcommand, treat as a positional argument
			positionalArgs.push(arg)
		}

		const optionsArgs = args.slice(optionsArgsStart)
		const parsedOptions = command.parseOptions(optionsArgs)

		if (parsedOptions.help) {
			command.showHelp()
			return
		}

		// If the current command has a version, and the user has provided the version flag, display the version and exit.
		if (command._commands.length && command._version && (args.includes('-v') || args.includes('--version'))) {
			console.log(command._version)
			process.exit(0)
		}

		await command._handler(positionalArgs, parsedOptions)
	}

	private splitArgs(args: string[]): { positionalArgs: string[]; optionsArgs: string[] } {
		const positionalArgs: string[] = []
		let optionsArgsStart = args.length

		for (let i = 0; i < args.length; i++) {
			const arg = args[i]

			// Check if arg is an option
			if (arg.startsWith('-')) {
				optionsArgsStart = i
				break
			}

			// If arg is not an option, treat as a positional argument
			positionalArgs.push(arg)
		}

		const optionsArgs = args.slice(optionsArgsStart)

		return { positionalArgs, optionsArgs }
	}
}
