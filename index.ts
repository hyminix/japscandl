import browser from "./src/utils/browser"
import chrome from "./src/utils/chrome"
import fsplus from "./src/utils/fsplus"
import mangaFormat from "./src/utils/mangaFormat"
import compress from "./src/utils/compress"
import * as types from "./src/utils/types";

const utils = {
    browser,
    chrome,
    fsplus,
    mangaFormat,
    compress: compress,
};

import getBrowser from "./src/utils/browser";

const japscandl = {
    getBrowser,
    utils,
    types
}
export default japscandl;



import Downloader from "./src/components/Downloader";
import Fetcher from "./src/components/Fetcher";
export { Downloader };
export { Fetcher };