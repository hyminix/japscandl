import browser from "./src/utils/browser"
import chrome from "./src/utils/chrome"
import config from "./src/utils/config"
import flags from "./src/utils/flags"
import fsplus from "./src/utils/fsplus"
import manga from "./src/utils/manga"
import mangaFormat from "./src/utils/mangaFormat"
import url from "./src/utils/url"
import zipper from "./src/utils/zipper"

const utils = {
    browser,
    chrome,
    config,
    flags,
    fsplus,
    manga,
    mangaFormat,
    url,
    zipper,
};

import getBrowser from "./src/utils/browser";

const japscandl = {
    getBrowser,
    utils
}
export default japscandl;



import Downloader from "./src/components/Downloader";
import Fetcher from "./src/components/Fetcher";
export { Downloader };
export { Fetcher };