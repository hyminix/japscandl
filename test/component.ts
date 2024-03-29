import Component from "../src/components/Component";
import { WEBSITE } from "../src/utils/variables";

export function componentTests(): void {
  let component: Component;
  describe("Instantiate component", function () {
    this.timeout(0);
    it("Component instantiation", async function () {
      component = await Component.launch();
    });
  });

  describe("japscan 404 tests", function () {
    this.timeout(0);
    const invalidLinks = [WEBSITE + "/manga/one-piece", WEBSITE + "/manga/na/"];
    invalidLinks.forEach((link) => {
      it("Invalid links are 404: " + link.replace(WEBSITE, ""), function () {
        return new Promise<void>((resolve, reject) => {
          component
            .createExistingPage(link)
            .then((page) => {
              page.close();
              reject(new Error(page.url()));
            })
            .catch(() => resolve());
        });
      });
    });
    const validLinks = [
      WEBSITE + "/manga/one-piece/",
      WEBSITE + "/manga/naruto/",
      WEBSITE + "/lecture-en-ligne/one-piece/1067/",
    ];
    validLinks.forEach((link) => {
      it("Should not throw because page exists: " + link.replace(WEBSITE, ""), function () {
        return new Promise<void>((resolve, reject) => {
          component.createExistingPage(link)
          .then(() => resolve())
          .catch((error) => reject(error));
        });
      });
    });
  });

  describe("is a webtoon tests", function () {
    this.timeout(0);
    describe("Not webtoon tests", function () {
      [
        "one-piece",
        "nanatsu-no-taizai",
        "mashle",
        "black-clover",
        "kingdom",
      ].forEach((manga) => {
        it(`Should return false because ${manga} is not a webtoon`, function () {
          return new Promise((resolve, reject) => {
            component.isAWebtoon(manga).then((res) => {
              if (res)
                reject(
                  Error(
                    `${manga} is not a webtoon but was detected as a webtoon`
                  )
                );
              else resolve(undefined);
            });
          });
        });
      });
    });
    describe("Is webtoon tests", function () {
      ["tower-of-god", "solo-leveling", "gosu" /* "the-gamer" */].forEach(
        (manga) => {
          it(`Should return true because ${manga} is a webtoon`, function () {
            return new Promise((resolve, reject) => {
              component.isAWebtoon(manga).then((res) => {
                if (!res)
                  reject(
                    Error(
                      `${manga} is a webtoon but was detected as not a webtoon`
                    )
                  );
                else resolve(undefined);
              });
            });
          });
        }
      );
    });
  });
}
