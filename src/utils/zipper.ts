import archiver from "archiver";
import fs from "fs";
import Downloader from "../components/Downloader";
import path from "path";

const zipper = {
    async safeZip(downloader: Downloader, mangaName: string, mangaType: string, mangaNumber: string, directories: string[]): Promise<void> {
        function bytesToSize(bytes: number) {
            const sizes = ['octet', 'Ko', 'Mo', 'Go', 'To'];
            if (bytes == 0) return '0 ' + sizes[0];
            const i = Math.floor(Math.log(bytes) / Math.log(1024));
            return Math.round(bytes / Math.pow(1024, i)) + ' ' + sizes[i];
        }
        console.log(`En train de faire le cbr ${mangaName} ${mangaType} ${mangaNumber}...`);
        const cbrName = downloader._getCbrFrom(
            mangaName,
            mangaNumber,
            mangaType
        );
        try {
            const infos = await zipper.zipDirectories(
                directories,
                cbrName
            )
            console.log("Cbr terminé! Il est enregistré à l'endroit " + infos.filename + " (" + bytesToSize(infos.archive.pointer()) + ")");
        } catch (e) {
            console.log("Erreur pendant la création du cbr (" + cbrName + "):", e);

        }
    },
    /**
     * @param {String[]} source is an array of path
     * @param {String} out is the filename
     */
    async zipDirectories(source: string[], out: string): Promise<{ archive: archiver.Archiver, filename: string }> {
        const archive = archiver("zip", { zlib: { level: 9 } });
        const stream = fs.createWriteStream(out);

        return new Promise((resolve, reject) => {
            source.forEach((s) => {
                const split = s
                    // split path on path separator (/ or \)
                    .split(path.sep)
                    //filter out empty strings
                    .filter((v) => v);
                // get the last element of the array (the chapter folder)
                const lastDir = split[split.length - 1];
                // put content of folder s on system into lastDir directory in the archive
                archive.directory(s, lastDir);
            });
            archive.on("error", (err) => reject(err)).pipe(stream);

            stream.on("close", () => resolve({ archive: archive, filename: out }));
            archive.finalize();
        });
    },
};

export default zipper;
