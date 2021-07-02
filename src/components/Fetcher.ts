import { Browser, Page } from "puppeteer";
import Component from "./Component";
import { Chapter, ComponentFlags, MangaContent, MangaInfos, Volume } from "../utils/types";
import url from "../utils/url";
import getBrowser from "../utils/browser";
import chrome from "../utils/chrome";
import fetch from 'node-fetch';

class Fetcher extends Component {
    /**
     * @param browser Browser the downloader is going to use
     * @param options optional options, which are flags and outputDirectory
     */
    constructor(browser: Browser, options?: {
        flags?: ComponentFlags,
        outputDirectory?: string
    }) {
        super(browser, options);
    }
    /**
     *
     * @param mangaName manga name
     * @returns manga stats
     */
    async fetchStats(
        mangaName: string
    ): Promise<MangaInfos> {
        this._verbosePrint(console.log, "Récupération des infos du manga " + mangaName);
        const link = url.buildMangaLink(mangaName, this);
        const page = await this.createExistingPage(link);
        const pageMangaName = url.getAttributesFromLink(page.url()).manga;
        const chapterList = await page.$("#chapters_list");
        const volumes = await chapterList?.$$("h4");
        const lastChapterLink = await chapterList?.$eval(".collapse", (el) => {
            const div = el.querySelector("div");
            if (div !== null) {
                const a = div.querySelector("a");
                if (a !== null) {
                    return a.href;
                }
            }
        });

        if (lastChapterLink === undefined) {
            throw new Error(
                "japdl n'a pas pu récupérer les infos de " +
                mangaName +
                ", ce manga ne se trouve pas à ce nom sur japscan"
            );
        }
        if (volumes === undefined) {
            throw new Error(
                "japdl n'a pas pu trouver la liste des chapitres sur la page du manga " +
                mangaName
            );
        }
        const chapter = url.getAttributesFromLink(lastChapterLink).chapter;
        page.close();
        return {
            volumes: volumes?.length,
            chapters: +chapter,
            name: pageMangaName,
        };
    }
    /**
     *
     * @param volumeNumber volume number
     * @param  mangaName manga name
     * @returns array of link to the chapters in volume volumeNumber
     */
    async fetchVolumeChapters(
        volumeNumber: number,
        mangaName: string
    ): Promise<Array<string>> {
        this._verbosePrint(console.log,
            "Récupération des chapitres du volume " +
            volumeNumber +
            " du manga " +
            mangaName
        );
        const link = url.buildMangaLink(mangaName, this);

        const page = await this.createExistingPage(link);
        const chapterList = await page.$("#chapters_list");
        const numberOfVolumes = (await this.fetchStats(mangaName)).volumes;

        if (volumeNumber > numberOfVolumes || volumeNumber <= 0) {
            throw new Error(
                `Le numéro de volume (${volumeNumber}) ne peut pas être plus grand que le nombre actuel de volumes (${numberOfVolumes}) ou moins de 1`
            );
        }
        const chapters = await chapterList?.$$(".collapse");
        if (chapters === undefined) {
            throw new Error(
                "Le programme n'a pas pu accéder au contenu du volume " + volumeNumber
            );
        }
        try {
            const volumeLinks = await chapters[
                chapters.length - volumeNumber
            ].evaluate((el: Element) => {
                const result: Array<string> = [];
                el.querySelectorAll("div").forEach((el) => {
                    const aElement = el.querySelector("a");
                    if (aElement === null) {
                        result.push("https://japscan.se/lecture-en-ligne/notFound");
                    } else {
                        result.push(aElement.href);
                    }
                });
                return result;
            });
            await page.close();
            return volumeLinks.reverse();
        } catch (e) {
            throw new Error(
                `japdl n'a pas pu récupérer les chapitres du volume ${volumeNumber} du manga ${mangaName}, qui a une longueur de chapitre de ${chapters.length}, erreur ${e}`
            );
        }
    }

    /**
     *
     * @param mangaName manga name
     * @param start start chapter
     * @param end end chapter
     * @returns array of links to download from in range start - end
     */
    async fetchChapterLinksBetweenRange(
        mangaName: string,
        start: number,
        end: number
    ): Promise<string[]> {
        return (await this.fetchChaptersBetweenRange(mangaName, start, end))
            .map((chapter => chapter.link));
    }

    async fetchChaptersBetweenRange(
        mangaName: string,
        start: number,
        end: number
    ): Promise<Chapter[]> {
        function getAllChaptersFromContent(content: MangaContent) {
            return Array.prototype.concat.apply([], content.volumes.map((volume) => volume.chapters));
        }
        if (end < start) {
            throw new Error(
                "Le début ne peut pas être plus grand que la fin (début: " +
                start +
                ", fin: " +
                end +
                ")"
            );
        }
        const data = await this.getMangaContent(mangaName);
        // filter ou out of range chapters
        const filteredChapters =
            // get all chapters objects in all volumes as an array
            getAllChaptersFromContent(data)
                .filter((chapter) => {
                    const chapterNumber = +url.getAttributesFromLink(chapter.link).chapter;
                    return chapterNumber >= start && chapterNumber <= end;
                })
        return filteredChapters;
    }

    /**
     *
     * @param link to fetch from
     * @returns number of pages in chapter
     */
    async fetchNumberOfPagesInChapter(link: string): Promise<number> {
        this._verbosePrint(console.log,
            "Recupération du nombre de pages pour le chapitre " + link
        );
        const startPage = await this.createExistingPage(link);
        const chapterSelectSelector = "div.div-select:nth-child(2) > .ss-main > .ss-content > .ss-list";
        const chapterSelect = await this.waitForSelector(startPage, chapterSelectSelector);
        if (!chapterSelect) {
            await startPage.close();
            return await this.fetchNumberOfPagesInChapter(link);
        }
        const numberOfPages = await chapterSelect.evaluate((el) => el.childElementCount);
        this._verbosePrint(console.log, "Nombre de page(s): " + numberOfPages);
        await startPage.close();
        return numberOfPages;
    }

    /**
     * Search the `search` parameter on japscan and returns the results as an array
     * @param search string to search on japscan
     * @returns json object containing results given by japscan
     */
    async searchManga(search: string): Promise<{ mangakas: string, original_name: null | string, name: string, url: string }[]> {
        const resp = await fetch('https://www.japscan.ws/live-search/', {
            method: 'POST',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0',
                'Accept': 'application/json',
                'Accept-Language': 'en-US,en;q=0.5',
                'X-Requested-With': 'XMLHttpRequest',
                'Content-Type': 'application/x-www-form-urlencoded',
                'Origin': 'https://www.japscan.ws',
                'Alt-Used': 'www.japscan.ws',
                'Connection': 'keep-alive',
                'Pragma': 'no-cache',
                'Cache-Control': 'no-cache',
                'TE': 'Trailers'
            },
            body: 'search=' + search
        });
        return resp.json();
    }
    /**
     * this function gets all volumes and chapters from the manga page
     * @param manga manga to get infos from
     * @param page can give a page to prevent it from being created
     */
    async getMangaContent(manga: string, page?: Page): Promise<MangaContent> {
        const link = url.buildMangaLink(manga, this);
        // indicates if we need to close the page at the end of the function (in case we create a new page)
        let closePage = false;
        if (!page) {
            // if there is no page, create one in the parameter variable
            page = await this.browser.newPage();
            // so we will need to close it
            closePage = true;
        }
        // applies to wrong url pages and new pages
        if (page.url() !== link) {
            await page.goto(link);
        }
        // div containing everything
        const chaptersList = await page.$('#chapters_list');
        if (!chaptersList) throw new Error("La liste des chapitres du manga n'a pas pu être récupérée");

        const volumes = await chaptersList.evaluate((chaptersListEl) => {
            const ResultVolumes: Volume[] = [];
            const volumes = chaptersListEl.querySelectorAll('h4');
            const chapters = chaptersListEl.querySelectorAll(".collapse");
            for (let i = 0; i < volumes.length; i++) {
                const chaptersResult: { name: string, link: string }[] = [];
                const aEls = chapters.item(i).querySelectorAll('div > a');
                aEls.forEach((el) => {
                    chaptersResult.push({
                        name: el.textContent?.trim() as string,
                        link: (<HTMLAnchorElement>el).href.trim()
                    });
                });
                const splitted = volumes.item(i).textContent?.split('Volume ');
                /**
                 * if `'Volume '` was found in the string, get second element of the array.
                 * Usually, the splitted array is `['', '<number>']`, so we just take the number.
                 * But sometimes it is `['', '<number> : <title of the volume>']`.
                 * In this case, using parseFloat will read `<number>` and return its value without reading
                 * the rest of the string. Then we can convert the number back to a string to get only the
                 * volume number.
                 *
                 * if `'Volume '` was not found in the string, it probably means that it's a webtoon,
                 * so we check for webtoon. If it is, return webtoon. If it is something else, we
                 * can simply return 'notFound', because we don't know what type of volume it is.
                 */
                const volumeNumber = (splitted)
                    ? parseFloat(splitted[1].trim()).toString()
                    : (volumes.item(i).textContent?.trim().includes("Webtoon")
                        ? "Webtoon"
                        : "notFound");
                const volume = {
                    name: volumes.item(i).textContent?.trim() as string,
                    num: volumeNumber,
                    chapters: chaptersResult.reverse(),
                }
                ResultVolumes.push(volume);
            }
            return ResultVolumes.reverse();
        });

        const synopsis = await page.$eval('p.list-group-item', (el) => {
            return el.textContent || "";
        })
        // close page if we created it earlier
        if (closePage) page.close();

        return {
            manga,
            synopsis,
            volumes
        }
    }

    static async launch(options?: {
        flags?: ComponentFlags,
        outputDirectory?: string,
        chromePath?: string,
    }): Promise<Fetcher> {
        const browser = await getBrowser(options?.flags?.visible ?? false, chrome.getChromePath(options?.chromePath));
        return new this(browser, options);
    }
}

export default Fetcher;