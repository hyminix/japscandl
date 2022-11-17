import fs from "fs";
import sizeOf from "image-size";
import Downloader from "../src/components/Downloader";
import MangaAttributes from "../src/MangaAttributes";
import fsplus from "../src/utils/fsplus";

export function downloaderTests(): void {
  let downloader: Downloader;

  describe("Downloader tests", function () {
    it("Browser instantiation", async function () {
      this.timeout(0);
      downloader = await Downloader.launch();
    });
    testDownloadOfManga(
      "one-piece",
      998,
      11,
      { number: 4, height: 1300, width: 1790 },
      true
    );
    testDownloadOfManga(
      "jujutsu-kaisen",
      152,
      10,
      { number: 10, height: 1300, width: 897 },
      true
    );
  });

  function testDownloadOfManga(
    mangaName: string,
    chapter: number,
    numberOfPages: number,
    pageToCheck: { number: number; height: number; width: number },
    compression: boolean
  ) {
    const attributes = new MangaAttributes(
      mangaName,
      chapter,
      pageToCheck.number
    );
    describe(`Downloading ${mangaName} chapter ${chapter}`, function () {
      this.timeout(1000 * 60 * 5); // 5 minutes
      this.afterEach(
        "number of open chrome pages must be all about:blank",
        async function () {
          return new Promise(function (resolve, reject) {
            downloader.browser.pages().then((pages) => {
              const pagesThatAreNotBlank: string[] = Array
                // create array of urls
                .from(pages, (page) => page.url())
                // keep only pages different from about:blank
                .filter((url) => url !== "about:blank");
              if (pagesThatAreNotBlank.length) {
                reject(
                  "Some pages are not closed:" + pagesThatAreNotBlank.join("\n")
                );
              } else {
                resolve();
              }
            });
          });
        }
      );
      it(`download ${mangaName} chapter ${chapter}`, function () {
        return new Promise((resolve, reject) => {
          downloader
            .downloadChapter(mangaName, chapter, { compression: compression })
            .then(() => resolve(undefined))
            .catch((error) => reject(error));
        });
      });
    });

    describe("After download tests", function () {
      it(`folder ${mangaName}/${chapter} must exist`, function () {
        const folderPath = attributes.getFolderPath(downloader.outputDirectory);
        if (!fs.existsSync(folderPath)) {
          throw new Error(
            "Folder " + folderPath + " was not created after download"
          );
        }
      });
      it(`downloaded ${mangaName} must have ${numberOfPages} pages`, function () {
        const downloadedAt = attributes.getFolderPath(
          downloader.outputDirectory
        );
        const numberOfImages = fs.readdirSync(downloadedAt).length;
        if (numberOfImages !== numberOfPages) {
          throw new Error(
            "There must be " +
              numberOfPages +
              " images, " +
              numberOfImages +
              " were found"
          );
        }
      });
      it("cbz must have been created", function () {
        const typeName = downloader._getZippedFilenameFrom(
          mangaName,
          chapter.toString(),
          "chapitre"
        );
        if (!fs.existsSync(typeName)) {
          throw new Error(compression + " was not created at " + typeName);
        }
      });
      it("cbz must not be 0 bytes", function () {
        const EMPTY_CBZ_FILE_SIZE = 22;
        const typeName = downloader._getZippedFilenameFrom(
          mangaName,
          chapter.toString(),
          "chapitre"
        );
        const stats = fs.statSync(typeName);
        if (stats.size === EMPTY_CBZ_FILE_SIZE) {
          throw new Error(
            compression + " has size of " + EMPTY_CBZ_FILE_SIZE + " bytes"
          );
        }
      });

      it(`Page ${pageToCheck.number} must have correct size`, function () {
        const imagePath = attributes.getImagePath(
          downloader.outputDirectory,
          downloader.imageFormat
        );
        const { height, width } = sizeOf(imagePath);
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
      it("Chapter should be detected as already downloaded", function () {
        fsplus.alreadyDownloadedChapter(
          new MangaAttributes(mangaName, chapter).getFolderPath(
            downloader.outputDirectory
          ),
          numberOfPages
        );
      });
    });
  }
}
