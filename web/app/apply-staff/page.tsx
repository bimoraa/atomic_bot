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
import { Popover, PopoverContent, PopoverTrigger }                                                                           from "@/components/ui/popover"
import { Calendar }                                                                                                          from "@/components/ui/calendar"
import { AtomicLogo }                                                                                                        from "@/components/icons/atomic_logo"
import { Loader2, CheckCircle2, Languages, FileText, CalendarIcon, ArrowUpRight, Bell }                                      from "lucide-react"
import { format }                                                                                                            from "date-fns"
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
      select_rating: "Pick a number",
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
      rate_skills: "On a scale of 1-10, how good are you at communicating? *",
      explanation: "Why'd you give yourself that rating? *",
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
      rule_3_desc: "You need to be able to communicate well in Indonesian and English. You also need patience, a calm head, and the ability to handle multiple things at once. Minimum age is 13, and you'll need a mic for the voice interview.",
      rule_4_title: "What We Expect",
      rule_4_desc: "You'll work together with other teams to keep the community running well. If something goes sideways, escalate it. Always stay professional when talking to people.",
      button: "Got It — Take Me to the Form"
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
      select_rating: "Pilih angka",
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
      language_spoken: "Bahasa yang Kamu Bisa *",
      rate_skills: "Skala 1-10, seberapa bagus kemampuan komunikasimu? *",
      explanation: "Kenapa kamu kasih nilai itu ke dirimu sendiri? *",
      upset_users: "Apa yang kamu lakuin kalau ada buyer yang marah atau kesal? *",
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
      rule_3_title: "Yang Kami Cari",
      rule_3_desc: "Kamu harus bisa komunikasi dengan baik dalam bahasa Indonesia dan Inggris. Butuh sabar, kepala dingin, dan bisa multitasking. Minimal usia 13 tahun, dan butuh mic untuk interview suara.",
      rule_4_title: "Yang Kami Harapkan",
      rule_4_desc: "Kamu bakal kerja bareng tim lain buat jaga komunitas tetap berjalan. Kalau ada masalah, escalate. Selalu jaga sikap waktu ngobrol sama orang.",
      button: "Oke Ngerti"
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
      select_rating: "选个数字",
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
      language_spoken: "你会的语言 *",
      rate_skills: "1-10分，你觉得自己沟通能力怎么样？*",
      explanation: "为什么给自己打这个分？*",
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
      rule_3_desc: "你需要能用印尼语和英语顺畅沟通，还要有耐心、沉得住气、能同时处理多件事。最低年龄 13 岁，语音面试需要麦克风。",
      rule_4_title: "我们的期望",
      rule_4_desc: "你会和其他团队一起维护社区的正常运转。出了问题就上报。和人沟通时要始终保持专业。",
      button: "明白了 — 带我去填表"
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
      select_rating: "数字を選んで",
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
      rate_skills: "1〜10で、自分のコミュ力どのくらいだと思う？*",
      explanation: "なんでその点数にしたの？*",
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
      rule_3_desc: "インドネシア語と英語でしっかりコミュニケーションが取れる必要があるよ。忍耐力・冷静さ・マルチタスクも大事。年齢は最低13歳、音声面接用のマイクも必要。",
      rule_4_title: "期待すること",
      rule_4_desc: "他のチームと協力してコミュニティを維持していくよ。問題があればちゃんとエスカレートして。人と話すときは常にプロとして接してね。",
      button: "わかった — フォームに進む"
    }
  }
}

export default function StaffApplicationPage() {
  const router = useRouter()

  const [loading, set_loading]               = useState(true)
  const [submitting, set_submitting]         = useState(false)
  const [user, set_user]                     = useState<any>(null)
  const [already_applied, set_already_applied]     = useState(false)
  const [warn_modal_open, set_warn_modal_open]     = useState(false)
  const [lang_modal_open, set_lang_modal_open]     = useState(true)
  const [form_lang, set_form_lang]                 = useState<keyof typeof __translations>("English")
  const [warn_scrolled, set_warn_scrolled]         = useState(false)
  const warn_scroll_ref                            = useRef<HTMLDivElement>(null)
  const [month, setMonth]                          = useState<Date>(new Date(2005, 0))

  const [confirm_submit_open, set_confirm_submit_open] = useState(false)
  const [success_uuid, set_success_uuid]               = useState<string | null>(null)

  const [form_data, set_form_data] = useState({
    full_name           : "",
    dob                 : undefined as Date | undefined,
    languages           : [] as string[],
    communication_skills: "10",
    explanation         : "",
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

        const app_res = await fetch("/api/staff-application")
        if (app_res.ok) {
          const app_data = await app_res.json()
          if (app_data.applied) {
            // set_already_applied(true) // DISABLED FOR DEMO
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
      const res  = await fetch("/api/staff-application", {
        method : "POST",
        headers: { "Content-Type": "application/json" },
        body   : JSON.stringify(form_data)
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
      <div className="flex h-screen w-full items-center justify-center bg-background text-foreground">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
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
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-14 items-center px-4 md:px-6 w-full max-w-6xl mx-auto justify-between">
          <div className="flex items-center gap-2.5">
            <AtomicLogo className="w-5 h-5 text-foreground" />
            <span className="font-semibold text-sm tracking-tight text-foreground">Atomicals</span>
            <span className="text-xs text-muted-foreground hidden sm:inline">/ Staff Recruitment</span>
          </div>
          <div className="flex items-center gap-2">
            <Avatar className="h-7 w-7 border border-border/50">
              <AvatarImage src={user?.avatar ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=64` : ""} />
              <AvatarFallback className="text-xs bg-primary/10 text-primary">{user?.username?.charAt(0).toUpperCase() || "U"}</AvatarFallback>
            </Avatar>
            <span className="text-sm text-muted-foreground hidden sm:inline">{user?.username || "User"}</span>
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
                  set_form_lang(lang)
                  set_lang_modal_open(false)
                  set_warn_modal_open(true)
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

      {/* - RECRUITMENT WARNING MODAL - \\ */}
      <Dialog open={warn_modal_open} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-[500px] p-6 bg-[#09090b] border border-border/40 shadow-2xl rounded-2xl [&>button]:hidden">
          <DialogHeader className="space-y-2 text-left">
            <DialogTitle className="flex items-center gap-2.5 text-[17px] font-semibold tracking-tight text-white">
              <FileText className="h-[18px] w-[18px] text-white" />
              {t.warning_dialog.title}
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
      <Dialog open={already_applied} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md [&>button]:hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              Application Received
            </DialogTitle>
            <DialogDescription className="pt-2">
              You have already submitted a staff application. Please wait patiently for our team to review it.
              We will contact you via Discord if you are selected for an interview.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button onClick={() => router.push("/dashboard")} className="w-full">
              Return to Dashboard
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
                            <Button variant="outline" className="w-full justify-start h-10 bg-background shadow-xs font-normal">
                              <Languages className="h-4 w-4" />
                              {selected_language_labels ? (
                                <span className="flex items-center gap-2">
                                  <span>{selected_language_labels}</span>
                                  <span>{form_data.languages.length} {t.ui.selected}</span>
                                </span>
                              ) : (
                                <span className="text-muted-foreground">{t.ui.select_languages}</span>
                              )}
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent className="w-[--radix-dropdown-menu-trigger-width] min-w-[--radix-dropdown-menu-trigger-width]">
                            <DropdownMenuLabel>{t.ui.select_languages}</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {__language_options.map((lang) => (
                              <DropdownMenuCheckboxItem 
                                key={lang.value} 
                                checked={form_data.languages.includes(lang.value)}
                                onCheckedChange={(checked) => handle_language_change(lang.value, checked)}
                                className="pl-8 flex items-center gap-3 py-2 cursor-pointer"
                              >
                                <span>{lang.flag}</span>
                                <span>{lang.label}</span>
                              </DropdownMenuCheckboxItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </Field>
                    </div>

                    <hr className="border-border" />

                    {/* SECTION: COMMUNICATION */}
                    <div className="flex flex-col gap-5">
                      <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-2">{t.ui.communication}</h3>

                      <Field className="gap-1.5">
                        <FieldLabel className="text-sm text-muted-foreground font-normal">
                          {t.questions.rate_skills}
                        </FieldLabel>
                        <ShadcnSelect value={form_data.communication_skills} onValueChange={(val) => handle_select("communication_skills", val)}>
                          <SelectTrigger className="h-10 bg-background shadow-xs">
                            <SelectValue placeholder={t.ui.select_rating} />
                          </SelectTrigger>
                          <SelectContent>
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
                              <SelectItem key={num} value={num.toString()}>{num}</SelectItem>
                            ))}
                          </SelectContent>
                        </ShadcnSelect>
                      </Field>

                      <Field className="gap-1.5">
                        <FieldLabel htmlFor="explanation" className="text-sm text-muted-foreground font-normal">
                          {t.questions.explanation}
                        </FieldLabel>
                        <Textarea required id="explanation" value={form_data.explanation} onChange={handle_change} className="bg-background min-h-[100px] resize-y shadow-xs" placeholder={t.placeholders.explain} />
                      </Field>
                    </div>

                    <hr className="border-border" />

                    {/* SECTION: SCENARIOS */}
                    <div className="flex flex-col gap-5">
                      <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-2">{t.ui.scenarios}</h3>

                      <Field className="gap-1.5">
                        <FieldLabel htmlFor="handle_upset_users" className="text-sm text-muted-foreground font-normal">
                          {t.questions.upset_users}
                        </FieldLabel>
                        <Textarea required id="handle_upset_users" value={form_data.handle_upset_users} onChange={handle_change} className="bg-background min-h-[100px] resize-y shadow-xs" placeholder={t.placeholders.upset} />
                      </Field>

                      <Field className="gap-1.5">
                        <FieldLabel htmlFor="handle_uncertainty" className="text-sm text-muted-foreground font-normal">
                          {t.questions.uncertainty}
                        </FieldLabel>
                        <Textarea required id="handle_uncertainty" value={form_data.handle_uncertainty} onChange={handle_change} className="bg-background min-h-[100px] resize-y shadow-xs" placeholder={t.placeholders.uncertainty} />
                      </Field>

                      <Field className="gap-1.5">
                        <FieldLabel htmlFor="unsure_case" className="text-sm text-muted-foreground font-normal">
                          {t.questions.unsure_case}
                        </FieldLabel>
                        <Textarea required id="unsure_case" value={form_data.unsure_case} onChange={handle_change} className="bg-background min-h-[100px] resize-y shadow-xs" />
                      </Field>
                    </div>

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

