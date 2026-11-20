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

export const DAY_INDEX_TO_ID = {
  0: 'sunday',
  1: 'monday',
  2: 'tuesday',
  3: 'wednesday',
  4: 'thursday',
  5: 'friday',
  6: 'saturday'
};

export const DAY_ID_TO_ARABIC = {
  saturday: 'السبت',
  sunday: 'الأحد',
  monday: 'الإثنين',
  tuesday: 'الثلاثاء',
  wednesday: 'الأربعاء',
  thursday: 'الخميس',
  friday: 'الجمعة'
};

/**
 * Returns clean day information (id, name, isOff) for a YYYY-MM-DD string without timezone skew.
 */
export function getDayInfoFromDateStr(dateStr, weeklyOffDays = []) {
  if (!dateStr || typeof dateStr !== 'string') return null;
  try {
    const parts = dateStr.split('T')[0].split('-').map(Number);
    if (parts.length !== 3 || isNaN(parts[0]) || isNaN(parts[1]) || isNaN(parts[2])) {
      return null;
    }
    // Using local noon to be 100% immune to DST and timezone shift
    const d = new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0);
    if (isNaN(d.getTime())) return null;

    const dayId = DAY_INDEX_TO_ID[d.getDay()];
    const dayName = DAY_ID_TO_ARABIC[dayId] || ARABIC_DAYS[d.getDay()] || '';
    const isOff = Array.isArray(weeklyOffDays) && weeklyOffDays.includes(dayId);

    return {
      dateStr: dateStr.split('T')[0],
      dayId,
      dayName,
      isOff
    };
  } catch (e) {
    return null;
  }
}

export function formatArabicDateWithDay(date = new Date()) {
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    const dayName = ARABIC_DAYS[d.getDay()] || '';
    const dayNumber = d.getDate();
    const monthName = ARABIC_MONTHS[d.getMonth()] || '';
    return `${dayName}، ${dayNumber} ${monthName}`;
  } catch (e) {
    return '';
  }
}

export function formatCairoTime(dateStrOrObj) {
  if (!dateStrOrObj) return '--:--';
  try {
    const clean = typeof dateStrOrObj === 'string' ? dateStrOrObj.replace(' ', 'T') : dateStrOrObj;
    const d = new Date(clean);
    if (isNaN(d.getTime())) return '--:--';
    return d.toLocaleTimeString('ar-EG', {
      timeZone: 'Africa/Cairo',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (e) {
    return '--:--';
  }
}
