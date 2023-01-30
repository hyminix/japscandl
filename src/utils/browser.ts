import StealthPlugin from "puppeteer-extra-plugin-stealth";
import AdblockerPlugin from "puppeteer-extra-plugin-adblocker";
import { Browser } from "puppeteer";

import puppeteerVanilla from "puppeteer-extra";
import { addExtra } from "puppeteer-extra";

//@ts-expect-error
import ChromeAppPlugin from "puppeteer-extra-plugin-stealth/evasions/chrome.app";
//@ts-expect-error
import ChromeCsiPlugin from "puppeteer-extra-plugin-stealth/evasions/chrome.csi";
//@ts-expect-error
import ChromeLoadTimesPlugin from "puppeteer-extra-plugin-stealth/evasions/chrome.loadTimes";
//@ts-expect-error
import ChromeRuntimePlugin from "puppeteer-extra-plugin-stealth/evasions/chrome.runtime";
//@ts-expect-error
import IFrameContentWindowPlugin from "puppeteer-extra-plugin-stealth/evasions/iframe.contentWindow";
//@ts-expect-error
import MediaCodecsPlugin from "puppeteer-extra-plugin-stealth/evasions/media.codecs";
//@ts-expect-error
import NavigatorHardwareConcurrencyPlugin from "puppeteer-extra-plugin-stealth/evasions/navigator.hardwareConcurrency";
//@ts-expect-error
import NavigatorLanguagesPlugin from "puppeteer-extra-plugin-stealth/evasions/navigator.languages";
//@ts-expect-error
import NavigatorPermissionsPlugin from "puppeteer-extra-plugin-stealth/evasions/navigator.permissions";
//@ts-expect-error
import NavigatorPlugins from "puppeteer-extra-plugin-stealth/evasions/navigator.plugins";
//@ts-expect-error
import NavigatorVendorPlugins from "puppeteer-extra-plugin-stealth/evasions/navigator.vendor";
//@ts-expect-error
import WebdriverPlugin from "puppeteer-extra-plugin-stealth/evasions/navigator.webdriver";
//@ts-expect-error
import SourceurlPlugin from "puppeteer-extra-plugin-stealth/evasions/sourceurl";
//@ts-expect-error
import UserAgentPlugin from "puppeteer-extra-plugin-stealth/evasions/user-agent-override";
//@ts-expect-error
import WebglVendorPlugin from "puppeteer-extra-plugin-stealth/evasions/webgl.vendor";
//@ts-expect-error
import WindowOuterDimensionsPlugin from "puppeteer-extra-plugin-stealth/evasions/window.outerdimensions";

const getBrowser = async (
  visible: boolean,
  chromePath: string
): Promise<Browser> => {
  try {
    const plugins = [
      NavigatorHardwareConcurrencyPlugin(),
      NavigatorVendorPlugins(),
      SourceurlPlugin(),
      ChromeAppPlugin(),
      ChromeCsiPlugin(),
      ChromeLoadTimesPlugin(),
      StealthPlugin(),
      ChromeRuntimePlugin(),
      IFrameContentWindowPlugin(),
      MediaCodecsPlugin(),
      NavigatorLanguagesPlugin(),
      NavigatorPermissionsPlugin(),
      NavigatorPlugins(),
      WebdriverPlugin(),
      WebglVendorPlugin(),
      WindowOuterDimensionsPlugin(),
      UserAgentPlugin(),
    ];

    const puppeteer = addExtra(puppeteerVanilla);
    puppeteer.use(AdblockerPlugin());
    const browser = await puppeteer.launch({
      headless: false,
      executablePath: chromePath,
      defaultViewport: null,
    });

    for (const plugin of plugins) {
      await plugin.onBrowser(browser);
    }

    // apply each plugins to each new page
    //@ts-ignore
    browser._newPage = browser.newPage;
    browser.newPage = async () => {
      //@ts-ignore
      const pageToReturn = await browser._newPage();
      for (const plugin of plugins) {
        await plugin.onPageCreated(pageToReturn);
      }
      return pageToReturn;
    };

    return browser;
  } catch (e: any) {
    if (e.toString().includes("FetchError")) {
      throw new Error(
        "Une erreur s'est produite, vérifiez que vous avez bien une connexion internet" +
          ", erreur complète:\n" +
          e
      );
    } else if (e.toString().includes("EACCES")) {
      throw new Error(
        "L'executable chrome à l'endroit " +
          chromePath +
          " ne peut pas être lancé: japdl n'a pas les permissions. Cela est dû à un manque de permission. Sur linux, la solution peut être: 'chmod 777 " +
          chromePath +
          "', erreur complète:\n" +
          e
      );
    } else if (e.toString().includes("ENOENT")) {
      throw new Error(
        "Le chemin de chrome donné (" + chromePath + ") n'est pas correct: " + e
      );
    } else if (e.toString().includes("Could not find expected browser")) {
      throw new Error("Chromium n'a pas été trouvé à côté de l'executable");
    }
    throw new Error("Une erreur s'est produite lors de l'initialisation: " + e);
  }
};

export default getBrowser;
