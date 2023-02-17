import { Browser } from "puppeteer";
// utils
import MangaAttributes from "../MangaAttributes";
import getBrowser from "../utils/browser";
import chrome from "../utils/chrome";
import compress from "../utils/compress";
import { toNDigits } from "../utils/digits";
import {
  ChapterDownloadEmit,
  ChaptersDownloadEmit,
  ImageDownloadEmit,
  VolumeDownloadEmit,
  VolumesDownloadEmit,
} from "../utils/emitTypes";
import fsplus from "../utils/fsplus";
import { DownloaderOptions } from "../utils/types";
import { getJapscanFromGithub } from "../utils/website";
import Fetcher from "./Fetcher";
import { writeFile } from "fs/promises";
import axios from "axios";
import puppeteer from "puppeteer-core";

/**
 * Japscan downloader class, usually used with an interface
 */
class Downloader extends Fetcher {
  chrome?: any;
  imageFormat: "jpg" | "png";
  mock: boolean;

  /**
   * Instantiates a browser and reads config file to get output directory
   * and chrome path
   * @param options Can take definitions of onEvent callbacks in onEvent property, default are empty callbacks.
   * @param browser Browser the downloader is going to use
   */
  constructor(browser: Browser, options?: DownloaderOptions) {
    super(browser, options);
    this.imageFormat = options?.imageFormat ?? "jpg";

    // this reduces downloadImageFromLink to instantly return if mock is true
    this.mock = options?.flags?.mock ?? false;
  }

  /**
   * @param link link to download from
   * @returns if image could be downloaded
   */
  async downloadImageFromLink(
    link: string,
    options?: {
      forceDownload?: boolean;
      callback?: (events: ImageDownloadEmit) => void;
    }
  ): Promise<void> {
    const { callback, forceDownload } = options ?? {};
    const eventEmitter = new ImageDownloadEmit(callback);
    const attributes = MangaAttributes.fromLink(link);
    eventEmitter.emit("start", attributes, link);

    const savePath = fsplus.prepareImagePath(attributes, this.outputDirectory, this.imageFormat);

    const shouldDownload =
      forceDownload || !fsplus.alreadyDownloadedImage(savePath);

    // this is for debug purposes, it will prevent the correct behavior of the downloader
    if (!this.mock && shouldDownload) {
      const page = await this.createExistingPage(link);

      const imageElement = await this.waitForSelector(page, "#single-reader > img");
      if (!imageElement) {
        eventEmitter.emit("noimage", attributes, link);
        return;
      }
      // get first
      const [image] = await this.getImagesOnPage(page);
      const download = await this._downloadImage(image, savePath);
      const closing = page.close();
      await Promise.all([download, closing]);
    }

    eventEmitter.emit("done", attributes, savePath);
  }

  private async _downloadImage(
    url: string,
    filename: string
  ) {
    const page = await this.browser.newPage();
    let viewSource;
    try {
      viewSource = await page.goto(url);
    } catch (e) {
      throw new Error("Unreachable ressource, " + e);
    }
    if (!viewSource) {
      throw new Error("No viewsource for " + url);
    }
    try {
      await writeFile(filename, await viewSource.buffer());
    } catch (e) {
      console.error("error during the download of", filename, ":", e);
    } finally {
      page.close();
    }
  }

  async downloadChapterFromLink(
    link: string,
    options?: {
      forceDownload?: boolean;
      compression?: boolean;
      deleteAfterCompression?: boolean;
      callback?: (events: ChapterDownloadEmit) => void;
    }
  ): Promise<void> {
    const eventEmitter = new ChapterDownloadEmit(options?.callback);
    const startAttributes = MangaAttributes.fromLink(link);
    const page = await this.createExistingPage(link);
    try {
      await page.waitForSelector("#single-reader");
    } catch(e) {
      //ignore and continue, probably worked
    }
    const downloadPath = startAttributes.getFolderPath(this.outputDirectory);

    const numberOfPages = await this.fetchNumberOfPagesInChapterWithPage(page);
    console.log("Number of pages for", link, "is", numberOfPages);

    eventEmitter.emit("start", startAttributes, link, numberOfPages);

    const imagesOnPage = await this.getImagesOnPage(page);
    await page.close();

    if (imagesOnPage.length > 1) {

      console.log("Getting images on pages", imagesOnPage.length);
      // webtoon mode
      for (const [index, imageLink] of imagesOnPage.entries()) {
        startAttributes.page = (index+1).toString();
        const savePath = fsplus.prepareImagePath(startAttributes, this.outputDirectory, this.imageFormat);
        await this._downloadImage(imageLink, savePath);
        eventEmitter.emit("page", startAttributes, numberOfPages, savePath);
      }
    } else {
      // normal mode
      for (let i = 1; i <= numberOfPages; i++) {
        const pageLink = i === 1 ? link : `${link}${i}.html`;
        await this.downloadImageFromLink(pageLink, {
          forceDownload: options?.forceDownload,
          callback: (events) => {
            events.on("noimage", (attributes, link) => {
              eventEmitter.emit("noimage", attributes, link);
            });
            events.on("done", (attributes, path) => {
              eventEmitter.emit("page", attributes, numberOfPages, path);
            });
          },
        });
      }
    }
    if (options?.compression) {
      eventEmitter.emit("compressing", startAttributes, downloadPath);
      const compressStats = await compress.safeCompress(
        this,
        startAttributes.manga,
        "chapitre",
        startAttributes.chapter,
        [downloadPath]
      );
      eventEmitter.emit(
        "compressed",
        startAttributes,
        downloadPath,
        compressStats
      );
      if (options?.deleteAfterCompression) fsplus.rmLocations([downloadPath]);
    }
    eventEmitter.emit("done", startAttributes, downloadPath);
  }

  async downloadChapter(
    mangaName: string,
    chapter: number,
    options?: {
      forceDownload?: boolean;
      compression?: boolean;
      deleteAfterCompression?: boolean;
      callback?: (events: ChapterDownloadEmit) => void;
    }
  ): Promise<void> {
    const link = new MangaAttributes(
      mangaName,
      chapter.toString()
    ).getLectureLink();
    return this.downloadChapterFromLink(link, options);
  }

  async downloadChaptersFromLinks(
    mangaName: string,
    links: string[],
    options?: {
      forceDownload?: boolean;
      compression?: boolean;
      compressAsOne?: boolean;
      deleteAfterCompression?: boolean;
      callback?: (events: ChaptersDownloadEmit) => void;
    }
  ): Promise<void> {
    const { compression, compressAsOne, deleteAfterCompression, callback } =
      options ?? {};
    const childCompression = !compression ? false : !compressAsOne;
    const startNumber = MangaAttributes.fromLink(links[0]).chapter;
    const endNumber = MangaAttributes.fromLink(links[links.length - 1]).chapter;
    const eventEmitter = new ChaptersDownloadEmit(callback);

    eventEmitter.emit("start", mangaName, links);
    const chapterDownloadLocations: Array<string> = [];
    let i = 0;
    for (const link of links) {
      await this.downloadChapterFromLink(link, {
        forceDownload: options?.forceDownload,
        compression: childCompression,
        deleteAfterCompression: !childCompression
          ? false
          : deleteAfterCompression,
        callback: (events: ChapterDownloadEmit) => {
          events.on("start", (attributes, link, pages) => {
            eventEmitter.emit(
              "startchapter",
              attributes,
              pages,
              ++i,
              links.length
            );
          });
          events.on("page", (attributes, total) => {
            eventEmitter.emit("page", attributes, total);
          });
          events.on("done", (attributes, download) => {
            chapterDownloadLocations.push(download);
            eventEmitter.emit("endchapter", attributes, i, links.length);
          });
        },
      });
    }
    if (compression && compressAsOne) {
      eventEmitter.emit("compressing", mangaName, chapterDownloadLocations);
      const compressStats = await compress.safeCompress(
        this,
        mangaName,
        "chapitre",
        `${toNDigits(startNumber, 4)}-${toNDigits(endNumber, 4)}`,
        chapterDownloadLocations
      );
      eventEmitter.emit(
        "compressed",
        mangaName,
        chapterDownloadLocations,
        compressStats
      );
      if (deleteAfterCompression) {
        fsplus.rmLocations(chapterDownloadLocations);
      }
    }
    eventEmitter.emit("done", mangaName, chapterDownloadLocations);
  }

  /**
   * @param mangaName manga name
   * @param start start chapter
   * @param end end chapter
   * @param compression defaults as true, if true the downloaded images are compressed as a cbz after downloading
   * @returns download locations as an array
   */
  async downloadChapters(
    mangaName: string,
    start: number,
    end: number,
    options?: {
      forceDownload?: boolean;
      compression?: boolean;
      compressAsOne?: boolean;
      deleteAfterCompression?: boolean;
      callback?: (events: ChaptersDownloadEmit) => void;
    }
  ): Promise<void> {
    const linksToDownload = await this.fetchChapterLinksBetweenRange(
      mangaName,
      start,
      end
    );
    return this.downloadChaptersFromLinks(mangaName, linksToDownload, options);
  }

  /**
   *
   * @param mangaName manga name
   * @param volumeNumber volume number
   * @param compression defaults as true, if true the downloaded images are compressed as a cbz after downloading
   */
  async downloadVolume(
    mangaName: string,
    volumeNumber: number,
    options?: {
      forceDownload?: boolean;
      compression?: boolean;
      deleteAfterCompression?: boolean;
      callback?: (events: VolumeDownloadEmit) => void;
    }
  ): Promise<void> {
    const eventEmitter = new VolumeDownloadEmit(options?.callback);
    eventEmitter.emit("start", mangaName, volumeNumber);
    const toDownloadFrom = await this.fetchVolumeChapters(
      volumeNumber,
      mangaName
    );

    eventEmitter.emit("chapters", toDownloadFrom);

    await this.downloadChaptersFromLinks(mangaName, toDownloadFrom, {
      forceDownload: options?.forceDownload,
      callback: (events) => {
        events.on("startchapter", (attributes, pages, current, total) => {
          eventEmitter.emit("startchapter", attributes, pages, current, total);
        });
        events.on("page", (attributes, total) => {
          eventEmitter.emit("page", attributes, total);
        });
        events.on("endchapter", (attributes, current, total) => {
          eventEmitter.emit("endchapter", attributes, current, total);
        });
        events.on("noimage", (attributes, links) => {
          eventEmitter.emit("noimage", attributes, links);
        });
        events.on("done", async (manga, locations) => {
          if (options?.compression) {
            eventEmitter.emit("compressing", manga, locations);
            const compressInfos = await compress.safeCompress(
              this,
              manga,
              "volume",
              toNDigits(volumeNumber, 3),
              locations
            );
            if (options?.deleteAfterCompression) {
              fsplus.rmLocations(locations);
            }
            eventEmitter.emit("compressed", manga, compressInfos);
          }
          eventEmitter.emit("done", manga, volumeNumber, locations);
        });
      },
    });
  }

  /**
   * @param mangaName manga name
   * @param start start chapter
   * @param end end chapter
   * @param compression defaults as true, if true the downloaded images are compressed as a cbz after downloading
   * @returns array of download locations for each volume
   */
  async downloadVolumes(
    mangaName: string,
    start: number,
    end: number,
    options?: {
      forceDownload?: boolean;
      compression?: boolean;
      deleteAfterCompression?: boolean;
      callback?: (events: VolumesDownloadEmit) => void;
    }
  ): Promise<void> {
    if (start > end) {
      throw new Error("Le début ne peut pas être plus grand que la fin");
    }
    const { compression, deleteAfterCompression, callback } = options ?? {};
    const eventEmitter = new VolumesDownloadEmit(callback);

    const volumeDownloadLocations: Array<Array<string>> = [];
    const total = end - start + 1;
    eventEmitter.emit("start", mangaName, start, end, total);
    for (let volumeNumber = start; volumeNumber <= end; volumeNumber++) {
      const volumeIndex = volumeNumber - start + 1;
      await this.downloadVolume(mangaName, volumeNumber, {
        forceDownload: options?.forceDownload,
        compression,
        deleteAfterCompression,
        callback: (events) => {
          events.on("start", (manga, volume) => {
            eventEmitter.emit("startvolume", manga, volume, volumeIndex, total);
          });
          events.on("chapters", (chapters) => {
            eventEmitter.emit("chapters", volumeNumber, volumeIndex, chapters);
          });
          events.on("startchapter", (attributes, pages, current, total) => {
            eventEmitter.emit(
              "startchapter",
              attributes,
              pages,
              current,
              total
            );
          });
          events.on("endchapter", (attributes, pages) => {
            eventEmitter.emit("endchapter", attributes, pages);
          });
          events.on("noimage", (attributes, links) => {
            eventEmitter.emit("noimage", attributes, links);
          });

          events.on("page", (attributes, total) => {
            eventEmitter.emit("page", attributes, total);
          });
          events.on("done", (manga, volume, downloadLocations) => {
            volumeDownloadLocations.push(downloadLocations);
            eventEmitter.emit(
              "endvolume",
              manga,
              volumeIndex,
              total,
              downloadLocations
            );
          });
        },
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

  static async launch(
    options?: DownloaderOptions & { chromePath?: string }
  ): Promise<Downloader> {
    const browser = await getBrowser(
      options?.flags?.visible ?? false,
      chrome.getChromePath(options?.chromePath)
    );
    if (!options?.website) {
      const currentWebsite = await getJapscanFromGithub();
      console.log("Options was", options);
      options = Object.assign(options ?? {}, { website: currentWebsite });
      console.log("Now is", options);
    }

  // this should open japscan url once to bypass cloudfare detection
  const instance = new this(browser, options);
  const page = await instance.browser.newPage();
  instance._goToExistingPage(page, instance.website);
  await page.waitForNavigation({waitUntil: "networkidle0"});
  await page.close();

  return instance;
  }


  static async getInstance(
    options?: DownloaderOptions & { chromePath?: string }
    ): Promise<Downloader> {
     // eslint-disable-next-line @typescript-eslint/no-var-requires
    const chromeLauncher = require('chrome-launcher');

    // Initializing a Chrome instance manually
    const chrome = await chromeLauncher.launch({
      chromePath: options?.chromePath,
      chromeFlags: ["--disable-gpu"]
    });
    const response = await axios.get(`http://localhost:${chrome.port}/json/version`);
    const { webSocketDebuggerUrl } = response.data;

    // Connecting the instance using `browserWSEndpoint`
    const browser = await puppeteer.connect({ browserWSEndpoint: webSocketDebuggerUrl });

    // @ts-ignore
    const downloader = new Downloader(browser, options);
    downloader.website = await getJapscanFromGithub();
    downloader.chrome = chrome;
    return downloader;
  }

  /**
   * destroy browser, do not use downloader after this operation
   */
  async destroy(): Promise<void> {
    if (this.browser) await this.browser.close();
    if(this.chrome) this.chrome.kill();
  }
}

export default Downloader;
