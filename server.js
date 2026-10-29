const http = require('http');
const fs = require('fs');
const path = require('path');
const db = require('./db.js');
const { scrapeAITCirculars } = require('./scraper.js');

const PORT = process.env.PORT || 5000;

function setCorsHeaders(res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function parseJsonBody(req) {
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
            try {
                resolve(body ? JSON.parse(body) : {});
            } catch (err) {
                reject(err);
            }
        });
        req.on('error', reject);
    });
}

const server = http.createServer(async (req, res) => {
    setCorsHeaders(res);

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
    const pathname = parsedUrl.pathname;

    // --- API ROUTES ---

    // 1. Notices: List & Filter
    if (pathname === '/api/notices' && req.method === 'GET') {
        try {
            const search = parsedUrl.searchParams.get('search') || '';
            const category = parsedUrl.searchParams.get('category') || '';
            const pdfOnly = parsedUrl.searchParams.get('pdfOnly') === 'true';
            const notices = db.getNotices(search, category, pdfOnly);
            let countSql = 'SELECT COUNT(*) as count FROM notices';
            if (pdfOnly) countSql += " WHERE link LIKE '%.pdf%'";
            const totalCount = db.db.prepare(countSql).get().count;

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                success: true,
                totalCount,
                data: notices
            }));
        } catch (err) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: err.message }));
        }
        return;
    }

    // 2. Notices: Live Scraper Trigger
    if (pathname === '/api/notices/sync' && req.method === 'POST') {
        try {
            const result = await scrapeAITCirculars();
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(result));
        } catch (err) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: err.message }));
        }
        return;
    }

    // 3. Transit Pools: List
    if (pathname === '/api/pools' && req.method === 'GET') {
        try {
            const pools = db.getPools();
            const formatted = pools.map(p => {
                let riders = [];
                try { riders = JSON.parse(p.riders || '[]'); } catch (e) { riders = []; }
                return { ...p, riders };
            });
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, data: formatted }));
        } catch (err) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: err.message }));
        }
        return;
    }

    // 4. Transit Pools: Create New
    if (pathname === '/api/pools' && req.method === 'POST') {
        try {
            const body = await parseJsonBody(req);
            const { creator_name, origin, destination, departure_time, total_seats, contact_info, vehicle_type } = body;
            
            if (!creator_name || !origin || !destination || !departure_time || !total_seats) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: 'Missing required pool fields' }));
                return;
            }

            const info = db.createPool(creator_name, origin, destination, departure_time, total_seats, contact_info, vehicle_type);
            res.writeHead(201, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, poolId: Number(info.lastInsertRowid) }));
        } catch (err) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: err.message }));
        }
        return;
    }

    // 5. Transit Pools: Join
    if (pathname === '/api/pools/join' && req.method === 'POST') {
        try {
            const body = await parseJsonBody(req);
            const { poolId, cadetName } = body;

            if (!poolId || !cadetName) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: 'poolId and cadetName required' }));
                return;
            }

            const result = db.joinPool(poolId, cadetName);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(result));
        } catch (err) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: err.message }));
        }
        return;
    }

    // 6. Mess Hub: Menu & Ratings
    if (pathname === '/api/mess' && req.method === 'GET') {
        try {
            const messName = parsedUrl.searchParams.get('name') || 'Thapa Mess';
            const data = db.getMessMenu(messName);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, ...data }));
        } catch (err) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: err.message }));
        }
        return;
    }

    // 7. Mess Hub: Submit Rating
    if (pathname === '/api/mess/rate' && req.method === 'POST') {
        try {
            const body = await parseJsonBody(req);
            const { messName, mealType, rating, comment, author } = body;

            if (!messName || !mealType || !rating) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: 'messName, mealType, and rating (1-5) required' }));
                return;
            }

            db.addMessRating(messName, mealType, rating, comment, author);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, message: 'Rating saved' }));
        } catch (err) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: err.message }));
        }
        return;
    }

    // 8. Smart Campus Query (AIT-GPT)
    if (pathname === '/api/query' && req.method === 'POST') {
        try {
            const body = await parseJsonBody(req);
            const queryText = (body.query || '').trim();

            if (!queryText) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: 'Empty query' }));
                return;
            }

            const searchResults = db.searchCampusKnowledge(queryText);
            const matches = [];

            // Add notice matches
            searchResults.notices.forEach(n => {
                matches.push({
                    type: 'Official Circular',
                    title: n.title,
                    extractedText: `Published: ${n.date} | Category: ${n.category}. Link: ${n.link}`
                });
            });

            // Add mess matches
            searchResults.mess.forEach(m => {
                matches.push({
                    type: 'Mess Dining',
                    title: `${m.mess_name} - ${m.meal_type}`,
                    extractedText: `Menu: ${m.items}. Diet focus: ${m.diet_type}.`
                });
            });

            // Add transit pool matches
            searchResults.pools.forEach(p => {
                matches.push({
                    type: 'Transit Pool',
                    title: `Ride: ${p.origin} ➔ ${p.destination}`,
                    extractedText: `Departs: ${p.departure_time}. Seats left: ${p.available_seats}/${p.total_seats}. Contact: ${p.contact_info}`
                });
            });

            // Campus Knowledge Fallbacks
            const lower = queryText.toLowerCase();
            if (matches.length === 0 || lower.includes('oac') || lower.includes('juice') || lower.includes('pdf') || lower.includes('contact') || lower.includes('phone') || lower.includes('useful') || lower.includes('department') || lower.includes('news') || lower.includes('tender') || lower.includes('rfp') || lower.includes('cfq') || lower.includes('ieee') || lower.includes('icndia')) {
                if (lower.includes('news') || lower.includes('ieee') || lower.includes('icndia') || lower.includes('conference') || lower.includes('desai') || lower.includes('coas') || lower.includes('green') || lower.includes('ngur')) {
                    matches.push({
                        type: 'Latest News & Achievements',
                        title: 'Latest News & Events (September 2026)',
                        extractedText: '• IEEE ICNDIA-2026: Two-day (18th-19th Sep 2026) International Conference on Next-Gen Devices & Intelligent Algorithms concluded successfully at AIT Pune.\n• COAS Award: Heartiest congratulations to Dr. Rahul Desai on receiving the prestigious COAS Award!\n• Green University Ranking: AIT Pune ranked among India’s leading institutions in National Green University Ranking (NGUR) – 2026.\nLink: https://www.aitpune.com/LatestNews.aspx'
                    });
                }
                if (lower.includes('tender') || lower.includes('quotation') || lower.includes('rfp') || lower.includes('cfq') || lower.includes('procurement') || lower.includes('cisco') || lower.includes('plc') || lower.includes('welding') || lower.includes('ar-vr')) {
                    matches.push({
                        type: 'Tenders & Procurement',
                        title: 'Active Tenders & Quotations (RFPs & CFQs)',
                        extractedText: '• RFP -141: Procurement of PLC with Analog Sensor Interacting (Sep 2026)\n• RFP -140: Procurement of Cisco Network Switch for AIT (Sep 2026)\n• CFQ: Audit Best Practices (Sep 2026)\n• CFQ: Procurement of Stationary Items for Exam Section (Sep 2026)\n• CFQ: Provisioning of Housekeeping Materials For QEDec2026 (Sep 2026)\n• CFQ: Procurement of Fire Extinguisher in AIT (Aug 2026)\n• CFQ: Procurement of UPS Batteries for Server Room (Aug 2026)\n• RFP: TIG Welding Machine (Aug 2026)\n• RFP - 102: Renovation of AR-VR Club Room (Aug 2026)\nPortal: https://www.aitpune.com/Tender.aspx'
                    });
                }
                if (lower.includes('avishkar') || lower.includes('hostel accn') || lower.includes('fee remittance') || lower.includes('circular')) {
                    matches.push({
                        type: 'Official Circulars',
                        title: 'Active Notices & Circulars (AY 2026-27)',
                        extractedText: '• Avishkar Competition of SPPU 2026 - 27 (Sep 2026)\n• Allotment of Hostel Accn ME FE STUDENTS 2026-27 (Aug 2026)\n• Notice: Remittance of Fees for AY 2026-27 (May 2026)\nPortal: https://www.aitpune.com/Notices-and-Circulars.aspx'
                    });
                }
                if (lower.includes('contact') || lower.includes('phone') || lower.includes('email') || lower.includes('address') || lower.includes('dighi') || lower.includes('8956018951') || lower.includes('follow') || lower.includes('number')) {
                    matches.push({
                        type: 'Institutional Contact',
                        title: 'Official AIT Contact Details & Address',
                        extractedText: '• Address: Dighi Hills, Pune-411015, Maharashtra, India\n• Telephones: 8956018951 / 8956018952 / 8956018953 / 8956018954\n• Official Email: ait[at]aitpune[dot]edu[dot]in\n• Follow Us: LinkedIn, Twitter/X (@AIT_Pune), Instagram (@aitpune_official), YouTube, Facebook'
                    });
                }
                if (lower.includes('useful') || lower.includes('skill test') || lower.includes('youth4work') || lower.includes('sppu') || lower.includes('unipune') || lower.includes('awes') || lower.includes('aicte') || lower.includes('virtual lab') || lower.includes('vlab') || lower.includes('clubs')) {
                    matches.push({
                        type: 'Useful Links',
                        title: 'Official Useful Links & Portals',
                        extractedText: '• Skill Test For Students: https://www.youth4work.com/onlinetalenttest\n• AIT Alumni Portal: https://alumni.aitpune.edu.in/\n• SPPU (Savitribai Phule Pune University): https://www.unipune.ac.in/\n• AWES (Army Welfare Education Society): https://www.awesindia.com/\n• AICTE: https://www.aicte-india.org/\n• Virtual Labs: https://www.vlab.co.in/\n• Clubs & Societies: https://www.aitpune.com/clubs.aspx'
                    });
                }
                if (lower.includes('oac') || lower.includes('open area') || lower.includes('canteen') || lower.includes('maggi') || lower.includes('burger')) {
                    matches.push({
                        type: 'Campus Food Hub',
                        title: 'Open Area Court (OAC) Food Menu',
                        extractedText: '• Maggi: Plain (₹30), Cheese (₹45), Egg Bhurji (₹50), Peri-Peri (₹40)\n• Sandwiches & Burgers: Veg Grilled (₹40), Cheese Corn (₹50), Paneer Tikka (₹65), Crispy Veg Burger (₹50), Chicken Burger (₹75)\n• Rolls: Veg Frankie (₹40), Paneer Roll (₹60), Egg Roll (₹45), Chicken Roll (₹75)\n• Snacks: Samosa (₹25), Veg Puff (₹20), French Fries (₹50), Steamed/Fried Momos (₹50/₹70)\n• Drinks: Masala Chai (₹15), Hot Filter Coffee (₹20), Thick Cold Coffee (₹50).\nTimings: 08:30 AM - 10:30 PM.'
                    });
                } 
                if (lower.includes('juice') || lower.includes('shake') || lower.includes('fruit') || lower.includes('smoothie')) {
                    matches.push({
                        type: 'Campus Spot',
                        title: 'Fruit Juice & Shake Stall Menu',
                        extractedText: '• Fresh Juices: Mosambi (₹40), Orange (₹45), Watermelon (₹35), Pineapple (₹40), Pomegranate Anaar (₹60), Apple (₹50), Mix Fruit (₹50), Fresh Sugarcane (₹25)\n• Milkshakes: Banana (₹40), Mango (₹50), Chikoo (₹45), Papaya (₹40), Strawberry (₹50), Belgian Chocolate (₹60), Oreo Thick Shake (₹65)\n• Fitness Boosters: Post-Gym Whey Protein Shake (₹75), Banana Peanut Butter Shake (₹65), Royal Dry Fruit Badam-Kaju-Anjeer (₹80).\nTimings: 09:30 AM - 10:30 PM.'
                    });
                } 
                if (lower.includes('pdf') || lower.includes('download') || lower.includes('document') || lower.includes('rule') || lower.includes('obe')) {
                    matches.push({
                        type: 'Official PDF Links',
                        title: 'Key AIT Official Downloadable PDFs',
                        extractedText: '• AIT Rule Book 2026: https://www.aitpune.com/AITrulebook/AIT-RuleBook-2026.pdf\n• Outcome-Based Education (OBE) Manual: https://www.aitpune.com/Documents/OBE_Manual_20Mar2022.pdf\n• SPPU Academic Calendar: https://www.aitpune.com/AcademicCalendar.aspx\n• Second Term Notice: https://www.aitpune.com/Notices/Commencement of Second Term 2025 - 26.pdf\n• SPPU Hall Ticket Notices: https://www.aitpune.com/Notices/Notice - Collection of Hall Ticket.pdf'
                    });
                }
                if (lower.includes('placements') || lower.includes('t&p') || lower.includes('recruiter') || lower.includes('package')) {
                    matches.push({
                        type: 'Institutional Section',
                        title: 'Placements & T&P Cell',
                        extractedText: '• Placements Portal: https://www.aitpune.com/Placements.aspx\n• Placement Brochure: https://www.aitpune.com/PlacementBrochure.aspx'
                    });
                }
                if (lower.includes('iqac') || lower.includes('naac') || lower.includes('nba') || lower.includes('accreditation')) {
                    matches.push({
                        type: 'Institutional Section',
                        title: 'IQAC & NAAC Reports',
                        extractedText: '• NAAC & NBA Reports: https://www.aitpune.com/NAACReports.aspx\n• Grade: NAAC A Grade & NBA accredited UG courses.'
                    });
                }
                if (lower.includes('alumni') || lower.includes('aitaa')) {
                    matches.push({
                        type: 'Institutional Section',
                        title: 'Alumni Network (AITAA)',
                        extractedText: '• AIT Alumni Portal: https://alumni.aitpune.edu.in/\n• Official AITAA Chapters & Mentorship: https://www.aitpune.com/Alumni.aspx'
                    });
                }
                if (lower.includes('programme') || lower.includes('branch') || lower.includes('department') || lower.includes('etc') || lower.includes('comp') || lower.includes('mech')) {
                    matches.push({
                        type: 'Academic Departments',
                        title: 'AIT Engineering Departments',
                        extractedText: '• E & TC: https://www.aitpune.com/Electronics-and-Telecommunication.aspx\n• Computer Engg: https://www.aitpune.com/Computer-Engg.aspx\n• Information Technology: https://www.aitpune.com/Information-Technology.aspx\n• Mechanical Engg: https://www.aitpune.com/Mechanical-Engg.aspx\n• Automation & Robotics Engg: https://www.aitpune.com/Automation-Robotics-Engg.aspx'
                    });
                }
                if (lower.includes('admission') || lower.includes('jee') || lower.includes('eligibility')) {
                    matches.push({
                        type: 'Institutional Section',
                        title: 'Admissions Desk',
                        extractedText: '• UG Admissions (B.E.): https://www.aitpune.com/Admissions.aspx\n• PG Admissions (M.Tech): https://www.aitpune.com/AdmissionsMEDS.aspx\n• PhD Admissions: https://www.aitpune.com/AdmissionsPhDC.aspx'
                    });
                }
                if (lower.includes('administration') || lower.includes('director') || lower.includes('governing')) {
                    matches.push({
                        type: 'Institutional Section',
                        title: 'Administration & Governance',
                        extractedText: '• Administration Block: https://www.aitpune.com/Administration.aspx\n• Joint Director Corner: https://www.aitpune.com/JtDirector.aspx\n• Grievance Mechanism: https://www.aitpune.com/grievance.aspx'
                    });
                }
            }

            const responseAnswer = matches.length > 0
                ? `Found ${matches.length} matching institutional record(s) for "${queryText}".`
                : `Queried AIT Pune database for "${queryText}". No immediate match, but you can check circulars or ask about mess menus, transit pools, or exam circulars.`;

            db.logChat(queryText, responseAnswer);

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                success: true,
                matches,
                query: queryText
            }));
        } catch (err) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: err.message }));
        }
        return;
    }

    // --- STATIC FILES SERVING ---
    if (pathname === '/' || pathname === '/index.html') {
        const filePath = path.join(__dirname, 'index.html');
        fs.readFile(filePath, (err, content) => {
            if (err) {
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end('Server error loading index.html');
                return;
            }
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(content);
        });
        return;
    }

    // Serve static files in assets/ or root if safe
    if (pathname.startsWith('/assets/')) {
        const safePath = path.normalize(path.join(__dirname, pathname));
        if (safePath.startsWith(path.join(__dirname, 'assets'))) {
            fs.readFile(safePath, (err, content) => {
                if (err) {
                    res.writeHead(404, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Asset not found' }));
                    return;
                }
                const ext = path.extname(safePath).toLowerCase();
                const mimeTypes = {
                    '.jpg': 'image/jpeg',
                    '.jpeg': 'image/jpeg',
                    '.png': 'image/png',
                    '.webp': 'image/webp',
                    '.svg': 'image/svg+xml',
                    '.css': 'text/css',
                    '.js': 'application/javascript'
                };
                res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
                res.end(content);
            });
            return;
        }
    }

    // 404 for other paths
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(PORT, () => {
    console.log(`=========================================`);
    console.log(`  OneStop AIT Server (Antigravity Engine)`);
    console.log(`  Port: http://localhost:${PORT}`);
    console.log(`  Database: SQLite (ait_onestop.db)`);
    console.log(`=========================================`);
});
