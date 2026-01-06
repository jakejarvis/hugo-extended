import logSymbols from "log-symbols";
import install from "./lib/install";
import { doesBinExist, getBinPath } from "./lib/utils";

/**
 * Gets the path to the Hugo binary, automatically installing it if it's missing.
 *
 * This is the main entry point for the hugo-extended package. It checks if Hugo
 * is already installed and available, and if not, triggers an automatic installation
 * before returning the binary path.
 *
 * This handles the case where Hugo may mysteriously disappear (see issue #81),
 * ensuring the binary is always available when this function is called.
 *
 * @returns A promise that resolves with the absolute path to the Hugo binary
 * @throws {Error} If installation fails or the platform is unsupported
 *
 * @example
 * ```typescript
 * import hugo from 'hugo-extended';
 *
 * const hugoPath = await hugo();
 * console.log(hugoPath); // "/usr/local/bin/hugo" or "./bin/hugo"
 * ```
 */
const hugo = async (): Promise<string> => {
  const bin = getBinPath();

  // A fix for fleeting ENOENT errors, where Hugo seems to disappear. For now,
  // just reinstall Hugo when it's missing and then continue normally like
  // nothing happened.
  // See: https://github.com/jakejarvis/hugo-extended/issues/81
  if (!doesBinExist(bin)) {
    // Hugo isn't there for some reason. Try re-installing.
    console.info(`${logSymbols.info} Hugo is missing, reinstalling now...`);
    await install();
  }

  return bin;
};

// The only thing this module really exports is the absolute path to Hugo:
export default hugo;
