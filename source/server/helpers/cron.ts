import { CronCommand, CronJob } from "cron"

const everyMinute = "* * * * *"
const everyHour = "0 * * * *"
const everyDay = "0 0 * * *"
const everyWeek = "0 0 * * 0"

type ScheduledTask = CronJob<() => void, undefined>

/**
 * Schedules a cron job to run at a specific time.
 * @param time The time to run the job at, in standard cron syntax.
 * @param onTick The function to run when the job is executed.
 * @param onComplete The function to run when the job is completed.
 * @param executeNow Whether to execute the job immediately. Defaults to true.
 * @returns The cron job.
 * @since 0.1.0
 * @example const job = scheduleTask("0 0 * * *", () => console.log("Hello World!"))
 */
export const scheduleTask = (
	time: string,
	onTick: CronCommand<undefined, true>,
	onComplete?: () => void,
	executeNow = false
): ScheduledTask => new CronJob(time, onTick, onComplete, true, "utc", undefined, executeNow)

/**
 * Schedule a task to run every minute.
 * @param onTick The function to run when the job is executed.
 * @param onComplete The function to run when the job is completed.
 * @param executeNow Whether to execute the job immediately. Defaults to true.
 * @returns The cron job.
 * @since 0.1.0
 * @example const job = scheduleMinutelyTask(() => console.log("Hello World!"))
 */
export const scheduleMinutelyTask = (
	onTick: CronCommand<undefined, true>,
	onComplete?: () => void,
	executeNow = true
): ScheduledTask => scheduleTask(everyMinute, onTick, onComplete, executeNow)

/**
 * Schedule a task to run every hour.
 * @param onTick The function to run when the job is executed.
 * @param onComplete The function to run when the job is completed.
 * @param executeNow Whether to execute the job immediately. Defaults to true.
 * @returns The cron job.
 * @since 0.1.0
 * @example const job = scheduleHourlyTask(() => console.log("Hello World!"))
 */
export const scheduleHourlyTask = (
	onTick: CronCommand<undefined, true>,
	onComplete?: () => void,
	executeNow = true
): ScheduledTask => scheduleTask(everyHour, onTick, onComplete, executeNow)

/**
 * Schedule a task to run every day.
 * @param onTick The function to run when the job is executed.
 * @param onComplete The function to run when the job is completed.
 * @param executeNow Whether to execute the job immediately. Defaults to true.
 * @returns The cron job.
 * @since 0.1.0
 * @example const job = scheduleDailyTask(() => console.log("Hello World!"))
 */
export const scheduleDailyTask = (
	onTick: CronCommand<undefined, true>,
	onComplete?: () => void,
	executeNow = true
): ScheduledTask => scheduleTask(everyDay, onTick, onComplete, executeNow)

/**
 * Schedule a task to run every week.
 * @param onTick The function to run when the job is executed.
 * @param onComplete The function to run when the job is completed.
 * @param executeNow Whether to execute the job immediately. Defaults to true.
 * @returns The cron job.
 * @since 0.1.0
 * @example const job = scheduleWeeklyTask(() => console.log("Hello World!"))
 */
export const scheduleWeeklyTask = (
	onTick: CronCommand<undefined, true>,
	onComplete?: () => void,
	executeNow = true
): ScheduledTask => scheduleTask(everyWeek, onTick, onComplete, executeNow)
