import archiver from "archiver";
import fs from "fs";
import path from "path";
// @ts-ignore
import imagesToPdf from "images-to-pdf";
import url from "./url";
import fsplus from "./fsplus";
import Fetcher from "../components/Fetcher";
import Component from "../components/Component";

function bytesToSize(bytes: number) {
    const sizes = ['octet', 'Ko', 'Mo', 'Go', 'To'];
    if (bytes == 0) return '0 ' + sizes[0];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i)) + ' ' + sizes[i];
}

function capitalize(str: string) {
    return str[0].toUpperCase() + str.slice(1);
}



const compress = {
    async zipFromJapscan(fetcher: Fetcher, mangaName: string, format: "chapitre" | "volume", type: "cbr" | "pdf", start: number, end?: number): Promise<void> {
        // if there an end, then it's a range, if there is none then it's just a number
        const toDownload = end ? { start: start, end: end } : start;
        const toZip: string[] = [];
        if (format === 'chapitre') {
            if (typeof toDownload !== "number") {
                const links = await fetcher.fetchChapterLinksBetweenRange(mangaName, toDownload.start, toDownload.end);
                links.forEach((link) => {
                    const attributes = url.getAttributesFromLink(link);
                    const path = fetcher._getPathFrom(attributes);
                    toZip.push(path);
                });
            } else {
                const path = fetcher._getPathFrom({ chapter: toDownload.toString(), manga: mangaName, page: "" + 1 });
                toZip.push(path);
            }
        }
        if (format === 'volume') {
            if (typeof toDownload !== "number") {
                for (let i = toDownload.start; i <= toDownload.end; i++) {
                    const chapters: string[] = await fetcher.fetchVolumeChapters(i, mangaName);
                    chapters.forEach((chapter) => {
                        toZip.push(fetcher._getPathFrom(chapter));
                    });
                }
            } else {
                const chapters: string[] = await fetcher.fetchVolumeChapters(toDownload, mangaName);
                chapters.forEach((chapter) => {
                    toZip.push(fetcher._getPathFrom(chapter));
                });
            }
        }
        const isWorthZipping = fsplus.tellIfDoesntExist(toZip);
        if (isWorthZipping) {
            const numberString = (typeof toDownload === "number") ? toDownload.toString() : `${toDownload.start}-${toDownload.end}`;
            await compress.safeCompress(fetcher, mangaName, format, numberString, toZip, type);
        }
    },
    //////////////////////////
    async safeZip(component: Component, mangaName: string, mangaType: string, mangaNumber: string, directories: string[]): Promise<void> {
        return compress.safeCompress(component, mangaName, mangaType, mangaNumber, directories, "cbr");
    },
    async safePdf(component: Component, mangaName: string, mangaType: string, mangaNumber: string, directories: string[]): Promise<void> {
        return compress.safeCompress(component, mangaName, mangaType, mangaNumber, directories, "pdf");
    },
    async safeCompress(component: Component, mangaName: string, mangaType: string, mangaNumber: string, directories: string[], compression: "cbr" | "pdf"): Promise<void> {
        console.log(`Création du ${compression} ${mangaName} ${mangaType} ${mangaNumber}...`);
        const name = component._getZippedFilenameFrom(mangaName, mangaNumber, mangaType, compression);
        try {
            const savePath = (compression === "cbr") ? await compress.zipDirectories(directories, name) : await compress.pdfDirectories(directories, name);
            console.log(capitalize(compression) + " terminé! Il est enregistré à l'endroit \"" + savePath + "\" (" + bytesToSize(fs.statSync(savePath).size) + ")");
        } catch (e) {
            console.log("Erreur pendant la création du" + compression + "(" + name + "):", e);
        }
    },
    /**
     * @param {String[]} source is an array of path
     * @param {String} out is the filename
     */
    async zipDirectories(source: string[], out: string): Promise<string> {
        const archive = archiver("zip", { zlib: { level: 9 } });
        const stream = fs.createWriteStream(out);

        return new Promise((resolve, reject) => {
            source.forEach((s) => {
                const split = s
                    // split path on path separator (/ or \)
                    .split(path.sep)
                    //filter out empty strings
                    .filter((v) => v);
                // get the last element of the array (the chapter folder)
                const lastDir = split[split.length - 1];
                // put content of folder s on system into lastDir directory in the archive
                archive.directory(s, lastDir);
            });
            archive.on("error", (err) => reject(err)).pipe(stream);

            stream.on("close", () => resolve(out));
            archive.finalize();
        });
    },
    /**
     * 
     * @param source array of directories containing images
     * @param out pdf name
     * @returns pdf location
     */
    async pdfDirectories(source: string[], out: string): Promise<string> {
        function getChapterNumber(filename: string): number {
            // isolate page
            const split = filename.split("_");
            // isolate chapter number
            const splitForChapterNumber = split[0].split(path.sep);
            // extract chapter number
            const chapterNumber = splitForChapterNumber[splitForChapterNumber.length - 1];

            // if chapter is a volume, remove it
            if (chapterNumber.includes("volume-")) chapterNumber.replace("volume-", "");
            return +chapterNumber;
        }
        function getNumberFromFilename(filename: string): number {
            // add both of numbers as string to be able to sort multiple chapters
            const num = getChapterNumber(filename) + filename.split("_")[1].split(".")[0];
            return +num;
        }
        function sortFunction(a: string, b: string) {
            const aChapterNumber = getChapterNumber(a);
            const bChapterNumber = getChapterNumber(b);
            if (aChapterNumber > bChapterNumber) {
                return 1;
            } else if (aChapterNumber < bChapterNumber) {
                return -1;
            } else {
                return getNumberFromFilename(a) - getNumberFromFilename(b);
            }
        }

        const allImages: string[] = [];
        source
            // for each directories
            .forEach((folderPath) => fs
                // read files in directory
                .readdirSync(folderPath)
                // for each image
                .forEach((image) => allImages
                    // add image full path to array
                    .push(path.join(folderPath, image))));
        allImages.sort(sortFunction);
        return imagesToPdf(allImages, out);
    }
};

export default compress;