import * as dotenv from 'dotenv';

dotenv.config();

const str = (key: string, fallback = ''): string => (process.env[key] ?? fallback).trim();

const httpUser = str('HTTP_USERNAME');
const httpPass = str('HTTP_PASSWORD');

export const env = {
  baseUrl: str('BASE_URL', 'https://tasawoq.uat.aawweb.com').replace(/\/+$/, ''),
  httpCredentials: httpUser ? { username: httpUser, password: httpPass } : undefined,
  user: {
    email: str('TEST_USER_EMAIL'),
    password: str('TEST_USER_PASSWORD'),
  },
  searchTerm: str('SEARCH_TERM', 'shirt'),
  searchTermNoResults: str('SEARCH_TERM_NO_RESULTS', 'zzqxnotaproduct123'),
  productPath: str('PRODUCT_PATH'),
  allowRegistration: str('ALLOW_REGISTRATION', 'true').toLowerCase() !== 'false',
};

export const hasUserCredentials = (): boolean => !!env.user.email && !!env.user.password;
