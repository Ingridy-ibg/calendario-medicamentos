import { addHours } from 'date-fns';
import { formatInTimeZone, toZonedTime } from 'date-fns-tz';
import { describe, expect, it } from 'vitest';

describe('date-fns setup', () => {
  it('adds hours to a date', () => {
    const start = new Date('2026-08-26T10:00:00.000Z');

    const result = addHours(start, 8);

    expect(result.toISOString()).toBe('2026-08-26T18:00:00.000Z');
  });
});

describe('date-fns-tz setup', () => {
  it('converts a UTC instant into the São Paulo time zone', () => {
    const utcInstant = new Date('2026-08-26T13:00:00.000Z');

    const saoPauloTime = toZonedTime(utcInstant, 'America/Sao_Paulo');
    const formatted = formatInTimeZone(utcInstant, 'America/Sao_Paulo', 'HH:mm');

    // América/São Paulo está em UTC-3 (sem horário de verão desde 2019).
    expect(saoPauloTime.getHours()).toBe(10);
    expect(formatted).toBe('10:00');
  });
});
