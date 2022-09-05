export function toNDigits(num: string | number, digits: number): string {
  if (typeof num === "number") {
    return toNDigits(num.toString(), digits);
  }
  let addedZeros = digits - num.length;
  // this prevents error if number is bigger than the number of digits
  if (addedZeros < 0) addedZeros = 0;
  return "0".repeat(addedZeros) + num;
}
