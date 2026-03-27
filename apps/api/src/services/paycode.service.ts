import * as walletService from './wallet.service';

export async function generatePaycode(userId: string, amount: number) {
  return walletService.generatePaycode(userId, amount);
}
