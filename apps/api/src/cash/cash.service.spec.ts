describe('Cash Closing & Divergence Calculation', () => {
  it('deve calcular o saldo esperado em dinheiro corretamente', () => {
    const initialBalance = 100.0;
    const cashSalesTotal = 350.5;
    const suppliesTotal = 50.0;
    const sangriasTotal = 100.0;
    const refundsTotal = 20.0;

    const expectedBalance = initialBalance + cashSalesTotal + suppliesTotal - sangriasTotal - refundsTotal;
    expect(expectedBalance).toBe(380.5);

    // Conferência Cega sem divergência
    const reportedExact = 380.5;
    const diffExact = reportedExact - expectedBalance;
    expect(diffExact).toBe(0);

    // Conferência Cega com quebra de caixa (faltando dinheiro)
    const reportedShort = 370.0;
    const diffShort = reportedShort - expectedBalance;
    expect(diffShort).toBe(-10.5);

    // Conferência Cega com sobra de caixa
    const reportedOver = 390.0;
    const diffOver = reportedOver - expectedBalance;
    expect(diffOver).toBe(9.5);
  });
});
