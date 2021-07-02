import fs from "fs";

import { MangaAttributes } from "./types";
import url from "./url";



const manga = {
    alreadyDownloaded(path: string, isDirectory = true): boolean {
        try {
            const fileStats = fs.lstatSync(path);
            if(isDirectory){
                return fileStats.isDirectory();
            } else {
                return fileStats.isFile();
            }
        } catch (e) {
            return false;
        }
    },
    rmLocations(downloadLocations: string[]): void {
        downloadLocations.forEach((path: string) =>
            fs.rmSync(path, { force: true, recursive: true })
        );
    },
    /**
    * @param param can be a link or manga attributes
    * @returns file name for the page
    */
    getFilenameFrom(
        param:
            | string
            | MangaAttributes
    ): string {
        if (typeof param === "string") {
            return this.getFilenameFrom(url.getAttributesFromLink(param));
        } else {
            return `${param.chapter}_${param.page}.png`;
        }
    },
};

export default manga;