export async function corsProxyResolveFileUrl(url: string) {
  return (
    "https://corsproxy.api.blocknotejs.org/corsproxy/?url=" +
    encodeURIComponent(url)
  );
}
