import { ogImageResponse } from "../ogImageResponse";

export const revalidate = false;

// route used for og images without a title
export async function GET(_req: Request) {
  return ogImageResponse();
}
