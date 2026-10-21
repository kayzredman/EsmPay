# 15 — Platform Revenue & Owner Economics

> What the **platform owner** earns, how each shilling is produced, and how the Platform Admin console shows it. Prototype: `prototype/staff.html` → Platform Admin → **Overview** (revenue strip) and **Revenue** (full breakdown). All figures in the prototype are mock data in GHS for the last 30 days.

## 1. Why this screen exists

The Platform Admin is the owner of the SaaS. They need to answer, without opening a spreadsheet:

1. **How much did the platform make?** (headline, trend, vs last period)
2. **Where did it come from?** (which revenue stream, which school)
3. **How much of it do we keep?** (gross profit after pass-through costs, contribution after run costs)
4. **How does it add up?** (every number traceable to its inputs and to a ledger account)

This is *platform* revenue only. School fee collections flow through to schools (see [07](07-payments.md)); the platform recognises only its own fees.

## 2. Revenue streams

| Stream | Driver | Prototype pricing | Direct cost | Ledger account |
|--------|--------|-------------------|-------------|----------------|
| **Subscriptions** | Students × plan price, recognised monthly | Starter 6 · Growth 9 · Pro 12 GHS per student per term (÷ 3 months) | Payment-gateway fee on collecting SaaS invoices (1.5%) | `saas_revenue` |
| **Transaction fees** | Digital collections × platform fee | 0.50% of each successful payment | None (aggregator's 1.00% is borne by the school or parent, not us) | `platform_fee_revenue` |
| **Alert credits** | Messages sent × price | SMS 0.050, WhatsApp 0.030 GHS per message | Provider cost (SMS 0.035, WhatsApp 0.020) | `alert_wallet_usage` |
| **AI study add-on** | Opted-in students × monthly price | 2.00 GHS per student per month | LLM usage (≈ 0.55 per student per month, capped) | `ai_addon_revenue` |
| **USSD sessions** | Sessions × price | 0.040 GHS per session | Telco / aggregator session charge (0.025) | `ussd_usage` |

Prices are **illustrative**; they are open questions (see [14](14-risks-open-questions.md) Q3, Q21–Q23).

## 3. The waterfall (how it adds up)

```
Subscriptions
+ Transaction fees
+ Alert credits
+ AI study add-on
+ USSD sessions
= NET REVENUE                      (prototype: GHS 100.1k)
− Message & session costs          (SMS/WhatsApp, USSD)
− LLM & payment-processing fees
= GROSS PROFIT                     (GHS 84.2k · 84% margin)
− Cloud & tools
− Support & onboarding
= CONTRIBUTION                     (GHS 66.3k · 66% of revenue)
```

Engineering payroll and founder costs are deliberately **excluded**; "contribution" is what the platform keeps after variable and run costs, before team costs.

Invariants checked by the prototype and to be asserted in production tests:

- Net revenue = Σ of the five streams = Σ of the per-school rows.
- Gross profit = net revenue − pass-through costs.
- Contribution = gross profit − run costs.
- A successful live payment of *X* raises transaction-fee revenue by exactly 0.5% × *X* (verified by the demo: pay in the parent app and watch the Revenue page move).

## 4. Metrics shown

| Metric | Definition |
|--------|-----------|
| Net revenue | Recognised platform revenue in the period |
| Gross profit / margin | Net revenue − pass-through costs (messages, sessions, LLM, gateway) |
| Contribution | Gross profit − run costs (infra, tools, support) |
| Recurring revenue | Subscriptions + AI add-on (predictable streams) |
| ARR run-rate | Recurring revenue × 12 |
| Revenue per school | Net revenue ÷ active schools |
| Take rate on collections | Transaction fees ÷ digital collections |
| Concentration | Share of revenue from the top 3 schools; largest school |
| Six-month trend | Stacked by stream; shows term seasonality (September spike, August dip) |

## 5. Screens

### 5.1 Overview — revenue strip
Headline revenue with change vs the previous period and YoY; a stacked bar of the five streams with amounts and shares; gross margin, contribution and ARR run-rate; **See how it adds up →** deep link to the detailed page.

### 5.2 Revenue page
1. **KPI row:** net revenue, gross profit, contribution, recurring revenue, revenue per school, take rate.
2. **Waterfall chart:** streams up to net revenue, costs down to contribution.
3. **Revenue by stream table:** driver, inputs (e.g. "GHS 3,240,000 collected × 0.50%"), revenue, direct cost, margin, share. Clicking a row opens the **formula** and the ledger account it posts to.
4. **Follow a payment:** an interactive calculator showing a parent paying GHS *N* and splitting into aggregator fee, platform fee and school receipt, with ledger lines. Includes a **who bears the fee** switch (school absorbs / passed to parent / split) mapping to Q5.
5. **Revenue mix** donut with concentration indicators.
6. **Six-month trend**.
7. **Per-school table:** plan, students, subscription, transaction fees, alerts, USSD, AI, total; sortable; drill into the school.
8. **Export statement** (CSV/PDF) for the accountant.

## 6. Data and ledger implications

New or clarified ledger accounts (platform side, see [04 §3](04-data-model.md)):

| Account | Type | Posted when |
|---------|------|-------------|
| `saas_revenue` | Revenue | Monthly recognition of subscription invoices (from `deferred_revenue`) |
| `deferred_revenue` | Liability | A school pays a term upfront; released monthly |
| `platform_fee_revenue` | Revenue | Each successful payment (existing) |
| `alert_wallet_usage` | Revenue | Message sent; debited from the school's alert wallet |
| `ai_addon_revenue` | Revenue | Monthly per opted-in student |
| `ussd_usage` | Revenue | Per session, aggregated daily |
| `provider_cost_expense` | Expense | Provider cost of messages, sessions, LLM (matched to usage) |

The Revenue page reads from a **reporting view over the ledger**, not from ad-hoc queries, so the screen can never disagree with the books. Recognition follows accounting policy (confirm with an accountant: deferral of term fees, wallet top-ups as liabilities until used).

## 7. Permissions and audit

- Visible to `platform_owner` and `platform_finance` only; **not** to school roles or support agents.
- Per-school revenue is aggregate commercial data about the school; it is not child data and carries no personal information.
- Exports are audit-logged.

## 8. Risks and open questions

See [14](14-risks-open-questions.md): pricing validation (Q3, Q21), take-rate disclosure and who bears the fee (Q5, Q22), AI add-on price (Q23), revenue concentration (R21), seasonality of cash (R22), and the dependence of the transaction-fee stream on the funds-flow decision ([ADR-004](adr/004-funds-flow-and-settlement.md)).
