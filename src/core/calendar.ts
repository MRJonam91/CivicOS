// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 Manoj Rollo (MRJonam91)

export class CivicCalendar {
  public static isHoliday(date: Date): boolean {
    const y = date.getUTCFullYear();
    const m = date.getUTCMonth() + 1; // 1-12
    const d = date.getUTCDate();

    // Fixed Italian national holidays
    const fixedHolidays = [
      '1-1',   // Capodanno
      '1-6',   // Epifania
      '4-25',  // Festa della Liberazione
      '5-1',   // Festa del Lavoro
      '6-2',   // Festa della Repubblica
      '8-15',  // Ferragosto
      '11-1',  // Ognissanti
      '12-8',  // Immacolata Concezione
      '12-25', // Natale
      '12-26'  // Santo Stefano
    ];

    if (fixedHolidays.includes(`${m}-${d}`)) {
      return true;
    }

    // Easter Monday (Lunedì dell'Angelo) via Meeus/Jones/Butcher algorithm
    const easterMonday = this.getEasterMonday(y);
    return easterMonday.month === m && easterMonday.day === d;
  }

  public static isBusinessDay(date: Date): boolean {
    const dayOfWeek = date.getUTCDay(); // 0: Sunday, 6: Saturday
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return false;
    }
    return !this.isHoliday(date);
  }

  public static addBusinessDays(startDate: Date, businessDays: number): Date {
    const cur = new Date(startDate.getTime());
    let added = 0;

    while (added < businessDays) {
      cur.setUTCDate(cur.getUTCDate() + 1);
      if (this.isBusinessDay(cur)) {
        added++;
      }
    }
    return cur;
  }

  private static getEasterMonday(year: number): { month: number; day: number } {
    const a = year % 19;
    const b = Math.floor(year / 100);
    const c = year % 100;
    const d = Math.floor(b / 4);
    const e = b % 4;
    const f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4);
    const k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31);
    const day = ((h + l - 7 * m + 114) % 31) + 1;

    // Easter is (month, day). Easter Monday is +1 day
    const easterDate = new Date(Date.UTC(year, month - 1, day));
    easterDate.setUTCDate(easterDate.getUTCDate() + 1);

    return {
      month: easterDate.getUTCMonth() + 1,
      day: easterDate.getUTCDate()
    };
  }
}
