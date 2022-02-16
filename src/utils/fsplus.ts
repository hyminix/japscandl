import fs from "fs";
import { mkdir } from "fs/promises";

const fsplus = {
    tellIfDoesntExist(locations: string[]): boolean {
        const found = [];
        locations.forEach((location) => {
            if (!fs.existsSync(location)) {
                console.log(
                    "Attention: le chapitre " +
                    location +
                    " n'a pas été trouvé sur votre disque."
                );
            } else {
                found.push({ location: location });
            }
        });
        console.log(`${found.length}/${locations.length} vont être ajoutés au zip`);
        return !!found.length;
    },
    mkdirIfDoesntExist(path: string): void {
        if (!fs.existsSync(path)) {
            fs.mkdirSync(path);
        }
    },
    async createPath(path: string): Promise<void> {
        await mkdir(path, { recursive: true });
    },
    directoryHasNChildren(path: string, n: number): boolean {
        const files = fs.readdirSync(path);
        return files.length === n;
    },

    alreadyDownloaded(path: string, isDirectory = true): boolean {
        try {
            const fileStats = fs.lstatSync(path);
            if (isDirectory) {
                return fileStats.isDirectory();
            } else {
                return fileStats.isFile();
            }
        } catch (e) {
            return false;
        }
    },
    rmLocations(downloadLocations: string[]): void {
        downloadLocations.forEach((path: string) =>
            fs.rmSync(path, { force: true, recursive: true })
        );
    },
};

export default fsplus;