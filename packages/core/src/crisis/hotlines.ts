/**
 * Crisis hotlines per country (#147).
 *
 * Данные основаны на официальных источниках (WHO, Befrienders Worldwide, IASP).
 * Источники нужно периодически проверять — номера меняются.
 *
 * Ключ — ISO 3166-1 alpha-2 country code.
 * `fallback` для неопознанных стран.
 */

export interface Hotline {
  name: string;
  phone: string; // национальный/бесплатный
  phoneInternational?: string; // для путешественников
  sms?: string;
  online?: string; // URL чата
  languages: string[];
  available247: boolean;
  specializations?: string[]; // suicide | crisis | youth | lgbtq+ | veterans
}

export interface CountryHotlines {
  country: string;
  countryCode: string;
  hotlines: Hotline[];
  emergencyNumber: string; // 911 / 112 / ...
}

const COMMON_EMERGENCY = {
  RU: '112',
  US: '911',
  CA: '911',
  GB: '999',
  DE: '112',
  FR: '112',
  IT: '112',
  ES: '112',
  PL: '112',
  UA: '112',
  AU: '000',
  NZ: '111',
  JP: '110',
  IN: '112',
  IL: '101',
  BR: '190',
  MX: '911',
  TR: '112',
  KZ: '112',
  BY: '112',
  GE: '112',
};

export const HOTLINES: Record<string, CountryHotlines> = {
  RU: {
    country: 'Russia',
    countryCode: 'RU',
    emergencyNumber: '112',
    hotlines: [
      {
        name: 'Телефон доверия МЧС',
        phone: '8-800-2000-122',
        languages: ['ru'],
        available247: true,
        specializations: ['crisis', 'youth'],
      },
      {
        name: 'Центр экстренной психологической помощи МЧС',
        phone: '+7 (495) 989-50-50',
        languages: ['ru'],
        available247: true,
      },
    ],
  },
  US: {
    country: 'United States',
    countryCode: 'US',
    emergencyNumber: '911',
    hotlines: [
      {
        name: '988 Suicide & Crisis Lifeline',
        phone: '988',
        sms: '988',
        online: 'https://988lifeline.org',
        languages: ['en', 'es'],
        available247: true,
        specializations: ['suicide', 'crisis'],
      },
      {
        name: 'Crisis Text Line',
        phone: '',
        sms: 'Text HOME to 741741',
        languages: ['en'],
        available247: true,
        specializations: ['crisis'],
      },
      {
        name: 'The Trevor Project (LGBTQ+ Youth)',
        phone: '1-866-488-7386',
        sms: 'Text START to 678678',
        languages: ['en'],
        available247: true,
        specializations: ['lgbtq+', 'youth'],
      },
    ],
  },
  GB: {
    country: 'United Kingdom',
    countryCode: 'GB',
    emergencyNumber: '999',
    hotlines: [
      {
        name: 'Samaritans',
        phone: '116 123',
        languages: ['en'],
        available247: true,
        specializations: ['suicide', 'crisis'],
      },
      {
        name: 'SHOUT',
        phone: '',
        sms: 'Text SHOUT to 85258',
        languages: ['en'],
        available247: true,
      },
    ],
  },
  CA: {
    country: 'Canada',
    countryCode: 'CA',
    emergencyNumber: '911',
    hotlines: [
      {
        name: 'Talk Suicide Canada',
        phone: '1-833-456-4566',
        sms: '45645',
        languages: ['en', 'fr'],
        available247: true,
        specializations: ['suicide'],
      },
    ],
  },
  DE: {
    country: 'Germany',
    countryCode: 'DE',
    emergencyNumber: '112',
    hotlines: [
      {
        name: 'Telefonseelsorge',
        phone: '0800 111 0 111',
        languages: ['de'],
        available247: true,
      },
    ],
  },
  FR: {
    country: 'France',
    countryCode: 'FR',
    emergencyNumber: '112',
    hotlines: [
      {
        name: '3114 — Numéro national de prévention du suicide',
        phone: '3114',
        languages: ['fr'],
        available247: true,
        specializations: ['suicide'],
      },
    ],
  },
  AU: {
    country: 'Australia',
    countryCode: 'AU',
    emergencyNumber: '000',
    hotlines: [
      {
        name: 'Lifeline Australia',
        phone: '13 11 14',
        online: 'https://www.lifeline.org.au/crisis-chat',
        languages: ['en'],
        available247: true,
      },
    ],
  },
  UA: {
    country: 'Ukraine',
    countryCode: 'UA',
    emergencyNumber: '112',
    hotlines: [
      {
        name: 'Лайфлайн Україна',
        phone: '7333',
        languages: ['uk'],
        available247: true,
        specializations: ['suicide', 'crisis'],
      },
    ],
  },
  KZ: {
    country: 'Kazakhstan',
    countryCode: 'KZ',
    emergencyNumber: '112',
    hotlines: [
      {
        name: 'Телефон доверия для детей и молодёжи',
        phone: '150',
        languages: ['ru', 'kk'],
        available247: true,
        specializations: ['youth'],
      },
    ],
  },
  BY: {
    country: 'Belarus',
    countryCode: 'BY',
    emergencyNumber: '112',
    hotlines: [
      {
        name: 'Экстренная психологическая помощь',
        phone: '8 801 100 16 11',
        languages: ['ru', 'be'],
        available247: true,
      },
    ],
  },
};

const FALLBACK_HOTLINES: CountryHotlines = {
  country: 'International',
  countryCode: 'XX',
  emergencyNumber: '112',
  hotlines: [
    {
      name: 'Befrienders Worldwide — find a helpline',
      phone: '',
      online: 'https://www.befrienders.org/need-to-talk',
      languages: ['multiple'],
      available247: true,
    },
    {
      name: 'IASP Crisis Centres',
      phone: '',
      online: 'https://www.iasp.info/resources/Crisis_Centres',
      languages: ['multiple'],
      available247: true,
    },
  ],
};

export function getHotlinesForCountry(countryCode?: string | null): CountryHotlines {
  if (!countryCode) return FALLBACK_HOTLINES;
  const upper = countryCode.toUpperCase();
  return HOTLINES[upper] ?? {
    ...FALLBACK_HOTLINES,
    emergencyNumber:
      COMMON_EMERGENCY[upper as keyof typeof COMMON_EMERGENCY] ??
      FALLBACK_HOTLINES.emergencyNumber,
  };
}
