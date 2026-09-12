export type KalpLagna = {
  value: string;
  signIndex: number;
  longitude: number;
  degree: number;
  degreeText: string;
  source: "KALP_CALCULATED";
  calculationSystem: "SIDEREAL_LAHIRI";
  evidenceStatus: "CALCULATED";
  ayanamsa: number;
  julianDay: number;
};

const SIGNS = ["मेष", "वृषभ", "मिथुन", "कर्क", "सिंह", "कन्या", "तुला", "वृश्चिक", "धनु", "मकर", "कुंभ", "मीन"];
const norm360 = (value: number): number => ((value % 360) + 360) % 360;

function parseLocalDateTime(value: string, timezoneOffsetMinutes = 330) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d+))?)?(?:([+-])(\d{2}):(\d{2})|Z)?$/);
  if (!match) throw new Error("INVALID_DATETIME_FORMAT");
  const [, year, month, day, hour, minute, second = "0", fraction = "", sign, offsetHour, offsetMinute] = match;
  const explicitOffset = sign && offsetHour && offsetMinute ? (Number(offsetHour) * 60 + Number(offsetMinute)) * (sign === "-" ? -1 : 1) : null;
  return { year: Number(year), month: Number(month), day: Number(day), hour: Number(hour), minute: Number(minute), second: Number(second), millisecond: Number((fraction + "000").slice(0, 3)), offsetMinutes: explicitOffset ?? timezoneOffsetMinutes };
}

function julianDayUtc(value: ReturnType<typeof parseLocalDateTime>): number {
  const utcMillis = Date.UTC(value.year, value.month - 1, value.day, value.hour, value.minute, value.second, value.millisecond) - value.offsetMinutes * 60000;
  const date = new Date(utcMillis);
  let year = date.getUTCFullYear(), month = date.getUTCMonth() + 1;
  const day = date.getUTCDate() + (date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600 + date.getUTCMilliseconds() / 3600000) / 24;
  if (month <= 2) { year -= 1; month += 12; }
  const A = Math.floor(year / 100), B = 2 - A + Math.floor(A / 4);
  return Math.floor(365.25 * (year + 4716)) + Math.floor(30.6001 * (month + 1)) + day + B - 1524.5;
}

function lahiriAyanamsa(julianDay: number): number {
  // Chitrapaksha/Lahiri mean drift anchored to the J2000 Lahiri value.
  // The sign is intentional: ayanamsa is smaller in 1976 than at J2000.
  return 23.85709 + (50.290966 / 3600) * ((julianDay - 2451545.0) / 365.2425);
}

function obliquity(julianDay: number): number {
  const T = (julianDay - 2451545.0) / 36525;
  return (84381.448 - 46.8150 * T - 0.00059 * T * T + 0.001813 * T * T * T) / 3600;
}

function gmstDegrees(julianDay: number): number {
  const T = (julianDay - 2451545.0) / 36525;
  return norm360(280.46061837 + 360.98564736629 * (julianDay - 2451545.0) + 0.000387933 * T * T - (T * T * T) / 38710000);
}

export function calculateKalpLagna(datetime: string, coordinates: string, timezoneOffsetMinutes = 330): KalpLagna {
  const [latitude, longitude] = coordinates.split(",").map(Number);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) throw new Error("INVALID_COORDINATES");
  const parsed = parseLocalDateTime(datetime, timezoneOffsetMinutes);
  const julianDay = julianDayUtc(parsed);
  const ramc = norm360(gmstDegrees(julianDay) + longitude);
  const epsilon = obliquity(julianDay) * Math.PI / 180;
  const phi = latitude * Math.PI / 180;
  const theta = ramc * Math.PI / 180;
  const tropical = norm360(Math.atan2(Math.cos(theta), -(Math.sin(theta) * Math.cos(epsilon) + Math.tan(phi) * Math.sin(epsilon))) * 180 / Math.PI);
  const ayanamsa = lahiriAyanamsa(julianDay);
  const sidereal = norm360(tropical - ayanamsa);
  const signIndex = Math.floor(sidereal / 30);
  const degree = sidereal - signIndex * 30;
  return { value: SIGNS[signIndex], signIndex, longitude: sidereal, degree, degreeText: `${Math.floor(degree)}° ${Math.floor((degree % 1) * 60)}′`, source: "KALP_CALCULATED", calculationSystem: "SIDEREAL_LAHIRI", evidenceStatus: "CALCULATED", ayanamsa, julianDay };
}
