export const interswitchService = {
  verifyBVN: async (documentNumber: string) => ({ verified: true, documentType: 'BVN', documentNumber }),
  verifyNIN: async (documentNumber: string) => ({ verified: true, documentType: 'NIN', documentNumber }),
  verifyPassport: async (documentNumber: string) => ({ verified: true, documentType: 'PASSPORT', documentNumber }),
  verifyDriversLicense: async (documentNumber: string) => ({ verified: true, documentType: 'DRIVERS_LICENSE', documentNumber }),
  facialCompare: async (_selfie: Buffer, _documentPhoto: Buffer) => ({ matched: true, similarityScore: 0.96 }),
};
