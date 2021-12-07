import { Browser, ElementHandle, Page, Response } from "puppeteer";
import path from "path";
import { ComponentFlags } from "../utils/types";
import getBrowser from "../utils/browser";
import chrome from "../utils/chrome";
import normalScript from "../inject/inject";
import webtoonScript from "../inject/injectWebtoon";

const scripts = {
    "normal": normalScript,
    "webtoon": webtoonScript
}

/**
 * Contains flags and variables needed for Fetcher and Downloader
 */
class Component {
    WEBSITE = "https://www.japscan.ws";
    browser: Browser;
    timeout: number;
    outputDirectory: string;

    /**
     * @param browser puppeteer browser the component is going to use
     * @param options optional options, contains flags and outputDirectory
     */
    constructor(browser: Browser, options?: {
        flags?: ComponentFlags,
        outputDirectory?: string
    }) {
        this.browser = browser;
        this.outputDirectory = options?.outputDirectory ?? "manga";
        this.timeout = (options?.flags?.timeout) ? options?.flags?.timeout * 1000 : 60 * 1000;
    }

    /** if page exists, go to it, else throw error
     * @param link link to go to
     * @param script optional, defaults to false. If true then injects script to pop out protected canvas, else doesn't do anything.
     * @returns a valid japscan page
     */
    async createExistingPage(link: string, script?: "normal" | "webtoon"): Promise<Page> {
        const page = await this.browser.newPage();
        await this._goToExistingPage(page, link, script);
        return page;
    }

    async _injectScriptToPage(page: Page, script: "normal" | "webtoon"): Promise<void> {
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
    async _goToExistingPage(page: Page, link: string, script?: "normal" | "webtoon"): Promise<void> {
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
        return response?.headers().status === '404';
    }

    /**
 * @param mangaName manga name
 * @returns true if link is a webtoon and false if the link is not a webtoon
 */
    async isAWebtoon(mangaName: string): Promise<boolean> {
        const link = this.WEBSITE + "/manga/" + mangaName + "/";
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
        return path.resolve(`${this.outputDirectory}/${manga}/${manga}-${type}-${number}.cbr`);
    }

    static async launch(options?: {
        flags?: ComponentFlags,
        outputDirectory?: string,
        chromePath?: string,
    }): Promise<Component> {
        const browser = await getBrowser(options?.flags?.visible ?? false, chrome.getChromePath(options?.chromePath));
        return new this(browser, options);
    }

    protected waitForSelector(page: Page, selector: string): Promise<ElementHandle<Element> | false> {
        return new Promise((resolve) => {
            page.waitForSelector(selector)
                .then((element) => {
                    resolve(element);
                })
                .catch(() => {
                    resolve(false);
                });
        })
    }
}

export default Component;