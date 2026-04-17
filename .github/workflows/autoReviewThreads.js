const parser = require('node-html-parser');
const fs = require('fs');

module.exports = async ({ glob }) => {
    const globber = await glob.create("**/motd.txt");

    const title_matcher = /Trialmin Review.*: (.+)$/i;
    const anchor_matcher = /(?:<!-- REVIEW THREADS ANCHOR START -->[^]*<!-- REVIEW THREADS ANCHOR END -->)/;
    const topic_id_matcher = /t=(\d+)/;

    const raw = await fetch("https://tgstation13.org/phpBB/viewforum.php?f=120", {
        headers: {
            "User-Agent": "Get Trial Threads Script"
        }
    });

    const root = parser.parse(await raw.text());

    const elements = root.querySelectorAll(".topictitle");

    const threads = [];

    for (const element of elements) {
        const match = element.innerHTML.match(title_matcher);

        if (match === null || element.parentNode.parentNode.getAttribute("title")?.startsWith("This topic is locked")) {
            continue;
        }

        const topic_id = element.attributes["href"].match(topic_id_matcher)[1];

        threads.push([match[1], topic_id]);
    }

    console.log("active threads found: " + threads.length)

    let new_text = "";
    if (threads.length > 0) {
        new_text += '<h2 style="color:red;">The following trial admin review threads are currently active:</h2>\n';
    }

    for (const [name, topic_id] of threads) {
        new_text += `<p style="color:blue;"><a href="https://forums.tgstation13.org/viewtopic.php?t=${topic_id}"><b>${name}</b></a></p>\n`;
    }

    const replacement =
`<!-- REVIEW THREADS ANCHOR START -->\n
${new_text}
<!-- REVIEW THREADS ANCHOR END -->`

    for (const file of globber.glob()) {
        console.log(`current file: ${file}`);

        let count = 0;

        const file_contents = fs.readFileSync(file).toString();
        const new_content = file_contents.replace(anchor_matcher, (_) => { count += 1; return replacement });

        if (count == 0) {
            console.error("no replacement anchor found in this file, was it removed? skipping update")
            continue;
        }

        if (file_contents === new_content) {
            console.log("no changes, skipping update");
            continue;
        }

        console.log("writing updated version");
        fs.writeFileSync(file, new_content);
    }
}
