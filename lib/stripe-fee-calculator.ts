// Calculate Stripe processing fees based on country and card region
// These fees are NON-REFUNDABLE when a payment is refunded

export interface StripeFeeCalculation {
  processingFee: number
  currencyConversionFee: number
  totalFees: number
  netAmount: number
  refundableAmount: number
}

export function calculateStripeFees(
  amount: number,
  currency: string,
  customerCountry: string,
  cardRegion: "domestic" | "international_eea" | "international_non_eea",
  isInternationalCard = false,
): StripeFeeCalculation {
  let percentageFee = 0
  let fixedFee = 0
  let currencyConversionFee = 0

  // Stripe fee structure by country and card type
  if (currency.toLowerCase() === "usd") {
    // United States pricing
    percentageFee = 0.029 // 2.9%
    fixedFee = 0.3 // $0.30

    if (isInternationalCard) {
      percentageFee += 0.015 // Additional 1.5% for international cards
    }

    // Currency conversion fee for non-USD accounts
    if (customerCountry !== "US") {
      currencyConversionFee = amount * 0.01 // 1% for US accounts
    }
  } else if (currency.toLowerCase() === "gbp") {
    // United Kingdom pricing
    if (cardRegion === "domestic") {
      percentageFee = 0.015 // 1.5% for standard UK cards
      fixedFee = 0.2 // £0.20
    } else if (cardRegion === "international_eea") {
      percentageFee = 0.025 // 2.5% for EEA cards
      fixedFee = 0.2 // £0.20
    } else {
      // international_non_eea
      percentageFee = 0.0325 // 3.25% for non-EEA cards
      fixedFee = 0.2 // £0.20
    }

    // Currency conversion fee for non-UK accounts
    if (customerCountry !== "GB" && customerCountry !== "UK") {
      currencyConversionFee = amount * 0.02 // 2% for non-US accounts
    }
  } else if (currency.toLowerCase() === "eur") {
    // European pricing (similar to UK)
    if (cardRegion === "domestic" || cardRegion === "international_eea") {
      percentageFee = 0.015 // 1.5% for EEA cards
      fixedFee = 0.25 // €0.25
    } else {
      percentageFee = 0.029 // 2.9% for non-EEA cards
      fixedFee = 0.25 // €0.25
    }

    if (
      customerCountry &&
      ![
        "AT",
        "BE",
        "BG",
        "HR",
        "CY",
        "CZ",
        "DK",
        "EE",
        "FI",
        "FR",
        "DE",
        "GR",
        "HU",
        "IE",
        "IT",
        "LV",
        "LT",
        "LU",
        "MT",
        "NL",
        "PL",
        "PT",
        "RO",
        "SK",
        "SI",
        "ES",
        "SE",
      ].includes(customerCountry)
    ) {
      currencyConversionFee = amount * 0.02 // 2% for non-EEA accounts
    }
  } else {
    // Default international pricing
    percentageFee = 0.029
    fixedFee = 0.3
    currencyConversionFee = amount * 0.02
  }

  const processingFee = amount * percentageFee + fixedFee
  const totalFees = processingFee + currencyConversionFee
  const netAmount = amount - totalFees

  // Refundable amount is the gross amount minus non-refundable fees
  // When you refund, Stripe keeps the processing fees
  const refundableAmount = amount

  return {
    processingFee: Number(processingFee.toFixed(2)),
    currencyConversionFee: Number(currencyConversionFee.toFixed(2)),
    totalFees: Number(totalFees.toFixed(2)),
    netAmount: Number(netAmount.toFixed(2)),
    refundableAmount: Number(refundableAmount.toFixed(2)),
  }
}

export function formatFeeBreakdown(calculation: StripeFeeCalculation, currency: string): string {
  const symbol = currency.toLowerCase() === "usd" ? "$" : currency.toLowerCase() === "gbp" ? "£" : "€"

  return `
Gross Amount: ${symbol}${calculation.refundableAmount.toFixed(2)}
Stripe Processing Fee: -${symbol}${calculation.processingFee.toFixed(2)} (non-refundable)
${calculation.currencyConversionFee > 0 ? `Currency Conversion: -${symbol}${calculation.currencyConversionFee.toFixed(2)} (non-refundable)\n` : ""}
Net Amount Received: ${symbol}${calculation.netAmount.toFixed(2)}

⚠️ Note: Processing fees are NOT refunded by Stripe
  `.trim()
}

export function calculateStripeFee(
  amountInPence: number,
  currency: "GBP" | "USD",
  cardType: "domestic" | "international" = "domestic",
): { feeAmount: number; feePercentage: string; netAmount: number } {
  let percentageFee = 0
  let fixedFeePence = 0

  if (currency === "USD") {
    percentageFee = 0.029 // 2.9%
    fixedFeePence = 30 // $0.30 = 30 cents
    if (cardType === "international") {
      percentageFee += 0.015 // Additional 1.5%
    }
  } else {
    // GBP
    if (cardType === "domestic") {
      percentageFee = 0.015 // 1.5%
      fixedFeePence = 20 // £0.20 = 20 pence
    } else {
      percentageFee = 0.0325 // 3.25%
      fixedFeePence = 20 // £0.20 = 20 pence
    }
  }

  const feeAmount = Math.ceil(amountInPence * percentageFee + fixedFeePence)
  const netAmount = amountInPence - feeAmount

  return {
    feeAmount,
    feePercentage: `${(percentageFee * 100).toFixed(2)}%`,
    netAmount,
  }
}
