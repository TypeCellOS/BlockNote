export async function corsProxyResolveFileUrl(url: string) {
  // data:/blob: URLs carry their bytes locally - there is nothing for the
  // proxy to fetch (blob: URLs aren't even resolvable outside this page),
  // and prefixing them produces a request the proxy always rejects.
  if (url.startsWith("data:") || url.startsWith("blob:")) {
    return url;
  }
  return (
    "https://corsproxy.api.blocknotejs.org/corsproxy/?url=" +
    encodeURIComponent(url)
  );
}
