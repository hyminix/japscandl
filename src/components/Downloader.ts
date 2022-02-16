import { Browser } from "puppeteer";
// utils
import compress from "../utils/compress";
import fsplus from "../utils/fsplus";
import Fetcher from "./Fetcher";
import getBrowser from "../utils/browser";
import chrome from "../utils/chrome";
import { ComponentFlags } from "../utils/types";
import {
  ChapterDownloadEmit,
  ChaptersDownloadEmit,
  ImageDownloadEmit,
  VolumeDownloadEmit,
  VolumesDownloadEmit,
} from "../utils/emitTypes";
import MangaAttributes from "../MangaAttributes";

/**
 * Japscan downloader class, usually used with an interface
 */
class Downloader extends Fetcher {
  imageFormat: "jpg" | "png";
  mock: boolean;

  /**
   * Instantiates a browser and reads config file to get output directory
   * and chrome path
   * @param options Can take definitions of onEvent callbacks in onEvent property, default are empty callbacks.
   * @param browser Browser the downloader is going to use
   */
  constructor(
    browser: Browser,
    options?: {
      flags?: ComponentFlags;
      outputDirectory?: string;
      imageFormat?: "jpg" | "png";
    }
  ) {
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
    callback?: (events: ImageDownloadEmit) => void
  ): Promise<void> {
    const eventEmitter = new ImageDownloadEmit(callback);
    const attributes = MangaAttributes.fromLink(link);
    eventEmitter.emit("start", attributes, link);

    let savePath = attributes.getFolderPath(this.outputDirectory);
    fsplus.createPath(savePath);
    savePath = attributes.getImagePath(this.outputDirectory, this.imageFormat);

    // this is for debug purposes, it will prevent the correct behavior of the downloader
    if (!this.mock) {
      const page = await this.createExistingPage(link, "normal");

      const canvasElement = await this.waitForSelector(page, "body > canvas");
      if (!canvasElement) {
        eventEmitter.emit("noimage", attributes, link);
        return;
      }
      const dimensions = await canvasElement.evaluate((canvas) => {
        // remove everything from page except canvas
        document.querySelectorAll("div").forEach((div) => div.remove());
        const width = canvas.getAttribute("width");
        const height = canvas.getAttribute("height");
        return {
          width: width ? +width * 2 : 4096,
          height: height ? +height * 2 : 2160,
        };
      });
      await page.setViewport(dimensions);

      await canvasElement
        .screenshot({
          path: savePath,
        })
        .catch((e) => console.log("Erreur dans la capture de l'image", e));
      page.close();
    }

    eventEmitter.emit("done", attributes, savePath);
  }

  async downloadChapterFromLink(
    link: string,
    options?: {
      compression?: boolean;
      deleteAfterCompression?: boolean;
      callback?: (events: ChapterDownloadEmit) => void;
    }
  ): Promise<void> {
    const eventEmitter = new ChapterDownloadEmit(options?.callback);
    const startAttributes = MangaAttributes.fromLink(link);
    const numberOfPages = await this.fetchNumberOfPagesInChapter(link);
    const alreadyDownloaded = fsplus.alreadyDownloadedChapter(
      startAttributes.getFolderPath(this.outputDirectory),
      numberOfPages
    );
    const downloadPath = startAttributes.getFolderPath(this.outputDirectory);

    eventEmitter.emit("start", startAttributes, link, numberOfPages);

    if (!alreadyDownloaded) {
      for (let i = 1; i <= numberOfPages; i++) {
        const pageLink = i === 1 ? link : `${link}${i}.html`;
        await this.downloadImageFromLink(pageLink, (events) => {
          events.on("noimage", (attributes, link) => {
            eventEmitter.emit("noimage", attributes, link);
          });
          events.on("done", (attributes, path) => {
            eventEmitter.emit("page", attributes, numberOfPages, path);
          });
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
      compression?: boolean;
      compressAsOne?: boolean;
      deleteAfterCompression?: boolean;
      callback?: (events: ChaptersDownloadEmit) => void;
    }
  ): Promise<void> {
    const { compression, compressAsOne, callback } = options ?? {};
    const childCompression = !compression
      ? false
      : !compressAsOne
      ? true
      : false;
    const startNumber = MangaAttributes.fromLink(links[0]).chapter;
    const endNumber = MangaAttributes.fromLink(links[links.length - 1]).chapter;
    const eventEmitter = new ChaptersDownloadEmit(callback);

    eventEmitter.emit("start", mangaName, links);
    const chapterDownloadLocations: Array<string> = [];
    let i = 0;
    for (const link of links) {
      await this.downloadChapterFromLink(link, {
        compression: childCompression,
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
        "chapitres",
        `${startNumber}-${endNumber}`,
        chapterDownloadLocations
      );
      eventEmitter.emit(
        "compressed",
        mangaName,
        chapterDownloadLocations,
        compressStats
      );
      if (options?.deleteAfterCompression)
        fsplus.rmLocations(chapterDownloadLocations);
    }
    eventEmitter.emit("done", mangaName, chapterDownloadLocations);
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
   * @param compression defaults as true, if true the downloaded images are compressed as a cbr after downloading
   */
  async downloadVolume(
    mangaName: string,
    volumeNumber: number,
    options?: {
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
              volumeNumber.toString(),
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
   * @param compression defaults as true, if true the downloaded images are compressed as a cbr after downloading
   * @returns array of download locations for each volume
   */
  async downloadVolumes(
    mangaName: string,
    start: number,
    end: number,
    options?: {
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

  static async launch(options?: {
    chromePath?: string;
    flags?: ComponentFlags;
    outputDirectory?: string;
    imageFormat?: "png" | "jpg";
  }): Promise<Downloader> {
    const browser = await getBrowser(
      options?.flags?.visible ?? false,
      chrome.getChromePath(options?.chromePath)
    );
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
