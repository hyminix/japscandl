import Downloader from "./components/Downloader";
import fs from "fs";
Downloader.launch({
    flags: {
        fast: false,
        visible: false,
        timeout: 60,
        verbose: false,
    },
    onEvent: {
        onPage: (attributes, total) => {
            console.log("onPage:", attributes.page, total)
        },
        onChapter: (attributes, current, total) => {
            console.log("onChapter:", attributes, current, total);
        },
        onVolume: (manga, current, total) => {
            console.log("onVolume:", manga, current, total);
        }
    }
}).then(async (downloader) => {
    const data = await downloader.fetchMangaContent("ashita-dorobou");
    fs.writeFileSync("test.json", JSON.stringify(data, null, 4));
    await downloader.destroy();
});