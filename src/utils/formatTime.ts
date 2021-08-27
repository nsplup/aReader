"use strict";

/**
 * @description YYYY => Year;
 * @description MM => Month;
 * @description DD => Date;
 * @description dd => Day;
 * @description hh => Hours;
 * @description mm => Minutes;
 * @description ss => Seconds
 */
export function formatTime (
  time: string | number | Date,
  format = 'YYYY-MM-DD hh:mm',
  dayStr = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
): string {
  const date = new Date(time)
  const YYYY = date.getFullYear(), MM = date.getMonth() + 1, DD = date.getDate()
  const dd = dayStr[date.getDay()]
  const hh = date.getHours(), mm = date.getMinutes(), ss = date.getSeconds()

  const DateMap: any[] = [YYYY, MM, DD, dd, hh, mm, ss].map(n => n < 10 ? '0' + n : n)
  const replaceMap: any = { 'YYYY': 0, 'MM': 1, 'DD': 2, 'dd': 3, 'hh': 4, 'mm': 5, 'ss': 6 }

  return format.replace(/YYYY|MM|DD|dd|hh|mm|ss/g, fragment => DateMap[replaceMap[fragment]])
}