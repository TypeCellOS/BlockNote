# AI Integration with ClientSideTransport

The standard setup is to have BlockNote AI call your server, which then calls an LLM of your choice. In this example, we show how you can use the `ClientSideTransport` to make calls directly to your LLM provider.

To hide API keys of our LLM provider, we do still route calls through a proxy server using `fetchViaProxy` (this is optional).
