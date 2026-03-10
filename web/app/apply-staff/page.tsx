/*
 * Atomicals Bot for Discord
 * Copyright (C) 2026 Atomicals LancarJaya
 *
 * Licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
 * You may not use this file except in compliance with the License.
 * See the LICENSE file for more information.
 */

"use client"

import { useEffect, useRef, useState }                                                                                       from "react"
import { useRouter }                                                                                                         from "next/navigation"
import { Button }                                                                                                            from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader }                                                                         from "@/components/ui/card"
import { Field, FieldLabel }                                                                                                 from "@/components/ui/field"
import { Input }                                                                                                             from "@/components/ui/input"
import { Textarea }                                                                                                          from "@/components/ui/textarea"
import { Select as ShadcnSelect, SelectContent, SelectItem, SelectTrigger, SelectValue }                                     from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter }                                 from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { ScrollArea }                                                                                                        from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage }                                                                               from "@/components/ui/avatar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuCheckboxItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Skeleton }                                                                                                          from "@/components/ui/skeleton"
import { Popover, PopoverContent, PopoverTrigger }                                                                           from "@/components/ui/popover"
import { Calendar }                                                                                                          from "@/components/ui/calendar"
import { AtomicLogo }                                                                                                        from "@/components/icons/atomic_logo"
import { Loader2, CheckCircle2, Languages, FileText, CalendarIcon, ArrowUpRight, Bell }                                      from "lucide-react"
import { format }                                                                                                            from "date-fns"
import { get_device_fingerprint }                                                                                            from "@/lib/utils/fingerprint"
import Image                                                                                                                 from "next/image"

const __language_options = [
  { value: "Indonesian", label: "Indonesian", flag: "🇮🇩" },
  { value: "English",    label: "English",    flag: "🇺🇸" },
  { value: "Malaysian",  label: "Malaysian",  flag: "🇲🇾" },
  { value: "Tagalog",    label: "Tagalog",    flag: "🇵🇭" },
  { value: "Japanese",   label: "Japanese",   flag: "🇯🇵" },
  { value: "Korean",     label: "Korean",     flag: "🇰🇷" },
  { value: "Other",      label: "Other",      flag: "🌐" }
]

const __translations = {
  English: {
    ui: {
      basic_info: "Basic Info",
      communication: "Communication",
      scenarios: "Scenarios",
      experience: "Experience & Why You",
      agreements: "Before You Go",
      yes: "Yes",
      no: "No",
      select_option: "Select an option",
      select_languages: "Pick Languages",
      selected: "picked",
      submit: "Send Application",
      applicant_profile: "Your Profile",
      discord_identity: "The Discord account tied to this application.",
      terms_agree: "By sending this, you confirm everything you wrote is honest and accurate.",
      form_title: "Staff Application",
      form_desc: "Answer everything honestly — your draft saves automatically as you type.",
      pick_date: "Pick a date",
      not_now: "Not Now",
      final_confirmation: "One Last Thing",
      final_desc_1: "You're about to send your application. Ready?",
      final_desc_2: "Once sent, you can't go back and change anything. Make sure everything looks good first.",
      select_lang_title: "Pick Your Language",
      select_lang_desc: "Which language do you want the questions in? This won't affect the spoken languages you list later.",
      success_title: "Done!",
      success_desc: "We got your application. We'll check it out and hit you up on Discord if you make it to the next round. Make sure your DMs are open!",
      view_application: "View Application"
    },
    questions: {
      full_name: "Full Name *",
      dob: "Date of Birth *",
      language_spoken: "Languages You Speak *",
      past_cs_experience: "Have you ever served a buyer / been customer service before? *",
      past_staff_experience: "Have you ever been a staff member in another hub/server? *",
      active_other_hub: "Are you currently active in any other hub besides Atomic? *",
      upset_users: "What do you do when a buyer is angry or upset? *",
      uncertainty: "How do you handle situations where you're not sure what to do? *",
      unsure_case: "If you're stuck on a specific case, what's your move? *",
      why_join: "Why do you want to join Euphoria's staff team? *",
      good_fit: "Why do you think you'd be a good Support Rep? *",
      other_exp: "Any past experience worth mentioning? *",
      working_mic: "Got a working mic? Would you be okay with a voice interview if you get in? *",
      understand_abuse: "You get that misusing staff power or going MIA can get you removed, right? *",
      additional: "Anything else you want to ask or tell us? (Say \"No\" if nothing) *"
    },
    placeholders: {
      name: "e.g. Afiez",
      explain: "Walk us through your reasoning...",
      upset: "What would you actually do or say?",
      uncertainty: "Be real — what's your process?",
      other_exp: "Mod roles, support experience, anything relevant..."
    },
    warning_dialog: {
      title: "Atomicals Staff Recruitment — Wave 14",
      desc: "Read through this before continuing. Scroll to the bottom to unlock the button.",
      rule_1_title: "No AI Responses",
      rule_1_desc: "Write everything yourself. Using ChatGPT, Claude, or any other AI tool to write your answers is an instant rejection — no exceptions.",
      rule_2_title: "What You'll Be Doing",
      rule_2_desc: "You'll be helping buyers through ticket transactions and handling complaints. The job is making sure buyers are happy and keeping things smooth.",
      rule_3_title: "What We're Looking For",
      rule_3_desc: "You need to be able to communicate well in Indonesian and English. You also need patience, a calm head, and the ability to handle multiple things at once. Minimum age is 15+, and you'll need a mic for the voice interview.",
      rule_4_title: "What We Expect",
      rule_4_desc: "You'll work together with other teams to keep the community running well. If something goes sideways, escalate it. Always stay professional when talking to people.",
      button: "Got It — Take Me to the Form"
    },
    blacklist_dialog: {
      title: "You are blacklisted",
      desc : "Your account has been flagged and is not eligible to submit a staff application.",
      flag : "This device will not be able to fill out the form again.",
      btn  : "Go Back"
    },
    closed_dialog: {
      title: "Recruitment is taking a break 👋",
      desc : "We're currently closing staff applications for a bit. But don't worry, it's not forever! We'll let everyone know once the next wave opens. Stay tuned so you don't miss out!",
      btn  : "Got it, take me back"
    }
  },
  Indonesia: {
    ui: {
      basic_info: "Info Dasar",
      communication: "Komunikasi",
      scenarios: "Skenario",
      experience: "Pengalaman & Alasanmu",
      agreements: "Sebelum Lanjut",
      yes: "Ya",
      no: "Tidak",
      select_option: "Pilih opsi",
      select_languages: "Pilih Bahasa",
      selected: "dipilih",
      submit: "Kirim Lamaran",
      applicant_profile: "Profilmu",
      discord_identity: "Akun Discord yang terhubung ke lamaran ini.",
      terms_agree: "Dengan mengirim ini, kamu memastikan semua yang kamu tulis jujur dan benar.",
      form_title: "Lamaran Staf",
      form_desc: "Jawab semua dengan jujur — draft kamu tersimpan otomatis saat kamu mengetik.",
      pick_date: "Pilih tanggal",
      not_now: "Nanti Aja",
      final_confirmation: "Satu Hal Lagi",
      final_desc_1: "Kamu mau kirim lamaranmu sekarang?",
      final_desc_2: "Setelah dikirim, kamu nggak bisa ubah apapun. Pastiin semuanya udah bener dulu ya.",
      select_lang_title: "Pilih Bahasa",
      select_lang_desc: "Mau pakai bahasa apa buat pertanyaannya? Ini nggak ngaruh ke bahasa yang kamu bisa, kok.",
      success_title: "Udah masuk!",
      success_desc: "Lamaran kamu udah kita terima. Nanti kita cek dulu, kalau lolos bakal kita kabarin lewat DM Discord. Jangan lupa buka DM ya!",
      view_application: "Lihat Lamaran"
    },
    questions: {
      full_name: "Nama Lengkap *",
      dob: "Tanggal Lahir *",
      language_spoken: "Bahasa yang Dikuasai *",
      past_cs_experience: "Apakah kamu pernah melayani pembeli / menjadi customer service sebelumnya? *",
      past_staff_experience: "Apakah kamu pernah menjabat sebagai staff di hub/server lain? *",
      active_other_hub: "Apakah kamu pernah aktif komunikasi di hub lain selain atomic? *",
      upset_users: "Apa yang kamu lakukan kalau ada pembeli yang marah atau komplain? *",
      uncertainty: "Gimana cara kamu handle situasi yang kamu nggak tau harus ngapain? *",
      unsure_case: "Kalau kamu bingung sama suatu kasus, kamu bakal ngapain? *",
      why_join: "Kenapa kamu mau gabung tim staf Euphoria? *",
      good_fit: "Menurut kamu, kenapa kamu cocok jadi Support Rep? *",
      other_exp: "Ada pengalaman sebelumnya yang worth disebutin? *",
      working_mic: "Punya mic yang berfungsi? Mau interview suara kalau lolos? *",
      understand_abuse: "Kamu ngerti kan kalau abuse kekuatan staf atau ghosting bisa bikin kamu dikeluarin? *",
      additional: "Ada yang mau kamu tanyain atau sampein ke kami? (Jawab \"Tidak\" kalau nggak ada) *"
    },
    placeholders: {
      name: "cth. Afiez",
      explain: "Ceritain alasan kamu...",
      upset: "Kamu bakal ngapain atau ngomong apa?",
      uncertainty: "Jujur aja — apa prosesmu?",
      other_exp: "Role mod, pengalaman support, apapun yang relevan..."
    },
    warning_dialog: {
      title: "Rekrutmen Staf Atomicals — Gelombang 14",
      desc: "Baca ini dulu sebelum lanjut. Scroll ke bawah untuk unlock tombolnya.",
      rule_1_title: "Dilarang Pakai AI",
      rule_1_desc: "Tulis semua jawaban sendiri. Pakai ChatGPT, Claude, atau AI lainnya buat nulis jawaban = langsung ditolak, tanpa pengecualian.",
      rule_2_title: "Kamu Bakal Ngapain",
      rule_2_desc: "Kamu bakal bantu buyer lewat transaksi tiket dan nangani keluhan. Intinya, pastiin buyer puas dan semuanya berjalan lancar.",
      rule_3_title: "Kriteria yang Kita Cari",
      rule_3_desc: "Kamu harus bisa komunikasi yang lancar pakai Bahasa Indonesia & Inggris. Sabar, nggak gampang emosi, dan bisa ngerjain beberapa hal sekaligus. Minimal umur 15+ tahun, dan wajib punya mic buat interview suara.",
      rule_4_title: "Yang Kami Harapkan",
      rule_4_desc: "Kamu bakal kerja bareng tim lain buat jaga komunitas tetap berjalan. Kalau ada masalah, escalate. Selalu jaga sikap waktu ngobrol sama orang.",
      button: "Oke Ngerti"
    },
    blacklist_dialog: {
      title: "Kamu diblacklist",
      desc : "Akunmu sudah ditandai dan tidak bisa mengirim lamaran staf.",
      flag : "Device ini tidak akan bisa mengisi form kembali.",
      btn  : "Kembali"
    },
    closed_dialog: {
      title: "Rekrutmen Lagi Ditutup Dulu Ya 👋",
      desc : "Untuk sekarang pendaftaran staff lagi kita tutup dulu. Tapi tenang aja, ini bukan selamanya kok. Nanti kalau gelombang berikutnya udah dibuka, bakal kita infoin lagi. Jadi stay tuned terus yaa, jangan sampai ketinggalan!",
      btn  : "Oke, Balik Dulu"
    }
  },
  Mandarin: {
    ui: {
      basic_info: "基本信息",
      communication: "沟通",
      scenarios: "情景",
      experience: "经验与动机",
      agreements: "继续之前",
      yes: "是",
      no: "否",
      select_option: "请选择",
      select_languages: "选语言",
      selected: "已选",
      submit: "提交申请",
      applicant_profile: "你的资料",
      discord_identity: "绑定到这份申请的 Discord 账号。",
      terms_agree: "提交即表示你确认所写内容真实准确。",
      form_title: "员工申请",
      form_desc: "如实回答所有问题 — 草稿会在你输入时自动保存。",
      pick_date: "选个日期",
      not_now: "先不了",
      final_confirmation: "最后确认一下",
      final_desc_1: "你要提交申请了，准备好了吗？",
      final_desc_2: "提交之后就没法改了，先确认一切都没问题。",
      select_lang_title: "选择语言",
      select_lang_desc: "你想用什么语言看问题？这不会影响你后面填的语言能力。",
      success_title: "收到了！",
      success_desc: "申请我们收到了。审核完如果过了会 Discord 私信你。记得开私信！",
      view_application: "查看申请"
    },
    questions: {
      full_name: "全名 *",
      dob: "出生日期 *",
      language_spoken: "掌握的语言 *",
      past_cs_experience: "你之前有服务过买家 / 做过客服的经验吗？*",
      past_staff_experience: "你曾经在其他服务器/团队担任过管理或员工吗？*",
      active_other_hub: "除了 Atomic，你目前还在其他团队活跃吗？*",
      upset_users: "遇到愤怒或不满的买家，你会怎么做？*",
      uncertainty: "遇到不确定怎么处理的情况，你会怎么应对？*",
      unsure_case: "如果某个案例你完全没头绪，你的下一步是什么？*",
      why_join: "你为什么想加入 Euphoria 的员工团队？*",
      good_fit: "你觉得自己为什么适合做 Support Rep？*",
      other_exp: "有什么值得一提的过往经验吗？*",
      working_mic: "有能用的麦克风吗？如果通过的话，愿意参加语音面试吗？*",
      understand_abuse: "你明白滥用权限或长期不活跃可能被踢出团队吧？*",
      additional: "还有什么想问或想说的吗？（没有的话回答\"无\"）*"
    },
    placeholders: {
      name: "例如：Afiez",
      explain: "说说你的理由...",
      upset: "你实际会说什么或做什么？",
      uncertainty: "直说就行 — 你的处理方式是什么？",
      other_exp: "Mod 经历、客服经验，什么都行..."
    },
    warning_dialog: {
      title: "Atomicals 员工招募 — 第14期",
      desc: "继续之前先读一遍。滚到底部才能解锁按钮。",
      rule_1_title: "禁止 AI 代写",
      rule_1_desc: "所有答案必须自己写。用 ChatGPT、Claude 或任何 AI 写答案 = 直接淘汰，没有例外。",
      rule_2_title: "你会做什么",
      rule_2_desc: "你会通过工单协助买家处理交易，以及处理投诉。核心工作就是让买家满意、让流程顺畅。",
      rule_3_title: "我们需要什么样的人",
      rule_3_desc: "你需要能用印尼语和英语顺畅沟通，还要有耐心、沉得住气、能同时处理多件事。最低年龄 15+ 岁，语音面试需要麦克风。",
      rule_4_title: "我们的期望",
      rule_4_desc: "你会和其他团队一起维护社区的正常运转。出了问题就上报。和人沟通时要始终保持专业。",
      button: "明白了 — 带我去填表"
    },
    blacklist_dialog: {
      title: "你已被列入黑名单",
      desc : "你的账号已被标记，无法提交员工申请。",
      flag : "此设备将无法再次填写表单。",
      btn  : "返回"
    },
    closed_dialog: {
      title: "招募暂时休息一下 👋",
      desc : "目前我们暂时关闭了员工申请。不过别担心，这不是永久的！等下一期开放时我们会通知大家的。请持续关注，别错过啦！",
      btn  : "好的，带我返回"
    }
  },
  Japan: {
    ui: {
      basic_info: "基本情報",
      communication: "コミュニケーション",
      scenarios: "シナリオ",
      experience: "経験と志望理由",
      agreements: "続ける前に",
      yes: "はい",
      no: "いいえ",
      select_option: "選択してください",
      select_languages: "言語を選んで",
      selected: "選択中",
      submit: "応募を送る",
      applicant_profile: "あなたのプロフィール",
      discord_identity: "この応募に紐づいている Discord アカウント。",
      terms_agree: "送信することで、書いた内容がすべて正直で正確だと確認したことになるよ。",
      form_title: "スタッフ応募",
      form_desc: "全部正直に答えてね — 入力しながら自動で下書き保存されるよ。",
      pick_date: "日付を選んで",
      not_now: "今はいいや",
      final_confirmation: "最後に確認",
      final_desc_1: "応募を送信しようとしてるけど、準備できてる？",
      final_desc_2: "送信したら変更はできないよ。先にちゃんと確認してね。",
      select_lang_title: "言語を選ぶ",
      select_lang_desc: "質問を何語で見たい？これは後で記入する話せる言語には影響しないよ。",
      success_title: "届いたよ！",
      success_desc: "応募受け取った。審査して通ったら Discord DM するね。DM 開けといて！",
      view_application: "応募を見る"
    },
    questions: {
      full_name: "氏名 *",
      dob: "生年月日 *",
      language_spoken: "話せる言語 *",
      past_cs_experience: "購入者の対応やカスタマーサービスの経験はある？*",
      past_staff_experience: "他のサーバーやコミュニティでスタッフをしたことはある？*",
      active_other_hub: "現在、Atomic 以外のサーバーで活動してる？*",
      upset_users: "怒ってる・不満そうな購入者に、どう対応する？*",
      uncertainty: "どうすればいいかわからない状況、どうやって対処する？*",
      unsure_case: "特定のケースで完全に迷ったとき、次の一手は？*",
      why_join: "なんで Euphoria のスタッフチームに入りたいの？*",
      good_fit: "自分が Support Rep に向いてると思う理由は？*",
      other_exp: "過去に何か関連する経験ある？*",
      working_mic: "使えるマイク持ってる？受かったら音声面接できる？*",
      understand_abuse: "権限の乱用や長期間の無活動でチームから外されることを理解してる？*",
      additional: "他に何か聞きたいこと・伝えたいことある？（なければ「なし」と回答）*"
    },
    placeholders: {
      name: "例：Afiez",
      explain: "その理由を話してみて...",
      upset: "実際に何を言う・何をする？",
      uncertainty: "正直に — どう進める？",
      other_exp: "モデレーター経験、サポート経験、関係あれば何でも..."
    },
    warning_dialog: {
      title: "Atomicals スタッフ募集 — 第14期",
      desc: "続ける前にこれを読んでね。一番下までスクロールするとボタンが解除されるよ。",
      rule_1_title: "AI 代筆禁止",
      rule_1_desc: "全部自分で書いてね。ChatGPT・Claude・その他 AI ツールで答えを書くのは即不合格 — 例外なし。",
      rule_2_title: "何をやるか",
      rule_2_desc: "チケット取引で購入者をサポートしたり、クレーム対応をしたりするよ。大事なのは購入者に満足してもらって、スムーズに進めること。",
      rule_3_title: "求める人物像",
      rule_3_desc: "インドネシア語と英語でしっかりコミュニケーションが取れる必要があるよ。忍耐力・冷静さ・マルチタスクも大事。年齢は最低 15+ 歳、音声面接用のマイクも必要。",
      rule_4_title: "期待すること",
      rule_4_desc: "他のチームと協力してコミュニティを維持していくよ。問題があればちゃんとエスカレートして。人と話すときは常にプロとして接してね。",
      button: "わかった — フォームに進む"
    },
    blacklist_dialog: {
      title: "ブラックリストに載っています",
      desc : "あなたのアカウントはフラグが立てられており、スタッフ申請を送ることができません。",
      flag : "このデバイスは二度とフォームに記入できません。",
      btn  : "戻る"
    },
    closed_dialog: {
      title: "募集はちょっとお休み中 👋",
      desc : "現在、スタッフの応募は一時的に締め切らせてもらっています。でも心配しないで、ずっとじゃないよ！次回の募集が始まったらまたお知らせするね。見逃さないようにチェックしててね！",
      btn  : "わかった、戻る"
    }
  }
}

export default function StaffApplicationPage() {
  const router = useRouter()

  const [loading, set_loading]               = useState(true)
  const [submitting, set_submitting]         = useState(false)
  const [user, set_user]                     = useState<any>(null)

  const [wave_number, set_wave_number]       = useState(1)
  const [is_open, set_is_open]               = useState(true)
  const [already_applied, set_already_applied] = useState(false)
  const [applied_uuid, set_applied_uuid]       = useState<string | null>(null)
  const [blacklisted,  set_blacklisted]                = useState(false)
  const [success_uuid, set_success_uuid]               = useState<string | null>(null)
  const [form_lang, set_form_lang]                     = useState<keyof typeof __translations>("English")

  // - MODALS - \\
  const [lang_modal_open, set_lang_modal_open]           = useState(true)
  const [warn_modal_open, set_warn_modal_open]           = useState(false)
  const [warn_scrolled, set_warn_scrolled]               = useState(false)
  const [blacklist_modal_open, set_blacklist_modal_open] = useState(false)
  const [closed_modal_open, set_closed_modal_open]       = useState(false)
  const [confirm_submit_open, set_confirm_submit_open]   = useState(false)
  const warn_scroll_ref                            = useRef<HTMLDivElement>(null)
  const [month, setMonth]                          = useState<Date>(new Date(2005, 0))

  const [form_data, set_form_data] = useState({
    full_name           : "",
    dob                 : undefined as Date | undefined,
    languages           : [] as string[],
    past_cs_experience  : "",
    past_staff_experience: "",
    active_other_hub    : "",
    handle_upset_users  : "",
    handle_uncertainty  : "",
    why_join            : "",
    good_fit            : "",
    other_experience    : "",
    unsure_case         : "",
    working_mic         : "",
    understand_abuse    : "",
    additional_questions: ""
  })

  // - LOAD CACHED DATA - \\
  useEffect(() => {
    const cached = localStorage.getItem("staff_app_draft")
    if (cached) {
      try {
        const parsed = JSON.parse(cached)
        if (parsed.dob) {
          parsed.dob = new Date(parsed.dob)
        }
        if (!Array.isArray(parsed.languages)) {
          parsed.languages = []
        }
        set_form_data(parsed)
      } catch (e) {
        console.error("[ - STAFF FORM - ] failed to parse cached draft")
      }
    }
  }, [])

  // - SAVE CACHE ON CHANGE - \\
  useEffect(() => {
    if (!loading && !already_applied && !success_uuid) {
      localStorage.setItem("staff_app_draft", JSON.stringify(form_data))
    }
  }, [form_data, loading, already_applied, success_uuid])

  // - FETCH RECRUITMENT INFO - \\
  useEffect(() => {
    fetch('/api/recruitment-info')
      .then(r => r.json())
      .then(d => { 
        if (d?.wave_number) set_wave_number(d.wave_number)
        if (d?.is_open !== undefined) set_is_open(d.is_open)
      })
      .catch(() => {})
  }, [])

  // - CHECK AUTH AND APPLICATION STATUS - \\
  useEffect(() => {
    async function check_auth() {
      try {
        const auth_res  = await fetch("/api/auth/check")
        if (!auth_res.ok) {
          router.push("/login?callback=/apply-staff")
          return
        }

        const auth_data = await auth_res.json()
        set_user(auth_data.user)

        // - CHECK DEVICE FINGERPRINT (HWID) - \\
        const fp          = await get_device_fingerprint()
        const fp_res      = await fetch(`/api/device-flag?fp=${fp}`)
        const fp_data     = fp_res.ok ? await fp_res.json() : { flagged: false }
        if (fp_data.flagged) {
          set_blacklisted(true)
          set_lang_modal_open(false)
          set_blacklist_modal_open(true)
          set_loading(false)
          return
        }

        const app_res = await fetch("/api/staff-application")
        if (app_res.ok) {
          const app_data = await app_res.json()
          if (app_data.applied) {
            set_already_applied(true)
            if (app_data.uuid) set_applied_uuid(app_data.uuid)
          }
          if (app_data.blacklisted) {
            set_blacklisted(true)
            // - PERSIST FINGERPRINT TO DB SO IT SURVIVES CACHE CLEARS - \\
            fetch('/api/device-flag', {
              method : 'POST',
              headers: { 'Content-Type': 'application/json' },
              body   : JSON.stringify({ fp })
            }).catch(() => {})
          }
        }

        set_loading(false)
      } catch (error) {
        console.error("[ - STAFF FORM - ] auth check error:", error)
        router.push("/login?callback=/apply-staff")
      }
    }

    check_auth()
  }, [router])

  const handle_change = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target
    set_form_data(prev => ({ ...prev, [id]: value }))
  }

  const handle_select = (id: string, value: string) => {
    set_form_data(prev => ({ ...prev, [id]: value }))
  }

  const handle_date = (date: Date | undefined) => {
    set_form_data(prev => ({ ...prev, dob: date }))
  }

  const handle_calendar_change = (value: string | number, onChange?: React.ChangeEventHandler<HTMLSelectElement>) => {
    if (!onChange) return
    const event = {
      target: { value: String(value) }
    } as React.ChangeEvent<HTMLSelectElement>
    onChange(event)
  }

  const handle_language_change = (val: string, checked: boolean) => {
    set_form_data(prev => {
      const new_langs = checked
        ? [...prev.languages, val]
        : prev.languages.filter(l => l !== val)
      return { ...prev, languages: new_langs }
    })
  }

  const handle_submit_click = (e: React.FormEvent) => {
    e.preventDefault()
    set_confirm_submit_open(true)
  }

  const execute_submit = async () => {
    set_confirm_submit_open(false)
    set_submitting(true)

    try {
      const sanitized_data = { ...form_data }
      
      if (sanitized_data.past_cs_experience === "No") {
        sanitized_data.past_staff_experience = ""
        sanitized_data.active_other_hub = ""
        sanitized_data.handle_upset_users = ""
        sanitized_data.handle_uncertainty = ""
        sanitized_data.unsure_case = ""
      } else if (sanitized_data.past_staff_experience === "Yes") {
        sanitized_data.active_other_hub = ""
      } else if (sanitized_data.past_staff_experience === "No" && sanitized_data.active_other_hub === "No") {
        sanitized_data.handle_upset_users = ""
        sanitized_data.handle_uncertainty = ""
        sanitized_data.unsure_case = ""
      }

      const res  = await fetch("/api/staff-application", {
        method : "POST",
        headers: { "Content-Type": "application/json" },
        body   : JSON.stringify(sanitized_data)
      })

      const data = await res.json()

      if (!res.ok) {
        alert(data.error || "Failed to submit application.")
        set_submitting(false)
        return
      }

      localStorage.removeItem("staff_app_draft")
      set_success_uuid(data.uuid)
      set_submitting(false)
    } catch (error) {
      console.error("[ - STAFF FORM - ] submit error:", error)
      alert("An error occurred. Please try again.")
      set_submitting(false)
    }
  }

  const handle_warn_scroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement
    const at_bottom = Math.abs(target.scrollHeight - target.scrollTop - target.clientHeight) < 10
    if (at_bottom && !warn_scrolled) set_warn_scrolled(true)
  }

  if (loading) {
    return (
      <div className="flex h-screen w-full flex-col space-y-4 items-center justify-center p-8 bg-background text-foreground">
        <div className="flex items-center space-x-4">
          <Skeleton className="h-12 w-12 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-[250px]" />
            <Skeleton className="h-4 w-[200px]" />
          </div>
        </div>
        <Skeleton className="h-[400px] w-full max-w-2xl rounded-xl" />
      </div>
    )
  }

  const selected_language_labels = form_data.languages.length > 0 
    ? form_data.languages.map(val => __language_options.find(l => l.value === val)?.flag).join(" ")
    : null

  const avatar_url = user?.avatar
    ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=256`
    : "https://images.shadcnspace.com/assets/profiles/profile-user.svg"

  const t = __translations[form_lang]

  return (
    <>
    <div className="min-h-screen bg-background flex flex-col">

      {/* - TOPBAR - \\ */}
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60 supports-[backdrop-filter]:backdrop-blur-xl">
        <div className="flex h-14 items-center px-4 md:px-6 w-full max-w-6xl mx-auto justify-between">
          <div className="flex items-center gap-2.5">
            <AtomicLogo className="w-5 h-5 text-foreground" />
            <span className="font-semibold text-sm tracking-tight text-foreground">Atomicals</span>
            <span className="text-xs text-muted-foreground hidden sm:inline">/ Staff Recruitment</span>
          </div>
          <div className="flex items-center gap-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 gap-1.5 px-2 text-muted-foreground hover:text-foreground">
                  <Languages className="h-4 w-4" />
                  <span className="text-xs font-medium uppercase">{form_lang.substring(0, 2)}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[150px]">
                {(Object.keys(__translations) as Array<keyof typeof __translations>).map((lang) => (
                  <DropdownMenuCheckboxItem
                    key={lang}
                    checked={form_lang === lang}
                    onCheckedChange={() => set_form_lang(lang)}
                  >
                    {lang === "English" && "🇬🇧 "}
                    {lang === "Indonesia" && "🇮🇩 "}
                    {lang === "Mandarin" && "🇨🇳 "}
                    {lang === "Japan" && "🇯🇵 "}
                    {lang}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <div className="flex items-center gap-2">
              <Avatar className="h-7 w-7 border border-border/50">
                <AvatarImage src={user?.avatar ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=64` : ""} />
                <AvatarFallback className="text-xs bg-primary/10 text-primary">{user?.username?.charAt(0).toUpperCase() || "U"}</AvatarFallback>
              </Avatar>
              <span className="text-sm text-muted-foreground hidden sm:inline">{user?.username || "User"}</span>
            </div>
          </div>
        </div>
      </header>

      {/* - LANGUAGE SELECTION MODAL - \\ */}
      <Dialog open={lang_modal_open} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-[400px] p-6 bg-[#09090b] border border-border/40 shadow-2xl rounded-2xl [&>button]:hidden">
          <DialogHeader className="space-y-2 text-left">
            <DialogTitle className="text-[17px] font-semibold tracking-tight text-white flex items-center gap-2">
              <Languages className="w-5 h-5 text-white" />
              {t.ui.select_lang_title}
            </DialogTitle>
            <DialogDescription className="text-[14px] text-muted-foreground/80">
              {t.ui.select_lang_desc}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2 mt-4">
            {(Object.keys(__translations) as Array<keyof typeof __translations>).map((lang) => (
              <Button
                key={lang}
                variant="outline"
                className="justify-start h-12 px-4 rounded-[12px] bg-transparent border-border/40 hover:bg-white/10 hover:text-white"
                onClick={() => {
                  set_form_lang(lang as keyof typeof __translations)
                  set_lang_modal_open(false)
                  if (blacklisted) {
                    set_blacklist_modal_open(true)
                  } else if (!is_open) {
                    set_closed_modal_open(true)
                  } else if (!already_applied) {
                    set_warn_modal_open(true)
                  }
                }}
              >
                {lang === "English" && "🇬🇧"}
                {lang === "Indonesia" && "🇮🇩"}
                {lang === "Mandarin" && "🇨🇳"}
                {lang === "Japan" && "🇯🇵"}
                <span className="ml-2 font-medium">{lang}</span>
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* - BLACKLIST MODAL - \ */}
      <Dialog open={blacklist_modal_open} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-[400px] p-6 bg-[#09090b] border border-border/40 shadow-2xl rounded-2xl [&>button]:hidden">
          <DialogHeader className="space-y-2 text-left">
            <DialogTitle className="text-[17px] font-semibold tracking-tight text-white">
              {t.blacklist_dialog.title}
            </DialogTitle>
            <DialogDescription className="text-[14px] text-muted-foreground/80">
              {t.blacklist_dialog.desc}
            </DialogDescription>
          </DialogHeader>
          <p className="text-xs text-zinc-600 mt-2">{t.blacklist_dialog.flag}</p>
          <DialogFooter className="mt-4">
            <Button
              onClick={() => router.push('/')}
              className="w-full h-11 rounded-[12px] bg-white text-black hover:bg-white/90 text-[14px] font-medium"
            >
              {t.blacklist_dialog.btn}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* - CLOSED MODAL - \ */}
      <Dialog open={closed_modal_open} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-[400px] p-6 bg-[#09090b] border border-border/40 shadow-2xl rounded-2xl [&>button]:hidden">
          <DialogHeader className="space-y-2 text-left">
            <DialogTitle className="text-[17px] font-semibold tracking-tight text-white">
              {t.closed_dialog.title}
            </DialogTitle>
            <DialogDescription className="text-[14px] text-muted-foreground/80">
              {t.closed_dialog.desc}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button
              onClick={() => router.push('/')}
              className="w-full h-11 rounded-[12px] bg-white text-black hover:bg-white/90 text-[14px] font-medium"
            >
              {t.closed_dialog.btn}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* - RECRUITMENT WARNING MODAL - \\ */}
      <Dialog open={warn_modal_open} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-[500px] p-6 bg-[#09090b] border border-border/40 shadow-2xl rounded-2xl [&>button]:hidden">
          <DialogHeader className="space-y-2 text-left">
            <DialogTitle className="flex items-center gap-2.5 text-[17px] font-semibold tracking-tight text-white">
              <FileText className="h-[18px] w-[18px] text-white" />
              {t.warning_dialog.title.replace(/\d+/, String(wave_number))}
            </DialogTitle>
            <DialogDescription className="text-[14px] text-muted-foreground/80">
              {t.warning_dialog.desc}
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="h-[320px] pr-5 mt-3" onScrollCapture={handle_warn_scroll} ref={warn_scroll_ref}>
            <div className="space-y-6 text-[14px]">
              <div>
                <h4 className="font-semibold text-white mb-1.5 flex items-center gap-2">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-white/10 text-white text-xs">1</span>
                  {t.warning_dialog.rule_1_title}
                </h4>
                <p className="text-muted-foreground/80 leading-[1.6] pl-7">
                  {t.warning_dialog.rule_1_desc}
                </p>
              </div>
              
              <div>
                <h4 className="font-semibold text-white mb-1.5 flex items-center gap-2">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-white/10 text-white text-xs">2</span>
                  {t.warning_dialog.rule_2_title}
                </h4>
                <p className="text-muted-foreground/80 leading-[1.6] pl-7">
                  {t.warning_dialog.rule_2_desc}
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-white mb-1.5 flex items-center gap-2">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-white/10 text-white text-xs">3</span>
                  {t.warning_dialog.rule_3_title}
                </h4>
                <p className="text-muted-foreground/80 leading-[1.6] pl-7">
                  {t.warning_dialog.rule_3_desc}
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-white mb-1.5 flex items-center gap-2">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-white/10 text-white text-xs">4</span>
                  {t.warning_dialog.rule_4_title}
                </h4>
                <p className="text-muted-foreground/80 leading-[1.6] pl-7">
                  {t.warning_dialog.rule_4_desc}
                </p>
              </div>
            </div>
          </ScrollArea>

          <DialogFooter className="mt-4 sm:justify-center">
            <Button
              disabled={!warn_scrolled}
              onClick={() => set_warn_modal_open(false)}
              className="w-full h-11 rounded-[12px] bg-white text-black hover:bg-white/90 text-[14px] font-medium transition-all disabled:opacity-50 disabled:bg-white/10 disabled:text-white"
            >
              {t.warning_dialog.button}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* - ALREADY APPLIED MODAL - \\ */}
      <Dialog open={already_applied && !lang_modal_open} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md [&>button]:hidden bg-[#09090b] border-border/40">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              {form_lang === "Indonesia" ? "Kamu udah pernah daftar" : 
               form_lang === "English" ? "You've already applied" :
               form_lang === "Japan" ? "すでに応募済みです" :
               "您已经申请过了"}
            </DialogTitle>
            <DialogDescription className="pt-2 text-muted-foreground/80">
              {form_lang === "Indonesia" ? "Kamu udah pernah ngisi form ini sebelumnya. Tolong tunggu tim kita buat review aplikasinya ya. Kita bakal hubungin kamu via Discord DM kalau kamu lolos ke tahap interview." : 
               form_lang === "English" ? "You have already submitted a staff application. Please wait patiently for our team to review it. We will contact you via Discord DM if you are selected for an interview." :
               form_lang === "Japan" ? "すでにスタッフ応募を送信しています。チームの審査をお待ちください。面接に進む場合は Discord の DM でご連絡します。" :
               "您已经提交过员工申请了。请耐心等待我们的团队进行审核。如果您被选中参加面试，我们将通过 Discord 私信联系您。"}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button 
              onClick={() => {
                if (applied_uuid) {
                  router.push(`/staff-form/application-data?id=${applied_uuid}`)
                } else {
                  router.push("/")
                }
              }} 
              className="w-full bg-white text-black hover:bg-white/90"
            >
              {form_lang === "Indonesia" ? "Lihat Hasil Pendaftaran" : 
               form_lang === "English" ? "View Application Result" :
               form_lang === "Japan" ? "応募結果を見る" :
               "查看申请结果"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* - FINAL CONFIRMATION MODAL - \\ */}
      <AlertDialog open={confirm_submit_open} onOpenChange={set_confirm_submit_open}>
        <AlertDialogContent className="sm:max-w-[450px] p-6 bg-[#09090b] border border-border/40 shadow-2xl rounded-2xl">
          <AlertDialogHeader className="space-y-3 text-left">
            <div className="flex items-center gap-2.5">
              <Bell className="size-[18px] text-blue-500" />
              <AlertDialogTitle className="text-[17px] font-semibold tracking-tight text-white">{t.ui.final_confirmation}</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-[14px] text-muted-foreground/80 leading-[1.6]">
              {t.ui.final_desc_1}
              <br /><br />
              <span className="text-foreground/90 font-medium">{t.ui.final_desc_2}</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-5 sm:justify-end gap-3 sm:gap-2">
            <AlertDialogCancel className="mt-0 sm:mt-0 h-10 px-6 rounded-[12px] bg-transparent border border-border/50 text-foreground hover:bg-muted/50 transition-all font-medium">{t.ui.not_now}</AlertDialogCancel>
            <AlertDialogAction onClick={execute_submit} className="h-10 px-6 rounded-[12px] bg-white text-black hover:bg-white/90 transition-all font-medium">{t.ui.submit}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* - MAIN CONTENT - \\ */}
      <div className="flex-1 py-8 sm:py-12">
        <div className="max-w-6xl xl:px-16 lg:px-8 px-4 mx-auto">
          <Card className="p-0 max-w-5xl w-full gap-0 border-0 bg-transparent shadow-none mx-auto">

            <CardHeader className="gap-2 px-0 sm:px-8 pt-0 pb-6 bg-transparent">
              <div className="flex flex-col gap-1">
                <h2 className="text-xl font-semibold text-foreground">
                  {t.ui.form_title}
                </h2>
                <p className="text-sm text-muted-foreground font-normal">
                  {t.ui.form_desc}
                </p>
              </div>
            </CardHeader>

            <CardContent className="py-8 px-0 sm:px-8">
              <div className="flex sm:flex-row flex-col gap-10">

                {/* LEFT FORM COLUMN */}
                <div className="flex-[2] md:pe-10 sm:border-e border-border sm:order-first order-last">
                  <form id="staff-form" onSubmit={handle_submit_click} className="flex flex-col gap-8">

                    {/* SECTION: BASIC INFO */}
                    <div className="flex flex-col gap-5">
                      <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-2">{t.ui.basic_info}</h3>

                      <Field className="gap-1.5">
                        <FieldLabel htmlFor="full_name" className="text-sm text-muted-foreground font-normal">
                          {t.questions.full_name}
                        </FieldLabel>
                        <Input required id="full_name" value={form_data.full_name} onChange={handle_change} className="h-10 bg-background shadow-xs" placeholder={t.placeholders.name} />
                      </Field>

                      <Field className="gap-1.5">
                        <FieldLabel htmlFor="dob" className="text-sm text-muted-foreground font-normal">
                          {t.questions.dob}
                        </FieldLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={`w-full justify-start h-10 bg-background shadow-xs font-normal ${!form_data.dob && "text-muted-foreground"}`}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {form_data.dob ? format(form_data.dob, "PPP") : <span>{t.ui.pick_date}</span>}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent align="start" className="w-auto p-0 border-border/50">
                            <Calendar
                              captionLayout="dropdown"
                              components={{
                                MonthCaption: (props) => <>{props.children}</>,
                                DropdownNav: (props) => (
                                  <div className="flex w-full items-center gap-2">
                                    {props.children}
                                  </div>
                                ),
                                Dropdown: (props) => (
                                  <ShadcnSelect
                                    onValueChange={(value) => handle_calendar_change(value, props.onChange)}
                                    value={String(props.value)}
                                  >
                                    <SelectTrigger className="first:flex-1 last:shrink-0 h-8 border-border/50">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {props.options?.map((option) => (
                                        <SelectItem
                                          disabled={option.disabled}
                                          key={option.value}
                                          value={String(option.value)}
                                        >
                                          {option.label}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </ShadcnSelect>
                                ),
                              }}
                              hideNavigation
                              mode="single"
                              month={month}
                              onMonthChange={setMonth}
                              onSelect={handle_date}
                              selected={form_data.dob}
                              defaultMonth={new Date(2005, 0)}
                              fromYear={1980}
                              toYear={new Date().getFullYear() - 13}
                            />
                          </PopoverContent>
                        </Popover>
                      </Field>

                      <Field className="gap-1.5">
                        <FieldLabel className="text-sm text-muted-foreground font-normal">
                          {t.questions.language_spoken}
                        </FieldLabel>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" className="w-full justify-between h-10 bg-background shadow-xs font-normal">
                              {form_data.languages.length === 0 ? (
                                <span className="text-muted-foreground">{t.ui.select_languages}</span>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <span className="text-lg tracking-widest leading-none">{selected_language_labels}</span>
                                  <span className="text-muted-foreground text-xs font-medium ml-1">
                                    ({form_data.languages.length} {t.ui.selected})
                                  </span>
                                </div>
                              )}
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent className="w-full min-w-[200px] border-border/50">
                            <DropdownMenuLabel>{t.ui.select_languages}</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {__language_options.map((lang) => (
                              <DropdownMenuCheckboxItem
                                key={lang.value}
                                checked={form_data.languages.includes(lang.value)}
                                onCheckedChange={(c) => handle_language_change(lang.value, c)}
                              >
                                {lang.flag} {lang.label}
                              </DropdownMenuCheckboxItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </Field>

                      <Field className="gap-1.5">
                        <FieldLabel htmlFor="past_cs_experience" className="text-sm text-muted-foreground font-normal">
                          {t.questions.past_cs_experience}
                        </FieldLabel>
                        <ShadcnSelect required onValueChange={(v) => handle_select("past_cs_experience", v)} value={form_data.past_cs_experience}>
                          <SelectTrigger className="h-10 bg-background shadow-xs">
                            <SelectValue placeholder={t.ui.select_option} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Yes">{t.ui.yes}</SelectItem>
                            <SelectItem value="No">{t.ui.no}</SelectItem>
                          </SelectContent>
                        </ShadcnSelect>
                      </Field>

                      {form_data.past_cs_experience === "Yes" && (
                        <div className="flex flex-col gap-5 pt-2">
                          <Field className="gap-1.5">
                            <FieldLabel htmlFor="past_staff_experience" className="text-sm text-muted-foreground font-normal">
                              {t.questions.past_staff_experience}
                            </FieldLabel>
                            <ShadcnSelect required onValueChange={(v) => handle_select("past_staff_experience", v)} value={form_data.past_staff_experience}>
                              <SelectTrigger className="h-10 bg-background shadow-xs">
                                <SelectValue placeholder={t.ui.select_option} />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Yes">{t.ui.yes}</SelectItem>
                                <SelectItem value="No">{t.ui.no}</SelectItem>
                              </SelectContent>
                            </ShadcnSelect>
                          </Field>

                          {form_data.past_staff_experience === "No" && (
                            <Field className="gap-1.5">
                              <FieldLabel htmlFor="active_other_hub" className="text-sm text-muted-foreground font-normal">
                                {t.questions.active_other_hub}
                              </FieldLabel>
                              <ShadcnSelect required onValueChange={(v) => handle_select("active_other_hub", v)} value={form_data.active_other_hub}>
                                <SelectTrigger className="h-10 bg-background shadow-xs">
                                  <SelectValue placeholder={t.ui.select_option} />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Yes">{t.ui.yes}</SelectItem>
                                  <SelectItem value="No">{t.ui.no}</SelectItem>
                                </SelectContent>
                              </ShadcnSelect>
                            </Field>
                          )}
                        </div>
                      )}
                    </div>

                    {/* SECTION: SCENARIOS - CONDITIONAL */}
                    {(form_data.past_staff_experience === "Yes" || form_data.active_other_hub === "Yes") && (
                      <div className="flex flex-col gap-5 pt-4">
                        <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-2">{t.ui.scenarios}</h3>

                        <Field className="gap-1.5">
                          <FieldLabel htmlFor="handle_upset_users" className="text-sm text-muted-foreground font-normal">
                            {t.questions.upset_users}
                          </FieldLabel>
                          <Textarea required id="handle_upset_users" value={form_data.handle_upset_users} onChange={handle_change} className="min-h-[100px] bg-background shadow-xs resize-none" placeholder={t.placeholders.upset} />
                        </Field>

                        <Field className="gap-1.5">
                          <FieldLabel htmlFor="handle_uncertainty" className="text-sm text-muted-foreground font-normal">
                            {t.questions.uncertainty}
                          </FieldLabel>
                          <Textarea required id="handle_uncertainty" value={form_data.handle_uncertainty} onChange={handle_change} className="min-h-[100px] bg-background shadow-xs resize-none" placeholder={t.placeholders.uncertainty} />
                        </Field>

                        <Field className="gap-1.5">
                          <FieldLabel htmlFor="unsure_case" className="text-sm text-muted-foreground font-normal">
                            {t.questions.unsure_case}
                          </FieldLabel>
                          <Textarea required id="unsure_case" value={form_data.unsure_case} onChange={handle_change} className="min-h-[100px] bg-background shadow-xs resize-none" />
                        </Field>
                      </div>
                    )}

                    <hr className="border-border" />

                    {/* SECTION: EXPERIENCE & INTENT */}
                    <div className="flex flex-col gap-5">
                      <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-2">{t.ui.experience}</h3>

                      <Field className="gap-1.5">
                        <FieldLabel htmlFor="why_join" className="text-sm text-muted-foreground font-normal">
                          {t.questions.why_join}
                        </FieldLabel>
                        <Textarea required id="why_join" value={form_data.why_join} onChange={handle_change} className="bg-background min-h-[100px] resize-y shadow-xs" />
                      </Field>

                      <Field className="gap-1.5">
                        <FieldLabel htmlFor="good_fit" className="text-sm text-muted-foreground font-normal">
                          {t.questions.good_fit}
                        </FieldLabel>
                        <Textarea required id="good_fit" value={form_data.good_fit} onChange={handle_change} className="bg-background min-h-[100px] resize-y shadow-xs" />
                      </Field>

                      <Field className="gap-1.5">
                        <FieldLabel htmlFor="other_experience" className="text-sm text-muted-foreground font-normal">
                          {t.questions.other_exp}
                        </FieldLabel>
                        <Textarea required id="other_experience" value={form_data.other_experience} onChange={handle_change} className="bg-background min-h-[100px] resize-y shadow-xs" placeholder={t.placeholders.other_exp} />
                      </Field>
                    </div>

                    <hr className="border-border" />

                    {/* SECTION: AGREEMENTS */}
                    <div className="flex flex-col gap-5">
                      <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-2">{t.ui.agreements}</h3>

                      <Field className="gap-1.5">
                        <FieldLabel className="text-sm text-muted-foreground font-normal">
                          {t.questions.working_mic}
                        </FieldLabel>
                        <ShadcnSelect value={form_data.working_mic} onValueChange={(val) => handle_select("working_mic", val)}>
                          <SelectTrigger className="h-10 bg-background shadow-xs">
                            <SelectValue placeholder={`${t.ui.yes} / ${t.ui.no}`} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Yes">{t.ui.yes}</SelectItem>
                            <SelectItem value="No">{t.ui.no}</SelectItem>
                          </SelectContent>
                        </ShadcnSelect>
                      </Field>

                      <Field className="gap-1.5">
                        <FieldLabel className="text-sm text-muted-foreground font-normal">
                          {t.questions.understand_abuse}
                        </FieldLabel>
                        <ShadcnSelect value={form_data.understand_abuse} onValueChange={(val) => handle_select("understand_abuse", val)}>
                          <SelectTrigger className="h-10 bg-background shadow-xs">
                            <SelectValue placeholder={`${t.ui.yes} / ${t.ui.no}`} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Yes">{t.ui.yes}</SelectItem>
                            <SelectItem value="No">{t.ui.no}</SelectItem>
                          </SelectContent>
                        </ShadcnSelect>
                      </Field>

                      <Field className="gap-1.5">
                        <FieldLabel htmlFor="additional_questions" className="text-sm text-muted-foreground font-normal">
                          {t.questions.additional}
                        </FieldLabel>
                        <Input required id="additional_questions" value={form_data.additional_questions} onChange={handle_change} className="h-10 bg-background shadow-xs" />
                      </Field>
                    </div>

                  </form>
                </div>

                {/* RIGHT PROFILE COLUMN */}
                <div className="flex-1 min-w-[250px]">
                  <div className="flex flex-col gap-6 sticky top-24">
                    <div className="flex flex-col gap-1">
                      <h6 className="text-primary text-sm font-medium">
                        {t.ui.applicant_profile}
                      </h6>
                      <p className="text-sm text-muted-foreground font-normal">
                        {t.ui.discord_identity}
                      </p>
                    </div>

                    <div className="relative w-32 h-32 mx-auto mt-4">
                      {user?.avatar ? (
                        <Image
                          src={avatar_url}
                          alt="user-profile"
                          fill
                          className="rounded-full object-cover ring-4 ring-muted"
                        />
                      ) : (
                        <img
                          src={avatar_url}
                          alt="user-profile"
                          className="w-32 h-32 rounded-full mx-auto ring-4 ring-muted"
                        />
                      )}
                    </div>

                    <div className="flex flex-col items-center mt-2">
                      <h5 className="text-foreground text-lg font-medium">
                        {user?.username || "Guest"}
                      </h5>
                      <p className="text-sm text-muted-foreground font-normal font-mono mt-1 px-3 py-1 bg-muted rounded-md">
                        {user?.id || "Discord ID"}
                      </p>
                    </div>

                    <div className="bg-muted/40 rounded-xl p-4 mt-4 border border-border">
                      <div className="flex items-start gap-3">
                        <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {t.ui.terms_agree}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            </CardContent>

            <CardFooter className="py-5 px-0 sm:px-8 flex justify-end bg-transparent border-t border-border mt-4">
              <div className="flex gap-3 items-center w-full sm:w-auto">
                <Button
                  form="staff-form"
                  type="submit"
                  className="relative text-sm font-medium rounded-full h-12 p-1 ps-6 pe-14 group transition-all duration-500 hover:ps-14 hover:pe-6 w-full sm:w-fit overflow-hidden cursor-pointer bg-white text-black hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={submitting || !form_data.working_mic || !form_data.understand_abuse || form_data.languages.length === 0}
                >
                  <span className="relative z-10 transition-all duration-500 flex items-center justify-center">
                    {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {t.ui.submit}
                  </span>
                  <div className="absolute right-1 w-10 h-10 bg-[#09090b] text-white rounded-full flex items-center justify-center transition-all duration-500 group-hover:right-[calc(100%-44px)] group-hover:rotate-45">
                    <ArrowUpRight size={16} />
                  </div>
                </Button>
              </div>
            </CardFooter>

          </Card>
        </div>
      </div>

    </div>

    {/* - SUCCESS DIALOG - \\ */}
    <AlertDialog open={!!success_uuid}>
      <AlertDialogContent className="max-w-sm">
        <AlertDialogHeader>
          <div className="flex items-center gap-2.5 mb-1">
            <CheckCircle2 className="size-5 text-green-500 shrink-0" />
            <AlertDialogTitle className="text-base font-semibold">
              {t.ui.success_title}
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-sm text-muted-foreground leading-relaxed">
            {t.ui.success_desc}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction
            onClick={() => router.push(`/staff-form/application-data?id=${success_uuid}`)}
            className="w-full"
          >
            {t.ui.view_application}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

  </>
  )
}

