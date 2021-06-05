import { Browser, ElementHandle } from "puppeteer";
import path from "path";
// utils
import zipper from "../utils/zipper";
import url from "../utils/url";
import fsplus from "../utils/fsplus";
import manga from "../utils/manga";
import Fetcher from "./Fetcher";
import getBrowser from "../utils/browser";
import chrome from "../utils/chrome";
import { ComponentFlags, MangaAttributes } from "../utils/types";


/**
 * Japscan downloader class, usually used with an interface
 */
class Downloader extends Fetcher {
    onPage: (attributes: MangaAttributes,
        currentPage: number,
        totalPages: number) => void = () => { };
    onChapter: (attributes: MangaAttributes, currentChapter: number, totalChapters: number) => void = () => { };
    onVolume: (mangaName: string, current: number, total: number) => void = () => { };

    /**
     * Instantiates a browser and reads config file to get output directory
     * and chrome path
     * @param options Can take definitions of onEvent callbacks in onEvent property, default are empty callbacks.
     * @param browser Browser the downloader is going to use
     */
    constructor(browser: Browser, options?: {
        onEvent?: {
            onPage?: (attributes: MangaAttributes,
                currentPage: number,
                totalPages: number) => void,
            onChapter?: (attributes: MangaAttributes, currentChapter: number, totalChapters: number) => void,
            onVolume?: (mangaName: string, current: number, total: number) => void,
        },
        flags?: ComponentFlags,
        outputDirectory?: string,
    }) {
        super(browser, options);
        // managing options
        if (options?.onEvent) {
            for (const option of Object.entries(options.onEvent)) {
                if (option[0] in this) {
                    // @ts-ignore
                    this[option[0]] = option[1];
                }
                // this[options[0]] becomes this.onPage, this.onChapter and this.onVolume
                // option[1] is the function given
            }
        }
        // flags
        if (options?.flags?.fast) {
            console.log(
                "Attention! Le flag 'fast' est activé. Le programme ne garantit plus de récupérer toutes les images des chapitres. Une bonne connexion et un bon ordinateur est très fortement recommandé pour l'utilisation de ce flag. Dans le cas contraire, des images pourraient manquer."
            );
        }
    }

    /**
     * @param link link to download from
     * @returns if image could be downloaded
     */
    async downloadImageFromLink(link: string): Promise<boolean> {
        const waitAndGetCanvas = async (): Promise<ElementHandle<Element> | false> => {
            const popupCanvasSelector = "body > canvas";
            try {
                this._verbosePrint(console.log, "Attente du script de page...");
                await page.waitForSelector(popupCanvasSelector, {
                    timeout: this.timeout,
                });
                this._verbosePrint(console.log, "Attente terminée");
            } catch (e) {
                console.log("La page" + link + "n'a pas l'air d'avoir d'images");
                return false;
            }
            return await page.$(popupCanvasSelector) ?? false;
        }
        this._verbosePrint(console.log, "Téléchargement de l'image depuis le lien " + link);
        const page = await this.createExistingPage(link, "normal");
        const attributes = url.getAttributesFromLink(link);

        let savePath = path.posix.join(
            this.outputDirectory,
            attributes.manga,
            attributes.chapter
        );
        fsplus.createPath(savePath);
        savePath = path.posix.join(savePath, manga.getFilenameFrom(attributes));
        const canvasElement = await waitAndGetCanvas();
        if (!canvasElement) return false;
        const dimensions = await canvasElement.evaluate((el) => {
            // remove everything from page except canvas
            document.querySelectorAll("div").forEach((el) => el.remove());
            const width = el.getAttribute("width");
            const height = el.getAttribute("height");
            return {
                width: (width) ? +width * 2 : 4096,
                height: (height) ? +height * 2 : 2160,
            }
        });
        await page.setViewport(dimensions);
        this._verbosePrint(console.log, "Téléchargement de l'image...");
        await canvasElement
            .screenshot({
                omitBackground: true,
                path: savePath,
                type: "jpeg",
                quality: 100,
            })
            .catch((e) => console.log("Erreur dans la capture de l'image", e));
        page.close();
        return true;
    }

    /**
     * @param mangaName manga name
     * @param chapter number of chapter
     * @param compression default as false, tells if chapter is compressed as a cbr after downloading
     * @returns download location
     */
    async downloadChapter(mangaName: string, chapter: number, compression = true): Promise<string> {
        this._verbosePrint(console.log,
            "Téléchargement du chapitre " + chapter + " de " + mangaName
        );
        const mangaNameStats = (await this.fetchStats(mangaName)).name;
        if (mangaName !== mangaNameStats) {
            console.log(
                "Le manga " +
                mangaName +
                " est appelé " +
                mangaNameStats +
                " sur japscan. japdl va le télécharger avec le nom " +
                mangaNameStats
            );
        }
        mangaName = mangaNameStats;
        const link = this.WEBSITE + "/lecture-en-ligne/" + mangaName + "/" + chapter + "/";
        return this.downloadChapterFromLink(link, compression);
    }

    /**
     * @param mangaName manga name
     * @param start start chapter
     * @param end end chapter
     * @param compression default as false, tells if chapter is compressed as a cbr after downloading
     * @returns download locations as an array
     */
    async downloadChapters(
        mangaName: string,
        start: number,
        end: number,
        compression = true
    ): Promise<string[]> {
        this._verbosePrint(console.log,
            "Téléchargement des chapitres de " +
            mangaName +
            " de " +
            start +
            " à " +
            end
        );
        const chapterDownloadLocations: Array<string> = [];
        const linksToDownload = await this.fetchChapterLinksBetweenRange(
            mangaName,
            start,
            end
        );
        this._verbosePrint(console.log, "Liens à télécharger: ", linksToDownload);
        let i = 1;
        for (const link of linksToDownload) {
            chapterDownloadLocations.push(await this.downloadChapterFromLink(link, compression));
            this.onChapter(url.getAttributesFromLink(link), i++, linksToDownload.length);
        }
        return chapterDownloadLocations;
    }

    /**
     * @param link link to download from
     * @param compression default as false, tells if chapter is compressed as a cbr after downloading
     * @returns chapter's download location
     */
    async downloadChapterFromLink(
        link: string,
        compression = false
    ): Promise<string> {
        this._verbosePrint(console.log, "Téléchargement du chapitre depuis le lien " + link);
        const startAttributes = url.getAttributesFromLink(link);
        const numberOfPages = await this.fetchNumberOfPagesInChapter(link);
        this._verbosePrint(console.log, "Pages dans le chapitre:", numberOfPages);

        const couldNotDownload: string[] = [];
        this.onPage(startAttributes, 0, numberOfPages);
        for (let i = 1; i <= numberOfPages; i++) {
            const pageLink = `${link}${i}.html`;
            const isDownloaded = await this.downloadImageFromLink(pageLink);
            if (!isDownloaded) {
                couldNotDownload.push(pageLink);
            }
            this.onPage(url.getAttributesFromLink(link), i, numberOfPages);

        }

        if (couldNotDownload.length > 0) {
            if (couldNotDownload.length > 1) {
                console.log(
                    "Les chapitres aux liens suivants n'ont pas pu être téléchargé:",
                    couldNotDownload
                );
                console.log(
                    "Peut être que ces liens n'ont pas d'image. Veuillez vérifier."
                );
            } else {
                console.log(
                    "Le chapitre au lien suivant n'a pas pu être téléchargé:",
                    couldNotDownload[0]
                );
                console.log(
                    "Peut être que ce lien n'a pas d'image. Veuillez vérifier."
                );
            }
        }

        if (compression) {
            await zipper.safeZip(this, startAttributes.manga, "chapitre", startAttributes.chapter, [this._getPathFrom(startAttributes)]);
        }
        return this._getPathFrom(startAttributes);
    }

    /**
     *
     * @param mangaName manga name
     * @param volumeNumber volume number
     * @param compression default as true, tells if volume is compressed as a cbr after downloading
     * @returns array of paths, where the chapters of the volume were downloaded
     */
    async downloadVolume(
        mangaName: string,
        volumeNumber: number,
        compression = true
    ): Promise<string[]> {
        console.log(
            "Téléchargement du volume " + volumeNumber + " de " + mangaName
        );
        const stats = await this.fetchStats(mangaName);
        if (stats.name !== mangaName) {
            console.log(
                "Le manga " +
                mangaName +
                " est appelé " +
                stats.name +
                " sur japscan. japdl va le télécharger avec le nom " +
                stats.name
            );
            mangaName = stats.name;
        }
        this._verbosePrint(console.log, "Récupération des informations sur le volume...");

        const toDownloadFrom = await this.fetchVolumeChapters(
            volumeNumber,
            mangaName
        );

        this._verbosePrint(console.log, "Récupéré");
        const waiters = [];
        const downloadLocations: Array<string> = [];
        let i = 1;
        for (const link of toDownloadFrom) {
            // should return path of download
            const chapterPromise = this.downloadChapterFromLink(link);
            if (this.fast) {
                waiters.push(chapterPromise);
            } else {
                downloadLocations.push(await chapterPromise);
                this.onChapter(url.getAttributesFromLink(link), i++, toDownloadFrom.length);
            }
        }

        if (this.fast) {
            for (const waiter of waiters) {
                downloadLocations.push(await waiter);
            }
        }
        if (compression) {
            await zipper.safeZip(this, mangaName, "volume", volumeNumber.toString(), downloadLocations);
        }
        return downloadLocations;
    }

        /**
     * @param mangaName manga name
     * @param start start chapter
     * @param end end chapter
     * @param compression default as false, tells if chapter is compressed as a cbr after downloading
     * @returns array of download locations for each volume
     */
         async downloadVolumes(
            mangaName: string,
            start: number,
            end: number,
            compression = true
        ): Promise<string[][]> {
            this._verbosePrint(console.log,
                "Téléchargement des volumes " + mangaName + " de " + start + " à " + end
            );
            if (start > end) {
                throw new Error("Le début ne peut pas être plus grand que la fin");
            }
            const volumeDownloadLocations: Array<Array<string>> = [];
            const total = end - start + 1;
            for (let i = start; i <= end; i++) {
                const downloadLocations = await this.downloadVolume(mangaName, i, compression);
                volumeDownloadLocations.push(downloadLocations);
                this.onVolume(mangaName, i - start + 1, total);
            }
            return volumeDownloadLocations;
        }

    async downloadWebtoonFromLink(link: string): Promise<string> {
        const page = await this.createExistingPage(link, "webtoon");

        const attributes = url.getAttributesFromLink(link);
        const imageElement = await page.$('#image');
        imageElement?.evaluate((image) => {
            const allA = image.querySelectorAll('a');
            allA.forEach((aEl) => alert(aEl.shadowRoot));
        })
        const numberOfPages = await page.evaluate(() => {
            const el = document.querySelector('div.card:nth-child(1) > div:nth-child(2) > div:nth-child(1) > p:nth-child(5)');
            if (!el) {
                return -1;
            }
            return el.textContent?.split(": ")[1];
        })
        console.log("Number of pages:", numberOfPages);

        return this.outputDirectory;
    }

    static async launch(options?: {
        chromePath?: string,
        onEvent?: {
            onPage?: (attributes: MangaAttributes,
                currentPage: number,
                totalPages: number) => void,
            onChapter?: (attributes: MangaAttributes, currentChapter: number, totalChapters: number) => void,
            onVolume?: (mangaName: string, current: number, total: number) => void,
        },
        flags?: ComponentFlags,
        outputDirectory?: string,
    }): Promise<Downloader> {
        const browser = await getBrowser(options?.flags?.headless ?? false, chrome.getChromePath(options?.chromePath));
        return new this(browser, options);
    }

    /**
     * destroy browser, do not use downloader after this operation
     */
    async destroy(): Promise<void> {
        this._verbosePrint(console.log, "Destruction du downloader");
        if (this.browser) await this.browser.close();
    }
}

export default Downloader;
