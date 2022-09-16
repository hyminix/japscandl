import browser from "./src/utils/browser";
import chrome from "./src/utils/chrome";
import compress from "./src/utils/compress";
import fsplus from "./src/utils/fsplus";
import mangaFormat from "./src/utils/mangaFormat";
import * as types from "./src/utils/types";
import * as website from "./src/utils/website";

const utils = {
  browser,
  chrome,
  fsplus,
  compress,
  mangaFormat,
  website,
};

import getBrowser from "./src/utils/browser";

const japscandl = {
  getBrowser,
  utils,
  types,
};
export default japscandl;

import Downloader from "./src/components/Downloader";
import Fetcher from "./src/components/Fetcher";
export { Downloader };
export { Fetcher };
