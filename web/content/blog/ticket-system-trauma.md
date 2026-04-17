---
uuid: 99887766-5544-3322-1100-aabbccddeeff
title: Riwayat Ticket System Kita yang Penuh Trauma
description: tiga generasi ticket system, makin lama makin absurd. ini bukan cerita sukses. ini cerita bertahan hidup.
date: Thu 17 Apr 20.15
readTime: 4 min read
category: Development
tag: History
author: shinapusu (v32encrypt)
avatar: https://cdn.discordapp.com/avatars/1118453649727823974/28344ca04d18da4a43d483bbd2c870a8.png?size=4096
---

oke jadi dulu sistem beli script kita tuh canggih banget. mau beli? DM admin. udah, gitu aja. sistemnya. seluruh infrastruktur transaksi kita adalah: DM satu orang dan berharap dia lagi melek.

spoiler: dia sering ga melek.

beberapa calon pembeli nunggu 2-3 hari, ga ada balesan, terus cabut. kita baru tau ada masalah pas ada orang yang frustrasi dan nge-ping di general. di depan semua orang. awkward.

oke panik. kita langsung nyari bot ticket di github. ketemu satu yang lumayan, open source, tinggal deploy. "gampang banget kenapa ga dari dulu" kata kita. bot jalan sebulan, bagus. terus suatu hari tiba-tiba error. pas dicek, ternyata owner repo-nya udah archive project-nya tanpa pemberitahuan, dependency-nya udah ga exist, dan ga ada satu pun yang maintain. bot mati di tempat. gg.

oke fine. bikin sendiri. berapa susahnya sih?

jawabannya: cukup susah kalau lo ga pake database. versi pertama buatan sendiri bisa buka ticket, bisa tutup ticket, ada channel-nya sendiri, keliatan pro. tapi state-nya disimpen di memory bot. yang artinya tiap bot restart, semua data ticket langsung amnesia total.

dan kebetulan waktu itu server hosting kita lagi fase "restart adalah lifestyle". bot bisa restart 2-3 kali sehari. orang-orang buka ticket, nunggu, bot restart, channel masih ada di discord, tapi bot udah ga kenal siapa-siapa. "ticket apa? gue ga tau ticket itu. gue baru lahir."

kondisi ini berlangsung lebih lama dari yang seharusnya.

sekarang udah bener pakai postgres. ticket ga ilang, ada status, ada log, history lengkap. kalau bot restart pun semua data masih ada. aman.

moral of the story: pakai database dari awal. jangan tanya kenapa kita ga lakuin itu dari awal.

