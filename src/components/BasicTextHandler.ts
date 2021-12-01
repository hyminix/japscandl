import { bytesToSize, CompressStats } from "../utils/compress";
import { ChapterDownloadEmit, ChaptersDownloadEmit, ImageDownloadEmit, VolumeDownloadEmit, VolumesDownloadEmit } from "../utils/emitTypes";
import { MangaAttributes } from "../utils/types";

class BasicTextHandler {
    static imageDownloadCallback(callback: ImageDownloadEmit) {
        callback.on("start", (attributes: MangaAttributes, link: string) => {
            console.log("Downloading image from", attributes, "at", link);
        });
        callback.on("noimage", (attributes: MangaAttributes, link: string) => {
            console.log("No image found for", attributes, "at", link);
        });
        callback.on("done", (attributes: MangaAttributes, savePath: string) => {
            console.log("Image of", attributes, "downloaded to", savePath);
        });
    }

    static chapterDownloadCallback(callback: ChapterDownloadEmit) {
        callback.on("start", (attributes: MangaAttributes, link: string, pages: number) => {
            console.log("Downloading chapter", attributes, "at", link, "with", pages, "pages");
        });
        callback.on("page", (attributes: MangaAttributes, totalPages: number, savePath: string) => {
            console.log("Downloading page", attributes, "/", totalPages, "at", savePath);
        });
        callback.on("noimage", (attributes: MangaAttributes, links: string[]) => {
            console.log("No image found for", attributes, "at", links);
        });
        callback.on("compressing", (attributes: MangaAttributes, savePath: string) => {
            console.log("Compressing", attributes, "from", savePath);
        });

        callback.on("compressed", (attributes: MangaAttributes, savePath: string, stats: CompressStats) => {
            console.log("Compressed", attributes, "to", savePath, "at", stats.path, ", size:", bytesToSize(stats.size));
        });
        callback.on("done", (attributes: MangaAttributes, savePath: string) => {
            console.log("Chapter", attributes, "downloaded to", savePath);
        });
    }

    static chaptersDownloadCallback(callback: ChaptersDownloadEmit) {
        callback.on("start", (manga: string, start: number, end: number) => {
            console.log("Downloading chapters", manga, "from", start, "to", end);
        });
        callback.on("startchapter", (attributes: MangaAttributes, pages: number) => {
            console.log("Starting", attributes, "with", pages, "pages");
        });
        callback.on("endchapter", (attributes: MangaAttributes, pages: number) => {
            console.log("Finished downloading", attributes, "with", pages, "pages");
        });
        callback.on("noimage", (attributes: MangaAttributes, links: string[]) => {
            console.log("No image found for", attributes, "at", links);
        });
        callback.on("page", (attributes: MangaAttributes, totalPages: number) => {
            console.log("Downloaded", attributes, "of", totalPages);
        });
        callback.on("done", (manga, start, end, path) => {
            console.log("Chapters", manga, "from", start, "to", end, "downloaded to", path);
        });
    }

    static volumeDownloadCallback(callback: VolumeDownloadEmit) {
        callback.on("start", (manga: string, volume: number) => {
            console.log("Downloading volume", volume, "of", manga);
        });
        callback.on("chapters", (chapters: string[]) => {
            console.log("Chapters to download from", chapters);
        });
        callback.on("startchapter", (attributes: MangaAttributes, pages: number) => {
            console.log("Starting", attributes, "with", pages, "pages");
        });
        callback.on("endchapter", (attributes: MangaAttributes, pages: number) => {
            console.log("Finished downloading", attributes, "with", pages, "pages");
        });
        callback.on("noimage", (attributes: MangaAttributes, links: string[]) => {
            console.log("No image found for", attributes, "at", links);
        });
        callback.on("page", (attributes: MangaAttributes, totalPages: number) => {
            console.log("Downloaded", attributes, "of", totalPages);
        });
        callback.on("done", (manga: string, volume: number, downloadLocations: string[]) => {
            console.log("Volume", volume, "of", manga, "downloaded to", downloadLocations);
        });
    }

    static volumesDownloadCallback(callback: VolumesDownloadEmit) {
        callback.on("start", (manga: string, start: number, end: number) => {
            console.log("Downloading volumes", start, "to", end, "of", manga);
        });
        callback.on("chapters", (volume: number, volumeIndex: number, chapters: string[]) => {
            console.log("Chapters to download from", volume, "volume", volumeIndex, "of", chapters);
        });
        callback.on("startvolume", (manga: string, volume: number, volumeIndex: number, total: number) => {
            console.log("Starting Volume", volume, "of", manga, ",", volumeIndex, "/", total, "volumes");
        });
        callback.on("startchapter", (attributes: MangaAttributes, pages: number) => {
            console.log("Starting Chapter", attributes, "with", pages, "pages");
        });
        callback.on("endchapter", (attributes: MangaAttributes, pages: number) => {
            console.log("Finished downloading", attributes, "with", pages, "pages");
        });
        callback.on("endvolume", (manga: string, volumeIndex: number, total: number, downloadLocations: string[]) => {
            console.log("Finished downloading volumes", volumeIndex, "of", manga, "with", total, "volumes", "downloaded to", downloadLocations);
        });
        callback.on("noimage", (attributes: MangaAttributes, links: string[]) => {
            console.log("No image found for", attributes, "at", links);
        });
        callback.on("page", (attributes: MangaAttributes, totalPages: number) => {
            console.log("Downloaded", attributes, "of", totalPages);
        });
        callback.on("done", (manga: string, start: number, end: number, downloadLocations: string[][]) => {
            console.log("Volumes", start, "to", end, "of", manga, "downloaded to", downloadLocations);
        });
    }
}

export default BasicTextHandler;