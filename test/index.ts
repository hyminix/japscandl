import { componentTests } from "./component";
import { downloaderTests } from "./download";
import { fetcherTests } from "./fetch";
import yargs from "yargs";

const flags = yargs(process.argv.slice(2)).option("only", {
  alias: "o",
  string: true,
  choices: ["c", "component", "f", "fetcher", "d", "downloader"],
}).argv;

const availableTests = {
    "c": componentTests,
    "f": fetcherTests,
    "d": downloaderTests
}

if(flags.only){
    // get first letter of choice ("downloader" -> "d" | "d" -> "d") which is a key to choices
    const choice = flags.only[0] as keyof typeof availableTests;
    // execute test
    availableTests[choice]();
} else {
    // execute each test in choices
    for(const test of Object.values(availableTests)){
        test();
    }
}




