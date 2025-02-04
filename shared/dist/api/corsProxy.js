export async function corsProxyResolveFileUrl(url) {
    return ("https://corsproxy.api.blocknotejs.org/corsproxy/?url=" +
        encodeURIComponent(url));
}
