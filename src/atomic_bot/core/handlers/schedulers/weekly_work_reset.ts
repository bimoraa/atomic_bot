import { logger, db, time } from "@shared/utils"
import { get_week_number, get_year } from "@shared/database/trackers/work_tracker"

const WORK_REPORTS_COLLECTION = "work_reports"
const log                     = logger.create_logger("weekly_work_reset")

interface WorkReport {
  staff_id             : string
  staff_name           : string
  total_work           : number
  total_work_this_week : number
  total_salary         : number
  salary_this_week     : number
  week_number          : number
  year                 : number
  last_work            : number
}

// - WEEKLY WORK STATS RESET SCHEDULER - \\
export async function start_weekly_reset_scheduler(): Promise<void> {
  log.info("Starting weekly work reset scheduler")

  const check_and_reset = async () => {
    try {
      const current_week = get_week_number()
      const current_year = get_year()
      
      log.info(`Checking for weekly reset - Current: Week ${current_week}, Year ${current_year}`)

      const all_reports = await db.find_many<WorkReport>(WORK_REPORTS_COLLECTION, {})

      let reset_count = 0

      for (const report of all_reports) {
        const needs_reset = report.week_number !== current_week || report.year !== current_year

        if (needs_reset && (report.total_work_this_week > 0 || report.salary_this_week > 0)) {
          await db.update_one(
            WORK_REPORTS_COLLECTION,
            { staff_id: report.staff_id },
            {
              ...report,
              total_work_this_week : 0,
              salary_this_week     : 0,
              week_number          : current_week,
              year                 : current_year,
            },
            true
          )

          reset_count++
          log.info(`Reset weekly stats for ${report.staff_name} (${report.staff_id})`)
        }
      }

      if (reset_count > 0) {
        log.info(`Successfully reset ${reset_count} staff work stats for Week ${current_week}`)
      } else {
        log.info("No work stats needed reset")
      }
    } catch (error) {
      log.error("Error in weekly reset scheduler:", error)
    }
  }

  // Run check every hour
  setInterval(check_and_reset, 60 * 60 * 1000)

  // Run initial check after 5 seconds
  setTimeout(check_and_reset, 5000)
}
