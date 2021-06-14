import archiver from "archiver";
import fs from "fs";
import Downloader from "../components/Downloader";
import path from "path";
// @ts-ignore
import imagesToPdf from "images-to-pdf";

function bytesToSize(bytes: number) {
    const sizes = ['octet', 'Ko', 'Mo', 'Go', 'To'];
    if (bytes == 0) return '0 ' + sizes[0];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i)) + ' ' + sizes[i];
}

function capitalize(str: string) {
    return str[0].toUpperCase() + str.slice(1);
}

async function safeCompress(downloader: Downloader, mangaName: string, mangaType: string, mangaNumber: string, directories: string[], compression: "cbr" | "pdf"): Promise<void> {
    console.log(`Création du ${compression} ${mangaName} ${mangaType} ${mangaNumber}...`);
    const name = downloader._getZippedFilenameFrom(mangaName, mangaNumber, mangaType, compression);
    try {
        const savePath = (compression === "cbr") ? await zipper.zipDirectories(directories, name) : await zipper.pdfDirectories(directories, name);
        console.log(capitalize(compression) + " terminé! Il est enregistré à l'endroit \"" + savePath + "\" (" + bytesToSize(fs.statSync(savePath).size) + ")");
    } catch (e) {
        console.log("Erreur pendant la création du" + compression + "(" + name + "):", e);
    }
}

const zipper = {
    async safeZip(downloader: Downloader, mangaName: string, mangaType: string, mangaNumber: string, directories: string[]): Promise<void> {
        return safeCompress(downloader, mangaName, mangaType, mangaNumber, directories, "cbr");
    },
    async safePdf(downloader: Downloader, mangaName: string, mangaType: string, mangaNumber: string, directories: string[]): Promise<void> {
        return safeCompress(downloader, mangaName, mangaType, mangaNumber, directories, "pdf");
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

export default zipper;
