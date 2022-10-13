import fetch from "node-fetch";
import path from "path";
import { Browser, ElementHandle, Page, Response } from "puppeteer";
import normalScript from "../inject/inject";
import webtoonScript from "../inject/injectWebtoon";
import getBrowser from "../utils/browser";
import chrome from "../utils/chrome";
import { toNDigits } from "../utils/digits";
import { ComponentOptions } from "../utils/types";
import { WEBSITE } from "../utils/variables";

const scripts = {
  normal: normalScript,
  webtoon: webtoonScript,
};

/**
 * Contains flags and variables needed for Fetcher and Downloader
 */
class Component {
  website: string;
  browser: Browser;
  timeout: number;
  outputDirectory: string;
  fast: boolean;

  /**
   * @param browser puppeteer browser the component is going to use
   * @param options optional options, contains flags and outputDirectory
   */
  constructor(browser: Browser, options?: ComponentOptions) {
    this.website = options?.website ?? WEBSITE;
    this.browser = browser;
    this.outputDirectory = options?.outputDirectory ?? "manga";
    this.timeout = (options?.flags?.timeout ?? 60) * 1000;
    this.fast = options?.flags?.fast ?? false;
  }

  async checkValidWebsite(website: string): Promise<boolean> {
    try {
      let resp = await fetch(website);
      console.log(website, resp.status);
      if (resp.status / 100 !== 2) {
        return false;
      }
      resp = await fetch(website + "/live-search", { method: "POST" });
      console.log(website, resp.status);
      if (resp.status / 100 !== 2) {
        return false;
      }
    } catch (e) {
      return false;
    }

    return true;
  }

  /** if page exists, go to it, else throw error
   * @param link link to go to
   * @param script optional, defaults to false. If true then injects script to pop out protected canvas, else doesn't do anything.
   * @returns a valid japscan page
   */
  async createExistingPage(
    link: string,
    script?: "normal" | "webtoon"
  ): Promise<Page> {
    let alreadyLoadedImage = false;
    const shouldAbort = (url: string) => {
      // if current page, allow
      if (url === link) {
        return false;
      } else if (url.includes("/lecture-en-ligne/")) {
        // next page should not be loaded
        return true;
      }

      const banned = [
        "bootstrap",
        "yandex.ru",
        "creepingbrings.com",
        "rusticswollenbelonged",
        "popper.min.js",
        "email-decode.min.js",
        "code.jquery.com",
      ];
      for (const ban of banned) {
        if (url.includes(ban)) {
          return true;
        }
      }
      const imageLink = "https://cdn.statically.io/img/c.japscan.ws/";
      if (url.includes(imageLink)) {
        if (!alreadyLoadedImage) {
          alreadyLoadedImage = true;
          return false;
        } else {
          return true;
        }
      }
      if (!url.endsWith(".js")) return true;
      // here should validate .js files that are not banned
      return false;
    };

    const page = await this.browser.newPage();
    if (this.fast) {
      page.setRequestInterception(true);
      page.removeAllListeners("request");
      page.on("request", (request) => {
        try {
          if (shouldAbort(request.url())) {
            request.abort();
            return;
          }
          request.continue();
        } catch (e) {
          console.error("ERROR:", e);
        }
      });
    }
    await this._goToExistingPage(page, link, script);
    return page;
  }

  async _injectScriptToPage(
    page: Page,
    script: "normal" | "webtoon"
  ): Promise<void> {
    const injectFunction = scripts[script];
    if (!injectFunction) {
      throw new Error("Invalid script specifier (" + script + ")");
    }
    await page.evaluateOnNewDocument(injectFunction);
  }

  /**
   *
   * @param page page that will go to link
   * @param link link to go to
   * @param script optional, can be either normal or webtoon depending on which script you want to inject
   */
  async _goToExistingPage(
    page: Page,
    link: string,
    script?: "normal" | "webtoon"
  ): Promise<void> {
    if (script) await this._injectScriptToPage(page, script);
    const response = await this._safePageGoto(page, link);
    if (await this._isJapscan404(response)) {
      throw new Error("La page " + link + " n'existe pas (404)");
    }
  }

  async _safePageGoto(page: Page, link: string): Promise<Response | null> {
    try {
      return await page.goto(link, { timeout: this.timeout });
    } catch (e) {
      return this._safePageGoto(page, link);
    }
  }

  /**
   * @param page page to evaluate
   * @returns true if link it not a good link and false if the link is right
   */
  async _isJapscan404(response: Response | null): Promise<boolean> {
    return response?.headers().status === "404";
  }

  /**
   * @param mangaName manga name
   * @returns true if link is a webtoon and false if the link is not a webtoon
   */
  async isAWebtoon(mangaName: string): Promise<boolean> {
    const link = this.website + "/manga/" + mangaName + "/";
    const page = await this.createExistingPage(link);
    const res = await page.evaluate(() => {
      return (
        document.querySelector(".text-danger")?.textContent?.trim() ===
        "Webtoon"
      );
    });
    await page.close();
    return res;
  }

  /**
   *
   * @param manga manga name
   * @param number number of volume or chapter
   * @param type usually 'volume' or 'chapitre'
   * @param extension extension the file will have
   * @returns zipped path
   */
  _getZippedFilenameFrom(manga: string, number: string, type: string): string {
    /* if type is volume then number is on 3 digits
     * if type is chapter then number is on 4 digits
     */
    const digits = type === "volume" ? 3 : 4;
    return path.resolve(
      `${this.outputDirectory}/${manga}/${manga}-${type}-${toNDigits(
        number,
        digits
      )}.cbz`
    );
  }

  static async launch(
    options?: ComponentOptions & { chromePath?: string }
  ): Promise<Component> {
    const browser = await getBrowser(
      options?.flags?.visible ?? false,
      chrome.getChromePath(options?.chromePath)
    );
    return new this(browser, options);
  }

  protected waitForSelector(
    page: Page,
    selector: string
  ): Promise<ElementHandle<Element> | false> {
    return new Promise((resolve) => {
      page
        .waitForSelector(selector)
        .then((element) => {
          resolve(element);
        })
        .catch(() => {
          resolve(false);
        });
    });
  }
}

export default Component;
