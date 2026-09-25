import { CommandUnderstandingProvider, ParsedCommand } from '@/types/mission'
import { parseCommand } from './parseCommand'
import { TARGETS } from '@/config/targets'

/**
 * Baseline Deterministic Command Understanding Provider.
 * Wraps deterministic heuristic regex/alias parser in an async Promise interface,
 * enabling hot-swappable replacement with Phase 4's local open-source semantic model.
 */
export class DeterministicCommandProvider implements CommandUnderstandingProvider {
  async parse(text: string): Promise<ParsedCommand> {
    const result = parseCommand(text, TARGETS)
    return Promise.resolve(result)
  }
}

/**
 * Default global command provider instance.
 */
export const defaultCommandProvider: CommandUnderstandingProvider = new DeterministicCommandProvider()
