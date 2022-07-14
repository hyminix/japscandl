import archiver from "archiver";
import fs from "fs";
import path from "path";
import fsplus from "./fsplus";
import Fetcher from "../components/Fetcher";
import Component from "../components/Component";
import MangaAttributes from "../MangaAttributes";
import StreamZip from "node-stream-zip";

export function bytesToSize(bytes: number): string {
  const sizes = ["octet", "Ko", "Mo", "Go", "To"];
  if (bytes == 0) return "0 " + sizes[0];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round(bytes / Math.pow(1024, i)) + " " + sizes[i];
}

export type CompressStats = {
  path: string;
  size: number;
};

const compress = {
  /**
   * @param fetcher Fetcher to use
   * @param mangaName manga name
   * @param format "chapitre" or "volume"
   * @param type compression type
   * @param start start type
   * @param end optional, end type if range
   */
  async zipFromJapscan(
    fetcher: Fetcher,
    mangaName: string,
    format: "chapitre" | "volume",
    type: "cbz",
    start: number,
    end?: number
  ): Promise<void> {
    function pushAttributesToZipArray(attributes: MangaAttributes): void {
      toZip.push(attributes.getFolderPath(fetcher.outputDirectory));
    }
    // if there an end, then it's a range, if there is none then it's just a number
    const toDownload = end ? { start: start, end: end } : start;
    const toZip: string[] = [];
    if (format === "chapitre") {
      if (typeof toDownload !== "number") {
        const links = await fetcher.fetchChapterLinksBetweenRange(
          mangaName,
          toDownload.start,
          toDownload.end
        );
        links
          .map((link) => MangaAttributes.fromLink(link))
          .forEach(pushAttributesToZipArray);
      } else {
        const attributes = new MangaAttributes(mangaName, toDownload, 1);
        pushAttributesToZipArray(attributes);
      }
    }
    if (format === "volume") {
      if (typeof toDownload !== "number") {
        for (let i = toDownload.start; i <= toDownload.end; i++) {
          const chapters: string[] = await fetcher.fetchVolumeChapters(
            i,
            mangaName
          );
          chapters
            .map((chapter: string) => new MangaAttributes(mangaName, chapter))
            .forEach(pushAttributesToZipArray);
        }
      } else {
        const chapters: string[] = await fetcher.fetchVolumeChapters(
          toDownload,
          mangaName
        );
        chapters
          .map((chapter: string) => new MangaAttributes(mangaName, chapter))
          .forEach(pushAttributesToZipArray);
      }
    }
    const isWorthZipping = fsplus.tellIfDoesntExist(toZip);
    if (isWorthZipping) {
      const numberString =
        typeof toDownload === "number"
          ? toDownload.toString()
          : `${toDownload.start}-${toDownload.end}`;
      await compress.safeCompress(
        fetcher,
        mangaName,
        format,
        numberString,
        toZip
      );
    }
  },
  //////////////////////////

  async safeCompress(
    component: Component,
    mangaName: string,
    mangaType: string,
    mangaNumber: string,
    directories: string[]
  ): Promise<CompressStats> {
    const name = component._getZippedFilenameFrom(
      mangaName,
      mangaNumber,
      mangaType
    );
    try {
      const savePath = await compress.zipDirectories(directories, name);
      const fileSize = fs.statSync(savePath).size;
      return { path: savePath, size: fileSize };
    } catch (e) {
      return { path: "", size: 0 };
    }
  },
  /**
   * @param {String[]} source is an array of path
   * @param {String} out is the filename
   * @param {Boolean} flat true if you want no subdirectories in the zip
   */
  async zipDirectories(
    source: string[],
    out: string,
    flat?: boolean
  ): Promise<string> {
    const archive = archiver("zip", { zlib: { level: 9 } });
    const stream = fs.createWriteStream(out);

    return new Promise((resolve, reject) => {
      source.forEach((s) => {
        archive.directory(s, flat ? false : path.basename(s));
      });
      archive.on("error", (err) => reject(err)).pipe(stream);

      stream.on("close", () => resolve(out));
      archive.finalize();
    });
  },

  async readImagesFromZip(
    zipPath: string
  ): Promise<{ path: string; value: string }[]> {
    const zip = new StreamZip.async({
      file: zipPath,
      storeEntries: true,
    });

    const entries = await zip.entries();
    const images: { path: string; value: string }[] = [];
    for (const entry of Object.values(entries)) {
      const desc = entry.isDirectory ? "directory" : `${entry.size} bytes`;
      console.log(`Entry ${entry.name}: ${desc}`);
      const data = await zip.entryData(entry);
      images.push({
        path: entry.name,
        value: "data:image/png;base64," + data.toString("base64"),
      });
    }

    await zip.close();
    return images;
  },
};

export default compress;
