import { MangaAttributes } from "./types";
import { EventEmitter } from "events";

export interface ImageDownloadEmit {
    on(event: "start", arg: (attributes: MangaAttributes) => void): this;
    on(event: "started"): this;
    on(event: "noimage", arg: (link: string) => void): this;
    on(event: "done", arg: (path: string) => void): this;
    on(event: string, listener: (...args: unknown[]) => unknown): this;
}

export class ImageDownloadEmit extends EventEmitter { }
