const longDateFormatter = new Intl.DateTimeFormat('ru-RU', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

const shortDateFormatter = new Intl.DateTimeFormat('ru-RU', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

export function formatDateLabel(value: string, variant: 'long' | 'short' = 'long') {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return variant === 'long'
    ? longDateFormatter.format(date)
    : shortDateFormatter.format(date);
}
