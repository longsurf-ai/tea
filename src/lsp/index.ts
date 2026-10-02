// Purpose: Public language-server surface: the session a host starts, and the pure analysis beneath it.

/**
 * The Tea language server. Start with {@link startLanguageServer}, which
 * serves one Language Server Protocol session on a connection the host
 * supplies, as `tea lsp` does over stdio; {@link analyze} returns the same
 * per-document diagnostics and name facts without a session.
 *
 * @packageDocumentation
 */

export {analyze, type Analysis} from './analysis';
export {startLanguageServer} from './server';
