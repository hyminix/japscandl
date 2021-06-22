import Downloader from "./components/Downloader";
Downloader.launch({
    flags: {
        fast: false,
        visible: false,
        timeout: 60,
        verbose: false,
    },
    onEvent: {
        onPage: (attributes, total) => {
            console.log(attributes.page, total)
        },
        onChapter: (attributes, current, total) => {
            console.log(attributes, current, total);
        }
    }
}).then(async (downloader) => {
    /*
    const page = await downloader.browser.newPage();
    await page.goto("http://127.0.0.1:5500/index.html");
    await page.click('input');
    await page.keyboard.type("hello");
    await page.screenshot({
        path: "test.jpg",
    })
    */
    const results = await downloader.searchManga("One Piece");
    console.log(results.length);
    results.forEach((res) => {
        console.log(res.name, res.url);
    })
    await downloader.destroy();
});