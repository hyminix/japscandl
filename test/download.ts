import fs from "fs";
import path from "path";
import sizeOf from "image-size";
import Downloader from "../src/components/Downloader";

let downloader: Downloader;

describe("Downloader tests", function () {
    it("Browser instantiation", async function () {
        this.timeout(0);
        downloader = await Downloader.launch({
            onEvent: {
                onPage: (attributes, totalPages) => {
                    const { manga, chapter, page } = attributes;
                    console.log(`\t${manga} ${chapter} ${page}/${totalPages}`);
                }
            },
        });
    });
    testDownloadOfManga("one-piece", 998, 11, { number: 4, height: 1300, width: 1790 }, "cbr");
    testDownloadOfManga("jujutsu-kaisen", 152, 10, { number: 10, height: 1300, width: 897 }, "pdf");
});


function testDownloadOfManga(mangaName: string, chapter: number, numberOfPages: number, pageToCheck: { number: number, height: number, width: number }, type: "cbr" | "pdf") {
    describe(`Downloading ${mangaName} chapter ${chapter}`, function () {
        this.timeout(1000 * 60 * 5); // 5 minutes
        this.afterEach("number of open chrome pages must be all about:blank", async function () {
            return new Promise(function (resolve, reject) {
                downloader.browser.pages().then((pages) => {
                    const pagesThatAreNotBlank: string[] = Array
                        // create array of urls
                        .from(pages, page => page.url())
                        // keep only pages different from about:blank
                        .filter((url) => url !== "about:blank");
                    if (pagesThatAreNotBlank.length) {
                        reject("Some pages are not closed:" + pagesThatAreNotBlank.join('\n'));
                    } else {
                        resolve();
                    }
                });
            });
        });
        it(`download ${mangaName} chapter ${chapter}`, function () {
            return new Promise((resolve, reject) => {
                downloader
                    .downloadChapter(mangaName, chapter, {compression: type})
                    .then(() => resolve(undefined))
                    .catch((error) => reject(error));
            });
        });
        it(`folder ${mangaName}/${chapter} must exist`, function () {
            const folderPath = path.join(
                downloader.outputDirectory,
                mangaName,
                chapter.toString()
            );
            if (!fs.existsSync(folderPath)) {
                throw new Error(
                    "Folder " + folderPath + " was not created after download"
                );
            }
        });
        it(`downloaded ${mangaName} must have ${numberOfPages} pages`, function () {
            const downloadedAt = path.join(
                downloader.outputDirectory,
                mangaName,
                chapter.toString()
            );
            const numberOfImages = fs.readdirSync(downloadedAt).length;
            if (numberOfImages !== numberOfPages) {
                throw new Error(
                    "There must be " + numberOfPages + " images, " + numberOfImages + " were found"
                );
            }
        });
        it(type + " must have been created", function () {
            const typeName = downloader._getZippedFilenameFrom(mangaName, chapter.toString(), "chapitre", type);
            if (!fs.existsSync(typeName)) {
                throw new Error(type + " was not created at " + typeName);
            }
        });
        it(type + " must not be 0 bytes", function () {
            const typeName = downloader._getZippedFilenameFrom(mangaName, chapter.toString(), "chapitre", type);
            const stats = fs.statSync(typeName);
            if (stats.size === 0) {
                throw new Error(type + " has size of 0 bytes");
            }
        });

        it(`Page ${pageToCheck.number} must have correct size`, function () {
            const { height, width } = sizeOf(
                path.join(__dirname, `../../manga/${mangaName}/${chapter}/${chapter}_${pageToCheck.number}.jpg`)
            );
            const errors: string[] = [];
            if (height !== pageToCheck.height) {
                errors.push(
                    `height is wrong, current: ${height}, supposed: ${pageToCheck.height}`
                );
            }
            if (width !== pageToCheck.width) {
                errors.push(
                    `width is wrong, current: ${width}, supposed: ${pageToCheck.width}`
                );
            }
            if (errors.length) {
                throw new Error(errors.join("\n"));
            }
        });
    });
}