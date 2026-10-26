/** Android versionName: SW_<version>_<key-features>_<YYYY-MM-DD or DDMonYY> */
export const VERSION_NAME_PATTERN =
  /^SW_\d+\.\d+(?:\.\d+)?_[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*_(?:\d{4}-\d{2}-\d{2}|\d{2}[A-Za-z]{3}\d{2})$/

export function isValidVersionName(versionName: string): boolean {
  return VERSION_NAME_PATTERN.test(versionName)
}

export function isValidVersionCode(versionCode: number): boolean {
  return Number.isInteger(versionCode) && versionCode > 0
}
