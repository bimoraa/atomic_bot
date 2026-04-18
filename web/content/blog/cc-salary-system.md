---
uuid: c8f3a291-6e4d-4b7a-9f2e-5d1a8c3b7e09
title: Sistem Gaji Content Creator
description: Mulai 20 April, setiap Content Creator yang ngajak member beli script bakal otomatis dapet komisi Rp 2.500 per transaksi. Ini pertama kalinya CC dibayar di server ini.
date: Sat 18 Apr 04.13
readTime: 8 min read
category: Management
tag: Development
author: shinapusu (v32encrypt)
avatar: https://cdn.discordapp.com/avatars/1118453649727823974/28344ca04d18da4a43d483bbd2c870a8.png?size=4096
---

Mulai 20 April, setiap CC yang berhasil ngajak member beli script bakal otomatis dapet komisi Rp 2.500 per transaksi. Ga perlu laporan manual, ga perlu ngejar siapa-siapa. Dan ini pertama kalinya CC dibayar di server ini.

---

## Kenapa baru sekarang?

Jujur aja, sebelumnya memang ga ada sistem gaji untuk CC sama sekali. CC ngajak orang masuk, orang itu beli, tapi CC ga dapet apa-apa. Kita tau itu ga adil, cuma ya... ga ada yang pernah bikin sistemnya.

Ga ada yang komplain juga, karena ga ada yang sadar harusnya ada sistem. Baru pas kita kepikiran "harusnya CC dikasih sesuatu", baru kerasa — kita bahkan ga punya cara buat ngitungnya.

Siapa ngajak siapa? Ga ada data. Ga pernah dicatat.

Jadi sekalian dibangun dari nol.

---

## 1. Tracking invite member

Setiap ada user baru join, bot langsung ngecek: dia masuk pake invite siapa? Siapa yang bikin link itu? Kalau pembuatnya punya role CC, relasi itu langsung disimpan.

```mermaid
flowchart TD
  A["CC bikin invite link"] --> B["User join pakai link CC"]
  B --> C{"Yang ngundang punya role CC?"}
  C -->|Ya| D["Simpen ke cc_invites DB"]
  C -->|Tidak| E["Skip — bukan CC"]
  D --> F["Tambah invite count CC"]

  style A fill:#5865F2,stroke:#4752C4,color:#fff
  style B fill:#3BA55D,stroke:#2D7D46,color:#fff
  style C fill:#FAA61A,stroke:#C7850F,color:#fff
  style D fill:#5865F2,stroke:#4752C4,color:#fff
  style E fill:#ED4245,stroke:#C73638,color:#fff
  style F fill:#3BA55D,stroke:#2D7D46,color:#fff
```

CC ga perlu ngapa-ngapain, semua jalan otomatis di background.

Kita sengaja ga ngecek eligibility CC saat join, karena role bisa berubah kapan aja. Lebih aman dicek pas momen pembayaran.

---

## 2. Alur komisi pembayaran

Setiap admin approve pembayaran, sistem langsung ngecek apakah ada CC yang ngajak buyer tersebut.

Kalau ada dan CC-nya masih aktif, Rp 2.500 langsung masuk ke saldo mereka dan dicatat. Kalau role-nya udah dicabut, ya ga dapet komisi. Simpel.

```mermaid
flowchart TD
  A["Admin approve pembayaran"] --> B["Cek cc_invites: siapa yang ngajak buyer?"]
  B --> C{"Ketemu invite CC?"}
  C -->|Ya| D{"CC masih punya role CC?"}
  C -->|Tidak| E["Ga ada komisi — skip"]
  D -->|Ya| F["Tambah Rp 2.500 ke cc_salary"]
  D -->|Tidak| G["Skip — role udah dicabut"]
  F --> H["Catat ke cc_salary_log"]

  style A fill:#5865F2,stroke:#4752C4,color:#fff
  style B fill:#FAA61A,stroke:#C7850F,color:#fff
  style C fill:#FAA61A,stroke:#C7850F,color:#fff
  style D fill:#FAA61A,stroke:#C7850F,color:#fff
  style E fill:#ED4245,stroke:#C73638,color:#fff
  style F fill:#3BA55D,stroke:#2D7D46,color:#fff
  style G fill:#ED4245,stroke:#C73638,color:#fff
  style H fill:#5865F2,stroke:#4752C4,color:#fff
```

Setiap komisi punya referensi ke transaksi yang memicunya. Jadi kalau ada CC nanya “kok saldo saya segini?”, semuanya bisa ditrace.

Kita pake flat rate, bukan persentase. Soalnya harga script udah standar, dan ini jauh lebih gampang dijelasin ke semua orang.

---

## 3. Panel CC

Semua akses CC ada di panel tombol. Ga ada slash command ribet, tinggal klik.

```mermaid
flowchart LR
  A["Panel CC"] --> B["Cek Penghasilan"]
  A --> C["Ambil Invite Link"]
  A --> D["Lihat Log Invite"]
  B --> E["Saldo, total earned, stats"]
  C --> F["Buat atau ambil link personal"]
  D --> G["Daftar user yang join via CC"]

  style A fill:#5865F2,stroke:#4752C4,color:#fff
  style B fill:#3BA55D,stroke:#2D7D46,color:#fff
  style C fill:#3BA55D,stroke:#2D7D46,color:#fff
  style D fill:#3BA55D,stroke:#2D7D46,color:#fff
  style E fill:#111118,stroke:#2a2a35,color:#aaa
  style F fill:#111118,stroke:#2a2a35,color:#aaa
  style G fill:#111118,stroke:#2a2a35,color:#aaa
```

**Cek Penghasilan** — saldo sekarang, total earning, dan jumlah invite. Satu layar, beres.

**Ambil Invite Link** — klik sekali, dapet link personal. Permanen, ga ada expiry.

**Lihat Log Invite** — lihat siapa aja yang join lewat link CC + siapa yang udah beli. Bisa langsung keliatan conversion rate real.

Semua response ephemeral — cuma kelihatan ke CC itu sendiri.

---

## 4. Command manager

Manager punya `/cc-salary` buat handle semuanya.

```mermaid
flowchart LR
  A["/cc-salary"] --> B["check — lihat penghasilan CC"]
  A --> C["add — tambah saldo manual"]
  A --> D["reset — reset saldo ke 0"]
  A --> E["withdraw — proses pencairan"]
  A --> F["log — lihat histori saldo"]
  A --> G["leaderboard — ranking CC"]

  style A fill:#5865F2,stroke:#4752C4,color:#fff
  style B fill:#3BA55D,stroke:#2D7D46,color:#fff
  style C fill:#FAA61A,stroke:#C7850F,color:#fff
  style D fill:#ED4245,stroke:#C73638,color:#fff
  style E fill:#FAA61A,stroke:#C7850F,color:#fff
  style F fill:#5865F2,stroke:#4752C4,color:#fff
  style G fill:#3BA55D,stroke:#2D7D46,color:#fff
```

`check` — cek saldo & stats CC mana aja.

`add` — tambah komisi manual (misalnya dari DM / luar sistem). Ditandai `manual` di log.

`reset` — nol-in saldo setelah payout. Manual, ga pernah otomatis.

`withdraw` — catat pencairan + kirim notifikasi ke CC.

`log` — histori lengkap semua transaksi saldo.

`leaderboard` — ranking CC berdasarkan earning. Reset tiap bulan.

---

## Bagaimana data disimpan

Semua data disimpan di PostgreSQL:

* `cc_invites` — siapa ngajak siapa (ga pernah dihapus)
* `cc_salary` — saldo aktif + total earning
* `cc_salary_log` — semua histori (append-only, ga pernah diedit)

Bot ga pake cache member/role Discord (sengaja dimatiin buat hemat memori). Semua pengecekan role pakai REST fetch langsung, jadi selalu akurat walaupun bot restart.

---

Sistem ini aktif mulai 20 April. Kalau ada pertanyaan terkait cara kerja invite atau proses pencairan, langsung tanyakan di channel CC sebelum tanggal tersebut.

