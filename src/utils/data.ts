/** Test data builders. Everything is clearly fake so it is easy to clean up on UAT. */
export const uniqueId = (): string => `${Date.now()}${Math.floor(Math.random() * 1000)}`;

export const newCustomer = () => {
  const id = uniqueId();
  return {
    firstName: 'QA',
    lastName: `Auto${id.slice(-5)}`,
    email: `qa.e2e+${id}@example.com`,
    password: `Qa!${id}Aa`,
    phone: `5${id.slice(-8)}`,
  };
};

export const guestShipping = () => {
  const c = newCustomer();
  return {
    ...c,
    street: '123 Test Street',
    city: 'Riyadh',
    postcode: '12345',
    country: 'Saudi Arabia',
  };
};

/** Parse a price string like "SAR 1,234.50", "١٬٢٣٤٫٥٠ ر.س" or "1.234,50 €" into a number. */
export const parsePrice = (raw: string): number => {
  const western = raw.replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d))).replace(/[٬]/g, ',').replace(/[٫]/g, '.');
  const cleaned = western.replace(/[^\d.,]/g, '');
  if (!cleaned) return NaN;
  const lastComma = cleaned.lastIndexOf(',');
  const lastDot = cleaned.lastIndexOf('.');
  const normalised =
    lastComma > lastDot && cleaned.length - lastComma <= 3
      ? cleaned.replace(/\./g, '').replace(',', '.')
      : cleaned.replace(/,/g, '');
  return parseFloat(normalised);
};
