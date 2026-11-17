// Standard Arabic date helpers with consistent "ال" prefix for all days of week
export const ARABIC_DAYS = [
  'الأحد',
  'الإثنين',
  'الثلاثاء',
  'الأربعاء',
  'الخميس',
  'الجمعة',
  'السبت'
];

export const ARABIC_MONTHS = [
  'يناير', 'فبراير', 'مارس', 'إبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
];

export const DAYS_OF_WEEK_OPTIONS = [
  { id: 'saturday', name: 'السبت' },
  { id: 'sunday', name: 'الأحد' },
  { id: 'monday', name: 'الإثنين' },
  { id: 'tuesday', name: 'الثلاثاء' },
  { id: 'wednesday', name: 'الأربعاء' },
  { id: 'thursday', name: 'الخميس' },
  { id: 'friday', name: 'الجمعة' }
];

export function formatArabicDateWithDay(date = new Date()) {
  const d = new Date(date);
  const dayName = ARABIC_DAYS[d.getDay()];
  const dayNumber = d.getDate();
  const monthName = ARABIC_MONTHS[d.getMonth()];
  return `${dayName}، ${dayNumber} ${monthName}`;
}

export function formatCairoTime(dateStrOrObj) {
  if (!dateStrOrObj) return '--';
  const d = new Date(dateStrOrObj);
  return d.toLocaleTimeString('ar-EG', {
    timeZone: 'Africa/Cairo',
    hour: '2-digit',
    minute: '2-digit'
  });
}
