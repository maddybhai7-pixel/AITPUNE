const { DatabaseSync } = require('node:sqlite');
const path = require('path');

const DB_PATH = path.join(__dirname, 'ait_onestop.db');
const db = new DatabaseSync(DB_PATH);

// Enable WAL mode for high concurrency
db.exec('PRAGMA journal_mode = WAL;');

// Initialize Database Schema
function initDatabase() {
    db.exec(`
        CREATE TABLE IF NOT EXISTS notices (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL UNIQUE,
            date TEXT,
            category TEXT DEFAULT 'General',
            link TEXT DEFAULT 'https://www.aitpune.com/Notices-and-Circulars.aspx',
            source TEXT DEFAULT 'Official AIT Portal',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS transit_pools (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            creator_name TEXT NOT NULL,
            origin TEXT NOT NULL,
            destination TEXT NOT NULL,
            departure_time TEXT NOT NULL,
            total_seats INTEGER NOT NULL,
            available_seats INTEGER NOT NULL,
            contact_info TEXT,
            riders TEXT DEFAULT '[]',
            vehicle_type TEXT DEFAULT 'Cab / Auto',
            status TEXT DEFAULT 'active',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS mess_menu (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            mess_name TEXT NOT NULL,
            day TEXT NOT NULL,
            meal_type TEXT NOT NULL,
            items TEXT NOT NULL,
            diet_type TEXT DEFAULT 'High-Protein & Balanced'
        );

        CREATE TABLE IF NOT EXISTS mess_ratings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            mess_name TEXT NOT NULL,
            meal_type TEXT NOT NULL,
            rating INTEGER NOT NULL,
            comment TEXT,
            author TEXT DEFAULT 'Cadet',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS chat_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            query TEXT NOT NULL,
            response TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    `);

    seedInitialData();
}

function seedInitialData() {
    // Seed initial notices if table is empty
    const countNotices = db.prepare('SELECT COUNT(*) as count FROM notices').get().count;
    if (countNotices === 0) {
        const insertNotice = db.prepare(`
            INSERT OR IGNORE INTO notices (title, date, category, link, source)
            VALUES (?, ?, ?, ?, ?)
        `);

        const defaultNotices = [
            // Latest News & Conferences 2026
            ["Call for Papers – IEEE ICNDIA 2026 (18-19 Sept 2026)", "18-19 Sept 2026", "Conferences & Events", "https://www.aitpune.com/LatestNews.aspx", "IEEE / AIT Research"],
            ["The two-day (18th and 19th Sep 2026) IEEE International Conference ICNDIA-2026 concluded successfully at Army Institute of Technology (AIT), Pune, bringing together experts from academia, industry, defence and research.", "Sep, 2026", "Latest News", "https://www.aitpune.com/LatestNews.aspx", "IEEE ICNDIA 2026"],
            ["Heartiest congratulations to Dr. Rahul Desai on receiving the prestigious COAS Award!", "Sep, 2026", "Latest News", "https://www.aitpune.com/LatestNews.aspx", "Army HQ / Directorate"],
            ["Army Institute of Technology, Pune has been recognized among India’s leading institutions in the National Green University Ranking (NGUR) – 2026.", "Jul, 2026", "Latest News", "https://www.aitpune.com/LatestNews.aspx", "NGUR 2026"],

            // Latest Notices & Circulars 2026
            ["Avishkar Competition of SPPU 2026 - 27", "Sep, 2026", "Academic", "https://www.aitpune.com/Notices-and-Circulars.aspx", "SPPU Research Board"],
            ["Allotment of Hostel Accn ME FE STUDENTS 2026-27", "Aug, 2026", "Hostel & Mess", "https://www.aitpune.com/Notices-and-Circulars.aspx", "Hostel Administration"],
            ["Notice: Remittance of Fees for AY 2026-27", "May, 2026", "Administration", "https://www.aitpune.com/Notices-and-Circulars.aspx", "Accounts Office"],

            // Latest Tenders / Quotations (RFPs & CFQs) 2026
            ["RFP -141 - PROCUREMENT OF PLC WITH ANALOG SENSOR INTERACTING", "Sep, 2026", "Tenders & Quotations", "https://www.aitpune.com/Notices-and-Circulars.aspx", "AIT Purchase Section"],
            ["RFP -140 - PROCUREMENT OF CISCO NETWORK SWITCH FOR AIT", "Sep, 2026", "Tenders & Quotations", "https://www.aitpune.com/Notices-and-Circulars.aspx", "IT Infrastructure"],
            ["CFQ AUDIT BEST PRACTICES", "Sep, 2026", "Tenders & Quotations", "https://www.aitpune.com/Notices-and-Circulars.aspx", "Internal Audit Cell"],
            ["CFQ procurement of stationary items for exam sec", "Sep, 2026", "Tenders & Quotations", "https://www.aitpune.com/Notices-and-Circulars.aspx", "Exam Section"],
            ["CFQ Provisioning of Housekeeping Materials For QEDec2026", "Sep, 2026", "Tenders & Quotations", "https://www.aitpune.com/Notices-and-Circulars.aspx", "Admin Branch"],
            ["Call for Quotation Procurement of Fire Extinguisher in AIT", "Aug, 2026", "Tenders & Quotations", "https://www.aitpune.com/Notices-and-Circulars.aspx", "Safety & Security Desk"],
            ["Call for quotation Procurement of UPS Batteries for Server Room", "Aug, 2026", "Tenders & Quotations", "https://www.aitpune.com/Notices-and-Circulars.aspx", "Server Room / IT Desk"],
            ["RFP-TIG WELDING MACHINE", "Aug, 2026", "Tenders & Quotations", "https://www.aitpune.com/Notices-and-Circulars.aspx", "Mechanical Workshop"],
            ["RFP - 102 - 2026-27 - RENOVATION OF AR-VR CLUB ROOM", "Aug, 2026", "Tenders & Quotations", "https://www.aitpune.com/Notices-and-Circulars.aspx", "AR-VR Innovation Lab"],

            // Core Institutional Notices
            ["Notice: TE Migration (2026-27)", "Aug, 2026", "Academic", "https://www.aitpune.com/Notices-and-Circulars.aspx", "AIT Portal"],
            ["Notice: SSB Training Area & Cadet Preparations", "May, 2026", "Training & Placement", "https://www.aitpune.com/Notices-and-Circulars.aspx", "AIT Portal"],
            ["Notice: Hostel Accn: Instructions for SE, TE & BE Students - AY 2025-26", "May, 2026", "Hostel & Mess", "https://www.aitpune.com/Notices-and-Circulars.aspx", "AIT Portal"],
            ["Notice: SE (2024 Pattern) SPPU Theory End Sem Exam Time Tables", "May, 2026", "Exams", "https://www.aitpune.com/Notices-and-Circulars.aspx", "SPPU Examination"],
            ["Notice: SPPU Circular No 389/2026 Postponement of Examination", "May, 2026", "Exams", "https://www.aitpune.com/Notices-and-Circulars.aspx", "SPPU Examination"],
            ["Notice: Student Railway Concession Guidelines for Vacations", "Apr, 2026", "Student Welfare", "https://www.aitpune.com/Notices-and-Circulars.aspx", "AIT Portal"],
            ["Notice: Reading Hall Timings & Library Extensions", "May, 2026", "Facilities", "https://www.aitpune.com/Notices-and-Circulars.aspx", "AIT Central Library"],
            ["Notice: AIT Code of Conduct and Student Dress Code Guidelines", "May, 2026", "Administration", "https://www.aitpune.com/Notices-and-Circulars.aspx", "Directorate"],
            ["Notice: Solutions 2026 Annual Technical Symposium and Hackathon", "Apr, 2026", "Clubs & Events", "https://www.aitnexus.in/", "NEXUS Tech Board"]
        ];

        for (const n of defaultNotices) {
            insertNotice.run(n[0], n[1], n[2], n[3], n[4]);
        }
    }

    // Seed initial transit pools if empty
    const countPools = db.prepare('SELECT COUNT(*) as count FROM transit_pools').get().count;
    if (countPools === 0) {
        const insertPool = db.prepare(`
            INSERT INTO transit_pools (creator_name, origin, destination, departure_time, total_seats, available_seats, contact_info, riders, vehicle_type)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        insertPool.run("Cadet Rohan (BE Comp)", "AIT Main Gate", "Pune Railway Station", "Today, 18:30", 4, 2, "+91 98765 43210", JSON.stringify(["Rohan", "Vikram"]), "Uber XL Cab");
        insertPool.run("Cadet Priya (TE IT)", "Dighi Hills (Gate 2)", "Pune Airport (PNQ)", "Tomorrow, 06:00", 3, 1, "+91 98234 56789", JSON.stringify(["Priya", "Ananya"]), "Shared Auto");
        insertPool.run("Cadet Aman (SE Mech)", "AIT Gate", "Phoenix Marketcity (Viman Nagar)", "Saturday, 16:00", 4, 3, "+91 97111 22334", JSON.stringify(["Aman"]), "Ola Sedan");
    }

    // Seed mess menus if empty
    const countMess = db.prepare('SELECT COUNT(*) as count FROM mess_menu').get().count;
    if (countMess === 0) {
        const insertMenu = db.prepare(`
            INSERT INTO mess_menu (mess_name, day, meal_type, items, diet_type)
            VALUES (?, ?, ?, ?, ?)
        `);

        const menus = [
            // Thapa Mess (1st & 4th Year)
            ["Thapa Mess", "Today", "Breakfast", "Poha, Boiled Eggs (2x), Sprouts, Banana, Tea/Coffee, Milk with Bournvita", "High-Protein & Energy"],
            ["Thapa Mess", "Today", "Lunch", "Paneer Butter Masala / Chicken Curry, Dal Tadka, Jeera Rice, Tawa Roti, Green Salad, Gulab Jamun", "Full Cadet Meal"],
            ["Thapa Mess", "Today", "Snacks", "Samosa / Veg Cutlet, Mint Chutney, Hot Ginger Tea & Biscuits", "Evening Refreshment"],
            ["Thapa Mess", "Today", "Dinner", "Egg Curry / Soya Chaap Masala, Dal Fry, Steamed Rice, Phulkas, Fresh Curd, Seasonal Fruit", "High Protein & Light"],

            // Kanika Mess (2nd & 3rd Year)
            ["Kanika Mess", "Today", "Breakfast", "Masala Idli & Medu Vada, Coconut Chutney, Sambar, Boiled Eggs, Tea/Coffee, Milk", "High-Protein South Indian"],
            ["Kanika Mess", "Today", "Lunch", "Rajma Masala, Aloo Gobi Matar, Phulkas, Steamed Basmati Rice, Boondi Raita, Moong Dal Halwa", "Balanced Nutrition"],
            ["Kanika Mess", "Today", "Snacks", "Pav Bhaji with butter toasted pav, Hot Tea / Filter Coffee", "Street Style Refreshment"],
            ["Kanika Mess", "Today", "Dinner", "Kadai Chicken / Malai Kofta, Yellow Dal, Paratha, Steamed Rice, Homemade Curd, Ice Cream", "Special Cadet Dinner"]
        ];

        for (const m of menus) {
            insertMenu.run(m[0], m[1], m[2], m[3], m[4]);
        }
    }

    // Seed sample reviews if empty
    const countRatings = db.prepare('SELECT COUNT(*) as count FROM mess_ratings').get().count;
    if (countRatings === 0) {
        const insertRating = db.prepare(`
            INSERT INTO mess_ratings (mess_name, meal_type, rating, comment, author)
            VALUES (?, ?, ?, ?, ?)
        `);
        insertRating.run("Thapa Mess", "Lunch", 5, "Chicken curry was tender and well spiced. High protein line was great!", "Cadet Sahil (TE E&TC)");
        insertRating.run("Kanika Mess", "Breakfast", 4, "Hot crispy Medu Vadas with coconut chutney tasted super fresh.", "Cadet Shreya (SE IT)");
    }
}

initDatabase();

module.exports = {
    db,

    // Notices queries
    getNotices(search = '', category = '', pdfOnly = false) {
        let sql = 'SELECT * FROM notices WHERE 1=1';
        const params = [];

        if (pdfOnly) {
            sql += " AND link LIKE '%.pdf%'";
        }
        if (search) {
            sql += ' AND (title LIKE ? OR category LIKE ?)';
            params.push(`%${search}%`, `%${search}%`);
        }
        if (category && category !== 'All') {
            sql += ' AND category = ?';
            params.push(category);
        }
        sql += ' ORDER BY id DESC LIMIT 60';
        return db.prepare(sql).all(...params);
    },

    insertNotice(title, date, category, link, source) {
        const stmt = db.prepare(`
            INSERT OR IGNORE INTO notices (title, date, category, link, source)
            VALUES (?, ?, ?, ?, ?)
        `);
        return stmt.run(title, date || 'Recent', category || 'General', link || 'https://www.aitpune.com/Notices-and-Circulars.aspx', source || 'Official Scraper');
    },

    // Transit Pool queries
    getPools() {
        return db.prepare("SELECT * FROM transit_pools WHERE status = 'active' ORDER BY id DESC").all();
    },

    createPool(creator_name, origin, destination, departure_time, total_seats, contact_info, vehicle_type) {
        const stmt = db.prepare(`
            INSERT INTO transit_pools (creator_name, origin, destination, departure_time, total_seats, available_seats, contact_info, riders, vehicle_type)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        const ridersJson = JSON.stringify([creator_name]);
        const avail = Math.max(0, parseInt(total_seats) - 1);
        return stmt.run(creator_name, origin, destination, departure_time, parseInt(total_seats), avail, contact_info, ridersJson, vehicle_type || 'Cab');
    },

    joinPool(poolId, cadetName) {
        const pool = db.prepare('SELECT * FROM transit_pools WHERE id = ?').get(poolId);
        if (!pool) throw new Error('Pool not found');
        if (pool.available_seats <= 0) throw new Error('No seats available in this pool');

        let riders = [];
        try { riders = JSON.parse(pool.riders || '[]'); } catch (e) { riders = []; }
        if (!riders.includes(cadetName)) {
            riders.push(cadetName);
        }

        const newAvail = pool.available_seats - 1;
        const updateStmt = db.prepare(`
            UPDATE transit_pools 
            SET available_seats = ?, riders = ?, status = CASE WHEN ? = 0 THEN 'full' ELSE 'active' END
            WHERE id = ?
        `);
        updateStmt.run(newAvail, JSON.stringify(riders), newAvail, poolId);
        return { success: true, newAvail, riders };
    },

    // Mess Queries
    getMessMenu(messName = 'Thapa Mess') {
        const menu = db.prepare('SELECT * FROM mess_menu WHERE mess_name = ?').all(messName);
        const ratings = db.prepare('SELECT * FROM mess_ratings WHERE mess_name = ? ORDER BY id DESC LIMIT 5').all(messName);
        const avgRow = db.prepare('SELECT AVG(rating) as avgRating, COUNT(*) as count FROM mess_ratings WHERE mess_name = ?').get(messName);

        return {
            messName,
            menu,
            ratings,
            avgRating: avgRow.avgRating ? Number(avgRow.avgRating).toFixed(1) : '4.5',
            ratingCount: avgRow.count || 0
        };
    },

    addMessRating(messName, mealType, rating, comment, author) {
        const stmt = db.prepare(`
            INSERT INTO mess_ratings (mess_name, meal_type, rating, comment, author)
            VALUES (?, ?, ?, ?, ?)
        `);
        return stmt.run(messName, mealType, parseInt(rating), comment || '', author || 'Cadet');
    },

    // Smart Campus Search (AIT-GPT)
    searchCampusKnowledge(query) {
        const cleanQuery = (query || '').toLowerCase().trim();
        const words = cleanQuery.split(/\s+/).filter(w => w.length > 2);

        // 1. Search Notices
        let noticeResults = [];
        const isPdfQuery = cleanQuery.includes('pdf') || cleanQuery.includes('download') || cleanQuery.includes('form') || cleanQuery.includes('rule');
        if (words.length > 0) {
            let conditions = words.map(() => 'title LIKE ?').join(' OR ');
            let sql = `SELECT * FROM notices WHERE (${conditions})`;
            if (isPdfQuery) {
                sql += " AND link LIKE '%.pdf%'";
            }
            sql += " ORDER BY CASE WHEN link LIKE '%.pdf%' THEN 0 ELSE 1 END, id DESC LIMIT 6";
            const params = words.map(w => `%${w}%`);
            noticeResults = db.prepare(sql).all(...params);
        } else if (isPdfQuery) {
            noticeResults = db.prepare("SELECT * FROM notices WHERE link LIKE '%.pdf%' ORDER BY id DESC LIMIT 6").all();
        }

        // 2. Search Mess
        const messResults = db.prepare(`
            SELECT * FROM mess_menu 
            WHERE items LIKE ? OR meal_type LIKE ? OR mess_name LIKE ?
        `).all(`%${cleanQuery}%`, `%${cleanQuery}%`, `%${cleanQuery}%`);

        // 3. Search Active Transit Pools
        const poolResults = db.prepare(`
            SELECT * FROM transit_pools 
            WHERE destination LIKE ? OR origin LIKE ?
        `).all(`%${cleanQuery}%`, `%${cleanQuery}%`);

        return {
            notices: noticeResults,
            mess: messResults,
            pools: poolResults
        };
    },

    logChat(query, response) {
        try {
            db.prepare('INSERT INTO chat_logs (query, response) VALUES (?, ?)').run(query, response);
        } catch (e) {
            console.error('Failed to log chat', e);
        }
    }
};
