// ================================================================
// ຕັ້ງຄ່າການເຊື່ອມຕໍ່ Supabase
// ເອົາຄ່ານີ້ຈາກ Supabase Dashboard → Project Settings → API
//   - "Project URL"      → ໃສ່ໃນ SUPABASE_URL
//   - "anon public" key  → ໃສ່ໃນ SUPABASE_ANON_KEY
// (ໃຊ້ "anon public" key ເທົ່ານັ້ນ, ຫ້າມໃຊ້ "service_role" key ຢູ່ນີ້)
// ================================================================
const SUPABASE_URL = 'https://bxwaeyqzpegraeltnmxr.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ4d2FleXF6cGVncmFlbHRubXhyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODczNzE5MjQsImV4cCI6MjEwMjk0NzkyNH0.BnmgRm4dCJjpv_f5wq_L_6mLPBV4glPu0FMX1Ov8xeg';

// ຄ່າ cache-busting — ເພີ່ມເລກນີ້ 1 ທຸກຄັ້ງທີ່ແກ້ໄຟລ໌ແລ້ວ deploy ໃໝ່
// (ຄືກັນກັບ GoodNote) ເພື່ອບໍ່ໃຫ້ browser ໃຊ້ໄຟລ໌ເກົ່າທີ່ cache ໄວ້
const APP_VERSION = 1;
