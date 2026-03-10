/*
 * Atomicals Bot for Discord
 * Copyright (C) 2026 Atomicals LancarJaya
 *
 * Licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
 * You may not use this file except in compliance with the License.
 * See the LICENSE file for more information.
 */

'use client'

import { useState } from 'react'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Scale, ShieldCheck, DangerTriangle, DocumentText, UserCross, FolderOpen, Database, EyeClosed, ShieldWarning, Global, Chart, AltArrowLeft } from '@solar-icons/react'
import { useRouter } from 'next/navigation'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { cn } from "@/lib/utils"

const translations = {
  en: {
    title: 'Terms of Service & Privacy Policy',
    desc: 'Please read the following policies carefully before using the Atomic Bypass service.',
    btn_back: 'Back',
    lang: 'English',
    last_updated: 'Last updated: 5 March, 2026',
    
    // Terms of Service
    tos_title: 'Terms of Service',
    tos_items: [
      {
        value: 'tos_1',
        title: 'Acceptance of Terms',
        subtitle: 'Agreement to policies',
        content: 'By accessing or using the Atomic Bypass service, you agree to be bound by these Terms of Service. If you do not agree to all the terms and conditions, you must not use the service.',
        icon: Scale,
        textColor: "text-blue-500",
        bgColor: "bg-blue-500/10",
      },
      {
        value: 'tos_2',
        title: 'Acceptable Use',
        subtitle: 'Rules of usage',
        content: 'The service is provided strictly for educational and accessibility purposes. You agree not to use the service for any malicious, illegal, or unauthorized activities. This includes, but is not limited to, bypassing security measures for unlawful access, distributing malware, or launching Denial of Service (DDoS) attacks against target websites.',
        icon: ShieldCheck,
        textColor: "text-emerald-500",
        bgColor: "bg-emerald-500/10",
      },
      {
        value: 'tos_3',
        title: 'Disclaimer of Warranties',
        subtitle: 'Service availability',
        content: 'The service is provided "as is" without any warranty of any kind. We do not guarantee that the service will be uninterrupted, secure, or error-free. The links you choose to bypass are processed entirely at your own risk.',
        icon: DangerTriangle,
        textColor: "text-orange-400",
        bgColor: "bg-orange-400/10",
      },
      {
        value: 'tos_4',
        title: 'Limitation of Liability',
        subtitle: 'Protection of developers',
        content: 'Under no circumstances shall Atomic or its developers be liable for any direct, indirect, incidental, or consequential damages resulting from the use or inability to use the service, or the content accessed through the bypassed links.',
        icon: DocumentText,
        textColor: "text-zinc-400",
        bgColor: "bg-zinc-400/10",
      },
      {
        value: 'tos_5',
        title: 'Service Abuse and Termination',
        subtitle: 'Ban policy',
        content: 'We reserve the right to monitor usage patterns. Any form of abuse, including but not limited to API scraping, botting, or exploiting vulnerabilities, will result in immediate termination of your access. We may ban specific Discord users or entire servers from using the bot without prior notice.',
        icon: UserCross,
        textColor: "text-red-500",
        bgColor: "bg-red-500/10",
      },
      {
        value: 'tos_6',
        title: 'Open Source Declaration',
        subtitle: 'Transparency and trust',
        content: 'This entire project is fully Open Source. You can review, audit, and contribute to the source code on our public repository. This ensures transparency in how your data is handled and gives the community the power to improve the service together.',
        icon: FolderOpen,
        textColor: "text-zinc-200",
        bgColor: "bg-zinc-800/50",
      }
    ],

    // Privacy Policy
    priv_title: 'Privacy Policy',
    priv_items: [
      {
        value: 'priv_1',
        title: 'Information Collection',
        subtitle: 'What data we collect',
        content: 'When you use our bypass service, we collect and temporarily store the URLs you submit to process your requests. For authentication, access management, and rate-limiting purposes, we also collect your Discord User ID, username, and Guild (Server) ID.',
        icon: Database,
        textColor: "text-indigo-400",
        bgColor: "bg-indigo-400/10",
      },
      {
        value: 'priv_2',
        title: 'Data Usage',
        subtitle: 'How we use your data',
        content: 'The data collected is strictly used to provide, maintain, and improve the bypass service. URL logs are used solely for debugging technical issues and identifying potential service abuse or spam.',
        icon: EyeClosed,
        textColor: "text-teal-400",
        bgColor: "bg-teal-400/10",
      },
      {
        value: 'priv_3',
        title: 'Data Retention and Security',
        subtitle: 'Storing your data securely',
        content: 'We do not retain bypassed URLs indefinitely; system logs are periodically cleared. We employ reasonable security measures to protect your data from unauthorized access. We explicitly do NOT sell, rent, or share your personal data or bypassed links with third parties.',
        icon: ShieldWarning,
        textColor: "text-purple-400",
        bgColor: "bg-purple-400/10",
      },
      {
        value: 'priv_4',
        title: 'Third-Party Interactions',
        subtitle: 'External websites',
        content: 'Our service acts as a proxy to bypass link shorteners. When you use our service, you are ultimately interacting with third-party websites. We are not responsible for the privacy practices, tracking, or content of these external sites.',
        icon: Global,
        textColor: "text-sky-400",
        bgColor: "bg-sky-400/10",
      },
      {
        value: 'priv_5',
        title: 'Analytics',
        subtitle: 'Aggregated metrics',
        content: 'We track aggregated and anonymized metrics, such as the total number of bypassed links globally, to monitor the health, performance, and usage limits of our infrastructure.',
        icon: Chart,
        textColor: "text-rose-400",
        bgColor: "bg-rose-400/10",
      }
    ]
  },
  id: {
    title: 'Syarat Ketentuan & Kebijakan Privasi',
    desc: 'Harap membaca kebijakan berikut dengan saksama sebelum menggunakan layanan Atomic Bypass.',
    btn_back: 'Kembali',
    lang: 'Bahasa Indonesia',
    last_updated: 'Terakhir diperbarui: 5 Maret, 2026',

    // Terms of Service
    tos_title: 'Syarat dan Ketentuan',
    tos_items: [
      {
        value: 'tos_1',
        title: 'Penerimaan Syarat',
        subtitle: 'Persetujuan kebijakan',
        content: 'Dengan mengakses atau menggunakan layanan Atomic Bypass, Anda setuju untuk terikat oleh Syarat dan Ketentuan ini. Jika Anda tidak menyetujui seluruh syarat dan ketentuan yang berlaku, Anda tidak diperkenankan menggunakan layanan ini.',
        icon: Scale,
        textColor: "text-blue-500",
        bgColor: "bg-blue-500/10",
      },
      {
        value: 'tos_2',
        title: 'Penggunaan yang Diizinkan',
        subtitle: 'Aturan pemakaian',
        content: 'Layanan ini disediakan semata-mata untuk tujuan edukasi dan aksesibilitas. Anda sepakat untuk tidak menggunakan layanan ini untuk aktivitas yang bersifat berbahaya, ilegal, atau tidak sah. Hal ini mencakup, namun tidak terbatas pada, menghindari sistem keamanan untuk akses ilegal, menyebarkan perangkat lunak berbahaya (malware), atau melancarkan serangan Denial of Service (DDoS) terhadap situs web target.',
        icon: ShieldCheck,
        textColor: "text-emerald-500",
        bgColor: "bg-emerald-500/10",
      },
      {
        value: 'tos_3',
        title: 'Penafian Jaminan',
        subtitle: 'Ketersediaan layanan',
        content: 'Layanan ini disediakan "sebagaimana adanya" tanpa jaminan dalam bentuk apa pun. Kami tidak menjamin bahwa layanan akan beroperasi tanpa gangguan, aman, atau bebas dari kesalahan. Tautan yang Anda proses menggunakan layanan kami adalah sepenuhnya risiko Anda sendiri.',
        icon: DangerTriangle,
        textColor: "text-orange-400",
        bgColor: "bg-orange-400/10",
      },
      {
        value: 'tos_4',
        title: 'Batasan Tanggung Jawab',
        subtitle: 'Perlindungan pengembang',
        content: 'Dalam keadaan apa pun, Atomic beserta para pengembangnya tidak bertanggung jawab atas kerugian langsung, tidak langsung, insidental, atau konsekuensial yang timbul akibat penggunaan atau ketidakmampuan menggunakan layanan ini, maupun atas konten yang diakses melalui tautan tersebut.',
        icon: DocumentText,
        textColor: "text-zinc-400",
        bgColor: "bg-zinc-400/10",
      },
      {
        value: 'tos_5',
        title: 'Penyalahgunaan dan Pemutusan Akses',
        subtitle: 'Kebijakan blokir (ban)',
        content: 'Kami berhak memantau pola penggunaan layanan. Segala bentuk penyalahgunaan, termasuk namun tidak terbatas pada ekstraksi data API secara paksa (scraping), penggunaan bot otomatis, atau eksploitasi celah keamanan, akan mengakibatkan pemutusan akses seketika. Kami dapat memblokir pengguna Discord tertentu atau bahkan seluruh server tanpa pemberitahuan sebelumnya.',
        icon: UserCross,
        textColor: "text-red-500",
        bgColor: "bg-red-500/10",
      },
      {
        value: 'tos_6',
        title: 'Deklarasi Sumber Terbuka (Open Source)',
        subtitle: 'Transparansi dan kepercayaan',
        content: 'Situs web dan bot ini sepenuhnya bersifat Open Source. Anda dapat meninjau, mengaudit, dan berkontribusi langsung pada kode sumber kami melalui repositori publik yang tersedia. Hal ini memastikan transparansi mutlak mengenai bagaimana data Anda ditangani serta memberikan kebebasan bagi komunitas untuk turut mengembangkan layanan ini bersama-sama.',
        icon: FolderOpen,
        textColor: "text-zinc-200",
        bgColor: "bg-zinc-800/50",
      }
    ],

    // Privacy Policy
    priv_title: 'Kebijakan Privasi',
    priv_items: [
      {
        value: 'priv_1',
        title: 'Pengumpulan Informasi',
        subtitle: 'Data yang dikumpulkan',
        content: 'Saat Anda menggunakan layanan bypass kami, kami mengumpulkan dan menyimpan sementara tautan (URL) yang Anda kirimkan untuk memproses permintaan Anda. Untuk keperluan autentikasi, manajemen akses, dan pembatasan laju penggunaan (rate-limiting), kami juga menyimpan ID Pengguna Discord, nama pengguna, dan ID Server (Guild) Anda.',
        icon: Database,
        textColor: "text-indigo-400",
        bgColor: "bg-indigo-400/10",
      },
      {
        value: 'priv_2',
        title: 'Penggunaan Data',
        subtitle: 'Cara data digunakan',
        content: 'Data yang dikumpulkan digunakan secara eksklusif untuk menyediakan, memelihara, dan meningkatkan kualitas layanan bypass. Catatan log URL hanya digunakan untuk menelusuri masalah teknis dan mengidentifikasi potensi penyalahgunaan layanan atau spam.',
        icon: EyeClosed,
        textColor: "text-teal-400",
        bgColor: "bg-teal-400/10",
      },
      {
        value: 'priv_3',
        title: 'Penyimpanan dan Keamanan Data',
        subtitle: 'Keamanan data Anda',
        content: 'Kami tidak menyimpan tautan URL yang diproses untuk jangka waktu yang tidak terbatas; log sistem akan dibersihkan secara berkala. Kami menerapkan langkah-langkah keamanan yang wajar untuk melindungi data Anda dari akses yang tidak sah. Kami secara tegas TIDAK menjual, menyewakan, atau membagikan data pribadi atau tautan Anda kepada pihak ketiga.',
        icon: ShieldWarning,
        textColor: "text-purple-400",
        bgColor: "bg-purple-400/10",
      },
      {
        value: 'priv_4',
        title: 'Interaksi dengan Pihak Ketiga',
        subtitle: 'Situs web eksternal',
        content: 'Layanan kami bertindak sebagai perantara untuk melewati pemendek tautan. Saat menggunakan layanan kami, Anda pada dasarnya berinteraksi dengan situs web pihak ketiga. Kami tidak bertanggung jawab atas praktik privasi, pelacakan, atau konten dari situs eksternal tersebut.',
        icon: Global,
        textColor: "text-sky-400",
        bgColor: "bg-sky-400/10",
      },
      {
        value: 'priv_5',
        title: 'Analitik',
        subtitle: 'Metrik anonim',
        content: 'Kami melacak metrik agregat yang dianonimkan, seperti jumlah total tautan yang berhasil diproses secara global, guna memantau kesehatan, kinerja, dan batas penggunaan infrastruktur layanan kami.',
        icon: Chart,
        textColor: "text-rose-400",
        bgColor: "bg-rose-400/10",
      }
    ]
  }
}

export default function BypassTerms() {
  const router = useRouter()
  const [lang, set_lang] = useState<'en' | 'id'>('en')
  
  const t = translations[lang]

  return (
    <section className="min-h-screen py-8 sm:py-16 lg:py-20 bg-background text-foreground dark selection:bg-primary/30">
      <div className="max-w-7xl xl:px-16 lg:px-8 px-4 mx-auto">
        <div className="flex flex-col gap-8 items-center w-full">
          
          <a href="/bypass" className="flex items-center justify-center gap-4 mb-2">
            <img
              src="/atomic-logo-with-bg.png"
              alt="Atomic Bypass"
              className="w-14 h-14 rounded-2xl object-cover shadow-sm"
            />
            <span className="text-3xl font-bold tracking-tight text-foreground">Atomic Softworks</span>
          </a>

          <Card className="p-0 max-w-4xl w-full gap-0 bg-card border-border shadow-sm">
            
            <CardHeader className="gap-6 px-6 pt-4 border-b border-border pb-4 flex flex-row items-center justify-between">
              <h2 className="text-base font-medium text-card-foreground">
                {t.title}
              </h2>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => set_lang(lang === 'en' ? 'id' : 'en')}
                className="h-8 gap-2 text-xs"
              >
                <Global size={14} />
                {t.lang}
              </Button>
            </CardHeader>
            
            <CardContent className="py-8 px-6 sm:px-10">
              <div className="flex flex-col gap-12">
                
                <div className="flex flex-col gap-2">
                  <p className="text-sm text-muted-foreground font-normal">
                    {t.desc}
                  </p>
                </div>

                <div className="flex lg:flex-row flex-col gap-10">
                  {/* - LEFT COLUMN: TERMS OF SERVICE - \\ */}
                  <div className="flex-1 lg:pe-10 lg:border-e border-border">
                    <div className="flex flex-col gap-6">
                      <div className="flex flex-col gap-1">
                        <h6 className="text-primary text-sm font-medium uppercase tracking-wider">
                          {t.tos_title}
                        </h6>
                      </div>
                      
                      <Accordion type="multiple" className="w-full -space-y-px" defaultValue={['tos_1']}>
                        {t.tos_items.map((item) => {
                          const Icon = item.icon
                          return (
                            <AccordionItem
                              key={item.value}
                              value={item.value}
                              className="border bg-background px-4 first:rounded-t-lg last:rounded-b-lg last:border-b"
                            >
                              <AccordionTrigger className="hover:no-underline py-4">
                                <div className="flex items-center gap-4">
                                  <div className={cn("p-2.5 rounded-xl shrink-0", item.bgColor, item.textColor)}>
                                    <Icon size={20} className="w-5 h-5" />
                                  </div>
                                  <div className="flex flex-col items-start text-left">
                                    <span className="text-sm font-semibold">{item.title}</span>
                                    <span className="text-xs text-muted-foreground font-normal">
                                      {item.subtitle}
                                    </span>
                                  </div>
                                </div>
                              </AccordionTrigger>
                              <AccordionContent className="ps-[3.25rem] pb-4">
                                <p className="text-sm text-muted-foreground leading-relaxed text-justify pe-2">
                                  {item.content}
                                </p>
                              </AccordionContent>
                            </AccordionItem>
                          )
                        })}
                      </Accordion>
                    </div>
                  </div>
                  
                  {/* - RIGHT COLUMN: PRIVACY POLICY - \\ */}
                  <div className="flex-1 lg:ps-4">
                    <div className="flex flex-col gap-6">
                      <div className="flex flex-col gap-1">
                        <h6 className="text-primary text-sm font-medium uppercase tracking-wider">
                          {t.priv_title}
                        </h6>
                      </div>
                      
                      <Accordion type="multiple" className="w-full -space-y-px" defaultValue={['priv_1']}>
                        {t.priv_items.map((item) => {
                          const Icon = item.icon
                          return (
                            <AccordionItem
                              key={item.value}
                              value={item.value}
                              className="border bg-background px-4 first:rounded-t-lg last:rounded-b-lg last:border-b"
                            >
                              <AccordionTrigger className="hover:no-underline py-4">
                                <div className="flex items-center gap-4">
                                  <div className={cn("p-2.5 rounded-xl shrink-0", item.bgColor, item.textColor)}>
                                    <Icon size={20} className="w-5 h-5" />
                                  </div>
                                  <div className="flex flex-col items-start text-left">
                                    <span className="text-sm font-semibold">{item.title}</span>
                                    <span className="text-xs text-muted-foreground font-normal">
                                      {item.subtitle}
                                    </span>
                                  </div>
                                </div>
                              </AccordionTrigger>
                              <AccordionContent className="ps-[3.25rem] pb-4">
                                <p className="text-sm text-muted-foreground leading-relaxed text-justify pe-2">
                                  {item.content}
                                </p>
                              </AccordionContent>
                            </AccordionItem>
                          )
                        })}
                      </Accordion>
                    </div>
                  </div>
                </div>

              </div>
            </CardContent>
            
            <CardFooter className="[.border-t]:pt-5 py-5 px-6 border-t border-border flex sm:flex-row flex-col justify-between sm:items-center items-start gap-5 bg-muted/20">
              <p className="text-muted-foreground text-sm font-normal">{t.last_updated}</p>
              <div className="flex gap-3 items-center">
                <Button 
                  variant="outline" 
                  onClick={() => router.back()}
                  className="rounded-lg cursor-pointer h-9 shadow-xs text-sm"
                >
                  <AltArrowLeft size={16} />
                  {t.btn_back}
                </Button>
              </div>
            </CardFooter>

          </Card>
        </div>
      </div>
    </section>
  )
}
