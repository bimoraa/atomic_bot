/*
 * Atomicals Bot for Discord
 * Copyright (C) 2026 Atomicals LancarJaya
 *
 * Licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
 * You may not use this file except in compliance with the License.
 * See the LICENSE file for more information.
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { flushSync }                        from 'react-dom'
import { Button } from '@/components/ui/button'
import { Scale, ShieldCheck, DangerTriangle, DocumentText, UserCross, FolderOpen, Database, EyeClosed, ShieldWarning, Global, Chart, AltArrowLeft, Sun, Moon, ClockCircle, Refresh, TrashBin2, Letter, Forbidden, Link } from '@solar-icons/react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'motion/react'
import { cn } from "@/lib/utils"

const translations = {
  en: {
    title       : 'Terms & Privacy Policy',
    desc        : 'Nothing scary here. Just some ground rules and how we handle your data. Worth a quick read.',
    btn_back    : 'Back',
    lang        : 'English',
    last_updated: 'Last updated: 5 March, 2026',

    // - terms of service - \\
    tos_title: 'Terms of Service',
    tos_items: [
      {
        value   : 'tos_1',
        title   : 'By Using This, You Agree',
        subtitle: 'The basics',
        content : 'Using Atomic Bypass means you\'ve read and agreed to these terms. If you don\'t vibe with any of this, that\'s totally fine. Just don\'t use the service. No hard feelings.',
        icon      : Scale,
        textColor : "text-blue-500",
        bgColor   : "bg-blue-500/10",
      },
      {
        value   : 'tos_2',
        title   : 'What This Service Is For',
        subtitle: 'Educational and accessibility use',
        content : 'Atomic Bypass exists to help people skip annoying link shorteners. You know, those sites that make you wait 5 seconds watching an ad just to get to the actual file. It\'s built for learning, accessibility, and day-to-day convenience. That\'s it. Nothing shady going on here.',
        icon      : Link,
        textColor : "text-sky-400",
        bgColor   : "bg-sky-400/10",
      },
      {
        value   : 'tos_3',
        title   : 'Don\'t Be Malicious',
        subtitle: 'Keep it clean',
        content : 'Pretty self-explanatory. Don\'t use this to bypass security systems without authorization, spread malware, scrape data in bulk, run DDoS attacks, or do anything that would make a judge raise an eyebrow. Break this rule and your access gets yanked. Permanently.',
        icon      : Forbidden,
        textColor : "text-red-400",
        bgColor   : "bg-red-400/10",
      },
      {
        value   : 'tos_4',
        title   : 'Keep It Legal',
        subtitle: 'Rules of the road',
        content : 'You agree not to use Atomic Bypass for anything illegal or that could hurt others. This includes bypassing paywalls you haven\'t paid for, distributing copyrighted content, or automating the service in ways that hammer our infrastructure. If it feels sketchy, it probably is.',
        icon      : ShieldCheck,
        textColor : "text-emerald-500",
        bgColor   : "bg-emerald-500/10",
      },
      {
        value   : 'tos_5',
        title   : 'No Warranty. Sorry.',
        subtitle: 'Service availability',
        content : 'We\'d love to promise 99.9% uptime and zero errors, but we honestly can\'t. The service is provided as-is. Some links might fail, the bot might be down, or a shortener site might block us. If something breaks, let us know. But we can\'t guarantee a quick fix every time.',
        icon      : DangerTriangle,
        textColor : "text-orange-400",
        bgColor   : "bg-orange-400/10",
      },
      {
        value   : 'tos_6',
        title   : 'Rate Limits Are Real',
        subtitle: 'Fair use policy',
        content : 'We\'re not a commercial API with unlimited capacity. Rate limits exist to keep things fair for everyone using the service. If you spam requests, you\'ll get throttled or temporarily blocked. Use it normally and you\'ll never even notice the limits exist.',
        icon      : ClockCircle,
        textColor : "text-yellow-400",
        bgColor   : "bg-yellow-400/10",
      },
      {
        value   : 'tos_7',
        title   : 'We Can Ban You',
        subtitle: 'Abuse and termination',
        content : 'If we catch abuse like bots, scrapers, exploit attempts, or just really suspicious usage patterns, we\'ll cut access without warning. This goes for individual Discord users and entire servers. We try to be fair, but when it\'s clearly abuse, we\'re not going to debate it.',
        icon      : UserCross,
        textColor : "text-rose-500",
        bgColor   : "bg-rose-500/10",
      },
      {
        value   : 'tos_8',
        title   : 'These Terms Can Change',
        subtitle: 'Updates happen',
        content : 'We might update these terms as the service grows and changes. We\'ll try to flag big updates in our Discord server. But we\'re not going to email you every time we fix a typo. If you keep using the service after a change, that means you\'re fine with it.',
        icon      : Refresh,
        textColor : "text-violet-400",
        bgColor   : "bg-violet-400/10",
      },
      {
        value   : 'tos_9',
        title   : 'Destination Sites Are Not Our Problem',
        subtitle: 'Third-party content',
        content : 'We bypass the shortener. We don\'t control what\'s on the other side. If the destination site has sketchy content, asks for your card info, or tries to install something on your machine, that\'s between you and them. We\'re not liable for what\'s past the link.',
        icon      : DocumentText,
        textColor : "text-zinc-400",
        bgColor   : "bg-zinc-400/10",
      },
      {
        value   : 'tos_10',
        title   : 'We\'re Not Responsible for Your Decisions',
        subtitle: 'Limitation of liability',
        content : 'If something goes wrong because of a link you decided to bypass, we\'re not legally on the hook for that. We provided the tool; you made the choice to use it. Use your own judgment about which links you process and where they lead.',
        icon      : Scale,
        textColor : "text-blue-400",
        bgColor   : "bg-blue-400/10",
      },
      {
        value   : 'tos_12',
        title   : 'No Promises on Future Features',
        subtitle: 'Roadmap disclaimer',
        content : 'Sometimes we announce things and then life happens. We might add a feature late, change the direction, or drop something entirely. We try our best to deliver what we talk about, but don\'t make plans that depend on a feature that hasn\'t shipped yet.',
        icon      : DangerTriangle,
        textColor : "text-amber-400",
        bgColor   : "bg-amber-400/10",
      },
      {
        value   : 'tos_13',
        title   : 'Fully Open Source',
        subtitle: 'Transparency and trust',
        content : 'The entire Atomic project, bot and website, is open source. Every line of code lives on our public repository. No black boxes, no hidden data pipelines, no secret sauces. If you ever want to know exactly what something does, the code is right there.',
        icon      : FolderOpen,
        textColor : "text-zinc-200",
        bgColor   : "bg-zinc-800/50",
      }
    ],

    // - privacy policy - \\
    priv_title: 'Privacy Policy',
    priv_items: [
      {
        value   : 'priv_1',
        title   : 'What We Collect',
        subtitle: 'Short answer: not much',
        content : 'When you use the bypass service, we temporarily process the URL you submit. For the Discord bot, we also store your User ID, username, and Server ID to manage rate limits, access control, and history if you\'ve enabled it. That\'s basically the full list.',
        icon      : Database,
        textColor : "text-indigo-400",
        bgColor   : "bg-indigo-400/10",
      },
      {
        value   : 'priv_2',
        title   : 'Why We Need That Data',
        subtitle: 'Legitimate reasons only',
        content : 'We use it to run the service, enforce rate limits, debug errors, and spot abuse. We don\'t sell it, we don\'t build profiles on you, and we definitely don\'t hand it over to advertisers. Your Discord ID is not a product we\'re monetizing.',
        icon      : EyeClosed,
        textColor : "text-teal-400",
        bgColor   : "bg-teal-400/10",
      },
      {
        value   : 'priv_3',
        title   : 'No Ads. No Tracking. No Creepiness.',
        subtitle: 'We are not in the surveillance business',
        content : 'We don\'t run ads. No tracking pixels. No marketing funnels. You won\'t see retargeted ads about link shorteners following you around the web after using us. We just run a bypass service. That\'s genuinely the whole business model.',
        icon      : ShieldWarning,
        textColor : "text-pink-400",
        bgColor   : "bg-pink-400/10",
      },
      {
        value   : 'priv_4',
        title   : 'Data Doesn\'t Stay Forever',
        subtitle: 'We clean up regularly',
        content : 'Processed URLs are not stored permanently. System logs get cleared on a rolling basis. Discord identifiers are only kept as long as needed for access management. If you want your data wiped sooner, just ask. We\'ll handle it.',
        icon      : ClockCircle,
        textColor : "text-amber-400",
        bgColor   : "bg-amber-400/10",
      },
      {
        value   : 'priv_5',
        title   : 'We Keep It Secure',
        subtitle: 'Reasonable security measures',
        content : 'We follow standard security practices to protect stored data. Databases aren\'t left open, and access is limited to the core dev team. No system is 100% bulletproof, but we take it seriously. If we ever detect a breach, we\'ll be upfront about it.',
        icon      : ShieldCheck,
        textColor : "text-emerald-400",
        bgColor   : "bg-emerald-400/10",
      },
      {
        value   : 'priv_6',
        title   : 'Destination Sites Have Their Own Rules',
        subtitle: 'Third-party privacy',
        content : 'Once you bypass a link and land on the destination site, their privacy policy applies, not ours. Some of those sites track everything you do. We genuinely can\'t control that. If you\'re concerned, check the destination site\'s own privacy policy before engaging with it.',
        icon      : Global,
        textColor : "text-sky-400",
        bgColor   : "bg-sky-400/10",
      },
      {
        value   : 'priv_7',
        title   : 'Cookies and Local Storage',
        subtitle: 'Minimal and functional only',
        content : 'We might store small bits of data in your browser like your preferred language or theme setting. That\'s it. No ad tracking cookies, no cross-site identifiers. If you clear your browser storage, nothing bad happens. You just have to pick your preferences again.',
        icon      : FolderOpen,
        textColor : "text-lime-400",
        bgColor   : "bg-lime-400/10",
      },
      {
        value   : 'priv_8',
        title   : 'Stats We Track',
        subtitle: 'Anonymous aggregates only',
        content : 'We monitor things like total daily bypasses, which shortener providers come up most often, and whether the infrastructure is healthy. All of it is aggregated and anonymized. We can\'t tie any statistic back to a specific person or account.',
        icon      : Chart,
        textColor : "text-rose-400",
        bgColor   : "bg-rose-400/10",
      },
      {
        value   : 'priv_9',
        title   : 'You Can Request Data Deletion',
        subtitle: 'Your data, your call',
        content : 'Want everything tied to your Discord account removed from our systems? Just send a request through our Discord server and we\'ll purge it within a few days. No interrogation, no guilt trip, no lengthy process.',
        icon      : TrashBin2,
        textColor : "text-red-400",
        bgColor   : "bg-red-400/10",
      },
      {
        value   : 'priv_10',
        title   : 'This Policy Can Be Updated',
        subtitle: 'Privacy evolves too',
        content : 'We might update this policy as the service changes. If we make significant changes to how we handle your data, we\'ll post an update in our Discord server. Continuing to use the service after that means you\'re okay with the changes.',
        icon      : Refresh,
        textColor : "text-violet-400",
        bgColor   : "bg-violet-400/10",
      },
      {
        value   : 'priv_11',
        title   : 'Questions About Privacy?',
        subtitle: 'Reach out anytime',
        content : 'If something here is confusing, you\'re worried about your data, or you just want to know more about how things work, send us a message in the Atomic Discord server. We\'re real people and we actually read the messages.',
        icon      : Letter,
        textColor : "text-violet-400",
        bgColor   : "bg-violet-400/10",
      }
    ]
  },
  id: {
    title       : 'Syarat Ketentuan & Kebijakan Privasi',
    desc        : 'Gak ada yang serem di sini. Cuma beberapa aturan dasar dan cara kami ngurus data kamu. Layak dibaca bentar kok.',
    btn_back    : 'Kembali',
    lang        : 'Bahasa Indonesia',
    last_updated: 'Terakhir diperbarui: 5 Maret, 2026',

    // - terms of service - \\
    tos_title: 'Syarat dan Ketentuan',
    tos_items: [
      {
        value   : 'tos_1',
        title   : 'Kalau Pakai, Berarti Setuju',
        subtitle: 'Dasarnya dulu',
        content : 'Dengan menggunakan Atomic Bypass, artinya kamu udah baca dan setuju sama syarat di sini. Kalau ada yang gak cocok, gak apa-apa. Tinggal gak usah pakai layanannya. Gak ada yang maksa kok.',
        icon      : Scale,
        textColor : "text-blue-500",
        bgColor   : "bg-blue-500/10",
      },
      {
        value   : 'tos_2',
        title   : 'Ini Layanan Buat Apa?',
        subtitle: 'Edukasi dan aksesibilitas',
        content : 'Atomic Bypass dibuat buat bantu orang skip shortlink yang nyebelin. Kamu tau kan, situs yang nyuruh nunggu 5 detik sambil nonton iklan cuma buat bisa dapet file-nya. Tujuannya buat belajar, aksesibilitas, dan kemudahan sehari-hari. Itu doang. Gak ada yang aneh-aneh.',
        icon      : Link,
        textColor : "text-sky-400",
        bgColor   : "bg-sky-400/10",
      },
      {
        value   : 'tos_3',
        title   : 'Jangan Jahat Dong',
        subtitle: 'Jaga etika ya',
        content : 'Simpel banget. Jangan pakai ini buat bypass sistem keamanan tanpa izin, nyebarin malware, scraping data dalam jumlah besar, nge-DDoS, atau hal-hal yang bakal bikin hakim angkat alis. Langgar ini dan akses kamu langsung dicabut. Permanen.',
        icon      : Forbidden,
        textColor : "text-red-400",
        bgColor   : "bg-red-400/10",
      },
      {
        value   : 'tos_4',
        title   : 'Tetap di Jalur yang Legal',
        subtitle: 'Rambu-rambu pemakaian',
        content : 'Kamu setuju untuk tidak menggunakan Atomic Bypass buat hal ilegal atau yang bisa merugikan orang lain. Ini termasuk bypass paywall yang belum kamu bayar, nyebarin konten berlisensi tanpa izin, atau otomasi yang membanjiri server kami. Kalau rasanya mencurigakan, kemungkinan besar memang mencurigakan.',
        icon      : ShieldCheck,
        textColor : "text-emerald-500",
        bgColor   : "bg-emerald-500/10",
      },
      {
        value   : 'tos_5',
        title   : 'Gak Ada Garansi. Maaf Ya.',
        subtitle: 'Ketersediaan layanan',
        content : 'Kami pengen bisa janji uptime 99.9% dan nol error, tapi kami jujur gak bisa. Layanan ini tersedia apa adanya. Ada link yang mungkin gagal, bot mungkin lagi down, atau situs shortener-nya yang block kami. Kalau ada yang gak jalan, kabarin kami. Tapi kami gak bisa janjiin langsung beres setiap waktu.',
        icon      : DangerTriangle,
        textColor : "text-orange-400",
        bgColor   : "bg-orange-400/10",
      },
      {
        value   : 'tos_6',
        title   : 'Rate Limit Itu Nyata',
        subtitle: 'Kebijakan penggunaan wajar',
        content : 'Kami bukan API komersial dengan kapasitas tak terbatas. Rate limit ada biar semua orang kebagian akses yang adil. Kalau kamu spam request, kamu bakal di-throttle atau diblokir sementara. Pakai secara normal dan kamu gak akan pernah nyentuh limitnya.',
        icon      : ClockCircle,
        textColor : "text-yellow-400",
        bgColor   : "bg-yellow-400/10",
      },
      {
        value   : 'tos_7',
        title   : 'Kami Bisa Ban Kamu',
        subtitle: 'Penyalahgunaan dan pemutusan akses',
        content : 'Kalau kami deteksi penyalahgunaan seperti bot, scraper, percobaan exploit, atau pola penggunaan yang mencurigakan, akses kamu bakal langsung diputus tanpa peringatan. Berlaku buat pengguna Discord individual maupun seluruh server. Kami usaha adil, tapi kalau udah jelas-jelas abuse, gak ada debat.',
        icon      : UserCross,
        textColor : "text-rose-500",
        bgColor   : "bg-rose-500/10",
      },
      {
        value   : 'tos_8',
        title   : 'Syarat Ini Bisa Berubah',
        subtitle: 'Update itu wajar',
        content : 'Kami mungkin update syarat ini seiring layanan berkembang. Kami bakal kasih tau di server Discord kalau ada perubahan besar. Tapi gak bakal kirimin notifikasi setiap kali ada typo yang diperbaiki. Kalau kamu lanjut pakai layanan setelah ada update, berarti kamu setuju.',
        icon      : Refresh,
        textColor : "text-violet-400",
        bgColor   : "bg-violet-400/10",
      },
      {
        value   : 'tos_9',
        title   : 'Situs Tujuan Bukan Tanggung Jawab Kami',
        subtitle: 'Konten pihak ketiga',
        content : 'Kami bypass shortlink-nya. Kami gak kontrol konten yang ada di tujuan. Kalau situs tujuannya punya konten aneh, minta info kartu kredit kamu, atau coba instal sesuatu di device kamu, itu urusan kamu sama mereka. Kami gak bisa dimintai tanggung jawab atas apa yang ada di balik link itu.',
        icon      : DocumentText,
        textColor : "text-zinc-400",
        bgColor   : "bg-zinc-400/10",
      },
      {
        value   : 'tos_10',
        title   : 'Keputusanmu, Tanggung Jawabmu',
        subtitle: 'Batasan tanggung jawab',
        content : 'Kalau sesuatu berjalan buruk karena link yang kamu pilih untuk di-bypass, kami gak bisa dimintai tanggung jawab secara hukum. Kami nyediain alatnya, kamu yang memilih untuk menggunakannya. Gunakan penilaianmu sendiri soal link mana yang mau diproses dan tujuannya ke mana.',
        icon      : Scale,
        textColor : "text-blue-400",
        bgColor   : "bg-blue-400/10",
      },
      {
        value   : 'tos_12',
        title   : 'Fitur Masa Depan Gak Dijamin',
        subtitle: 'Disclaimer roadmap',
        content : 'Kadang kami umumin sesuatu dan kemudian ya... hidup terjadi. Mungkin fiturnya terlambat, arahnya berubah, atau malah dibatalin. Kami berusaha deliver apa yang kami bilang, tapi jangan buat rencana yang bergantung pada fitur yang belum rilis.',
        icon      : DangerTriangle,
        textColor : "text-amber-400",
        bgColor   : "bg-amber-400/10",
      },
      {
        value   : 'tos_13',
        title   : 'Sepenuhnya Open Source',
        subtitle: 'Transparansi dan kepercayaan',
        content : 'Seluruh proyek Atomic, bot dan websitenya, open source. Setiap baris kode ada di repositori publik kami. Gak ada black box, gak ada pipeline data tersembunyi. Kalau kamu penasaran sesuatu ngapain, tinggal cek kodenya langsung.',
        icon      : FolderOpen,
        textColor : "text-zinc-200",
        bgColor   : "bg-zinc-800/50",
      }
    ],

    // - privacy policy - \\
    priv_title: 'Kebijakan Privasi',
    priv_items: [
      {
        value   : 'priv_1',
        title   : 'Data Apa yang Kami Kumpulkan',
        subtitle: 'Singkatnya: gak banyak',
        content : 'Saat kamu pakai layanan bypass, kami proses URL yang kamu kirim secara sementara. Untuk bot Discord, kami juga nyimpen User ID, username, dan Server ID kamu buat rate limit, kontrol akses, dan histori kalau kamu aktifkan. Segitu kurang lebih daftarnya.',
        icon      : Database,
        textColor : "text-indigo-400",
        bgColor   : "bg-indigo-400/10",
      },
      {
        value   : 'priv_2',
        title   : 'Kenapa Kami Perlu Data Itu',
        subtitle: 'Alasan yang masuk akal',
        content : 'Kami pakai data itu buat jalanin layanan, tegakkin rate limit, debug error, dan deteksi abuse. Gak dijual, gak buat bikin profil, dan pasti gak dikasih ke pengiklan. Discord ID kamu bukan produk yang kami monetisasi.',
        icon      : EyeClosed,
        textColor : "text-teal-400",
        bgColor   : "bg-teal-400/10",
      },
      {
        value   : 'priv_3',
        title   : 'Gak Ada Iklan. Gak Ada Tracking.',
        subtitle: 'Kami bukan bisnis surveillance',
        content : 'Kami gak pasang iklan. Gak pakai tracking pixel. Gak ada marketing funnel. Kamu gak bakal di-retarget iklan tentang shortlink setelah pakai layanan kami. Kami cuma jalanin layanan bypass. Itu beneran seluruh model bisnisnya.',
        icon      : ShieldWarning,
        textColor : "text-pink-400",
        bgColor   : "bg-pink-400/10",
      },
      {
        value   : 'priv_4',
        title   : 'Data Gak Disimpen Selamanya',
        subtitle: 'Ada batas waktunya',
        content : 'URL yang diproses gak disimpan permanen. Log sistem dibersihkan secara berkala. Identitas Discord cuma disimpan selama dibutuhkan untuk manajemen akses. Kalau kamu mau datanya dihapus lebih cepat, tinggal minta dan kami urus.',
        icon      : ClockCircle,
        textColor : "text-amber-400",
        bgColor   : "bg-amber-400/10",
      },
      {
        value   : 'priv_5',
        title   : 'Data Kamu Kami Jaga',
        subtitle: 'Keamanan yang wajar',
        content : 'Kami pakai praktik keamanan standar buat lindungi data yang tersimpan. Database gak dibiarkan terbuka sembarangan dan akses dibatasi hanya untuk tim developer inti. Gak ada sistem yang 100% aman, tapi kami serius soal ini. Kalau ada kebocoran yang terdeteksi, kami bakal transparan.',
        icon      : ShieldCheck,
        textColor : "text-emerald-400",
        bgColor   : "bg-emerald-400/10",
      },
      {
        value   : 'priv_6',
        title   : 'Situs Tujuan Punya Aturan Sendiri',
        subtitle: 'Privasi pihak ketiga',
        content : 'Begitu kamu bypass link dan sampai di situs tujuan, kebijakan privasi mereka yang berlaku, bukan kami. Beberapa situs tracking semuanya. Kami beneran gak bisa ngapa-ngapain soal itu. Kalau kamu khawatir, cek kebijakan privasi situs tersebut sebelum berinteraksi lebih jauh.',
        icon      : Global,
        textColor : "text-sky-400",
        bgColor   : "bg-sky-400/10",
      },
      {
        value   : 'priv_7',
        title   : 'Cookie dan Local Storage',
        subtitle: 'Minimal dan fungsional aja',
        content : 'Kami mungkin nyimpen data kecil di browser kamu seperti preferensi bahasa atau tema tampilan. Itu doang. Gak ada cookie tracking iklan, gak ada identifikasi lintas situs. Kalau kamu hapus storage browser, gak ada yang buruk terjadi. Kamu cuma perlu pilih preferensi lagi.',
        icon      : FolderOpen,
        textColor : "text-lime-400",
        bgColor   : "bg-lime-400/10",
      },
      {
        value   : 'priv_8',
        title   : 'Statistik yang Kami Pantau',
        subtitle: 'Hanya agregat anonim',
        content : 'Kami pantau hal-hal seperti total bypass per hari, provider shortener yang paling sering muncul, dan apakah infrastruktur layanan sehat. Semuanya diagregasi dan dianonimkan. Kami gak bisa melacak sebuah statistik balik ke orang atau akun tertentu.',
        icon      : Chart,
        textColor : "text-rose-400",
        bgColor   : "bg-rose-400/10",
      },
      {
        value   : 'priv_9',
        title   : 'Minta Hapus Data Kamu',
        subtitle: 'Datamu, keputusanmu',
        content : 'Mau kami hapus semua yang terkait akun Discord kamu dari sistem kami? Kirim request lewat server Discord kami dan kami bakal proses dalam beberapa hari. Gak ada interogasi, gak ada drama, gak ada proses panjang.',
        icon      : TrashBin2,
        textColor : "text-red-400",
        bgColor   : "bg-red-400/10",
      },
      {
        value   : 'priv_10',
        title   : 'Kebijakan Ini Bisa Diupdate',
        subtitle: 'Privasi juga berkembang',
        content : 'Kami mungkin update kebijakan ini seiring layanan berubah. Kalau ada perubahan signifikan soal cara kami handle data kamu, kami bakal posting update di server Discord. Kalau kamu lanjut pakai layanan setelah itu, berarti kamu setuju dengan perubahannya.',
        icon      : Refresh,
        textColor : "text-violet-400",
        bgColor   : "bg-violet-400/10",
      },
      {
        value   : 'priv_11',
        title   : 'Ada Pertanyaan Soal Privasi?',
        subtitle: 'Hubungi kami kapan aja',
        content : 'Kalau ada yang bikin bingung, kamu khawatir soal datamu, atau sekadar pengen tau lebih soal cara kerja layanan ini, kirim pesan di server Discord Atomic. Kami manusia beneran dan kami baca pesannya kok.',
        icon      : Letter,
        textColor : "text-violet-400",
        bgColor   : "bg-violet-400/10",
      }
    ]
  }
}
export default function BypassTerms() {
  const router          = useRouter()
  const [lang,  set_lang]  = useState<'en' | 'id'>('en')
  const [theme, set_theme] = useState<'dark' | 'light'>('dark')

  // - sync theme class to <html> on mount and theme change - \\
  useEffect(() => {
    const html = document.documentElement
    if (theme === 'dark') { html.classList.add('dark')    }
    else                  { html.classList.remove('dark') }
    return () => { html.classList.add('dark') }
  }, [theme])

  // - animated theme toggle using view transition api clip-path wipe - \\
  const toggle_theme = useCallback(async () => {
    const next = theme === 'dark' ? 'light' : 'dark'

    if (!('startViewTransition' in document)) {
      set_theme(next)
      return
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (document as any).startViewTransition(() => {
      flushSync(() => {
        set_theme(next)
        document.documentElement.classList.toggle('dark', next === 'dark')
      })
    }).ready

    document.documentElement.animate(
      { clipPath: ['inset(0 100% 0 0)', 'inset(0 0 0 0)'] },
      {
        duration     : 700,
        easing       : 'ease-in-out',
        pseudoElement: '::view-transition-new(root)',
      },
    )
  }, [theme])

  const t = translations[lang]

  const [tab,       set_tab]       = useState<'tos' | 'priv'>('tos')
  const [open_tos,  set_open_tos]  = useState<string | null>(null)
  const [open_priv, set_open_priv] = useState<string | null>(null)

  // - reusable accordion list renderer — iOS grouped-list style with framer motion - \\
  const render_items = (
    items    : typeof t.tos_items,
    open     : string | null,
    set_open : (v: string | null) => void,
  ) => (
    <div className="rounded-2xl overflow-hidden border border-border/50 bg-card divide-y divide-border/40">
      {items.map((item) => {
        const Icon    = item.icon
        const is_open = open === item.value
        return (
          <div
            key={item.value}
            className={cn('border-0 transition-colors duration-200', is_open && 'bg-muted/30')}
          >
            <button
              onClick={() => set_open(is_open ? null : item.value)}
              className="hover:bg-muted/20 active:bg-muted/40 transition-colors px-4 py-3.5 w-full"
            >
              <div className="flex items-center gap-3 text-left w-full">
                <div className={cn("w-8 h-8 rounded-[10px] flex items-center justify-center shrink-0", item.bgColor, item.textColor)}>
                  <Icon size={17} />
                </div>
                <div className="flex flex-col flex-1 min-w-0">
                  <span className="text-[13.5px] font-medium leading-snug truncate">{item.title}</span>
                  <span className="text-[11.5px] text-muted-foreground font-normal mt-0.5 truncate">{item.subtitle}</span>
                </div>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={cn(
                    'text-muted-foreground/50 shrink-0 transition-transform duration-200',
                    is_open && 'rotate-90',
                  )}
                >
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </div>
            </button>
            <AnimatePresence initial={false}>
              {is_open && (
                <motion.div
                  key={item.value}
                  initial={{ height: 0, opacity: 0, y: 12 }}
                  animate={{ height: 'auto', opacity: 1, y: 0 }}
                  exit={{ height: 0, opacity: 0, y: 12 }}
                  transition={{ duration: 0.32, ease: [0.4, 0, 0.2, 1] }}
                  style={{ overflow: 'hidden' }}
                >
                  <div className="px-4 pb-4">
                    <div className="ps-11 pt-1 border-t border-border/30">
                      <p className="text-[13px] text-muted-foreground leading-relaxed pt-3">
                        {item.content}
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )
      })}
    </div>
  )

  return (
    <section className="min-h-screen bg-background text-foreground">
      <style>{`::view-transition-old(root),::view-transition-new(root){animation:none;mix-blend-mode:normal;}`}</style>

      {/* - top nav bar - \\ */}
      <nav className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-4 sm:px-8 h-14 flex items-center justify-between gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="gap-1.5 text-muted-foreground hover:text-foreground -ml-2"
          >
            <AltArrowLeft size={16} />
            {t.btn_back}
          </Button>

          <a href="/bypass" className="flex items-center gap-2.5">
            <img
              src="/atomic-logo-with-bg.png"
              alt="Atomic Bypass"
              className="w-7 h-7 rounded-lg object-cover"
            />
            <span className="text-sm font-semibold tracking-tight hidden sm:block">Atomic Softworks</span>
          </a>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggle_theme}
              className="w-8 h-8 p-0 text-muted-foreground hover:text-foreground"
            >
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => set_lang(lang === 'en' ? 'id' : 'en')}
              className="gap-2 h-8 text-xs"
            >
              <Global size={14} />
              {t.lang}
            </Button>
          </div>
        </div>
      </nav>

      {/* - page content - \\ */}
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-14 flex flex-col gap-10">

        {/* - hero header - \\ */}
        <div className="flex flex-col gap-3">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
            {t.title}
          </h1>
          <p className="text-base text-muted-foreground leading-relaxed max-w-xl">
            {t.desc}
          </p>
        </div>

        {/* - tabbed policy sections - \\ */}
        <div className="flex flex-col gap-3">

          {/* - animated tab list with sliding pill indicator - \\ */}
          <div className="relative inline-flex h-9 w-full rounded-lg bg-muted p-[3px]">

            {/* - sliding pill — always rendered, animates x position - \\ */}
            <motion.div
              className="absolute top-[3px] left-[3px] h-[calc(100%-6px)] w-[calc(50%-3px)] rounded-md bg-black shadow-sm"
              animate={{ x: tab === 'tos' ? 0 : '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            />

            {(['tos', 'priv'] as const).map((key) => (
              <button
                key={key}
                onClick={() => set_tab(key)}
                className={cn(
                  'relative z-10 flex-1 h-full inline-flex items-center justify-center rounded-md px-2 py-1 text-sm font-medium whitespace-nowrap transition-colors duration-200',
                  tab === key ? 'text-white' : 'text-muted-foreground hover:text-foreground/70',
                )}
              >
                {key === 'tos' ? t.tos_title : t.priv_title}
              </button>
            ))}
          </div>

          {/* - panel with blur-fade transition - \ */}
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={tab}
              initial={{ opacity: 0, filter: 'blur(4px)' }}
              animate={{ opacity: 1, filter: 'blur(0px)' }}
              exit={{ opacity: 0, filter: 'blur(4px)' }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
            >
              {tab === 'tos'
                ? render_items(t.tos_items,  open_tos,  set_open_tos)
                : render_items(t.priv_items, open_priv, set_open_priv)
              }
            </motion.div>
          </AnimatePresence>

        </div>

      </div>
    </section>
  )
}
