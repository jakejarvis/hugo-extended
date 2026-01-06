/* eslint-disable */
// AUTO-GENERATED. DO NOT EDIT.

export interface HugoGlobalOptions {
  /** set the clock used by Hugo, e.g. --clock 2021-11-06T22:30:00.00+09:00 */
  clock?: string;
  /** config file (default hugo.yaml|json|toml) */
  config?: string;
  /** config dir (default "config") */
  configDir?: string;
  /** filesystem path to write files to */
  destination?: string;
  /** build environment */
  environment?: string;
  /** ignores any _vendor for module paths matching the given Glob pattern */
  ignoreVendorPaths?: string;
  /** log level */
  logLevel?: "debug" | "info" | "warn" | "error";
  /** don't create .hugo_build.lock file */
  noBuildLock?: boolean;
  /** filesystem path to write files to */
  output?: string;
  /** build in quiet mode */
  quiet?: boolean;
  /** render to memory (mostly useful when running the server) */
  renderToMemory?: boolean;
  /** filesystem path to read files relative from */
  source?: string;
  /** filesystem path to themes directory */
  themesDir?: string;
  /** enable less safe operations, please backup first */
  unsafe?: boolean;
}

export interface HugoBuildOptions extends HugoGlobalOptions {
  /** hostname (and path) to the root, e.g. https://spf13.com/ */
  baseURL?: string;
  /** include content marked as draft */
  buildDrafts?: boolean;
  /** include expired content */
  buildExpired?: boolean;
  /** include content with publishdate in the future */
  buildFuture?: boolean;
  /** filesystem path to cache directory */
  cacheDir?: string;
  /** remove files from destination not found in static directories */
  cleanDestinationDir?: boolean;
  /** filesystem path to content directory */
  contentDir?: string;
  /** disable different kind of pages (home, RSS etc.) */
  disableKinds?: string[];
  /** add Git revision, date, author, and CODEOWNERS info to the pages */
  enableGitInfo?: boolean;
  /** copy all files when static is changed. */
  forceSyncStatic?: boolean;
  /** enable to run some cleanup tasks (remove unused cache files) after the build */
  gc?: boolean;
  /** ignores the cache directory */
  ignoreCache?: boolean;
  /** filesystem path to layout directory */
  layoutDir?: string;
  /** minify any supported output format (HTML, XML etc.) */
  minify?: boolean;
  /** don't sync permission mode of files */
  noChmod?: boolean;
  /** don't sync modification time of files */
  noTimes?: boolean;
  /** panic on first WARNING log */
  panicOnWarning?: boolean;
  /** set this to a poll interval, e.g --poll 700ms, to use a poll based approach to watch for file system changes */
  poll?: string;
  /** print missing translations */
  printI18nWarnings?: boolean;
  /** print memory usage to screen at intervals */
  printMemoryUsage?: boolean;
  /** print warnings on duplicate target paths etc. */
  printPathWarnings?: boolean;
  /** print warnings on unused templates. */
  printUnusedTemplates?: boolean;
  /** named segments to render (configured in the segments config) */
  renderSegments?: string[];
  /** display metrics about template executions */
  templateMetrics?: boolean;
  /** calculate some improvement hints when combined with --templateMetrics */
  templateMetricsHints?: boolean;
  /** themes to use (located in /themes/THEMENAME/) */
  theme?: string[];
  /** write trace to file (not useful in general) */
  trace?: string;
  /** watch filesystem for changes and recreate as needed */
  watch?: boolean;
}

export interface HugoCompletionOptions extends HugoGlobalOptions {
}

export interface HugoCompletionBashOptions extends HugoGlobalOptions {
  /** disable completion descriptions */
  noDescriptions?: boolean;
}

export interface HugoCompletionFishOptions extends HugoGlobalOptions {
  /** disable completion descriptions */
  noDescriptions?: boolean;
}

export interface HugoCompletionPowershellOptions extends HugoGlobalOptions {
  /** disable completion descriptions */
  noDescriptions?: boolean;
}

export interface HugoCompletionZshOptions extends HugoGlobalOptions {
  /** disable completion descriptions */
  noDescriptions?: boolean;
}

export interface HugoConfigOptions extends HugoGlobalOptions {
  /** hostname (and path) to the root, e.g. https://spf13.com/ */
  baseURL?: string;
  /** filesystem path to cache directory */
  cacheDir?: string;
  /** filesystem path to content directory */
  contentDir?: string;
  /** preferred file format (toml, yaml or json) (default "toml") */
  format?: string;
  /** the language to display config for. Defaults to the first language defined. */
  lang?: string;
  /** include config options with zero values (e.g. false, 0, "") in the output */
  printZero?: boolean;
  /** named segments to render (configured in the segments config) */
  renderSegments?: string[];
  /** themes to use (located in /themes/THEMENAME/) */
  theme?: string[];
}

export interface HugoConfigMountsOptions extends HugoGlobalOptions {
  /** hostname (and path) to the root, e.g. https://spf13.com/ */
  baseURL?: string;
  /** filesystem path to cache directory */
  cacheDir?: string;
  /** filesystem path to content directory */
  contentDir?: string;
  /** named segments to render (configured in the segments config) */
  renderSegments?: string[];
  /** themes to use (located in /themes/THEMENAME/) */
  theme?: string[];
}

export interface HugoConvertOptions extends HugoGlobalOptions {
}

export interface HugoConvertToJSONOptions extends HugoGlobalOptions {
}

export interface HugoConvertToTOMLOptions extends HugoGlobalOptions {
}

export interface HugoConvertToYAMLOptions extends HugoGlobalOptions {
}

export interface HugoEnvOptions extends HugoGlobalOptions {
}

export interface HugoGenOptions extends HugoGlobalOptions {
}

export interface HugoGenDocOptions extends HugoGlobalOptions {
  /** the directory to write the doc. (default "/tmp/hugodoc/") */
  dir?: string;
}

export interface HugoGenManOptions extends HugoGlobalOptions {
  /** the directory to write the man pages. (default "man/") */
  dir?: string;
}

export interface HugoHelpOptions extends HugoGlobalOptions {
}

export interface HugoImportOptions extends HugoGlobalOptions {
}

export interface HugoImportJekyllOptions extends HugoGlobalOptions {
  /** allow import into non-empty target directory */
  force?: boolean;
}

export interface HugoListOptions extends HugoGlobalOptions {
}

export interface HugoListAllOptions extends HugoGlobalOptions {
}

export interface HugoListDraftsOptions extends HugoGlobalOptions {
}

export interface HugoListExpiredOptions extends HugoGlobalOptions {
}

export interface HugoListFutureOptions extends HugoGlobalOptions {
}

export interface HugoListPublishedOptions extends HugoGlobalOptions {
}

export interface HugoModOptions extends HugoGlobalOptions {
}

export interface HugoModCleanOptions extends HugoGlobalOptions {
  /** clean entire module cache */
  all?: boolean;
  /** hostname (and path) to the root, e.g. https://spf13.com/ */
  baseURL?: string;
  /** filesystem path to cache directory */
  cacheDir?: string;
  /** filesystem path to content directory */
  contentDir?: string;
  /** pattern matching module paths to clean (all if not set), e.g. "**hugo*" */
  pattern?: string;
  /** named segments to render (configured in the segments config) */
  renderSegments?: string[];
  /** themes to use (located in /themes/THEMENAME/) */
  theme?: string[];
}

export interface HugoModGetOptions extends HugoGlobalOptions {
}

export interface HugoModGraphOptions extends HugoGlobalOptions {
  /** hostname (and path) to the root, e.g. https://spf13.com/ */
  baseURL?: string;
  /** filesystem path to cache directory */
  cacheDir?: string;
  /** delete module cache for dependencies that fail verification */
  clean?: boolean;
  /** filesystem path to content directory */
  contentDir?: string;
  /** named segments to render (configured in the segments config) */
  renderSegments?: string[];
  /** themes to use (located in /themes/THEMENAME/) */
  theme?: string[];
}

export interface HugoModInitOptions extends HugoGlobalOptions {
  /** hostname (and path) to the root, e.g. https://spf13.com/ */
  baseURL?: string;
  /** filesystem path to cache directory */
  cacheDir?: string;
  /** filesystem path to content directory */
  contentDir?: string;
  /** named segments to render (configured in the segments config) */
  renderSegments?: string[];
  /** themes to use (located in /themes/THEMENAME/) */
  theme?: string[];
}

export interface HugoModNpmOptions extends HugoGlobalOptions {
}

export interface HugoModNpmPackOptions extends HugoGlobalOptions {
  /** hostname (and path) to the root, e.g. https://spf13.com/ */
  baseURL?: string;
  /** filesystem path to cache directory */
  cacheDir?: string;
  /** filesystem path to content directory */
  contentDir?: string;
  /** named segments to render (configured in the segments config) */
  renderSegments?: string[];
  /** themes to use (located in /themes/THEMENAME/) */
  theme?: string[];
}

export interface HugoModTidyOptions extends HugoGlobalOptions {
  /** hostname (and path) to the root, e.g. https://spf13.com/ */
  baseURL?: string;
  /** filesystem path to cache directory */
  cacheDir?: string;
  /** filesystem path to content directory */
  contentDir?: string;
  /** named segments to render (configured in the segments config) */
  renderSegments?: string[];
  /** themes to use (located in /themes/THEMENAME/) */
  theme?: string[];
}

export interface HugoModVendorOptions extends HugoGlobalOptions {
  /** hostname (and path) to the root, e.g. https://spf13.com/ */
  baseURL?: string;
  /** filesystem path to cache directory */
  cacheDir?: string;
  /** filesystem path to content directory */
  contentDir?: string;
  /** named segments to render (configured in the segments config) */
  renderSegments?: string[];
  /** themes to use (located in /themes/THEMENAME/) */
  theme?: string[];
}

export interface HugoModVerifyOptions extends HugoGlobalOptions {
  /** hostname (and path) to the root, e.g. https://spf13.com/ */
  baseURL?: string;
  /** filesystem path to cache directory */
  cacheDir?: string;
  /** delete module cache for dependencies that fail verification */
  clean?: boolean;
  /** filesystem path to content directory */
  contentDir?: string;
  /** named segments to render (configured in the segments config) */
  renderSegments?: string[];
  /** themes to use (located in /themes/THEMENAME/) */
  theme?: string[];
}

export interface HugoNewOptions extends HugoGlobalOptions {
  /** hostname (and path) to the root, e.g. https://spf13.com/ */
  baseURL?: string;
  /** filesystem path to cache directory */
  cacheDir?: string;
  /** filesystem path to content directory */
  contentDir?: string;
  /** edit new content with this editor, if provided */
  editor?: string;
  /** overwrite file if it already exists */
  force?: boolean;
  /** content type to create */
  kind?: string;
  /** named segments to render (configured in the segments config) */
  renderSegments?: string[];
  /** themes to use (located in /themes/THEMENAME/) */
  theme?: string[];
}

export interface HugoServerOptions extends HugoGlobalOptions {
  /** append port to baseURL (default true) */
  appendPort?: boolean;
  /** hostname (and path) to the root, e.g. https://spf13.com/ */
  baseURL?: string;
  /** interface to which the server will bind (default "127.0.0.1") */
  bind?: string;
  /** include content marked as draft */
  buildDrafts?: boolean;
  /** include expired content */
  buildExpired?: boolean;
  /** include content with publishdate in the future */
  buildFuture?: boolean;
  /** filesystem path to cache directory */
  cacheDir?: string;
  /** remove files from destination not found in static directories */
  cleanDestinationDir?: boolean;
  /** filesystem path to content directory */
  contentDir?: string;
  /** do not show build errors in the browser */
  disableBrowserError?: boolean;
  /** enables full re-renders on changes */
  disableFastRender?: boolean;
  /** disable different kind of pages (home, RSS etc.) */
  disableKinds?: string[];
  /** watch without enabling live browser reload on rebuild */
  disableLiveReload?: boolean;
  /** add Git revision, date, author, and CODEOWNERS info to the pages */
  enableGitInfo?: boolean;
  /** copy all files when static is changed. */
  forceSyncStatic?: boolean;
  /** enable to run some cleanup tasks (remove unused cache files) after the build */
  gc?: boolean;
  /** ignores the cache directory */
  ignoreCache?: boolean;
  /** filesystem path to layout directory */
  layoutDir?: string;
  /** port for live reloading (i.e. 443 in HTTPS proxy situations) (default -1) */
  liveReloadPort?: number;
  /** minify any supported output format (HTML, XML etc.) */
  minify?: boolean;
  /** navigate to changed content file on live browser reload */
  navigateToChanged?: boolean;
  /** don't sync permission mode of files */
  noChmod?: boolean;
  /** prevent HTTP caching */
  noHTTPCache?: boolean;
  /** don't sync modification time of files */
  noTimes?: boolean;
  /** open the site in a browser after server startup */
  openBrowser?: boolean;
  /** panic on first WARNING log */
  panicOnWarning?: boolean;
  /** set this to a poll interval, e.g --poll 700ms, to use a poll based approach to watch for file system changes */
  poll?: string;
  /** port on which the server will listen (default 1313) */
  port?: number;
  /** enable the pprof server (port 8080) */
  pprof?: boolean;
  /** print missing translations */
  printI18nWarnings?: boolean;
  /** print memory usage to screen at intervals */
  printMemoryUsage?: boolean;
  /** print warnings on duplicate target paths etc. */
  printPathWarnings?: boolean;
  /** print warnings on unused templates. */
  printUnusedTemplates?: boolean;
  /** named segments to render (configured in the segments config) */
  renderSegments?: string[];
  /** serve static files from disk and dynamic files from memory */
  renderStaticToDisk?: boolean;
  /** display metrics about template executions */
  templateMetrics?: boolean;
  /** calculate some improvement hints when combined with --templateMetrics */
  templateMetricsHints?: boolean;
  /** themes to use (located in /themes/THEMENAME/) */
  theme?: string[];
  /** generate and use locally-trusted certificates. */
  tlsAuto?: boolean;
  /** path to TLS certificate file */
  tlsCertFile?: string;
  /** path to TLS key file */
  tlsKeyFile?: string;
  /** write trace to file (not useful in general) */
  trace?: string;
  /** watch filesystem for changes and recreate as needed (default true) */
  watch?: boolean;
}

export interface HugoServerTrustOptions extends HugoGlobalOptions {
  /** Uninstall the local CA (but do not delete it). */
  uninstall?: boolean;
}

export interface HugoVersionOptions extends HugoGlobalOptions {
}

export type HugoCommand = "build" | "completion" | "completion bash" | "completion fish" | "completion powershell" | "completion zsh" | "config" | "config mounts" | "convert" | "convert toJSON" | "convert toTOML" | "convert toYAML" | "env" | "gen" | "gen doc" | "gen man" | "help" | "import" | "import jekyll" | "list" | "list all" | "list drafts" | "list expired" | "list future" | "list published" | "mod" | "mod clean" | "mod get" | "mod graph" | "mod init" | "mod npm" | "mod npm pack" | "mod tidy" | "mod vendor" | "mod verify" | "new" | "server" | "server trust" | "version";

export type HugoOptionsFor<C extends HugoCommand> =
  C extends "build" ? HugoBuildOptions :
  C extends "completion" ? HugoCompletionOptions :
  C extends "completion bash" ? HugoCompletionBashOptions :
  C extends "completion fish" ? HugoCompletionFishOptions :
  C extends "completion powershell" ? HugoCompletionPowershellOptions :
  C extends "completion zsh" ? HugoCompletionZshOptions :
  C extends "config" ? HugoConfigOptions :
  C extends "config mounts" ? HugoConfigMountsOptions :
  C extends "convert" ? HugoConvertOptions :
  C extends "convert toJSON" ? HugoConvertToJSONOptions :
  C extends "convert toTOML" ? HugoConvertToTOMLOptions :
  C extends "convert toYAML" ? HugoConvertToYAMLOptions :
  C extends "env" ? HugoEnvOptions :
  C extends "gen" ? HugoGenOptions :
  C extends "gen doc" ? HugoGenDocOptions :
  C extends "gen man" ? HugoGenManOptions :
  C extends "help" ? HugoHelpOptions :
  C extends "import" ? HugoImportOptions :
  C extends "import jekyll" ? HugoImportJekyllOptions :
  C extends "list" ? HugoListOptions :
  C extends "list all" ? HugoListAllOptions :
  C extends "list drafts" ? HugoListDraftsOptions :
  C extends "list expired" ? HugoListExpiredOptions :
  C extends "list future" ? HugoListFutureOptions :
  C extends "list published" ? HugoListPublishedOptions :
  C extends "mod" ? HugoModOptions :
  C extends "mod clean" ? HugoModCleanOptions :
  C extends "mod get" ? HugoModGetOptions :
  C extends "mod graph" ? HugoModGraphOptions :
  C extends "mod init" ? HugoModInitOptions :
  C extends "mod npm" ? HugoModNpmOptions :
  C extends "mod npm pack" ? HugoModNpmPackOptions :
  C extends "mod tidy" ? HugoModTidyOptions :
  C extends "mod vendor" ? HugoModVendorOptions :
  C extends "mod verify" ? HugoModVerifyOptions :
  C extends "new" ? HugoNewOptions :
  C extends "server" ? HugoServerOptions :
  C extends "server trust" ? HugoServerTrustOptions :
  C extends "version" ? HugoVersionOptions :
  never;
