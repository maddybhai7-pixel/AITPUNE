const cheerio = require('cheerio');
const db = require('./db.js');

const AIT_NOTICES_URL = 'https://www.aitpune.com/Notices-and-Circulars.aspx';

async function scrapeAITCirculars() {
    try {
        console.log(`[Scraper] Fetching latest circulars from ${AIT_NOTICES_URL}...`);
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 12000);

        const response = await fetch(AIT_NOTICES_URL, {
            signal: controller.signal,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });
        clearTimeout(timeout);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status} returned from AIT Portal`);
        }

        const html = await response.text();
        const $ = cheerio.load(html);
        const notices = [];

        // 1. Scan for notice table rows or list items
        $('tr, li').each((_, el) => {
            const text = $(el).text().replace(/\s+/g, ' ').trim();
            if (text.includes('Notice:') || text.includes('Circular') || text.includes('Timetable') || text.includes('Time Table') || text.includes('Allotment of')) {
                const linkEl = $(el).find('a').first();
                const href = linkEl.attr('href') || '';
                let link = AIT_NOTICES_URL;
                if (href && !href.startsWith('javascript')) {
                    link = href.startsWith('http') ? href : (href.startsWith('/') ? `https://www.aitpune.com${href}` : `https://www.aitpune.com/${href}`);
                }

                const dateMatch = text.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*,?\s*202\d/i);
                const date = dateMatch ? dateMatch[0] : 'AY 2025-26';

                // Categorization
                let category = 'Academic';
                const lower = text.toLowerCase();
                if (lower.includes('exam') || lower.includes('sppu') || lower.includes('timetable')) category = 'Exams';
                else if (lower.includes('hostel') || lower.includes('accn') || lower.includes('room')) category = 'Hostel & Mess';
                else if (lower.includes('ssb') || lower.includes('placement') || lower.includes('training')) category = 'T&P Cell';
                else if (lower.includes('fee') || lower.includes('remittance') || lower.includes('admin')) category = 'Administration';
                else if (lower.includes('concession') || lower.includes('railway') || lower.includes('scholarship')) category = 'Student Welfare';
                else if (lower.includes('trophy') || lower.includes('fest') || lower.includes('club')) category = 'Clubs & Events';

                // Clean notice title
                let cleanTitle = text.replace(date, '').replace(/Notice:\s*/i, 'Notice: ').trim();
                // If text was prefixed with URL or extra whitespace
                if (cleanTitle.startsWith('https://')) {
                    cleanTitle = cleanTitle.replace(/https:\/\/[^\s]+/, '').trim();
                }
                if (cleanTitle.length > 140) {
                    cleanTitle = cleanTitle.substring(0, 140) + '...';
                }

                if (cleanTitle.length >= 8 && !cleanTitle.includes('Undergraduate Programmes')) {
                    notices.push({
                        title: cleanTitle,
                        date,
                        category,
                        link,
                        source: 'AIT Official Portal'
                    });
                }
            }
        });

        // 2. Also scan direct PDF download links
        $('a[href$=".pdf"]').each((_, el) => {
            const href = $(el).attr('href') || '';
            const title = $(el).text().replace(/\s+/g, ' ').trim() || $(el).attr('title') || 'Official Document';
            if (title.length >= 6 && !title.toLowerCase().includes('download')) {
                const link = href.startsWith('http') ? href : (href.startsWith('/') ? `https://www.aitpune.com${href}` : `https://www.aitpune.com/${href}`);
                notices.push({
                    title: title.startsWith('Notice') ? title : `Notice: ${title}`,
                    date: 'Recent',
                    category: 'Academic',
                    link,
                    source: 'AIT Circular PDF'
                });
            }
        });

        console.log(`[Scraper] Found ${notices.length} circular records.`);

        // Insert into database
        let newlyAdded = 0;
        const seen = new Set();
        for (const n of notices) {
            if (!seen.has(n.title)) {
                seen.add(n.title);
                try {
                    const info = db.insertNotice(n.title, n.date, n.category, n.link, n.source);
                    if (info.changes > 0) newlyAdded++;
                } catch (e) {
                    // Ignore duplicate
                }
            }
        }

        const totalInDb = db.getNotices().length;
        console.log(`[Scraper] Sync completed. Added ${newlyAdded} new, total ${totalInDb} in database.`);

        return {
            success: true,
            totalScraped: notices.length,
            newlyAdded,
            totalInDb,
            lastSynced: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
    } catch (err) {
        console.warn(`[Scraper Notice] Live scrape fallback to local DB: ${err.message}`);
        return {
            success: false,
            error: err.message,
            totalInDb: db.getNotices().length,
            lastSynced: 'Cached'
        };
    }
}

module.exports = { scrapeAITCirculars };
