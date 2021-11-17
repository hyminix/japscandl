import { Browser } from "puppeteer";
import path from "path";
// utils
import compress from "../utils/compress";
import url from "../utils/url";
import fsplus from "../utils/fsplus";
import manga from "../utils/manga";
import Fetcher from "./Fetcher";
import getBrowser from "../utils/browser";
import chrome from "../utils/chrome";
import { ComponentFlags, MangaAttributes } from "../utils/types";
import { ChapterDownloadEmit, ChaptersDownloadEmit, ImageDownloadEmit, VolumeDownloadEmit } from "../utils/emitTypes";


/**
 * Japscan downloader class, usually used with an interface
 */
class Downloader extends Fetcher {
    imageFormat: "jpg" | "png";

    /**
     * Instantiates a browser and reads config file to get output directory
     * and chrome path
     * @param options Can take definitions of onEvent callbacks in onEvent property, default are empty callbacks.
     * @param browser Browser the downloader is going to use
     */
    constructor(browser: Browser, options?: {
        onEvent?: {
            onPage?: (attributes: MangaAttributes,
                totalPages: number) => void,
            onChapter?: (attributes: MangaAttributes, currentChapter: number, totalChapters: number) => void,
            onVolume?: (mangaName: string, current: number, total: number) => void,
        },
        flags?: ComponentFlags,
        outputDirectory?: string,
        imageFormat?: "jpg" | "png",
    }) {
        super(browser, options);
        // managing options
        if (options?.onEvent) {
            for (const [eventName, callback] of Object.entries(options.onEvent)) {
                if (eventName in this) {
                    // @ts-ignore
                    this[eventName] = callback;
                }
            }
        }
        // flags
        if (options?.flags?.fast) {
            console.log(
                "Attention! Le flag 'fast' est activé. Le programme ne garantit plus de récupérer toutes les images des chapitres. Une bonne connexion et un bon ordinateur est très fortement recommandé pour l'utilisation de ce flag. Dans le cas contraire, des images pourraient manquer."
            );
        }
        this.imageFormat = options?.imageFormat ?? "png";
    }

    /**
     * @param link link to download from
     * @returns if image could be downloaded
     */
    async downloadImageFromLink(link: string, callback?: (events: ImageDownloadEmit) => void): Promise<void> {
        const eventEmitter = new ImageDownloadEmit();
        if (callback) callback(eventEmitter);
        const attributes = url.getAttributesFromLink(link);
        eventEmitter.emit("start", attributes, link);
        this._verbosePrint(console.log, "Téléchargement de l'image depuis le lien " + link);
        const page = await this.createExistingPage(link, "normal");
        let savePath = path.posix.join(
            this.outputDirectory,
            attributes.manga,
            attributes.chapter
        );
        fsplus.createPath(savePath);
        savePath = path.posix.join(savePath, manga.getFilenameFrom(attributes, this.imageFormat));
        const popupCanvasSelector = "body > canvas";
        const canvasElement = await this.waitForSelector(page, popupCanvasSelector);
        if (!canvasElement) {
            eventEmitter.emit("noimage", link);
            return;
        }
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
                path: savePath,
            })
            .catch((e) => console.log("Erreur dans la capture de l'image", e));
        page.close();
        eventEmitter.emit("done", savePath);
    }

    async downloadChapter(mangaName: string, chapter: number,
        options?: {
            compression?: "cbr" /* | "pdf" */,
            callback: (events: ChapterDownloadEmit) => void;
        }
    ): Promise<string> {
        const { compression, callback } = options ?? {};
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
        const link = url.buildLectureLink(mangaName, chapter.toString(), this);
        return this.downloadChapterFromLink(link, { compression, callback });
    }

    /**
     * @param mangaName manga name
     * @param start start chapter
     * @param end end chapter
     * @param compression defaults as true, if true the downloaded images are compressed as a cbr after downloading
     * @returns download locations as an array
     */
    async downloadChapters(
        mangaName: string,
        start: number,
        end: number,
        options?: {
            compression?: "cbr" /* | "pdf" */,
            callback?: (events: ChaptersDownloadEmit) => void,
        }
    ): Promise<void> {
        const { compression, callback } = options ?? {};
        const eventEmitter = new ChaptersDownloadEmit();
        if(callback) callback(eventEmitter);
        eventEmitter.emit('start', mangaName, start, end);
        const chapterDownloadLocations: Array<string> = [];
        const linksToDownload = await this.fetchChapterLinksBetweenRange(
            mangaName,
            start,
            end
        );
        let i = 0;
        for (const link of linksToDownload) {
            const linkAttributes = url.getAttributesFromLink(link);
            eventEmitter.emit('startChapter', linkAttributes, i++, linksToDownload.length);
            chapterDownloadLocations.push(await this.downloadChapterFromLink(link, {
                compression,
                callback: (events: ChapterDownloadEmit) => {
                    events.on('page', (attributes, total) => eventEmitter.emit('page', attributes, total))
                }
            }));
            eventEmitter.emit('endChapter', linkAttributes, i, linksToDownload.length);
        }
        eventEmitter.emit('done', chapterDownloadLocations);
    }

 async downloadChapterFromLink(
        link: string,
        options?: {
            compression?: "cbr" /* | "pdf" */,
            callback?: (events: ChapterDownloadEmit) => void,
        }
    ): Promise<string> {
        const eventEmitter = new ChapterDownloadEmit();
        const { compression } = options ?? {};
        const startAttributes = url.getAttributesFromLink(link);
        const numberOfPages = await this.fetchNumberOfPagesInChapter(link);
        eventEmitter.emit("start", startAttributes, link, numberOfPages);
        const couldNotDownload: string[] = [];
        for (let i = 1; i <= numberOfPages; i++) {
            const pageLink = `${link}${i}.html`;
            await this.downloadImageFromLink(pageLink, (events) => {
                events.on('noimage', (link) => couldNotDownload.push(link));
            });
            eventEmitter.emit('page', url.getAttributesFromLink(pageLink), numberOfPages);

        }

        if (couldNotDownload.length > 0) {
            eventEmitter.emit('noimage', couldNotDownload);
        }
        const zipFunction = (compression === "cbr") ? compress.safeZip /* : (compression === "pdf") ? compress.safePdf */ : () => { };
        const downloadPath = this._getPathFrom(startAttributes);
        await zipFunction(this, startAttributes.manga, "chapitre", startAttributes.chapter, [downloadPath]);
        eventEmitter.emit('done', downloadPath);
        return downloadPath;
    }

    /**
     *
     * @param mangaName manga name
     * @param volumeNumber volume number
     * @param compression defaults as true, if true the downloaded images are compressed as a cbr after downloading
     * @returns array of paths, where the chapters of the volume were downloaded
     */
    async downloadVolume(
        mangaName: string,
        volumeNumber: number,
        options?: {
            compression?: "cbr" /* | "pdf" */,
            callback?: (events: VolumeDownloadEmit) => void;
        }
    ): Promise<void> {
        const eventEmitter = new VolumeDownloadEmit();
        const { compression, callback } = options ?? {};
        if(callback) callback(eventEmitter);
        eventEmitter.emit('start', mangaName, volumeNumber);
        const toDownloadFrom = await this.fetchVolumeChapters(
            volumeNumber,
            mangaName
        );

        eventEmitter.emit('chapters', toDownloadFrom);

        const waiters = [];
        const downloadLocations: string[] = [];
        let i = 0;
        for (const link of toDownloadFrom) {
            const linkAttributes = url.getAttributesFromLink(link);
            eventEmitter.emit('startChapter', linkAttributes, i++, toDownloadFrom.length);
            // should return path of download
            const chapterPromise = this.downloadChapterFromLink(link, { callback: (events) => events.on('page', (attributes, total) => eventEmitter.emit('page', attributes, total)) });
            if (this.fast) {
                waiters.push(chapterPromise);
            } else {
                downloadLocations.push(await chapterPromise);
                eventEmitter.emit('endChapter', linkAttributes, i, toDownloadFrom.length);
            }
        }

        if (this.fast) {
            for (const waiter of waiters) {
                downloadLocations.push(await waiter);
            }
        }
        if (compression === "cbr") {
            // TODO: begin zip
            await compress.safeZip(this, mangaName, "volume", volumeNumber.toString(), downloadLocations);
            // TODO: end zip with size, path
        } /* else if (compression === "pdf") {
            await compress.pdfDirectories(downloadLocations, this._getZippedFilenameFrom(mangaName, volumeNumber.toString(), "volume", "pdf"))
        } */
        eventEmitter.emit('done', downloadLocations);
    }

    /**
 * @param mangaName manga name
 * @param start start chapter
 * @param end end chapter
 * @param compression defaults as true, if true the downloaded images are compressed as a cbr after downloading
 * @returns array of download locations for each volume
 */
    async downloadVolumes(
        mangaName: string,
        start: number,
        end: number,
        options?: {
            compression?: "cbr"/*  | "pdf" */,
            onVolume?: (mangaName: string, current: number, total: number) => void,
            onChapter?: (attributes: MangaAttributes, currentChapter: number, totalChapters: number) => void,
            onPage?: (attributes: MangaAttributes, totalPages: number) => void,
        }
    ): Promise<string[][]> {
        const { compression, onVolume, onChapter, onPage } = options ?? {};

        this._verbosePrint(console.log,
            "Téléchargement des volumes " + mangaName + " de " + start + " à " + end
        );
        if (start > end) {
            throw new Error("Le début ne peut pas être plus grand que la fin");
        }
        const volumeDownloadLocations: Array<Array<string>> = [];
        const total = end - start + 1;
        (onVolume ?? this.onVolume)(mangaName, 0, total);
        for (let i = start; i <= end; i++) {
            const downloadLocations = await this.downloadVolume(mangaName, i, { compression, onChapter, onPage });
            volumeDownloadLocations.push(downloadLocations);
            (onVolume ?? this.onVolume)(mangaName, i - start + 1, total);
        }
        return volumeDownloadLocations;
    }

    // unfinished, do not touch
    async ___downloadWebtoonFromLink(link: string): Promise<string> {
        const page = await this.createExistingPage(link, "webtoon");

        //const attributes = url.getAttributesFromLink(link);
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
        page.close();

        return this.outputDirectory;
    }

    static async launch(options?: {
        chromePath?: string,
        onEvent?: {
            onPage?: (attributes: MangaAttributes,
                totalPages: number) => void,
            onChapter?: (attributes: MangaAttributes, currentChapter: number, totalChapters: number) => void,
            onVolume?: (mangaName: string, current: number, total: number) => void,
        },
        flags?: ComponentFlags,
        outputDirectory?: string,
        imageFormat?: "png" | "jpg",
    }): Promise<Downloader> {
        const browser = await getBrowser(options?.flags?.visible ?? false, chrome.getChromePath(options?.chromePath));
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
