export const ENV = {
  API_URL: process.env.NEXT_PUBLIC_API_URL || 'https://api.example.com',
  IS_PRODUCTION: process.env.NODE_ENV === 'production',
  IS_DEVELOPMENT: process.env.NODE_ENV === 'development',
} as const;

if (!process.env.NEXT_PUBLIC_API_URL && ENV.IS_PRODUCTION) {
  console.warn('NEXT_PUBLIC_API_URL is not defined in production environment.');
}
