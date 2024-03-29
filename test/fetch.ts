import Fetcher from "../src/components/Fetcher";
import { WEBSITE } from "../src/utils/variables";

export function fetcherTests(): void {
  let fetcher: Fetcher;

  describe("Instantiate Fetcher", function () {
    it("Browser instantiation", async function () {
      this.timeout(0);
      fetcher = await Fetcher.launch();
    });
  });
  describe("Fetch manga stats tests", function () {
    this.timeout(0);
    it("Fetchs nanatsu-no-taizai volumes, name and chapters", function () {
      const supposedResults = {
        volumes: 41,
        chapters: 347,
        name: "nanatsu-no-taizai",
        display: "Nanatsu No Taizai",
        synopsis:
          "Il y a dix ans, un groupe de mercenaires appelé les Seven Deadly Sins s'est rebellé contre les Chevaliers Sacrés, la garde du royaume… Depuis, ils ont disparu et personne ne sait ce qu'ils sont devenus. Un beau jour, une mystérieuse jeune fille s'écroule dans la taverne de Meliodas, un garçon enjoué qui parcourt le monde en compagnie de son cochon loquace. Cette jeune fille n'est autre que la princesse Elizabeth qui désire ardemment retrouver les Seven Deadly Sins. En effet, ce sont les seuls à même de lutter contre les Chevaliers Sacrés, qui ont fait prisonnier le roi et qui asservissent toute la population du royaume ! Très vite, elle va découvrir que Meliodas n'est pas un simple patron de taverne mais un guerrier à la puissance exceptionnelle...",
      };
      return new Promise<void>((resolve, reject) => {
        fetcher.fetchStats("nanatsu-no-taizai").then((infos) => {
          const supposedResultsString = JSON.stringify(supposedResults);
          const infosString = JSON.stringify(infos);
          if (supposedResultsString !== infosString) {
            reject(
              new Error(
                "Wrong fetch. Supposed: " +
                  supposedResultsString +
                  "\nGot: " +
                  infosString
              )
            );
          }
          resolve();
        });
      });
    });
    it("Fetchs one-piece volume 97 chapters", function () {
      this.timeout(0);
      const supposedResults = [
        WEBSITE + "/lecture-en-ligne/one-piece/975/",
        WEBSITE + "/lecture-en-ligne/one-piece/976/",
        WEBSITE + "/lecture-en-ligne/one-piece/977/",
        WEBSITE + "/lecture-en-ligne/one-piece/978/",
        WEBSITE + "/lecture-en-ligne/one-piece/979/",
        WEBSITE + "/lecture-en-ligne/one-piece/980/",
        WEBSITE + "/lecture-en-ligne/one-piece/981/",
        WEBSITE + "/lecture-en-ligne/one-piece/982/",
        WEBSITE + "/lecture-en-ligne/one-piece/983/",
        WEBSITE + "/lecture-en-ligne/one-piece/984/",
      ];
      return new Promise<void>((resolve, reject) => {
        const supposedResultsString = supposedResults.toString();
        fetcher.fetchVolumeChapters(97, "one-piece").then((chapters) => {
          const chaptersToString = chapters.toString();
          if (chaptersToString !== supposedResultsString) {
            reject(
              new Error(
                "Wrong fetch. Supposed: " +
                  supposedResultsString +
                  "\nGot: " +
                  chaptersToString
              )
            );
          }
          resolve();
        });
      });
    });

    it("Fetchs range between one-piece 1000 and 1005", function () {
      function getListOrNone(arr: string[]) {
        if (arr.length) return arr.join(" | ");
        return "none";
      }
      const supposedLinks = [
        WEBSITE + "/lecture-en-ligne/one-piece/1000/",
        WEBSITE + "/lecture-en-ligne/one-piece/1000.5/",
        WEBSITE + "/lecture-en-ligne/one-piece/1001/",
        WEBSITE + "/lecture-en-ligne/one-piece/1002/",
        WEBSITE + "/lecture-en-ligne/one-piece/1003/",
        WEBSITE + "/lecture-en-ligne/one-piece/1004/",
        WEBSITE + "/lecture-en-ligne/one-piece/1005/",
      ];
      return new Promise<void>((resolve, reject) => {
        fetcher
          .fetchChapterLinksBetweenRange("one-piece", 1000, 1005)
          .then((links) => {
            if (links.toString() !== supposedLinks.toString()) {
              const couldNotBeFetched = supposedLinks.filter(
                (x) => !links.includes(x)
              );
              const fetchedButShouldnt = links.filter(
                (x) => !supposedLinks.includes(x)
              );
              reject(
                new Error(
                  `Were not fetched: ${getListOrNone(
                    couldNotBeFetched
                  )}\nWere fetched but shouldnt: ${getListOrNone(
                    fetchedButShouldnt
                  )}`
                )
              );
            } else {
              resolve();
            }
          });
      });
    });
    it("Should throw because range is invalid", function () {
      return new Promise((resolve, reject) => {
        fetcher
          .fetchChapterLinksBetweenRange("one-piece", 1005, 1004)
          .then((links) =>
            reject(
              new Error(
                "Was supposed to throw because invalid, got links: " +
                  links.toString()
              )
            )
          )
          .catch((error) => resolve(error));
      });
    });
  });

  describe("fetch pages tests", function () {
    it(`Fetchs one-piece chapter 1000 pages`, function () {
      this.timeout(0);
      const supposedResult = 15;
      return new Promise<void>((resolve, reject) => {
        fetcher
          .fetchNumberOfPagesInChapter(
            WEBSITE + "/lecture-en-ligne/one-piece/1000/"
          )
          .then((numberOfPages) => {
            if (supposedResult !== numberOfPages) {
              reject(
                new Error(
                  "Wrong fetch. Supposed: " +
                    supposedResult +
                    "\nGot: " +
                    numberOfPages
                )
              );
            }
            resolve();
          });
      });
    });
    it("Fetch number of pages in One Piece volume 1", function () {
      this.timeout(0);
      return new Promise<void>((resolve, reject) => {
        fetcher
          .fetchNumberOfPagesInChapter(
            WEBSITE + "/lecture-en-ligne/one-piece/volume-1/"
          )
          .then((pages) => {
            if (pages !== 206) {
              reject(new Error("Wrong fetch. Supposed: 206\nGot: " + pages));
            }
            resolve();
          })
          .catch((error) => reject(error));
      });
    });

    it("Searches for one piece", function () {
      this.timeout(0);
      return new Promise<void>((resolve, reject) => {
        fetcher.searchManga("one piece").then((search) => {
          const onePieceManga = search[0];
          if (onePieceManga?.japscan !== "one-piece") {
            reject(
              new Error(
                "Search did not find one-piece but" +
                  JSON.stringify(onePieceManga)
              )
            );
          }
          resolve();
        });
      });
    });
  });
}
