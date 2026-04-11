/*
 * Atomicals Bot for Discord
 * Copyright (C) 2026 Atomicals LancarJaya
 *
 * Licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
 * You may not use this file except in compliance with the License.
 * See the LICENSE file for more information.
 */

'use client'

import { useEffect, useRef, useState } from 'react'
import { cn }                                        from '@/lib/utils'

// - BASE URL UNTUK ASET CDN TELKOM UNIVERSITY - \\
const __cdn = 'https://telkomuniversity.ac.id/wp-content/uploads'

// - WARNA TELKOM UNIVERSITY - \\
const __red = '#CC0000'

// - VIDEO PROFIL FIF (YouTube embed ID) - \\
const __video_id = '3WKjLg8XOGI'

// - NAV LINKS - \\
const __nav = [
  { label: 'Beranda',       href: '#beranda'   },
  { label: 'Tentang FIF',   href: '#tentang'   },
  { label: 'Dekan',         href: '#akademik'  },
  { label: 'Video Profil',  href: '#video'     },
  { label: 'Program Studi', href: '#peminatan' },
  { label: 'Acara',         href: '#acara'     },
  { label: 'Berita',        href: '#berita'    },
  { label: 'Kerja Sama',    href: '#kerjasama' },
  { label: 'Hubungi Kami',  href: '#kontak'    },
]

// - DATA PROGRAM STUDI FIF - \\
const __peminatan = [
  {
    title : 'Teknik Informatika',
    desc  : 'Membekali mahasiswa dengan kemampuan rekayasa perangkat lunak, kecerdasan buatan, komputasi berbasis data, dan pengembangan sistem yang siap bersaing di industri teknologi global.',
    ig    : 'https://www.instagram.com/if.telkomuniversity/',
  },
  {
    title : 'Sistem Informasi',
    desc  : 'Mengintegrasikan pengelolaan informasi bisnis dengan teknologi untuk menghasilkan solusi sistem informasi yang efektif, efisien, dan bernilai tambah tinggi bagi organisasi.',
    ig    : 'https://www.instagram.com/si_telkomuniversity/',
  },
  {
    title : 'Ilmu Komputasi',
    desc  : 'Berfokus pada komputasi saintifik, analisis data besar, dan pemodelan matematika untuk memecahkan permasalahan kompleks di berbagai bidang sains dan teknologi.',
    ig    : 'https://telkomuniversity.ac.id/fakultas-informatika/',
  },
  {
    title : 'Teknik Komputer',
    desc  : 'Mempelajari desain sistem komputer, elektronika digital, arsitektur prosesor, dan sistem tertanam yang menjadi fondasi perangkat teknologi masa depan.',
    ig    : 'https://telkomuniversity.ac.id/fakultas-informatika/',
  },
  {
    title : 'Rekayasa Perangkat Lunak',
    desc  : 'Mendidik mahasiswa untuk merancang, membangun, dan mengelola perangkat lunak berkualitas tinggi melalui metodologi rekayasa, pengujian, dan manajemen proyek.',
    ig    : 'https://telkomuniversity.ac.id/fakultas-informatika/',
  },
]

// - DATA ACARA FIF - \\
const __acara = [
  {
    img   : `${__cdn}/2024/07/FAKULTAS-IF-1.jpg`,
    date  : '05 SEP 2024',
    title : 'Seminar Nasional Informatika 2024 - Artificial Intelligence dan Data Science',
    href  : 'https://telkomuniversity.ac.id/fakultas-informatika/',
  },
  {
    img   : `${__cdn}/2024/07/Group-296.jpg`,
    date  : '18 JUL 2024',
    title : 'Hackathon FIF 2024 - Inovasi Teknologi untuk Indonesia Maju',
    href  : 'https://telkomuniversity.ac.id/fakultas-informatika/',
  },
  {
    img   : `${__cdn}/2024/07/Group-217-1.jpg`,
    date  : '22 MEI 2024',
    title : 'Kuliah Umum Bersama Google - Cloud Computing dan Machine Learning',
    href  : 'https://telkomuniversity.ac.id/fakultas-informatika/',
  },
  {
    img   : `${__cdn}/2024/07/Group-358.png`,
    date  : '14 MAR 2024',
    title : 'FIF Research Day 2024 - Pameran Riset dan Inovasi Mahasiswa Terbaik',
    href  : 'https://telkomuniversity.ac.id/fakultas-informatika/',
  },
]

// - DATA BERITA FIF - \\
const __berita = [
  {
    img   : `${__cdn}/2024/07/Group-296.jpg`,
    date  : '10 JAN 2026',
    title : 'Mahasiswa FIF Raih Juara 1 Kompetisi AI Nasional Tingkat Perguruan Tinggi 2025.',
    href  : 'https://telkomuniversity.ac.id/fakultas-informatika/',
  },
  {
    img   : `${__cdn}/2024/07/Group-217-1.jpg`,
    date  : '18 DES 2025',
    title : 'Tim Riset FIF Kembangkan Sistem Deteksi Penyakit Menggunakan Deep Learning Berbasis Citra Medis.',
    href  : 'https://telkomuniversity.ac.id/fakultas-informatika/',
  },
  {
    img   : `${__cdn}/2024/07/FAKULTAS-IF-1.jpg`,
    date  : '05 NOV 2025',
    title : 'FIF Tandatangani MoU dengan 12 Perusahaan Teknologi Global untuk Penguatan Kompetensi Mahasiswa.',
    href  : 'https://telkomuniversity.ac.id/fakultas-informatika/',
  },
]

// - DATA PARTNER KERJA SAMA FIF - \\
const __partners = [
  { name: 'Microsoft',  img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/44/Microsoft_logo.svg/180px-Microsoft_logo.svg.png'            },
  { name: 'Google',     img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2f/Google_2015_logo.svg/180px-Google_2015_logo.svg.png'       },
  { name: 'IBM',        img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/51/IBM_logo.svg/180px-IBM_logo.svg.png'                        },
  { name: 'Cisco',      img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/64/Cisco_logo.svg/180px-Cisco_logo.svg.png'                    },
  { name: 'Oracle',     img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/50/Oracle_logo.svg/180px-Oracle_logo.svg.png'                  },
  { name: 'SAP',        img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/59/SAP_2011_logo.svg/180px-SAP_2011_logo.svg.png'              },
  { name: 'Tokopedia',  img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/58/Tokopedia_logo_2020.svg/180px-Tokopedia_logo_2020.svg.png'  },
  { name: 'Gojek',      img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6e/GoJek_logo_2019.svg/180px-GoJek_logo_2019.svg.png'          },
  { name: 'BRIN',       img: 'https://upload.wikimedia.org/wikipedia/id/thumb/2/29/BRIN_logo.svg/180px-BRIN_logo.svg.png'                           },
  { name: 'Huawei',     img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e8/Huawei_Logo.svg/180px-Huawei_Logo.svg.png'                  },
]

// - SOCIAL MEDIA FIF - \\
const __socials = [
  { label: 'Instagram FIF Telkom',          href: 'https://www.instagram.com/if.telkomuniversity/'         },
  { label: 'YouTube Telkom University',     href: 'https://www.youtube.com/@TelkomUniversity'               },
  { label: 'Instagram Teknik Informatika',  href: 'https://www.instagram.com/if.telkomuniversity/'         },
  { label: 'Instagram Sistem Informasi',    href: 'https://www.instagram.com/si_telkomuniversity/'         },
  { label: 'Website Resmi FIF',             href: 'https://telkomuniversity.ac.id/fakultas-informatika/'   },
  { label: 'LinkedIn Telkom University',    href: 'https://www.linkedin.com/school/telkomuniversity/'      },
  { label: 'Instagram FIF International',  href: 'https://www.instagram.com/if.telkomuniversity/'         },
]

// - STATS FIF - \\
const __stats = [
  { value: 2007, suffix: '',  label: 'Tahun Berdiri'    },
  { value: 5,    suffix: '+', label: 'Program Studi'    },
  { value: 7000, suffix: '+', label: 'Mahasiswa Aktif'  },
  { value: 20,   suffix: '+', label: 'Laboratorium'     },
]

// - INTERSECTION OBSERVER HOOK - \\
function use_in_view(threshold = 0.1) {
  const ref                    = useRef<HTMLDivElement>(null)
  const [visible, set_visible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) set_visible(true) },
      { threshold },
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [threshold])

  return { ref, visible }
}

// - FADE IN SECTION WRAPPER - \\
function FadeIn({
  children,
  className,
  delay = 0,
}: {
  children : React.ReactNode
  className?: string
  delay    ?: number
}) {
  const { ref, visible } = use_in_view()
  return (
    <div
      ref={ref}
      className={cn('transition-all duration-700', className)}
      style={{
        opacity         : visible ? 1 : 0,
        transform       : visible ? 'translateY(0)' : 'translateY(24px)',
        transitionDelay : `${delay}ms`,
      }}
    >
      {children}
    </div>
  )
}

// - NAVIGATION BAR - \\
function DKVNav() {
  const [scrolled, set_scrolled]   = useState(false)
  const [menu_open, set_menu_open] = useState(false)
  const [search_open, set_search]  = useState(false)

  useEffect(() => {
    const fn = () => set_scrolled(window.scrollY > 10)
    window.addEventListener('scroll', fn, { passive: true })
    return () => window.removeEventListener('scroll', fn)
  }, [])

  return (
    <header
      className={cn(
        'fixed top-0 left-0 right-0 z-50 bg-white transition-shadow duration-300',
        scrolled && 'shadow-md',
      )}
    >
      {/* - TOP UTILITY BAR - \\*/}
      <div className="border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 h-10 flex items-center justify-between gap-4">
          <div className="flex items-center gap-5">
            {[
              { label: 'Akreditasi',    href: 'https://telkomuniversity.ac.id/fakultas-informatika/'              },
              { label: 'Alumni',        href: 'https://telkomuniversity.ac.id/fakultas-informatika/'              },
              { label: 'International', href: 'https://telkomuniversity.ac.id/fakultas-informatika/'              },
              { label: 'Beasiswa',      href: 'https://telkomuniversity.ac.id/beasiswa/'                       },
            ].map(lnk => (
              <a
                key={lnk.label}
                href={lnk.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[12px] text-gray-500 hover:text-gray-800 transition-colors hidden md:block"
              >
                {lnk.label}
              </a>
            ))}
          </div>
          <div className="flex items-center gap-3">
            {/* - SEARCH - \\*/}
            <button
              className="flex items-center gap-1.5 text-[12px] text-gray-500 hover:text-gray-800 transition-colors"
              onClick={() => set_search(v => !v)}
              aria-label="Search"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <circle cx={11} cy={11} r={8} /><path d="m21 21-4.35-4.35" />
              </svg>
              <span className="hidden sm:block">Cari</span>
            </button>
            {/* - LOGIN / DAFTAR - \\*/}
            <a
              href="https://smb.telkomuniversity.ac.id/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-[12px] font-semibold text-white px-3 py-1 transition hover:opacity-90"
              style={{ background: __red }}
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3" />
              </svg>
              Daftar
            </a>
          </div>
        </div>
      </div>

      {/* - MAIN NAV - \\*/}
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
        <a href="#beranda" className="shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`${__cdn}/2022/02/logo3-e1511767184374.png`}
            alt="Fakultas Informatikaultas Informatika Telkom University"
            className="h-9 w-auto object-contain"
          />
        </a>

        {/* - DESKTOP NAV LINKS - \\*/}
        <ul className="hidden lg:flex items-center gap-1">
          {__nav.map(item => (
            <li key={item.href}>
              <a
                href={item.href}
                className="text-[13px] font-medium text-gray-600 hover:text-gray-900 px-3 py-1.5 rounded transition-colors relative group"
              >
                {item.label}
                <span
                  className="absolute bottom-0 left-3 right-3 h-0.5 w-0 group-hover:w-[calc(100%-24px)] transition-all duration-200 rounded-full"
                  style={{ background: __red }}
                />
              </a>
            </li>
          ))}
        </ul>

        {/* - HAMBURGER - \\*/}
        <button
          className="lg:hidden w-8 h-8 flex flex-col items-center justify-center gap-1.5"
          onClick={() => set_menu_open(v => !v)}
          aria-label="Toggle menu"
        >
          <span className={cn('w-5 h-0.5 bg-gray-700 transition-all', menu_open && 'rotate-45 translate-y-2')} />
          <span className={cn('w-5 h-0.5 bg-gray-700 transition-all', menu_open && 'opacity-0')} />
          <span className={cn('w-5 h-0.5 bg-gray-700 transition-all', menu_open && '-rotate-45 -translate-y-2')} />
        </button>
      </div>

      {/* - SEARCH BAR DROP - \\*/}
      <div className={cn('overflow-hidden transition-all duration-200 border-t border-gray-100 bg-white', search_open ? 'max-h-16' : 'max-h-0')}>
        <div className="max-w-7xl mx-auto px-4 py-2">
          <input
            type="search"
            placeholder="Cari program, konten, atau halaman..."
            className="w-full border border-gray-200 rounded px-4 py-2 text-sm outline-none focus:border-gray-400"
            autoFocus={search_open}
          />
        </div>
      </div>

      {/* - MOBILE MENU - \\*/}
      <div className={cn('lg:hidden overflow-hidden transition-all duration-300 bg-white border-t border-gray-100', menu_open ? 'max-h-[32rem]' : 'max-h-0')}>
        <div className="px-4 py-4 flex flex-col gap-2">
          {__nav.map(item => (
            <a
              key={item.href}
              href={item.href}
              onClick={() => set_menu_open(false)}
              className="text-sm text-gray-700 hover:text-red-700 py-1 transition-colors"
            >
              {item.label}
            </a>
          ))}
          <a
            href="https://smb.telkomuniversity.ac.id/"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 px-4 py-2.5 text-center text-white text-sm font-semibold"
            style={{ background: __red }}
          >
            Daftar Sekarang
          </a>
        </div>
      </div>
    </header>
  )
}

// ============================================================
// MAIN PAGE
// ============================================================
export default function DKVTelkomPage() {
  return (
    <main className="min-h-screen bg-white text-gray-900">
      <DKVNav />

      {/* ================================================== */}
      {/* HERO — SPLIT LAYOUT                               */}
      {/* ================================================== */}
      <section id="beranda" className="pt-[96px] min-h-[calc(100vh-0px)] flex">
        <div className="flex flex-col lg:flex-row w-full max-w-[1600px] mx-auto">

          {/* - LEFT: TEXT CONTENT - \\*/}
          <div className="flex-1 flex flex-col justify-center px-8 md:px-16 lg:px-20 py-16 lg:py-20">
            <FadeIn>
              <p className="text-sm font-semibold tracking-widest uppercase mb-4" style={{ color: __red }}>
                Fakultas Informatika
              </p>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-gray-900 leading-[1.08] tracking-tight mb-6">
                Fakultas<br />Informatika<br />Telkom.
              </h1>
              <p className="text-gray-500 text-base md:text-lg leading-relaxed max-w-md mb-10">
                Mencetak talenta digital unggul yang siap menghadapi tantangan era
                transformasi teknologi — berbasis riset, inovasi, dan kolaborasi industri global.
              </p>
            </FadeIn>

            {/* - QUICK ACTION TILES - \\*/}
            <FadeIn delay={80}>
              <div className="grid grid-cols-2 gap-3 max-w-sm mb-10">
                {[
                  { label: 'Profil Fakultas', href: 'https://telkomuniversity.ac.id/fakultas-informatika/', icon: '01' },
                  { label: 'Akreditasi',      href: 'https://telkomuniversity.ac.id/fakultas-informatika/', icon: '02' },
                  { label: 'Kurikulum',       href: 'https://telkomuniversity.ac.id/fakultas-informatika/', icon: '03' },
                  { label: 'Program Studi',   href: '#peminatan',                                            icon: '04' },
                ].map(tile => (
                  <a
                    key={tile.label}
                    href={tile.href}
                    target={tile.href.startsWith('http') ? '_blank' : undefined}
                    rel={tile.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                    className="flex items-center justify-between gap-2 px-4 py-3 bg-gray-50 hover:bg-gray-100 border border-gray-200 transition-all group"
                  >
                    <span className="text-sm font-semibold text-gray-800">{tile.label}</span>
                    <span
                      className="text-xs font-black w-7 h-7 flex items-center justify-center text-white shrink-0 group-hover:opacity-90 transition"
                      style={{ background: __red }}
                    >
                      {tile.icon}
                    </span>
                  </a>
                ))}
              </div>
            </FadeIn>

            <FadeIn delay={120}>
              <div className="flex items-center gap-2 text-gray-400 text-sm">
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0Z" /><circle cx={12} cy={10} r={3} />
                </svg>
                Jl. Telekomunikasi No.1, Bojongsoang, Kabupaten Bandung, Jawa Barat
              </div>
            </FadeIn>
          </div>

          {/* - RIGHT: CAMPUS PHOTO - \\*/}
          <FadeIn className="lg:w-[52%] relative min-h-[360px] lg:min-h-full overflow-hidden bg-gray-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`${__cdn}/2024/07/FAKULTAS-IF-1.jpg`}
              alt="Gedung Fakultas Informatika Telkom University"
              className="absolute inset-0 w-full h-full object-cover"
            />
            {/* - PATTERN OVERLAY - \\*/}
            <div
              className="absolute inset-0"
              style={{
                background      : 'linear-gradient(135deg, rgba(0,0,0,0.08) 0%, transparent 60%)',
                backgroundImage : `radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px)`,
                backgroundSize  : '24px 24px',
              }}
            />
            {/* - FLOATING BADGE - \\*/}
            <div className="absolute bottom-8 left-8 text-white p-4 max-w-[220px]" style={{ background: __red }}>
              <p className="text-2xl font-black leading-none">Terakreditasi</p>
              <p className="text-sm font-semibold mt-1 text-white/80">BAN-PT Unggul</p>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ================================================== */}
      {/* SUCCESS STATS STRIP                               */}
      {/* ================================================== */}
      <section className="bg-white border-y border-gray-100">
        <div className="max-w-7xl mx-auto px-6">
          <div className="py-14 grid grid-cols-1 md:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr_auto_1fr] gap-0 items-center">

            {/* - LABEL - \\*/}
            <FadeIn>
              <div>
                <p className="text-xs font-bold tracking-widest uppercase text-gray-400 mb-1">Capaian</p>
                <h2 className="text-2xl md:text-3xl font-black text-gray-900 leading-snug">
                  Keunggulan<br />
                  <span style={{ color: __red }}>FIF Telkom.</span>
                </h2>
              </div>
            </FadeIn>

            {/* - DIVIDER - \\*/}
            {[0, 1, 2, 3].map(i => (
              <div key={i} className="hidden md:block w-px h-20 bg-gray-200 mx-auto" />
            ))}

            {/* - STAT CARDS - \\*/}
            {__stats.map((stat, i) => (
              <FadeIn key={stat.label} delay={i * 70}>
                <div className="text-center py-4">
                  <p className="text-4xl md:text-5xl font-black tabular-nums leading-none" style={{ color: __red }}>
                    {stat.value}{stat.suffix}
                  </p>
                  <p className="text-xs font-semibold text-gray-400 mt-2 tracking-wide uppercase">{stat.label}</p>
                </div>
              </FadeIn>
            ))}
          </div>

          {/* - FEATURE ROW - \\*/}
          <div className="pb-14 grid grid-cols-2 md:grid-cols-4 gap-4">
            <FadeIn delay={0}>
              <div className="bg-gray-50 border border-gray-200 p-6 flex flex-col gap-3">
                <span className="text-xs font-bold tracking-widest uppercase" style={{ color: __red }}>Teknik Informatika</span>
                <p className="text-gray-700 text-sm leading-relaxed">Kecerdasan buatan, rekayasa perangkat lunak, dan sistem berbasis data.</p>
              </div>
            </FadeIn>
            <FadeIn delay={70}>
              <div className="text-white p-6 flex flex-col gap-3" style={{ background: '#111' }}>
                <div className="w-10 h-10 rounded-full overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`${__cdn}/2024/07/Group-217-1.jpg`} alt="Dekan FIF" className="w-full h-full object-cover" />
                </div>
                <span className="text-xs font-bold tracking-widest uppercase text-white/60">Dekan</span>
                <p className="text-white text-sm font-semibold leading-snug">Dr. Ir. Husni Amani, MM., MSc.</p>
              </div>
            </FadeIn>
            <FadeIn delay={120}>
              <div className="p-6 flex flex-col gap-3 border border-gray-200" style={{ background: __red }}>
                <p className="text-4xl font-black text-white leading-none">7000+</p>
                <span className="text-xs font-bold tracking-widest uppercase text-white/70">Mahasiswa Aktif</span>
              </div>
            </FadeIn>
            <FadeIn delay={180}>
              <a
                href="https://telkomuniversity.ac.id/fakultas-informatika/"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-gray-900 p-6 flex flex-col justify-between gap-8 hover:bg-black transition-colors group"
              >
                <span className="text-white font-black text-lg leading-snug">Jelajahi<br />FIF Telkom.</span>
                <span className="text-white/50 text-sm group-hover:text-white transition-colors">Lihat semua artikel &#8594;</span>
              </a>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* ================================================== */}
      {/* TEMUKAN JALURMU (PEMINATAN CARDS)                 */}
      {/* ================================================== */}
      <section id="peminatan" className="py-20 px-6 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <FadeIn className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-12">
            <div>
              <p className="text-xs font-bold tracking-widest uppercase mb-2" style={{ color: __red }}>Program</p>
              <h2 className="text-3xl md:text-4xl font-black text-gray-900">Program Studi</h2>
            </div>
            <a
              href="https://telkomuniversity.ac.id/fakultas-informatika/"
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 text-sm font-semibold transition-colors"
              style={{ color: __red }}
            >
              Lihat Kurikulum &#8594;
            </a>
          </FadeIn>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              {
                title : 'Teknik Informatika',
                tag   : 'Program 01',
                desc  : 'Kecerdasan buatan, rekayasa perangkat lunak, dan sistem berbasis data untuk industri teknologi.',
                img   : `${__cdn}/2024/07/Group-357-1.png`,
                href  : 'https://telkomuniversity.ac.id/fakultas-informatika/',
              },
              {
                title : 'Sistem Informasi',
                tag   : 'Program 02',
                desc  : 'Integrasi teknologi dan bisnis untuk solusi sistem informasi bernilai tinggi bagi organisasi.',
                img   : `${__cdn}/2024/07/Group-217-1.jpg`,
                href  : 'https://telkomuniversity.ac.id/fakultas-informatika/',
              },
              {
                title : 'Ilmu Komputasi',
                tag   : 'Program 03',
                desc  : 'Komputasi saintifik, data sains, dan pemodelan matematika untuk permasalahan kompleks.',
                img   : `${__cdn}/2024/07/Group-296.jpg`,
                href  : 'https://telkomuniversity.ac.id/fakultas-informatika/',
              },
              {
                title : 'Teknik Komputer',
                tag   : 'Program 04',
                desc  : 'Arsitektur prosesor, sistem tertanam, dan elektronika digital untuk perangkat masa depan.',
                img   : `${__cdn}/2024/07/FAKULTAS-IF-1.jpg`,
                href  : 'https://telkomuniversity.ac.id/fakultas-informatika/',
              },
            ].map((item, i) => (
              <FadeIn key={item.title} delay={i * 70}>
                <a
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group block bg-white border border-gray-200 hover:shadow-lg transition-all duration-300 overflow-hidden flex flex-col h-full"
                >
                  <div className="relative overflow-hidden" style={{ aspectRatio: '4/3' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.img}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute top-3 left-3">
                      <span
                        className="text-[10px] font-black tracking-widest uppercase text-white px-2.5 py-1"
                        style={{ background: __red }}
                      >
                        {item.tag}
                      </span>
                    </div>
                  </div>
                  <div className="p-5 flex flex-col flex-1">
                    <h3 className="font-black text-gray-900 text-lg mb-2">{item.title}</h3>
                    <p className="text-gray-500 text-sm leading-relaxed flex-1">{item.desc}</p>
                    <span className="mt-4 text-sm font-semibold transition-colors" style={{ color: __red }}>
                      Pelajari &#8594;
                    </span>
                  </div>
                </a>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================== */}
      {/* SAMBUTAN KAPRODI                                  */}
      {/* ================================================== */}
      <section id="akademik" className="py-20 px-6 bg-white">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">

          {/* - LEFT: TEXT - \\*/}
          <FadeIn>
            <p className="text-xs font-bold tracking-widest uppercase mb-3" style={{ color: __red }}>Sambutan</p>
            <h2 className="text-3xl md:text-4xl font-black text-gray-900 mb-8 leading-tight">
              Dekan Fakultas Informatika
            </h2>
            <blockquote className="border-l-4 pl-6 mb-8" style={{ borderColor: __red }}>
              <p className="text-gray-700 text-lg md:text-xl font-medium leading-relaxed italic">
                &ldquo;Kami berkomitmen menjadi fakultas informatika terkemuka di Asia Tenggara,
                menghasilkan lulusan yang berkompeten secara teknis, adaptif terhadap perubahan
                teknologi, dan mampu memberikan kontribusi nyata bagi kemajuan bangsa.&rdquo;
              </p>
            </blockquote>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 overflow-hidden rounded-full border-2 shrink-0" style={{ borderColor: __red }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`${__cdn}/2024/07/Group-217-1.jpg`}
                  alt="Dekan FIF"
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <p className="font-black text-gray-900">Dr. Ir. Husni Amani, MM., MSc.</p>
                <p className="text-sm text-gray-500">Dekan Fakultas Informatika, Telkom University</p>
              </div>
            </div>

            {/* - QUICK STATS ROW - \\*/}
            <div className="mt-10 grid grid-cols-3 gap-4 border-t border-gray-100 pt-8">
              {[
                { value: 'BAN-PT',  label: 'Akreditasi Nasional'     },
                { value: 'ABET',    label: 'Akreditasi Internasional' },
                { value: '2007',    label: 'Tahun Berdiri'            },
              ].map(s => (
                <div key={s.label}>
                  <p className="text-xl font-black text-gray-900">{s.value}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
          </FadeIn>

          {/* - RIGHT: PHOTO - \\*/}
          <FadeIn delay={80} className="relative">
            <div className="relative overflow-hidden" style={{ aspectRatio: '3/4' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`${__cdn}/2024/07/Group-217-1.jpg`}
                alt="Dekan Fakultas Informatika Telkom University"
                className="w-full h-full object-cover"
              />
            </div>
            {/* - DECORATIVE CORNER - \\*/}
            <div
              className="absolute -bottom-3 -right-3 w-24 h-24 -z-10"
              style={{ background: __red, opacity: 0.15 }}
            />
          </FadeIn>
        </div>
      </section>

      {/* ================================================== */}
      {/* VIDEO PROFIL FIF                                  */}
      {/* ================================================== */}
      <section id="video" className="py-20 px-6 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <FadeIn className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
            <div>
              <p className="text-xs font-bold tracking-widest uppercase mb-2" style={{ color: __red }}>Media</p>
              <h2 className="text-3xl md:text-4xl font-black text-gray-900">Video Profil FIF</h2>
            </div>
            <a
              href="https://www.youtube.com/@TelkomUniversity"
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 flex items-center gap-2 text-sm font-semibold transition-colors"
              style={{ color: '#FF0000' }}
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
              </svg>
              YouTube Channel &#8594;
            </a>
          </FadeIn>

          <FadeIn delay={80}>
            <div className="relative w-full overflow-hidden" style={{ paddingBottom: '56.25%' }}>
              <iframe
                src={`https://www.youtube.com/embed/${__video_id}?rel=0&modestbranding=1`}
                title="Video Profil Fakultas Informatikaultas Informatika Telkom University"
                className="absolute inset-0 w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ================================================== */}
      {/* ACARA & BERITA                                    */}
      {/* ================================================== */}
      <section id="acara" className="py-20 px-6 bg-white">
        <div className="max-w-7xl mx-auto">

          {/* - ACARA - \\*/}
          <FadeIn className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
            <div>
              <p className="text-xs font-bold tracking-widest uppercase mb-2" style={{ color: __red }}>Kegiatan</p>
              <h2 className="text-3xl md:text-4xl font-black text-gray-900">Acara</h2>
            </div>
            <a
              href="https://telkomuniversity.ac.id/fakultas-informatikinformatika/"
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 text-sm font-semibold transition-colors"
              style={{ color: __red }}
            >
              Semua Acara &#8594;
            </a>
          </FadeIn>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-20">
            {__acara.map((item, i) => {
              const parts = item.date.split(' ')
              return (
                <FadeIn key={item.title} delay={i * 70}>
                  <a
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group block"
                  >
                    <div className="relative overflow-hidden bg-gray-100 mb-3" style={{ aspectRatio: '554/674' }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={item.img}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div
                        className="absolute top-3 left-3 text-white text-center leading-none z-10 px-2.5 py-2 min-w-[44px]"
                        style={{ background: __red }}
                      >
                        {parts.length >= 3 ? (
                          <>
                            <span className="block text-[10px] font-bold tracking-wider">{parts[2]}</span>
                            <span className="block text-2xl font-black leading-tight">{parts[0]}</span>
                            <span className="block text-[10px] font-bold tracking-wider">{parts[1]}</span>
                          </>
                        ) : (
                          <span className="block text-sm font-black">{parts[0]}</span>
                        )}
                      </div>
                    </div>
                    <p className="text-gray-800 text-sm font-semibold leading-snug line-clamp-3 group-hover:text-red-700 transition-colors">
                      {item.title}
                    </p>
                  </a>
                </FadeIn>
              )
            })}
          </div>

          {/* - BERITA - \\*/}
          <div id="berita">
          <FadeIn className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
            <div>
              <p className="text-xs font-bold tracking-widest uppercase mb-2" style={{ color: __red }}>Informasi</p>
              <h2 className="text-3xl md:text-4xl font-black text-gray-900">Berita Terbaru</h2>
            </div>
            <a
              href="https://telkomuniversity.ac.id/fakultas-informatika/formatika/"
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 text-sm font-semibold transition-colors"
              style={{ color: __red }}
            >
              Semua Berita &#8594;
            </a>
          </FadeIn>

          <div className="grid md:grid-cols-3 gap-6">
            {__berita.map((item, i) => {
              const parts = item.date.split(' ')
              return (
                <FadeIn key={item.title} delay={i * 90}>
                  <a
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex flex-col h-full"
                  >
                    <div className="relative overflow-hidden bg-gray-100 mb-3" style={{ aspectRatio: '554/451' }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={item.img}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div
                        className="absolute top-3 left-3 text-white text-center leading-none z-10 px-2.5 py-2 min-w-[44px]"
                        style={{ background: __red }}
                      >
                        {parts.length >= 3 ? (
                          <>
                            <span className="block text-[10px] font-bold tracking-wider">{parts[2]}</span>
                            <span className="block text-2xl font-black leading-tight">{parts[0]}</span>
                            <span className="block text-[10px] font-bold tracking-wider">{parts[1]}</span>
                          </>
                        ) : (
                          <span className="block text-sm font-black">{parts[0]}</span>
                        )}
                      </div>
                    </div>
                    <p className="text-gray-800 font-semibold text-sm leading-relaxed line-clamp-3 group-hover:text-red-700 transition-colors flex-1">
                      {item.title}
                    </p>
                  </a>
                </FadeIn>
              )
            })}
          </div>
          </div>
        </div>
      </section>

      {/* ================================================== */}
      {/* KERJA SAMA                                        */}
      {/* ================================================== */}
      <section id="kerjasama" className="py-20 px-6 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <FadeIn className="text-center mb-12">
            <p className="text-xs font-bold tracking-widest uppercase mb-2" style={{ color: __red }}>Mitra</p>
            <h2 className="text-3xl md:text-4xl font-black text-gray-900">Kerja Sama</h2>
          </FadeIn>

          <FadeIn delay={80}>
            <div className="flex flex-wrap items-center justify-center gap-4">
              {__partners.map(p => (
                <div
                  key={p.name}
                  title={p.name}
                  className="w-24 h-24 flex items-center justify-center p-3 bg-white border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.img} alt={p.name} className="w-full h-full object-contain" />
                </div>
              ))}
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ================================================== */}
      {/* SCROLLING MARQUEE                                 */}
      {/* ================================================== */}
      <div className="overflow-hidden py-4 border-y border-gray-800" style={{ background: '#111' }}>
        <div
          className="flex gap-16 whitespace-nowrap text-white/60 text-sm font-bold tracking-widest uppercase"
          style={{
            animation : 'marquee 28s linear infinite',
          }}
        >
          {Array.from({ length: 6 }).map((_, i) => (
            <span key={i} className="shrink-0">
              &#8226;&nbsp; FAKULTAS INFORMATIKA &nbsp;&#8226;&nbsp; TELKOM UNIVERSITY &nbsp;&#8226;&nbsp; TALENTA DIGITAL UNGGULp;
            </span>
          ))}
        </div>
        <style>{`@keyframes marquee { from { transform: translateX(0) } to { transform: translateX(-50%) } }`}</style>
      </div>

      {/* ================================================== */}
      {/* FOOTER / KONTAK                                   */}
      {/* ================================================== */}
      <footer id="kontak" style={{ background: '#111111', color: '#fff' }}>

        {/* - CTA STRIP - \\*/}
        <div className="px-6 py-16 text-center" style={{ background: __red }}>
          <p className="text-xs font-bold tracking-widest uppercase text-white/70 mb-3">Bergabung</p>
          <h3 className="text-3xl md:text-4xl font-black text-white mb-4 leading-tight">Hubungi Kami</h3>
          <p className="text-white/75 text-sm mb-2">Email: fiftelkomuniversity.ac.id</p>
          <p className="text-white/75 text-sm mb-8 max-w-md mx-auto">
            Gedung Fakultas Industri Kreatif, Telkom University,<br />
            Jl. Telekomunikasi No.1, Bojongsoang, Kabupaten Bandung.
          </p>
          <a
            href="https://smb.telkomuniversity.ac.id/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-8 py-3 bg-white font-bold text-sm hover:bg-gray-100 transition"
            style={{ color: __red }}
          >
            Mari bergabung bersama kami &#8594;
          </a>
        </div>

        {/* - GRID - \\*/}
        <div className="max-w-7xl mx-auto px-6 py-14 grid md:grid-cols-3 gap-10">

          {/* - COL 1 - \\*/}
          <div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`${__cdn}/2022/02/logo3-e1511767184374.png`}
              alt="Fakultas Informatika Telkom University"
              className="h-12 w-auto object-contain mb-5"
            />
            <h4 className="text-white font-bold mb-3 text-sm tracking-widest uppercase">
              Fakultas Informatika
            </h4>
            <p className="text-white/50 text-sm leading-relaxed">
              Fakultas Informatika Telkom University — pusat pendidikan teknologi informasi
              dan komunikasi terkemuka, terakreditasi BAN-PT Unggulreditasi BAN-PT Unggul.
            </p>
          </div>

          {/* - COL 2 - \\*/}
          <div>
            <h4 className="text-white font-bold mb-4 text-sm tracking-widest uppercase">Program Studi</h4>
            <ul className="space-y-2">
              {[
                { label: 'Teknik Informatika',       href: 'https://telkomuniversity.ac.id/fakultas-informatika/' },
                { label: 'Sistem Informasi',          href: 'https://telkomuniversity.ac.id/fakultas-informatika/' },
                { label: 'Ilmu Komputasi',            href: 'https://telkomuniversity.ac.id/fakultas-informatika/' },
                { label: 'Teknik Komputer',           href: 'https://telkomuniversity.ac.id/fakultas-informatika/' },
                { label: 'Rekayasa Perangkat Lunak',  href: 'https://telkomuniversity.ac.id/fakultas-informatika/' },
              ].map(lnk => (
                <li key={lnk.label}>
                  <a
                    href={lnk.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-white/50 hover:text-white text-sm transition-colors"
                  >
                    {lnk.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* - COL 3 - \\*/}
          <div>
            <h4 className="text-white font-bold mb-4 text-sm tracking-widest uppercase">Sosial Media</h4>
            <ul className="space-y-2">
              {__socials.map(s => (
                <li key={s.label}>
                  <a
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-white/50 hover:text-white text-sm transition-colors"
                  >
                    {s.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* - BOTTOM BAR - \\*/}
        <div
          className="border-t px-6 py-5 flex flex-col md:flex-row items-center justify-between gap-3 text-xs"
          style={{ borderColor: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.3)' }}
        >
          <span>&copy; All rights reserved. Fakultas Informatika Telkom University.</span>
          <a
            href="https://telkomuniversity.ac.id/fakultas-informatika/"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-white/60 transition-colors"
          >
            telkomuniversity.ac.id/fakultas-informatika
          </a>
        </div>
      </footer>
    </main>
  )
}
