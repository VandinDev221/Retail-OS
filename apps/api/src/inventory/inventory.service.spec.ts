describe('Inventory FEFO Algorithm & Expiration Sorting', () => {
  it('deve ordenar lotes de estoque pela data de validade mais próxima (FEFO)', () => {
    const lotA = { id: 'lot-1', lotNumber: 'L-001', expirationDate: new Date('2026-09-01'), qty: 20 };
    const lotB = { id: 'lot-2', lotNumber: 'L-002', expirationDate: new Date('2026-08-25'), qty: 15 };
    const lotC = { id: 'lot-3', lotNumber: 'L-003', expirationDate: new Date('2026-12-31'), qty: 50 };

    const lots = [lotA, lotB, lotC];
    const sortedFEFO = lots.sort((a, b) => a.expirationDate.getTime() - b.expirationDate.getTime());

    expect(sortedFEFO[0].id).toBe('lot-2'); // Vence em 25/08 (primeiro a sair)
    expect(sortedFEFO[1].id).toBe('lot-1'); // Vence em 01/09
    expect(sortedFEFO[2].id).toBe('lot-3'); // Vence em 31/12
  });

  it('deve identificar corretamente produtos vencidos e a vencer em 7 dias', () => {
    const baseTime = new Date('2026-08-20T00:00:00Z').getTime();
    const isExpired = (expDate: Date) => expDate.getTime() < baseTime;
    const isExpiringIn7Days = (expDate: Date) => {
      const d7 = baseTime + 7 * 24 * 60 * 60 * 1000;
      return expDate.getTime() >= baseTime && expDate.getTime() <= d7;
    };

    expect(isExpired(new Date('2026-08-19T00:00:00Z'))).toBe(true);
    expect(isExpired(new Date('2026-08-21T00:00:00Z'))).toBe(false);

    expect(isExpiringIn7Days(new Date('2026-08-25T00:00:00Z'))).toBe(true);
    expect(isExpiringIn7Days(new Date('2026-08-30T00:00:00Z'))).toBe(false);
  });
});
