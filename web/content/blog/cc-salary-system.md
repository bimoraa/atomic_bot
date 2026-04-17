---
uuid: c8f3a291-6e4d-4b7a-9f2e-5d1a8c3b7e09
title: Sistem Gaji Content Creator
description: Mulai 20 April, setiap Content Creator yang ngajak member beli script akan otomatis menerima komisi Rp 2.500 per transaksi. Ini adalah pertama kalinya CC dibayar.
date: Sat 18 Apr 04.13
readTime: 8 min read
category: Management
tag: Development
author: shinapusu (v32encrypt)
avatar: https://cdn.discordapp.com/avatars/1118453649727823974/28344ca04d18da4a43d483bbd2c870a8.png?size=4096
---

Mulai 20 April, setiap CC yang berhasil ngajak member beli script bakal otomatis dapet komisi Rp 2.500 per transaksi. Tidak perlu laporan manual, tidak perlu ngejar siapapun. Dan ini pertama kalinya CC dibayar di server ini.

---

## Kenapa baru sekarang?

Jujur aja, sebelumnya tidak ada sistem gaji untuk CC sama sekali. CC ngajak orang masuk, orang itu beli, tapi CC tidak dapat apa-apa. Kita tahu itu tidak adil, hanya saja tidak ada yang pernah bikin sistemnya.

Tidak ada yang komplain karena tidak ada yang tahu seharusnya ada sistem. Baru waktu kita mulai mikir "harusnya CC dikasih sesuatu" kita sadar tidak ada cara untuk ngitungnya. Siapa yang ngajak siapa? Tidak ada data. Tidak pernah dicatat.

Jadi ya, dibangun dari nol sekalian.

---

## 1. Tracking invite member

Setiap ada user baru bergabung ke server, bot langsung ngecek: link invite mana yang dipakai? Siapa yang bikin link itu? Kalau pembuatnya punya role CC, relasi itu langsung disimpan sebagai "user ini dibawa oleh CC ini."

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

CC tidak perlu melakukan apa-apa, tracking jalan otomatis di background. Kita sengaja tidak mengecek eligibility CC pada saat join karena status CC bisa berubah kapan saja. Lebih aman dicek langsung di momen pembayaran.

---

## 2. Alur komisi pembayaran

Setiap admin menyetujui pembayaran, sistem langsung ngecek apakah ada CC yang ngajak pembeli tersebut.

Kalau ada dan CC-nya masih aktif (masih punya rolenya), Rp 2.500 langsung masuk ke saldo mereka dan kejadiannya dicatat. Kalau rolenya sudah dicabut, tidak ada komisi yang keluar. Simpel.

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

Setiap komisi disimpan dengan referensi ke transaksi yang memicunya. Jadi kalau ada CC yang nanya "kok saldo saya segini?", kita bisa trace setiap Rp 2.500 balik ke pembelian spesifiknya.

Kita pilih flat rate daripada persentase karena harga script sudah standar, dan flat rate jauh lebih gampang dijelaskan ke semua pihak.

---

## 3. Panel CC

CC bisa akses semuanya lewat panel tombol di channel khusus. Tidak ada slash command yang perlu dihafalkan, cukup tekan tombol.

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

Cek Penghasilan — menampilkan saldo saat ini, total yang pernah diterima, dan jumlah invite. Satu layar, tidak perlu buka spreadsheet.

Ambil Invite Link — klik sekali, dapat link personal. Bot membuat link permanen yang terikat ke akun, jadi setiap kali tombol ini ditekan selalu menghasilkan link yang sama. Tidak ada expiry, aman dipasang di konten tanpa khawatir link mati keesokan harinya.

Lihat Log Invite — daftar siapa saja yang bergabung lewat link CC, lengkap dengan info apakah mereka sudah beli. Berguna untuk lihat conversion rate yang sebenarnya, bukan sekadar angka invite.

Semua respons bersifat ephemeral, hanya terlihat oleh CC yang bersangkutan.

---

## 4. Command manager

Manager punya command group `/cc-salary` untuk keperluan administratif.

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

`check` — lihat saldo dan statistik CC manapun. Berguna saat ada dispute atau kasus support yang perlu konfirmasi data.

`add` — tambah komisi manual untuk kasus referral yang terjadi di luar sistem, misalnya via DM atau media sosial. Tercatat di log dengan tag `manual` supaya bisa dibedakan dari yang otomatis.

`reset` — nol-in saldo CC setelah transfer dikonfirmasi sudah dikirim. Selalu dilakukan manual oleh manager, tidak pernah otomatis. (Karena otomatis itu scary.)

`withdraw` — catat pencairan sebagai selesai beserta referensi transaksinya. CC langsung dapat notifikasi setelah prosesnya beres.

`log` — seluruh riwayat aktivitas saldo CC: setiap komisi masuk, tambahan manual, pencairan, semua ada timestamp-nya.

`leaderboard` — peringkat CC berdasarkan total penghasilan. Reset setiap bulan, top 3 dapat shoutout di channel announcements.

---

## Bagaimana data disimpan

Semua data tersimpan di PostgreSQL dalam tiga tabel:

- `cc_invites` — relasi siapa ngajak siapa. Tidak pernah dihapus meskipun user sudah keluar dari server, karena mereka bisa balik kapan saja.
- `cc_salary` — satu baris per CC, berisi saldo aktif dan total lifetime earning.
- `cc_salary_log` — log append-only untuk seluruh aktivitas saldo. Tidak ada yang diedit atau dihapus di sini. Ini audit trail-nya.

Bot tidak pernah membaca cache member atau role Discord karena cache-nya memang dinonaktifkan untuk efisiensi memori. Setiap pengecekan role menggunakan REST fetch langsung, jadi datanya selalu akurat meskipun bot baru saja restart.

---

Sistem ini aktif mulai 20 April. Kalau ada pertanyaan soal cara kerja invite atau proses pencairan, tanyakan di channel CC sebelum tanggal tersebut.

---

Sistem ini aktif mulai 20 April. Jika ada pertanyaan terkait cara kerja invite atau proses pencairan, silakan tanyakan di channel CC sebelum tanggal tersebut.



