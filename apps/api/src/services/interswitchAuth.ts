import { getAccessToken } from './interswitch.service';

export async function getInterswitchToken(): Promise<string> {
  return getAccessToken();
}
