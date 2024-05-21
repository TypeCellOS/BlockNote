export function camelToDataKebab(str: string): string {
  return "data-" + str.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();
}

export function filenameFromURL(url: string): string {
  const parts = url.split("/");
  if (
    !parts.length || // invalid?
    parts[parts.length - 1] === "" // for example, URL ends in a directory-like trailing slash
  ) {
    // in this case just return the original url
    return url;
  }
  return parts[parts.length - 1];
}
