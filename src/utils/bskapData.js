/**
 * BSKAP Data utility.
 * Exports data and provide dynamic loading if needed in the future.
 */
import BSKAP_DATA_RAW from './bskap_2025_intel.json';
import VERBATIM_BSKAP_DATA_RAW from './bskap_2025_verbatim.json';

export const BSKAP_DATA = BSKAP_DATA_RAW;
export const VERBATIM_BSKAP_DATA = VERBATIM_BSKAP_DATA_RAW;

/**
 * Dynamically load BSKAP data if large.
 */
export const loadBskapData = async () => {
    const intel = await import('./bskap_2025_intel.json');
    const verbatim = await import('./bskap_2025_verbatim.json');
    return { intel: intel.default, verbatim: verbatim.default };
};
