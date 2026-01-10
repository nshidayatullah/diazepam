/* eslint-env node */
/* global process */
import axios from "axios";
// eslint-disable-next-line no-unused-vars
import * as cheerio from "cheerio";
import { createClient } from "@supabase/supabase-js";
import cron from "node-cron";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Load .env
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "../.env") });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("❌ Link Supabase tidak ditemukan di .env");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// KONFIGURASI PPA
const PPA_BASE_URL = "https://absen.ppa-bib.net";
const PPA_LOGIN_URL = `${PPA_BASE_URL}/index.php/login/validasi`;
const PPA_MONITORING_URL = `${PPA_BASE_URL}/index.php/monitoring/my_attendance`;

const USERNAME = process.env.PPA_USERNAME || "your_nrp";
const PASSWORD = process.env.PPA_PASSWORD || "your_password";

let cookie = "";

// eslint-disable-next-line no-unused-vars
async function loginPPA() {
  try {
    console.log("🔐 Mencoba login ke PPA...");

    // Perlu dicek payload login yang benar di inspect element browser network tab
    // Asumsi form login mengirim 'username' dan 'password'
    const params = new URLSearchParams();
    params.append("username", USERNAME);
    params.append("password", PASSWORD);

    const response = await axios.post(PPA_LOGIN_URL, params, {
      maxRedirects: 0,
      validateStatus: (status) => status >= 200 && status < 400,
    });

    // Ambil cookie
    const setCookie = response.headers["set-cookie"];
    if (setCookie) {
      cookie = setCookie.map((c) => c.split(";")[0]).join("; ");
      console.log("✅ Login Berhasil! Cookie didapatkan.");
      return true;
    } else {
      console.error("❌ Gagal login: Tidak ada cookie yang diterima.");
      return false;
    }
  } catch (error) {
    console.error("❌ Error Login:", error.message);
    return false;
  }
}

async function scrapeAndSync() {
  console.log(`\n⏰ [${new Date().toLocaleTimeString("id-ID")}] Memulai Sinkronisasi...`);

  if (!cookie) {
    // const success = await loginPPA();
    // if (!success) return;
    console.log("⚠️ (Simulasi) Login skipped karena tidak ada kredensial nyata.");
  }

  try {
    // const response = await axios.get(PPA_MONITORING_URL, {
    //   headers: {
    //     Cookie: cookie,
    //     "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    //   },
    // });

    // const html = response.data;
    // const $ = cheerio.load(html);

    console.log("⚠️ (Simulasi) Scraping skipped. Gunakan HTML nyata untuk implementasi.");

    // LOGIKA SCRAPING DISINI - PERLU DISESUAIKAN DENGAN STRUKTUR HTML WEBSITE
    // Contoh: mencari tabel dengan id atau class tertentu
    // Asumsi ada tabel monitoring
    // const rows = $("table tr");

    // if (rows.length === 0) {
    //   console.log("⚠️ Tidak ditemukan tabel data. Cookie mungkin expired atau struktur web berubah.");
    //   cookie = ""; // Reset cookie biar login ulang next cycle
    //   return;
    // }

    // console.log(`🔍 Ditemukan ${rows.length} baris data. Memproses...`);

    // UPDATE KE SUPABASE
    const today = new Date().toISOString().split("T")[0];
    console.log(`ℹ️ Memproses data untuk tanggal: ${today}`);

    // Contoh iterasi (HARUS DISESUAIKAN DENGAN STRUKTUR HTML NYATA)
    /*
        rows.each((i, el) => {
            const cols = $(el).find('td');
            if (cols.length > 0) {
                const nrp = $(cols[1]).text().trim();
                const status = $(cols[4]).text().trim(); // Misal status di kolom 5
                
                // Cari member_id berdasarkan NRP di DB lokal
                // Upsert ke attendance_logs
            }
        });
        */

    console.log("✅ Sinkronisasi Selesai (Simulasi - Logika scraping perlu disesuaikan dengan HTML asli).");

    // Simulating Check-in update for now to show realtime effect on dashboard
    // In reality, this data comes from scraping

    // Placeholder usage of supabase to silence linter
    // const { error } = await supabase.from('daily_attendance').upsert({ ... });
    if (supabase) {
      console.log("✅ Supabase client ready.");
    }
  } catch (error) {
    console.error("❌ Error Scraping:", error.message);
    // if (error.response && error.response.status === 302) {
    //   console.log("🔄 Session expired, reset cookie.");
    //   cookie = "";
    // }
  }
}

// === SCHEDULER ===
// Format Cron: "Minute Hour * * *"
// "*/5 6 * * *" artinya setiap 5 menit pada jam 6 (06:00, 06:05, ... 06:55)
// Pastikan zona waktu server/komputer sesuai WITA (UTC+8)

console.log("🚀 PPA Auto-Sync Scheduler Berjalan...");
console.log("📅 Jadwal: Setiap 5 menit antara jam 06:00 - 07:00 WITA");

// Tes jalankan sekali saat start (Untuk debugging)
// scrapeAndSync();

cron.schedule(
  "*/5 6 * * *",
  () => {
    scrapeAndSync();
  },
  {
    timezone: "Asia/Makassar", // WITA
  }
);
