import { Browser } from "puppeteer";
import path from "path";
// utils
import compress from "../utils/compress";
import fsplus from "../utils/fsplus";
import Fetcher from "./Fetcher";
import getBrowser from "../utils/browser";
import chrome from "../utils/chrome";
import { ComponentFlags } from "../utils/types";
import { ChapterDownloadEmit, ChaptersDownloadEmit, ImageDownloadEmit, VolumeDownloadEmit, VolumesDownloadEmit } from "../utils/emitTypes";
import MangaAttributes from "../MangaAttributes";


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
        flags?: ComponentFlags,
        outputDirectory?: string,
        imageFormat?: "jpg" | "png",
    }) {
        super(browser, options);
        // flags
        if (options?.flags?.fast) {
            console.log(
                "Attention! Le flag 'fast' est activé. Le programme ne garantit plus de récupérer toutes les images des chapitres. Une bonne connexion et un bon ordinateur est très fortement recommandé pour l'utilisation de ce flag. Dans le cas contraire, des images pourraient manquer."
            );
        }
        this.imageFormat = options?.imageFormat ?? "jpg";
    }

    /**
     * @param link link to download from
     * @returns if image could be downloaded
     */
    async downloadImageFromLink(link: string, callback?: (events: ImageDownloadEmit) => void): Promise<void> {
        const eventEmitter = new ImageDownloadEmit();
        if (callback) callback(eventEmitter);
        const attributes = MangaAttributes.fromLink(link);
        eventEmitter.emit("start", attributes, link);
        const page = await this.createExistingPage(link, "normal");
        let savePath = path.posix.join(
            this.outputDirectory,
            attributes.manga,
            attributes.chapter
        );
        attributes.getPath(this.WEBSITE);
        fsplus.createPath(savePath);
        const filename = attributes.getFilename(this.imageFormat);
        savePath = path.posix.join(savePath, filename);
        const popupCanvasSelector = "body > canvas";
        const canvasElement = await this.waitForSelector(page, popupCanvasSelector);
        if (!canvasElement) {
            eventEmitter.emit("noimage", attributes, link);
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
        await canvasElement
            .screenshot({
                path: savePath,
            })
            .catch((e) => console.log("Erreur dans la capture de l'image", e));
        page.close();
        eventEmitter.emit("done", attributes, savePath);
    }

    async downloadChapter(mangaName: string, chapter: number,
        options?: {
            compression?: "cbr" /* | "pdf" */,
            callback?: (events: ChapterDownloadEmit) => void;
        }
    ): Promise<void> {
        const { compression, callback } = options ?? {};
        const link = new MangaAttributes(mangaName, chapter.toString()).getLectureLink(this.WEBSITE);
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
        if (callback) callback(eventEmitter);
        eventEmitter.emit('start', mangaName, start, end);
        const chapterDownloadLocations: Array<string> = [];
        const linksToDownload = await this.fetchChapterLinksBetweenRange(
            mangaName,
            start,
            end
        );
        let i = 0;
        for (const link of linksToDownload) {
            const linkAttributes = MangaAttributes.fromLink(link);
            eventEmitter.emit('startchapter', linkAttributes, i++, linksToDownload.length);
            await this.downloadChapterFromLink(link, {
                compression,
                callback: (events: ChapterDownloadEmit) => {
                    events.on('page', (attributes, total) => {
                        eventEmitter.emit('page', attributes, total);
                    });
                    events.on("done", (attributes, download) => {
                        chapterDownloadLocations.push(download);
                    });
                }
            });
            eventEmitter.emit('endchapter', linkAttributes, i, linksToDownload.length);
        }
        eventEmitter.emit('done', chapterDownloadLocations);
    }

    async downloadChapterFromLink(
        link: string,
        options?: {
            compression?: "cbr" /* | "pdf" */,
            callback?: (events: ChapterDownloadEmit) => void,
        }
    ): Promise<void> {
        const eventEmitter = new ChapterDownloadEmit();
        if (options?.callback) options?.callback(eventEmitter);
        const { compression } = options ?? {};
        const startAttributes = MangaAttributes.fromLink(link);
        const numberOfPages = await this.fetchNumberOfPagesInChapter(link);
        eventEmitter.emit("start", startAttributes, link, numberOfPages);
        for (let i = 1; i <= numberOfPages; i++) {
            const pageLink = (i === 1) ? link : `${link}${i}.html`;
            await this.downloadImageFromLink(pageLink, (events) => {
                events.on('noimage', (attributes, link) => {
                    eventEmitter.emit('noimage', attributes, link);
                });
                events.on("done", (attributes, path) => {
                    eventEmitter.emit('page', attributes, numberOfPages, path);
                });
            });

        }

        const zipFunction = (compression === "cbr") ? compress.safeZip /* : (compression === "pdf") ? compress.safePdf */ : () => { };
        const downloadPath = startAttributes.getPath(this.outputDirectory);
        eventEmitter.emit("compressing", startAttributes, downloadPath);
        const compressStats = await zipFunction(this, startAttributes.manga, "chapitre", startAttributes.chapter, [downloadPath]);
        eventEmitter.emit("compressed", startAttributes, downloadPath, compressStats);
        eventEmitter.emit('done', startAttributes, downloadPath);
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
            deleteAfterCompression?: boolean,
            callback?: (events: VolumeDownloadEmit) => void;
        }
    ): Promise<void> {
        const eventEmitter = new VolumeDownloadEmit();
        const { compression, callback } = options ?? {};
        if (callback) callback(eventEmitter);
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
            // should return path of download
            const chapterPromise = this.downloadChapterFromLink(link, {
                callback: (events) => {
                    events.on("start", (attributes, link, pages) => {
                        eventEmitter.emit("startchapter", attributes, pages, toDownloadFrom.length)
                    });
                    events.on('page', (attributes, total) => {
                        eventEmitter.emit('page', attributes, total)
                    });
                    events.on("noimage", (attributes, links) => {
                        eventEmitter.emit('noimage', attributes, links);
                    })
                    events.on("done", (attributes, location) => {
                        eventEmitter.emit('endchapter', attributes, i, toDownloadFrom.length);
                        downloadLocations.push(location);
                    });
                }
            });
            if (this.fast) {
                waiters.push(chapterPromise);
            } else {
                await chapterPromise;
            }
        }

        if (this.fast) {
            Promise.all(waiters);
        }
        if (compression === "cbr") {
            // TODO: begin zip
            eventEmitter.emit('compressing', mangaName, downloadLocations);
            const compressInfos = await compress.safeZip(this, mangaName, "volume", volumeNumber.toString(), downloadLocations);
            if(options?.deleteAfterCompression) {
                fsplus.rmLocations(downloadLocations);
            }
            eventEmitter.emit('compressed', mangaName, compressInfos);
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
            callback?: (events: VolumesDownloadEmit) => void;
        }
    ): Promise<void> {
        if (start > end) {
            throw new Error("Le début ne peut pas être plus grand que la fin");
        }
        const { compression, callback } = options ?? {};
        const eventEmitter = new VolumesDownloadEmit();
        if (callback) callback(eventEmitter);
        eventEmitter.emit('start', mangaName, start, end);

        const volumeDownloadLocations: Array<Array<string>> = [];
        const total = end - start + 1;
        for (let volumeNumber = start; volumeNumber <= end; volumeNumber++) {
            const volumeIndex = volumeNumber - start + 1;
            await this.downloadVolume(mangaName, volumeNumber, {
                compression,
                callback: (events) => {
                    events.on("start", (manga, volume) => {
                        eventEmitter.emit('startvolume', manga, volume, volumeIndex, total);
                    })
                    events.on("chapters", (chapters) => {
                        eventEmitter.emit("chapters", volumeNumber, volumeIndex, chapters);
                    });
                    events.on("startchapter", (attributes, pages) => {
                        eventEmitter.emit('startchapter', attributes, pages);
                    });
                    events.on("endchapter", (attributes, pages) => {
                        eventEmitter.emit('endchapter', attributes, pages);
                    })
                    events.on("noimage", (attributes, links) => {
                        eventEmitter.emit('noimage', attributes, links);
                    });

                    events.on("page", (attributes, total) => {
                        eventEmitter.emit("page", attributes, total);
                    })
                    events.on("done", (manga, volume, downloadLocations) => {
                        volumeDownloadLocations.push(downloadLocations);
                        eventEmitter.emit('endvolume', manga, volumeIndex, total, downloadLocations);
                    });
                }
            });
        }
        eventEmitter.emit("done", mangaName, start, end, volumeDownloadLocations);
    }

    /*

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

    */

    static async launch(options?: {
        chromePath?: string,
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
        if (this.browser) await this.browser.close();
    }
}

export default Downloader;
