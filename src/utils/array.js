export const joinNonEmpty = (array, separator) =>
  array.filter(Boolean).join(separator)
