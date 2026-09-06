export const assertString = (value: unknown, field: string, filePath: string): string => {
  if (typeof value !== 'string' || value.trim().length === 0) throw new Error(`Missing required frontmatter field "${field}" in ${filePath}`);
  return value;
};

export const optionalString = (value: unknown) => (typeof value === 'string' ? value : undefined);

export const stringList = (value: unknown, field: string, filePath: string): string[] => {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) throw new Error(`Frontmatter field "${field}" must be a list of strings in ${filePath}`);
  return value;
};
