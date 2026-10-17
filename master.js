const fs = require('fs');
const path = require('path');
// NEW: Import Faker library to generate realistic fake data
const { faker } = require('@faker-js/faker'); 

// ==================================================================
// CONFIGURASI UTAMA AUTOMATION MULTI-DOMAIN
// ==================================================================
// NEW CAMPAIGN ID TO PREVENT DUPLICATE RSS ON NEW PAGES
const DEPLOYMENT_ID = "NEW_PAGES_BATCH_024"; // Change this every time you deploy a new Pages!

const POSTS_PER_PAGE = 1000;
const MASTER_FILE_SIZE = 200179; 
const MASTER_DURATION = 12;      

// 🔗 LINK TUJUAN AFFILIATE (Money Domain murni yang kamu tentukan sendiri)
const MONEY_DOMAIN = "https://lastoutline.com"; 

// 🎙️ DOMAIN TEMPAT MENARUH RSS DI CLOUDFLARE (Tempat penampung aset musik & file redirects)
// PASTIKAN kamu selalu mengubah ini sesuai domain Cloudflare Pages baru hasil fork-mu!
const ASSET_URL = "https://sdmrendang-eng.github.io"; 

// 📝 DAFTAR 19 DOMAIN EMAIL KAMU
const LIST_EMAIL_DOMAINS = [
"kiwil.my.id",
"kopyor.co.uk",
"kopyor.uk",
"kuntrink.co.uk",
"kuntrink.uk",
"lemper.co.uk",
"lemper.org.uk",
"shopee-cod.my.id",
"smilespirit.co.uk"
];

// --- SPINTAX CONFIG (AMAZON COMPLIANCE & GERILYA MODE - FULL VERSION) ---
const FEED_TITLE_SPIN = `{Digital Library Insights|Premium Book Reviews|Daily Literary & Kindle Guide|The Audio & Ebook Library|Reader's Digital Perspective|Digital Book Journal|The Narrative & Kindle Hub|Literary & Ebook Archive}`; 
const FEED_DESC_SPIN = `{Discover professional reviews and immersive audio previews or Kindle editions of the world's most popular titles. Our library offers detailed insights into various genres, helping you find your next great listen or read with expert narration.|Your destination for curated book summaries, Kindle editions, and audio versions. Explore our collection of mystery, romance, and non-fiction titles designed for the modern reader seeking quality storytelling.|Explore an extensive archive of literature through our digital-first approach. We feature detailed reviews, author backgrounds, and professional previews for book enthusiasts seeking a premium Kindle or Audio experience.}`; 
const FEED_AUTHOR_SPIN = `{Review Team|Literary Curator|Digital Book Critic|Digital Librarian|Archive Manager|Audio & Kindle Reviewer|The Digital Book Guide|Digital Scholar}`; 

const SPINTAX_PREFIX = `{Review of|Get Insights on|Preview|Explore|Discover|The Reading Order for|A Complete Series Guide to|Why You Should Read|First Look at|Inside the Pages of|Exploring|Quick Summary of|Introduction to|A Brief Summary|Complete Guide|Important Characters of} {Audiobook|Kindle Edition|Digital Book|Audible Title|Ebook Summary}`; 
const SPINTAX_SUFFIX = `{Detailed Review|Unabridged Insights|Complete Guide|2026 Edition} {Premium Access|Kindle & Audio Preview|High Quality|Curated Content} {Best Seller|Trending Title|Must Read|Editor's Choice} `; 
const MULTI_LANG_PREFIX = `{Featured|Infos|Guide|Résumé|Resumen|Guía|Sommario} {Edition|Review|Insights|Summary} {Audiobook|Ebook|Livre Audio|Libro Audiolibro}`; 

const DESC_PREFIX = `{Explore|Access|Discover|Find|Read the Review of|Get Insights on} {this|the} {premium|full|latest|detailed|featured} {digital edition|audiobook summary|Kindle version|editorial review} {in|as} {Audio|Digital|Ebook} {format|narrated version|readable copy}`; 
const DESC_SUFFIX = `{and start your listening or reading experience today|available for your Kindle or mobile device|designed for the modern reader and listener|perfect for checking availability on the digital store}. 
This {digital title|audiobook|ebook} is {highly recommended|an editor's pick|a must-read|a top-rated review}. 
Enjoy {immersive|seamless|insightful} {access|storytelling|previews|highlights} and start {listening|reading|exploring|discovering} {right now|today|via proper channels}. 
Optimized for {mobile|Kindle|tablet|desktop|Audible} devices.`; 
const DESC_TAGS = `{audiobook review|kindle edition|premium books|audible preview|book summary|read online|listen online|literary insights|audio book guide|digital library|kindle unlimited|professional narrator|best digital books 2026}`; 

// --- HELPER FUNCTIONS ---
function cdata(str) { 
    if (!str) return ""; 
    let clean = str.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, ""); 
    clean = clean.replace(/]]>/g, "]]]]><![CDATA[>"); 
    return `<![CDATA[${clean}]]>`; 
}

function xmlSafe(str) { 
    if (!str) return ""; 
    return str.replace(/[<>&"']/g, m => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' }[m])); 
}

function stringToHash(string) { 
    let hash = 0; 
    if (string.length === 0) return hash; 
    for (let i = 0; i < string.length; i++) { 
        hash = ((hash << 5) - hash) + string.charCodeAt(i); 
        hash = hash & hash; 
    } 
    return Math.abs(hash); 
}

function spinTextStable(text, seedStr) { 
    return text.replace(/\{([^{}]+)\}/g, (match, content) => { 
        const choices = content.split("|"); 
        const index = stringToHash(seedStr + content) % choices.length; 
        return choices[index]; 
    }); 
}

function generateUUID(seed) { 
    const hash = stringToHash(seed).toString(16).padEnd(32, '0'); 
    return `${hash.substr(0,8)}-${hash.substr(8,4)}-4${hash.substr(13,3)}-8${hash.substr(17,3)}-${hash.substr(20,12)}`; 
}

function toTitleCase(str) { 
    if (!str) return ""; 
    return str.replace(/[^a-zA-Z0-9 ]/g, " ").toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ').trim(); 
}

function generateSecureUsername(seedStr) {
    const chars = 'abcdefghijklmnopqrstuvwxyz1234567890';
    const hash = stringToHash(seedStr);
    const length = 7 + (hash % 4); 
    let result = '';
    for (let i = 0; i < length; i++) {
        const charIndex = stringToHash(seedStr + i + "bulk_salt") % chars.length;
        result += chars[charIndex];
    }
    return result;
}

function parseSqlContent(sqlText) { 
    const books = [];
    const regex = /VALUES\s*\(\s*'(.*?)'\s*,\s*'(.*?)'\s*,\s*'(.*?)'\s*,\s*'(.*?)'\s*,\s*'(.*?)'\s*\);/g;
    const cleanSql = sqlText.replace(/''/g, "'"); 
    let match;
    while ((match = regex.exec(cleanSql)) !== null) {
        books.push({
            Judul: match[1],
            Author: match[2],
            Image: match[3],
            Kategori: match[4],
            KodeUnik: match[5]
        });
    }
    return books;
}

// --- CORE BULK PROCESSOR ---
function main() {
    try {
        console.log("======================================================");
        console.log("🔥 STARTING AUTOMATED BULK RSS FEED GENERATOR 🔥");
        console.log("======================================================");

        faker.seed(stringToHash(DEPLOYMENT_ID + "folder_seed"));
        const folderFirstName = faker.person.firstName().replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
        const DYNAMIC_FOLDER_NAME = `output_${folderFirstName}`;
        
        const outputFolder = path.join(__dirname, DYNAMIC_FOLDER_NAME);

        if (!fs.existsSync(outputFolder)) {
            fs.mkdirSync(outputFolder, { recursive: true });
        }

        const backlinkPath = path.join(__dirname, 'backlinks.txt');
        let backlinkList = [];
        if (fs.existsSync(backlinkPath)) {
            backlinkList = fs.readFileSync(backlinkPath, 'utf-8').split('\n').map(line => line.trim()).filter(line => line.length > 0);
            console.log(`[🔗] Loaded ${backlinkList.length} global backlinks successfully.`);
        } else {
            console.log(`[⚠️] Notice: 'backlinks.txt' not found or empty. Generating clean feeds.`);
        }

        const sqlFolderPath = path.join(__dirname, 'sql_files');
        if (!fs.existsSync(sqlFolderPath)) {
            console.error("[❌] Error: 'sql_files' directory not found!");
            return;
        }

        const allFiles = fs.readdirSync(sqlFolderPath);
        const sqlFiles = allFiles.filter(file => file.endsWith('.sql'));

        if (sqlFiles.length === 0) {
            console.error("[❌] Error: No .sql files found inside 'sql_files' directory!");
            return;
        }

        console.log(`[📁] Found ${sqlFiles.length} SQL script files inside directory.\n`);

        const minimalLogData = [];

        sqlFiles.forEach((sqlFilename, index) => {
            const domainIndex = index % LIST_EMAIL_DOMAINS.length;
            const targetDomain = LIST_EMAIL_DOMAINS[domainIndex];
            
            const baseName = path.basename(sqlFilename, '.sql');
            const outputXmlFilename = `RSS-${baseName}.xml`;

            console.log(`[⏳] [${index + 1}/${sqlFiles.length}] Processing ${sqlFilename} ──► 📧 domain: ${targetDomain}`);

            const fullSqlPath = path.join(sqlFolderPath, sqlFilename);
            const rawSqlText = fs.readFileSync(fullSqlPath, 'utf-8');
            const rows = parseSqlContent(rawSqlText).slice(0, POSTS_PER_PAGE);

            if (rows.length === 0) {
                console.log(`    [⚠️] Skip: File ${sqlFilename} is empty or data format mismatch.`);
                return;
            }

            const identitySeed = sqlFilename + ASSET_URL + __dirname + DEPLOYMENT_ID; 
            const channelUUID = generateUUID(identitySeed);

            faker.seed(stringToHash(identitySeed + "faker_email_seed"));
            const safeFirstName = faker.person.firstName().replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
            const randomPrefix = generateSecureUsername(identitySeed + "email_salt").substring(0, 8);
            const combinedName = `${randomPrefix}${safeFirstName}`;
            const DYNAMIC_EMAIL = `${combinedName}@${targetDomain}`;

            minimalLogData.push({
                rss_url: `${ASSET_URL}/${DYNAMIC_FOLDER_NAME}/${outputXmlFilename}`,
                email: DYNAMIC_EMAIL
            });

            const baseTitle = spinTextStable(FEED_TITLE_SPIN, identitySeed + "title"); 
            const dynamicFeedTitle = `${toTitleCase(combinedName)} ${baseTitle}`; 
            
            const dynamicFeedDesc = spinTextStable(FEED_DESC_SPIN, identitySeed + "desc"); 
            const rawAuthorSpin = spinTextStable(FEED_AUTHOR_SPIN, identitySeed + "auth"); 
            
            const authorNameClean = `${toTitleCase(combinedName)} ${rawAuthorSpin}`; 
            const channelCoverUrl = `https://picsum.photos/seed/${combinedName}/1400/1400.jpg`; 
            
            const lastBuildDate = new Date().toUTCString(); 
            const BASE_TIME_MS = new Date().getTime(); 
            const WINDOW_MS = 12 * 60 * 1000 * 60; 

            const FEED_URL = `${ASSET_URL}/${DYNAMIC_FOLDER_NAME}/${outputXmlFilename}`;

            /* OLD CODE START
            let xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" 
    xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd" 
    xmlns:content="http://purl.org/rss/1.0/modules/content/" 
    xmlns:podcast="https://podcastindex.org/namespace/1.0" 
    xmlns:atom="http://www.w3.org/2005/Atom"
    xmlns:dc="http://purl.org/dc/elements/1.1/">
<channel>
<title>${cdata(dynamicFeedTitle)}</title>
<link>${ASSET_URL}</link>
<atom:link href="${xmlSafe(FEED_URL)}" rel="self" type="application/rss+xml" />
<description>${cdata(dynamicFeedDesc)}</description>
<generator>LocalBulkSQLGenerator</generator>
<lastBuildDate>${lastBuildDate}</lastBuildDate>
<language><![CDATA[en]]></language>
<author><![CDATA[${xmlSafe(authorNameClean)}]]></author>
<copyright><![CDATA[${xmlSafe(authorNameClean)}]]></copyright>
<itunes:image href="${xmlSafe(channelCoverUrl)}"/>
<itunes:explicit>false</itunes:explicit>
<itunes:type>episodic</itunes:type>
<itunes:summary>${cdata(dynamicFeedDesc)}</itunes:summary>
<itunes:author>${xmlSafe(authorNameClean)}</itunes:author>
<itunes:owner>
    <itunes:name>${xmlSafe(authorNameClean)}</itunes:name>
    <itunes:email>${xmlSafe(DYNAMIC_EMAIL)}</itunes:email>
</itunes:owner>
<itunes:category text="Arts"><itunes:category text="Books"/></itunes:category>
<image>
    <url>${xmlSafe(channelCoverUrl)}</url>
    <title>${cdata(dynamicFeedTitle)}</title>
    <link>${ASSET_URL}</link>
</image>
<podcast:locked owner="${xmlSafe(DYNAMIC_EMAIL)}">no</podcast:locked>
<podcast:guid>${channelUUID}</podcast:guid>\n`;
            OLD CODE END */

            // NEW CODE: Exact copy of the structural style from the successful podcasts.com reference
            let xml = `<?xml version="1.0" encoding="utf-8"?>
<rss xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd" version="2.0">
<channel>
<title>${cdata(dynamicFeedTitle)}</title>
<link>${ASSET_URL}</link>
<description>${cdata(dynamicFeedDesc)}</description>
<itunes:summary>${cdata(dynamicFeedDesc)}</itunes:summary>
<itunes:type><![CDATA[Episodic]]></itunes:type>
<image>
    <title>${cdata(dynamicFeedTitle)}</title>
    <link>${ASSET_URL}</link>
    <url>${xmlSafe(channelCoverUrl)}</url>
</image>
<itunes:image href="${xmlSafe(channelCoverUrl)}"/>
<itunes:author><![CDATA[${xmlSafe(authorNameClean)}]]></itunes:author>
<itunes:owner>
    <itunes:name><![CDATA[${xmlSafe(authorNameClean)}]]></itunes:name>
    <itunes:email>${xmlSafe(DYNAMIC_EMAIL)}</itunes:email>
</itunes:owner>
<itunes:block>No</itunes:block>
<itunes:complete>No</itunes:complete>
<itunes:category text="Arts"><itunes:category text="Books"/></itunes:category>
<language>en</language>
<copyright>${xmlSafe(authorNameClean)}</copyright>\n`;

            rows.forEach((post, i) => {
                const audioUrl = `${ASSET_URL}/amz/${post.KodeUnik}.mp3`; 
                const postUrl = `${ASSET_URL}/post/${post.KodeUnik}`; 
                const postmoney = `${MONEY_DOMAIN}/post/${post.KodeUnik}`; 
                
                const seed = (post.KodeUnik || post.Judul) + identitySeed; 
                const judulAsli = post.Judul || "Untitled"; 

                const timeOffset = Math.floor((i / rows.length) * WINDOW_MS); 
                const pubDate = new Date(BASE_TIME_MS - timeOffset).toUTCString(); 

                const isMultiLang = (stringToHash(seed + "langType") % 100) < 50; 
                let awalan = isMultiLang ? spinTextStable(MULTI_LANG_PREFIX, seed + "prefix") : spinTextStable(SPINTAX_PREFIX, seed + "prefix"); 
                let akhiran = isMultiLang ? spinTextStable("{2025|2026|Full}", seed + "suffix") : spinTextStable(SPINTAX_SUFFIX, seed + "suffix"); 
                const finalTitle = `${awalan} ${judulAsli} ${akhiran}`; 

                let pinterestPart = "";
                if (backlinkList.length > 0) {
                    const linkIndex = stringToHash(seed + "pinterest_pick") % backlinkList.length;
                    const randomPinterestUrl = backlinkList[linkIndex];
                    
                    const pIntro = spinTextStable("{To view the visual gallery|For book cover art|To see related illustrations|Check out our visual board|Discover the visual companion}", seed + "pintro");
                    const pAnchor = spinTextStable("{View Gallery|Visit Other Podcast|See Art|Visual Guide|Another Podcast}", seed + "panchor");
                    
                    pinterestPart = `<hr/><p>📌 ${pIntro}: <a href="${randomPinterestUrl}">${pAnchor} : ${randomPinterestUrl}</a></p>`; 
                }

                const authorSafe = post.Author || "Unknown Author"; 
                const descStart = spinTextStable(DESC_PREFIX, seed + "descStart"); 
                const descEnd = spinTextStable(DESC_SUFFIX, seed + "descEnd"); 
                const rawDescText = `${descStart} ${judulAsli} by ${authorSafe} ${descEnd}. Tags: ${spinTextStable(DESC_TAGS, seed + "descTags")}`; 
                const ctaPrefix = spinTextStable("{Learn More|Read the Review|Explore the Book|Discover More|See the Full Review|Read More Details|Explore This Book|Find Out More|View Book Details|Continue Reading|See What It’s About|Explore the Story|Check Out the Review|Learn More About This Book|Discover the Details}", seed + "cta"); 
                const liveLinkText = `📥 ${ctaPrefix}: ${judulAsli}`; 

                const htmlContent = `
          <p>👉 <strong><a href="${postmoney}">${liveLinkText} : ${postmoney} </a></strong></p>
          <hr/>
          <p>${rawDescText}</p>
          ${pinterestPart}
        `.trim();
                
                let episodeImage = post.Image ? post.Image : channelCoverUrl; 

                const episodeGUID = generateUUID(seed + (post.KodeUnik || i));

                // NEW CODE: Using exact item structure and duration format (HH:MM:SS) from the successful reference
                const formattedDuration = MASTER_DURATION < 10 ? `00:00:0${MASTER_DURATION}` : `00:00:${MASTER_DURATION}`;

                xml += `<item>
<title>${cdata(finalTitle)}</title>
<itunes:title>${cdata(finalTitle)}</itunes:title>
<description>${cdata(htmlContent)}</description>
<itunes:summary>${cdata(htmlContent)}</itunes:summary>
<link>${postUrl}</link>
<pubDate>${pubDate}</pubDate>
<enclosure url="${audioUrl}" type="audio/mpeg" length="${MASTER_FILE_SIZE}"/>
<author>${xmlSafe(authorNameClean)}</author>
<itunes:author>${xmlSafe(authorNameClean)}</itunes:author>
<itunes:episodeType>Full</itunes:episodeType>
<itunes:duration>${formattedDuration}</itunes:duration>
<guid>${episodeGUID}</guid>
<itunes:image href="${xmlSafe(episodeImage)}"/>
</item>\n`; 
            });

            xml += `</channel></rss>`; 

            fs.writeFileSync(path.join(outputFolder, outputXmlFilename), xml.trim(), 'utf-8');
            console.log(`    [✅] Created: ${DYNAMIC_FOLDER_NAME}/${outputXmlFilename}\n`);
        });

        console.log("[⚙️] Creating '_redirects' file for Cloudflare Media Trick...");
        const redirectsContent = `/amz/*.mp3  /master.mp3  200\n`;
        fs.writeFileSync(path.join(outputFolder, '_redirects'), redirectsContent, 'utf-8');
        console.log("    [✅] Created: _redirects\n");


        console.log("[⚙️] Saving minimal feeds log into JSON...");
        const logFilePath = path.join(__dirname, 'generated_feeds.json');
        fs.writeFileSync(logFilePath, JSON.stringify(minimalLogData, null, 2), 'utf-8');
        console.log("    [✅] Created Database Log: generated_feeds.json\n");

        console.log("======================================================");
        console.log("🎉 SUCCESS: ALL FEEDS CREATED & READY TO UPLOAD 🎉");
        console.log("======================================================");

    } catch (error) {
        console.error("\n[❌] Fatal Batch Error:", error);
    }
}

main();
