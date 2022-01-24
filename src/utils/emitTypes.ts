import { EventEmitter } from "events";
import MangaAttributes from "../MangaAttributes";
import { CompressStats } from "./compress";

export interface ImageDownloadEmit {
    on(event: "start", arg: (attributes: MangaAttributes, link: string) => void): this;
    on(event: "noimage", arg: (attributes: MangaAttributes, link: string) => void): this;
    on(event: "done", arg: (attributes: MangaAttributes, link: string) => void): this;
    on(event: string, listener: (...args: unknown[]) => unknown): this;
}

export class ImageDownloadEmit extends EventEmitter {
    constructor(callback?: (events: ImageDownloadEmit) => void) {
        super();
        if(callback) callback(this);
    }
}

export interface ChapterDownloadEmit {
    on(event: "start", arg: (attributes: MangaAttributes, link: string, pages: number) => void): this;
    on(event: "page", arg: (attributes: MangaAttributes, totalPages: number, savePath: string) => void): this;
    on(event: "noimage", arg: (attributes: MangaAttributes, link: string) => void): this;
    on(event: "compressing", arg: (attributes: MangaAttributes, path: string) => void): this;
    on(event: "compressed", arg: (attributes: MangaAttributes, path: string, stats: CompressStats) => void): this;
    on(event: "done", arg: (attributes: MangaAttributes, downloadPath: string) => void): this;
}

export class ChapterDownloadEmit extends EventEmitter {
    constructor(callback?: (events: ChapterDownloadEmit) => void) {
        super();
        if(callback) callback(this);
    }
}

export interface ChaptersDownloadEmit {
    on(event: "start", arg: (manga: string, links: string[]) => void): this;
    on(event: "startchapter", arg: (attributes: MangaAttributes, pages: number, current: number, total: number) => void): this;
    on(event: "page", arg: (attributes: MangaAttributes, totalPages: number) => void): this;
    on(event: "noimage", arg: (attributes: MangaAttributes,  links: string[]) => void): this;
    on(event: "endchapter", arg: (attributes: MangaAttributes, current:number, total: number) => void): this;
    on(event: "done", arg: (manga: string, downloadLocations: string[]) => void): this;
}

export class ChaptersDownloadEmit extends EventEmitter {
    constructor(callback?: (events: ChaptersDownloadEmit) => void) {
        super();
        if(callback) callback(this);
    }
}

export interface VolumeDownloadEmit {
    on(event: "start", arg: (manga: string, volume: number) => void): this;
    on(event: "chapters", arg: (chapters: string[]) => void): this;
    on(event: "startchapter", arg: (attributes: MangaAttributes, pages: number, current: number, total: number) => void): this;
    on(event: "page", arg: (attributes: MangaAttributes, totalPages: number) => void): this;
    on(event: "noimage", arg: (attributes: MangaAttributes,  links: string[]) => void): this;
    on(event: "endchapter", arg: (attributes: MangaAttributes, current: number, total: number) => void): this;
    on(event: "compressing", arg: (manga: string, locations: string[]) => void): this;
    on(event: "compressed", arg: (manga: string, stats: CompressStats) => void): this;
    on(event: "done", arg: (manga: string, volume: number, downloadLocations: string[]) => void): this;
}

export class VolumeDownloadEmit extends EventEmitter {
    constructor(callback?: (events: VolumeDownloadEmit) => void) {
        super();
        if(callback) callback(this);
    }
}

export interface VolumesDownloadEmit {
    on(event: "start", arg: (manga: string, start: number, end: number, totalVolumes:number) => void): this;
    on(event: "chapters", arg: ( volume: number, volumeIndex: number, chapters: string[]) => void): this;
    on(event: "startvolume", arg: (manga: string, volume: number, volumeIndex: number, total: number) => void): this;
    on(event: "startchapter", arg: (attributes: MangaAttributes, pages: number, current: number, total: number) => void): this;
    on(event: "page", arg: (attributes: MangaAttributes, totalPages: number) => void): this;
    on(event: "noimage", arg: (attributes: MangaAttributes,  links: string[]) => void): this;
    on(event: "endchapter", arg: (attributes: MangaAttributes, current: number, total: number) => void): this;
    on(event: "endvolume", arg: (manga: string, volumeIndex: number, total: number, downloadLocations: string[]) => void): this;
    on(event: "done", arg: (manga: string, start: number, end: number, downloadLocations: string[][]) => void): this;
}

export class VolumesDownloadEmit extends EventEmitter {
    constructor(callback?: (events: VolumesDownloadEmit) => void) {
        super();
        if(callback) callback(this);
    }
}