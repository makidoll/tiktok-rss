import { Feed } from "https://cdn.skypack.dev/feed";

const commands = [
	"sudo apt-get install libegl1 libopus0 libwoff1 libharfbuzz-icu0 gstreamer1.0-plugins-base libgstreamer-gl1.0-0 gstreamer1.0-plugins-bad libopenjp2-7 libwebpdemux2 libenchant1c2a libhyphen0 libgles2 gstreamer1.0-libav libevdev-dev",
	"python -m pip install TikTokApi",
	"python -m playwright install",
	"sudo npx playwright install-deps",
];

for (const command of commands) {
	await Deno.run({
		cmd: command.split(" "),
	}).status();
}

const { url: serveUrl, usernames } = JSON.parse(
	await Deno.readTextFile("./settings.json"),
);

async function downloadAsset(url: string, filename: string) {
	const res = await fetch(url, {
		headers: {
			Referer: "https://www.tiktok.com/",
		},
	});
	const buffer = await res.arrayBuffer();
	await Deno.writeFile("./assets/" + filename, new Uint8Array(buffer));
	// return parseInt(res.headers.get("content-length") ?? "0");
}

async function scrapeUser(username: string) {
	const cmd = Deno.run({
		cmd: ["python", "scrape.py", username],
		stdout: "piped",
		stderr: "piped",
	});

	const response = await cmd.output();
	const status = await cmd.status();

	if (status.success == false) {
		throw new Error(new TextDecoder().decode(await cmd.stderrOutput()));
	}

	cmd.close();

	const posts = JSON.parse(new TextDecoder().decode(response));
	// await Deno.writeTextFile(JSON.stringify(posts));
	// const posts = JSON.parse(await Deno.readTextFile("./data.json"));

	const feed = new Feed({
		title: "TikTok @" + username,
		description: posts[0].author.signature,
		link: "https://www.tiktok.com/@" + username,
	});

	for (const post of posts) {
		await downloadAsset(post.video.playAddr, post.id + ".mp4");
		await downloadAsset(post.video.cover, post.id + ".jpg");

		const videoUrl = serveUrl + "/assets/" + post.id + ".mp4";
		const imageUrl = serveUrl + "/assets/" + post.id + ".jpg";

		feed.addItem({
			title: post.desc,
			id: post.id,
			link: "https://www.tiktok.com/@" + username + "/video/" + post.id,
			date: new Date(post.createTime * 1000),
			description: post.desc,
			image: { url: imageUrl, length: 0 },
			content:
				`🎵 ${post.music.title} - ${post.music.authorName}<br/><br/>` +
				`<video poster="${imageUrl}" controls><source src="${videoUrl}" type="video/mp4"></video>`,
		});
	}

	const rssFilePath = "./rss/" + username + ".xml";
	await Deno.writeTextFile(rssFilePath, feed.rss2());

	console.log(rssFilePath + " written!");
}

async function mkdirp(path: string) {
	try {
		await Deno.mkdir(path);
	} catch (error) {}
}

await mkdirp("rss");
await mkdirp("assets");

for (const username of usernames) {
	await scrapeUser(username);
}
