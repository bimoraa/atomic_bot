---
uuid: a1b2c3d4-e5f6-7890-abcd-ef1234567890
title: Bot Restart Ke-47 Bulan Ini
description: Iya, bot mati lagi. Bukan salah siapa-siapa. Atau mungkin salah semua orang.
date: Mon 14 Apr 09.00
readTime: 2 min read
category: Incident
tag: Internal
author: shinapusu (v32encrypt)
avatar: https://cdn.discordapp.com/avatars/1118453649727823974/28344ca04d18da4a43d483bbd2c870a8.png?size=4096
---

bot mati lagi jam 3 pagi. entah kenapa selalu jam segitu.

gue lagi tidur, hp bunyi 6 kali. buka mata, ada notif railway "service crashed". tutup hp, tidur lagi. hp bunyi 4 kali lagi. oke fine.

buka laptop, cek log. ada job yang numpuk karena gue lupa nambahin guard buat cek apakah job sebelumnya udah kelar. hasilnya memory naik pelan-pelan sampe meledak.

fix-nya literally satu baris:

```ts
if (job_running) return
```

satu. baris.

udah fix sekarang. bot hidup lagi. gue balik tidur.
