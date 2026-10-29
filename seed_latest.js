const { DatabaseSync } = require('node:sqlite');
const path = require('path');

const dbPath = path.join(__dirname, 'ait_onestop.db');
const db = new DatabaseSync(dbPath);

const items = [
  ['Call for Papers – IEEE ICNDIA 2026 (18-19 Sept 2026)', '18-19 Sept 2026', 'Conferences & Events', 'https://www.aitpune.com/LatestNews.aspx', 'IEEE / AIT Research'],
  ['The two-day (18th and 19th Sep 2026) IEEE International Conference ICNDIA-2026 concluded successfully at Army Institute of Technology (AIT), Pune, bringing together experts from academia, industry, defence and research.', 'Sep, 2026', 'Latest News', 'https://www.aitpune.com/LatestNews.aspx', 'IEEE ICNDIA 2026'],
  ['Heartiest congratulations to Dr. Rahul Desai on receiving the prestigious COAS Award!', 'Sep, 2026', 'Latest News', 'https://www.aitpune.com/LatestNews.aspx', 'Army HQ / Directorate'],
  ['Army Institute of Technology, Pune has been recognized among India’s leading institutions in the National Green University Ranking (NGUR) – 2026.', 'Jul, 2026', 'Latest News', 'https://www.aitpune.com/LatestNews.aspx', 'NGUR 2026'],
  ['Avishkar Competition of SPPU 2026 - 27', 'Sep, 2026', 'Academic', 'https://www.aitpune.com/Notices-and-Circulars.aspx', 'SPPU Research Board'],
  ['Allotment of Hostel Accn ME FE STUDENTS 2026-27', 'Aug, 2026', 'Hostel & Mess', 'https://www.aitpune.com/Notices-and-Circulars.aspx', 'Hostel Administration'],
  ['Notice: Remittance of Fees for AY 2026-27', 'May, 2026', 'Administration', 'https://www.aitpune.com/Notices-and-Circulars.aspx', 'Accounts Office'],
  ['RFP -141 - PROCUREMENT OF PLC WITH ANALOG SENSOR INTERACTING', 'Sep, 2026', 'Tenders & Quotations', 'https://www.aitpune.com/Notices-and-Circulars.aspx', 'AIT Purchase Section'],
  ['RFP -140 - PROCUREMENT OF CISCO NETWORK SWITCH FOR AIT', 'Sep, 2026', 'Tenders & Quotations', 'https://www.aitpune.com/Notices-and-Circulars.aspx', 'IT Infrastructure'],
  ['CFQ AUDIT BEST PRACTICES', 'Sep, 2026', 'Tenders & Quotations', 'https://www.aitpune.com/Notices-and-Circulars.aspx', 'Internal Audit Cell'],
  ['CFQ procurement of stationary items for exam sec', 'Sep, 2026', 'Tenders & Quotations', 'https://www.aitpune.com/Notices-and-Circulars.aspx', 'Exam Section'],
  ['CFQ Provisioning of Housekeeping Materials For QEDec2026', 'Sep, 2026', 'Tenders & Quotations', 'https://www.aitpune.com/Notices-and-Circulars.aspx', 'Admin Branch'],
  ['Call for Quotation Procurement of Fire Extinguisher in AIT', 'Aug, 2026', 'Tenders & Quotations', 'https://www.aitpune.com/Notices-and-Circulars.aspx', 'Safety & Security Desk'],
  ['Call for quotation Procurement of UPS Batteries for Server Room', 'Aug, 2026', 'Tenders & Quotations', 'https://www.aitpune.com/Notices-and-Circulars.aspx', 'Server Room / IT Desk'],
  ['RFP-TIG WELDING MACHINE', 'Aug, 2026', 'Tenders & Quotations', 'https://www.aitpune.com/Notices-and-Circulars.aspx', 'Mechanical Workshop'],
  ['RFP - 102 - 2026-27 - RENOVATION OF AR-VR CLUB ROOM', 'Aug, 2026', 'Tenders & Quotations', 'https://www.aitpune.com/Notices-and-Circulars.aspx', 'AR-VR Innovation Lab']
];

const insert = db.prepare('INSERT OR REPLACE INTO notices (title, date, category, link, source) VALUES (?, ?, ?, ?, ?)');
let count = 0;
for (const it of items) {
  insert.run(it[0], it[1], it[2], it[3], it[4]);
  count++;
}
console.log(`Successfully seeded ${count} latest 2026 notices, news and tenders into SQLite!`);

const tenders = db.prepare("SELECT COUNT(*) as count FROM notices WHERE category = 'Tenders & Quotations'").get();
console.log(`Total Tenders in DB: ${tenders.count}`);
const news = db.prepare("SELECT COUNT(*) as count FROM notices WHERE category = 'Latest News'").get();
console.log(`Total Latest News in DB: ${news.count}`);
