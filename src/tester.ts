import Downloader from "./components/Downloader";
import zipper from "./utils/zipper";
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
        }
    }
}).then(async (downloader) => {
    await zipper.pdfDirectories([
        downloader._getPathFrom({ manga: "one-piece", "chapter": "998", "page": "0" }),
        downloader._getPathFrom({ manga: "one-piece", "chapter": "999", "page": "0" }),
    ], "test.pdf");
    downloader.destroy();
});