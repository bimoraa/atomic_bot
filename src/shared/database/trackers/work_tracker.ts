import { db, time, logger } from "../../utils"

const WORK_LOGS_COLLECTION    = "work_logs"
const WORK_REPORTS_COLLECTION = "work_reports"
const log                     = logger.create_logger("work_tracker")

export interface WorkLog {
  work_id:       string
  staff_id:      string
  staff_name:    string
  type:          "ticket" | "whitelist"
  thread_link:   string
  proof_link?:   string
  amount:        number
  salary:        number
  week_number:   number
  year:          number
  date:          string
  created_at:    number
}

export interface WorkReport {
  staff_id:             string
  staff_name:           string
  total_work:           number
  total_work_this_week: number
  total_salary:         number
  salary_this_week:     number
  week_number:          number
  year:                 number
  last_work:            number
}

const SALARY_TICKET    = 2500
const SALARY_WHITELIST = 1500

export function get_week_number(): number {
  const now        = new Date()
  const start      = new Date(now.getFullYear(), 0, 1)
  const diff       = now.getTime() - start.getTime()
  const one_week   = 1000 * 60 * 60 * 24 * 7
  return Math.ceil((diff + start.getDay() * 86400000) / one_week)
}

export function get_year(): number {
  return new Date().getFullYear()
}

export function format_date_id(): string {
  const days   = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"]
  const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"]
  const now    = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Jakarta" }))
  const day    = days[now.getDay()]
  const date   = now.getDate()
  const month  = months[now.getMonth()]
  const hours  = now.getHours().toString().padStart(2, "0")
  const mins   = now.getMinutes().toString().padStart(2, "0")
  return `${day} ${date} ${month} ${hours}.${mins}`
}

export async function get_next_work_id(staff_id: string): Promise<string> {
  const week   = get_week_number()
  const year   = get_year()
  const count  = await db.count(WORK_LOGS_COLLECTION, { staff_id, week_number: week, year })
  return `WORK-${count + 1}`
}

export async function add_work_log(
  staff_id:     string,
  staff_name:   string,
  type:         "ticket" | "whitelist",
  thread_link:  string,
  proof_link?:  string,
  amount:       number = 0
): Promise<WorkLog | null> {
  if (!db.is_connected()) return null

  const work_id     = await get_next_work_id(staff_id)
  const week_number = get_week_number()
  const year        = get_year()
  const salary      = type === "ticket" ? SALARY_TICKET : SALARY_WHITELIST
  const created_at  = time.now()
  const date        = format_date_id()

  const work_log: WorkLog = {
    work_id,
    staff_id,
    staff_name,
    type,
    thread_link,
    proof_link,
    amount,
    salary,
    week_number,
    year,
    date,
    created_at,
  }

  await db.insert_one(WORK_LOGS_COLLECTION, work_log)
  await update_work_report(staff_id, staff_name, salary)

  log.info(`Added work log ${work_id} for ${staff_name} (${type})`)
  return work_log
}

export async function update_work_report(
  staff_id:   string,
  staff_name: string,
  salary:     number
): Promise<void> {
  if (!db.is_connected()) return

  const week_number = get_week_number()
  const year        = get_year()
  const now         = time.now()

  const existing = await db.find_one<WorkReport>(WORK_REPORTS_COLLECTION, { staff_id })

  if (existing) {
    const is_same_week = existing.week_number === week_number && existing.year === year

    await db.update_one(WORK_REPORTS_COLLECTION, { staff_id }, {
      staff_id,
      staff_name,
      total_work:           Number(existing.total_work || 0) + 1,
      total_work_this_week: is_same_week ? Number(existing.total_work_this_week || 0) + 1 : 1,
      total_salary:         Number(existing.total_salary || 0) + Number(salary),
      salary_this_week:     is_same_week ? Number(existing.salary_this_week || 0) + Number(salary) : Number(salary),
      week_number,
      year,
      last_work:            now,
    }, true)
  } else {
    await db.update_one(WORK_REPORTS_COLLECTION, { staff_id }, {
      staff_id,
      staff_name,
      total_work:           1,
      total_work_this_week: 1,
      total_salary:         Number(salary),
      salary_this_week:     Number(salary),
      week_number,
      year,
      last_work:            now,
    }, true)
  }
}

export async function get_work_report(staff_id: string): Promise<WorkReport | null> {
  if (!db.is_connected()) return null
  return await db.find_one<WorkReport>(WORK_REPORTS_COLLECTION, { staff_id })
}

export async function get_work_logs(
  staff_id:    string,
  week_number: number,
  year:        number
): Promise<WorkLog[]> {
  if (!db.is_connected()) return []
  return await db.find_many<WorkLog>(WORK_LOGS_COLLECTION, { staff_id, week_number, year })
}

export async function get_all_staff_reports(): Promise<WorkReport[]> {
  if (!db.is_connected()) return []
  return await db.find_many<WorkReport>(WORK_REPORTS_COLLECTION, {})
}

export function format_salary(amount: number): string {
  return `Rp ${new Intl.NumberFormat("id-ID").format(amount)}`
}
