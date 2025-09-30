export const fetchViaProxy =
  (getUrl: (url: string) => string) =>
  async (input: string | URL | Request, init?: RequestInit) => {
    const request = new Request(input, init);

    // console.log("fetchViaProxy", baseURL, provider, request);
    const url = getUrl(request.url);
    const newRequest = new Request(url, {
      headers: request.headers,
      // if we just pass request.body, it's a readablestream which is not visible in chrome inspector,
      // so use init?.body instead if it's available to make debugging easier
      body: init?.body || request.body,
      method: request.method,
      duplex: "half",
    } as any);

    const resp = await fetch(newRequest);
    return resp;
  };
