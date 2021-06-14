import fs from "fs";
import path from "path";
import sizeOf from "image-size";
import Downloader from "../src/components/Downloader";

let downloader: Downloader;

const mangaToDownload = "one-piece";
const chapterToDownload = 998;
const numberOfPages = 11;

describe("Downloader tests", function () {
    it("Browser instantiation", async function () {
        this.timeout(0);
        downloader = await Downloader.launch({
            onEvent: {
                onPage: (attributes, totalPages) => {
                    const { manga, chapter, page } = attributes;
                    console.log(`\t${manga} ${chapter} ${page}/${totalPages}`);
                }
            }
        });
    });
    describe(`Downloading ${mangaToDownload} chapter ${chapterToDownload}`, function () {
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
        it(`download ${mangaToDownload} chapter ${chapterToDownload}`, function () {
            this.timeout(1000 * 60 * 5); // 5 minutes
            return new Promise((resolve, reject) => {
                downloader
                    .downloadChapter(mangaToDownload, chapterToDownload, "cbr")
                    .then(() => resolve(undefined))
                    .catch((error) => reject(error));
            });
        });
        it(`folder ${mangaToDownload}/${chapterToDownload} must exist`, function () {
            const folderPath = path.join(
                downloader.outputDirectory,
                mangaToDownload,
                chapterToDownload.toString()
            );
            if (!fs.existsSync(folderPath)) {
                throw new Error(
                    "Folder " + folderPath + " was not created after download"
                );
            }
        });
        it(`downloaded One Piece must have ${numberOfPages} pages`, function () {
            const downloadedAt = path.join(
                downloader.outputDirectory,
                mangaToDownload,
                chapterToDownload.toString()
            );
            const numberOfImages = fs.readdirSync(downloadedAt).length;
            if (numberOfImages !== numberOfPages) {
                throw new Error(
                    "There must be " + numberOfPages + " images, " + numberOfImages + " were found"
                );
            }
        });
        it("cbr must have been created", function () {
            const cbrName = downloader._getZippedFilenameFrom(mangaToDownload, chapterToDownload.toString(), "chapitre", "cbr");
            if (!fs.existsSync(cbrName)) {
                throw new Error("cbr was not created at " + cbrName);
            }
        });
        it("cbr must not be 0 bytes", function () {
            const cbrName = downloader._getZippedFilenameFrom(mangaToDownload, chapterToDownload.toString(), "chapitre", "cbr");
            const stats = fs.statSync(cbrName);
            if (stats.size === 0) {
                throw new Error("Cbr has size of 0 bytes");
            }
        });
        const pageToCheck = { number: 4, height: 1300, width: 1790 };
        it(`Page ${pageToCheck.number} must have correct size`, function () {
            const { height, width } = sizeOf(
                path.join(__dirname, `../../manga/one-piece/${chapterToDownload}/${chapterToDownload}_${pageToCheck.number}.jpg`)
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

});