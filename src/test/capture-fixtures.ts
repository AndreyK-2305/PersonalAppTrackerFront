import type { OwnKey, Review } from "@/features/capture/api/capture"
import type { DeviceToken } from "@/features/connections/api/device-tokens"
import type { Account, AccountList } from "@/features/finance/api/finance"
import { accountList, cardAccount, savingsAccount } from "./finance-fixtures"

/** Datos de ejemplo de la captura (ADR-0017), anonimizados. */

export const rappiWallet: Account = {
  id: "acc-rappi",
  kind: "DIGITAL_WALLET",
  name: "RappiCuenta",
  currency: "COP",
  institution: "Rappi",
  openingBalance: "0.00",
  balance: "0.00",
  archived: false,
  systemManaged: false,
  createdAt: "2026-11-01T14:00:00Z",
  updatedAt: "2026-11-01T14:00:00Z",
}

export const accountsWithWallet: AccountList = {
  ...accountList,
  accounts: [...accountList.accounts, rappiWallet],
}

export const ownTransferReview: Review = {
  id: "rev-own",
  reason: "POSSIBLE_OWN_TRANSFER",
  app: "Mensajes",
  title: "85540",
  body: "Bancolombia: ANA, transferiste $50,000.00 a la llave 3001112233 desde tu cuenta *1234 a Ana Perez",
  receivedAt: "2026-11-08T18:36:00Z",
  transactionId: "tx-own",
  amount: "50000.00",
  currency: "COP",
  productId: savingsAccount.id,
}

export const dollarReview: Review = {
  id: "rev-usd",
  reason: "MISSING_EXCHANGE_RATE",
  app: "Mensajes",
  title: "85540",
  body: "Bancolombia: Compraste USD20,00 en ANTHROPIC* CLAUDE SU con tu T.Cred *5403",
  receivedAt: "2026-10-17T18:26:00Z",
}

export const unrecognizedReview: Review = {
  id: "rev-text",
  reason: "UNRECOGNIZED_TEXT",
  app: "Mensajes",
  title: "",
  body: "",
  receivedAt: "2026-09-01T12:00:00Z",
}

export const ownKey: OwnKey = {
  id: "key-1",
  key: "@rp1000000001",
  productId: rappiWallet.id,
  createdAt: "2026-11-09T15:00:00Z",
}

export const deviceToken: DeviceToken = {
  id: "tok-1",
  name: "iPhone",
  scopes: ["FINANCE_CAPTURE"],
  active: true,
  createdAt: "2026-11-09T15:00:00Z",
  lastUsedAt: "2026-11-09T16:00:00Z",
}

export { cardAccount, savingsAccount }
