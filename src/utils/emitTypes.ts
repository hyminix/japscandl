import { MangaAttributes } from "./types";
import { EventEmitter } from "events";

export interface ImageDownloadEmit {
    on(event: "start", arg: (attributes: MangaAttributes, link: string) => void): this;
    on(event: "noimage", arg: (attributes: MangaAttributes, link: string) => void): this;
    on(event: "done", arg: (attributes: MangaAttributes, savePath: string) => void): this;
    on(event: string, listener: (...args: unknown[]) => unknown): this;
}

export class ImageDownloadEmit extends EventEmitter { }

export interface ChapterDownloadEmit {
    on(event: "start", arg: (attributes: MangaAttributes, link: string, pages: number) => void): this;
    on(event: "page", arg: (attributes: MangaAttributes, totalPages: number, savePath: string) => void): this;
    on(event: "noimage", arg: (attributes: MangaAttributes, links: string[]) => void): this;
    on(event: "done", arg: (attributes: MangaAttributes, downloadPath: string) => void): this;
}

export class ChapterDownloadEmit extends EventEmitter { }

export interface ChaptersDownloadEmit {
    on(event: "start", arg: (manga: string, start: number, end: number) => void): this;
    on(event: "startChapter", arg: (attributes: MangaAttributes, pages: number) => void): this;
    on(event: "endChapter", arg: (attributes: MangaAttributes, pages: number) => void): this;
    on(event: "page", arg: (attributes: MangaAttributes, totalPages: number) => void): this;
    on(event: "noimage", arg: (attributes: MangaAttributes,  links: string[]) => void): this;
    on(event: "done", arg: (manga: string, start: number, end: number, downloadPath: string) => void): this;
}

export class ChaptersDownloadEmit extends EventEmitter { }

export interface VolumeDownloadEmit {
    on(event: "start", arg: (manga: string, volume: number) => void): this;
    on(event: "chapters", arg: (chapters: string[]) => void): this;
    on(event: "startChapter", arg: (attributes: MangaAttributes, pages: number) => void): this;
    on(event: "endChapter", arg: (attributes: MangaAttributes, pages: number) => void): this;
    on(event: "noimage", arg: (attributes: MangaAttributes,  links: string[]) => void): this;
    on(event: "page", arg: (attributes: MangaAttributes, totalPages: number) => void): this;
    on(event: "done", arg: (manga: string, volume: number, downloadLocations: string[]) => void): this;
}

export class VolumeDownloadEmit extends EventEmitter { }

export interface VolumesDownloadEmit {
    on(event: "start", arg: (manga: string, start: number, end: number) => void): this;
    on(event: "chapters", arg: ( volume: number, volumeIndex: number, chapters: string[]) => void): this;
    on(event: "startVolume", arg: (manga: string, volume: number, volumeIndex: number, total: number) => void): this;
    on(event: "startChapter", arg: (attributes: MangaAttributes, pages: number) => void): this;
    on(event: "endChapter", arg: (attributes: MangaAttributes, pages: number) => void): this;
    on(event: "endVolume", arg: (manga: string, volumeIndex: number, total: number, downloadLocations: string[]) => void): this;
    on(event: "noimage", arg: (attributes: MangaAttributes,  links: string[]) => void): this;
    on(event: "page", arg: (attributes: MangaAttributes, totalPages: number) => void): this;
    on(event: "done", arg: (manga: string, start: number, end: number, downloadLocations: string[][]) => void): this;
}

export class VolumesDownloadEmit extends EventEmitter { }