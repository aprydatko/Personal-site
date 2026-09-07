import { parseDate } from '@/lib/date';

export const sortByNewest = <T extends { date: string }>(items: T[]) =>
  items.toSorted((first, second) => parseDate(second.date).getTime() - parseDate(first.date).getTime());
