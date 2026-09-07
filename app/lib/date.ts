const DISPLAY_DATE_PATTERN = /^(January|February|March|April|May|June|July|August|September|October|November|December) ([1-9]|[12]\d|3[01]), (\d{4})$/;
const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * Parses a display date such as "May 12, 2024" into a UTC Date.
 *
 * @throws {TypeError} When the value is not a valid display date.
 */
export const parseDate = (value: string): Date => {
  const match = DISPLAY_DATE_PATTERN.exec(value);
  const isoMatch = ISO_DATE_PATTERN.exec(value);

  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    const parsedDate = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));

    if (parsedDate.getUTCMonth() !== Number(month) - 1 || parsedDate.getUTCDate() !== Number(day)) {
      throw new TypeError(`Invalid date: "${value}".`);
    }

    return parsedDate;
  }

  if (!match) {
    throw new TypeError(`Invalid date format: "${value}". Expected "Month D, YYYY".`);
  }

  const [, monthName, day, year] = match;
  const month = new Date(`${monthName} 1, ${year}`).getUTCMonth();
  const parsedDate = new Date(Date.UTC(Number(year), month, Number(day)));

  if (parsedDate.getUTCMonth() !== month || parsedDate.getUTCDate() !== Number(day)) {
    throw new TypeError(`Invalid date: "${value}".`);
  }

  return parsedDate;
};
