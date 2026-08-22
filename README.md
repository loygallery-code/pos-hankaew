# ຄູ່ມືການຕັ້ງຄ່າ — ລະບົບຂາຍເຄື່ອງ &amp; ສາງ (ຮ້ານເອື້ອຍ)

ເຮັດຕາມລຳດັບ 4 ຂັ້ນຕອນນີ້. ໃຊ້ເວລາປະມານ 20-30 ນາທີ.

## ຂັ້ນຕອນ 1 — ສ້າງ Supabase project

1. ໄປທີ່ https://supabase.com → ສະໝັກ/ເຂົ້າສູ່ລະບົບ
2. ກົດ **New project** → ຕັ້ງຊື່ (ເຊັ່ນ `pos-hankaew`) → ຕັ້ງລະຫັດຜ່ານ database (ຈົດເກັບໄວ້) → ເລືອກ Region ໃກ້ (Singapore)
3. ລໍຖ້າປະມານ 1-2 ນາທີໃຫ້ project ສ້າງແລ້ວສຳເລັດ
4. ໄປທີ່ເມນູຊ້າຍ **SQL Editor** → ກົດ **New query**
5. ເປີດໄຟລ໌ `sql/setup.sql` ໃນໂຟນເດີນີ້ → copy ເນື້ອຫາທັງໝົດ → paste ໃສ່ໃນ SQL Editor → ກົດ **Run**
6. ຖ້າຂຶ້ນ "Success" ແມ່ນສຳເລັດ — ຕາຕະລາງ ແລະ ຂໍ້ມູນຕົວຢ່າງຖືກສ້າງແລ້ວ

## ຂັ້ນຕອນ 2 — ເອົາ API keys

1. ໄປທີ່ **Project Settings** (ໄອຄອນເຟືອງ) → **API**
2. Copy ຄ່າ **Project URL** ແລະ **anon public** key
3. ເປີດໄຟລ໌ `assets/config.js` ໃນນີ້ → ວາງແທນທີ່ `SUPABASE_URL` ແລະ `SUPABASE_ANON_KEY`

## ຂັ້ນຕອນ 3 — ອັບໂຫຼດຂຶ້ນ GitHub

1. ໄປທີ່ https://github.com → ກົດ **New repository** → ຕັ້ງຊື່ (ເຊັ່ນ `pos-hankaew`) → Create
2. ອັບໂຫຼດໄຟລ໌ທັງໝົດໃນໂຟນເດີນີ້ (ລວມທັງໂຟນເດີ `assets/` ແລະ `sql/`) ຂຶ້ນ repo
   - ວິທີງ່າຍສຸດ: ໜ້າ repo → **Add file → Upload files** → ລາກໄຟລ໌ທັງໝົດເຂົ້າໄປ → Commit

## ຂັ້ນຕອນ 4 — ເຊື່ອມ Cloudflare Pages

1. ໄປທີ່ https://dash.cloudflare.com → ເມນູຊ້າຍ **Workers & Pages** → **Create** → ແທັບ **Pages** → **Connect to Git**
2. ເລືອກ repo `pos-hankaew` ທີ່ຫາກໍ່ສ້າງ
3. ຕັ້ງຄ່າ build:
   - **Build command**: ປະຫວ່າງໄວ້ (ບໍ່ຕ້ອງໃສ່)
   - **Build output directory**: `/`
4. ກົດ **Save and Deploy** → ລໍຖ້າ 1-2 ນາທີ
5. ຈະໄດ້ URL ແບບ `pos-hankaew.pages.dev` — ເປີດເບິ່ງ, ໃສ່ PIN `1234` (ປ່ຽນໄດ້ພາຍຫຼັງໃນໜ້າ "ຕັ້ງຄ່າ")
6. (ທາງເລືອກ) ຕໍ່ domain ຂອງເຈົ້າເອງ ໃນ Cloudflare Pages → **Custom domains**

## ການອັບເດດລະບົບໃນອະນາຄົດ

ທຸກຄັ້ງທີ່ຂ້ອຍແກ້ໄຂໄຟລ໌ໃຫ້ ພຽງແຕ່ອັບໂຫຼດໄຟລ໌ໃໝ່ຂຶ້ນ GitHub repo ດຽວກັນ (ຫຼືໃຊ້ `git push`) — Cloudflare Pages ຈະ deploy ໃໝ່ອັດຕະໂນມັດພາຍໃນ 1-2 ນາທີ.

## ຂໍ້ຄວນຮູ້ດ້ານຄວາມປອດໄພ

ລະບົບນີ້ໃຊ້ PIN screen ປ້ອງກັນ (ຄືກັນກັບ debt-tracker) ບໍ່ໄດ້ໃຊ້ລະບົບ login ຈິງຂອງ Supabase — ເໝາະສຳລັບໃຊ້ພາຍໃນຮ້ານ. ຖ້າວັນໃດຢາກຂາຍລະບົບນີ້ເປັນ SaaS ໃຫ້ຮ້ານອື່ນ (ຫຼາຍຮ້ານໃຊ້ຮ່ວມ project ດຽວ) ຄວນປ່ຽນມາໃຊ້ Supabase Auth + ແຍກຂໍ້ມູນແຕ່ລະຮ້ານດ້ວຍ RLS ແທ້ໆ — ແຈ້ງໄດ້ເມື່ອພ້ອມ ຈະຊ່ວຍອອກແບບຂັ້ນຕອນນັ້ນຕໍ່.
