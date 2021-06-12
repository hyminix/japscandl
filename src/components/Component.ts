import { Browser, Page, Response } from "puppeteer";
import path from "path";
import { ComponentFlags, MangaAttributes } from "../utils/types";
import url from "../utils/url";
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
    verbose: boolean;
    browser: Browser;
    fast: boolean;
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
        this.verbose = options?.flags?.verbose ?? false;
        this.fast = options?.flags?.fast ?? false;
        this.timeout = (options?.flags?.timeout) ? options?.flags?.timeout * 1000 : 60 * 1000;
    }

    /** if page exists, go to it, else throw error
     * @param link link to go to
     * @param script optional, defaults to false. If true then injects script to pop out protected canvas, else doesn't do anything.
     * @returns a valid japscan page
     */
    async createExistingPage(link: string, script?: "normal" | "webtoon"): Promise<Page> {
        const page = await this.browser.newPage();
        this._verbosePrint(console.log, "Création de la page " + link + ((script) ? " avec un script" : ""));
        await this._goToExistingPage(page, link, script);
        return page;
    }

    async _injectScriptToPage(page: Page, script: "normal" | "webtoon"): Promise<void> {
        const injectFunction = scripts[script];
        if(!injectFunction){
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
        this._verbosePrint(console.log, "Création de la page " + link);
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
     * @param param can be a link or manga attributes
     * @returns path to manga without filename
     */
    _getPathFrom(
        param: string | MangaAttributes
    ): string {
        if (typeof param === "string") {
            return this._getPathFrom(url.getAttributesFromLink(param));
        } else {
            return `${this.outputDirectory}/${param.manga}/${param.chapter}/`;
        }
    }

    /**
     *
     * @param manga manga name
     * @param number number of volume or chapter
     * @param type usually 'volume' or 'chapitre'
     * @returns cbr path
     */
    _getCbrFrom(manga: string, number: string, type: string): string {
        return path.resolve(`${this.outputDirectory}/${manga}/${manga}-${type}-${number}.cbr`);
    }
    /**
     * Only prints msg with printFunction if this.verbose is true
     * @param printFunction function used to print msg param
     * @param msg msg param to print
     */
    protected _verbosePrint(printFunction: unknown, ...msg: unknown[]): void {
        if (this.verbose) {
            if (printFunction instanceof Function) {
                printFunction(...msg);
            } else {
                throw new Error("verbosePrint used with nonFunction parameter");
            }
        }
    }

    static async launch(options?: {
        flags?: ComponentFlags,
        outputDirectory?: string,
        chromePath?: string,
    }): Promise<Component> {
        const browser = await getBrowser(options?.flags?.visible ?? false, chrome.getChromePath(options?.chromePath));
        return new this(browser, options);
    }
}

export default Component;