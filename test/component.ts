import Component from "../src/components/Component";
import chrome from "../src/utils/chrome";
import config from "../src/utils/config";

let component: Component;
describe("Instantiate component", function () {
    this.timeout(0);
    it("Component instantiation", async function () {
        const configVariables = config.getConfigVariables();
        component = await Component.launch({ chromePath: chrome.getChromePath(configVariables.chromePath) });
    })
});

describe("japscan 404 tests", function () {
    this.timeout(0);
    it("Should throw because page is 404", function () {
        return new Promise((resolve, reject) => {
            component
                .createExistingPage(component.WEBSITE + "/manga/one-piece")
                .catch((error) => reject(error));
            resolve(undefined);
        });
    });
    it("Should not throw because page exists", function () {
        return new Promise((resolve, reject) => {
            component
                .createExistingPage(component.WEBSITE + "/manga/one-piece/")
                .catch((error) => reject(error));
            resolve(undefined);
        });
    });
});

describe("is a webtoon tests", function () {
    this.timeout(0);
    describe("Not webtoon tests", function () {
        ["one-piece", "nanatsu-no-taizai", "mashle", "black-clover", "kingdom"].forEach((manga) => {
            it(`Should return false because ${manga} is not a webtoon`, function () {
                return new Promise((resolve, reject) => {
                    component.isAWebtoon(manga).then((res) => {
                        if (res) reject(Error(`${manga} is not a webtoon but was detected as a webtoon`));
                        else resolve(undefined);
                    })
                })

            })
        })
    })
    describe("Is webtoon tests", function () {
        ["tower-of-god", "solo-leveling", "gosu", "the-gamer"].forEach((manga) => {
            it(`Should return true because ${manga} is a webtoon`, function () {
                return new Promise((resolve, reject) => {
                    component.isAWebtoon(manga).then((res) => {
                        if (!res) reject(Error(`${manga} is a webtoon but was detected as not a webtoon`));
                        else resolve(undefined);

                    });
                })

            })
        })
    });
});