import type { Action, Attribution, Campaign, Conversion, CustomerResponse, LearningCandidate, MarketSignal, Opportunity, RevenueEvent, MTRVerticalSlice } from "../../contracts/market-to-revenue-v01.js";

export interface MarketManthanSignalSource {
  getSignal(): MarketSignal;
}

export interface AsyncMarketManthanSignalSource {
  getSignal(now?: string): Promise<MarketSignal>;
}

/** Controlled v0.1 provider boundary. Replace this adapter with Market Manthan runtime output without changing MTR contracts. */
export class DeterministicMarketManthanFixture implements MarketManthanSignalSource {
  getSignal(): MarketSignal {
    return {
      signal_id: "MM-SIG-001",
      category: "quick-commerce",
      geography: "Delhi NCR",
      trend: "Rising demand for fast, convenience-led grocery delivery among young professionals",
      evidence: ["category demand +18%", "weekday evening intent +24%", "competitor convenience messaging gap"],
      source: "market-manthan-fixture",
      provider: "MM-PAF-FIXTURE",
      observed_at: "2026-09-12T14:00:00Z",
      confidence: 0.89
    };
  }
}

export function runMTR001(source: MarketManthanSignalSource, now = "2026-09-12T14:05:00Z"): MTRVerticalSlice {
  return runMTR001FromSignal(source.getSignal(), now);
}

/** Live/provider-neutral execution path: fetch the MarketSignal asynchronously, then execute the same MTR lineage. */
export async function runMTR001Live(source: AsyncMarketManthanSignalSource, now = new Date().toISOString()): Promise<MTRVerticalSlice> {
  return runMTR001FromSignal(await source.getSignal(now), now);
}

export function runMTR001FromSignal(signal: MarketSignal, now = new Date().toISOString()): MTRVerticalSlice {
  const opportunity: Opportunity = {
    opportunity_id: "MTR-OPP-001",
    signal_id: signal.signal_id,
    customer_segment: "Young professionals, Delhi NCR",
    problem: "Need reliable grocery replenishment without sacrificing time",
    opportunity_score: 87,
    confidence: signal.confidence
  };
  const action: Action = {
    action_id: "MTR-ACT-001",
    opportunity_id: opportunity.opportunity_id,
    recommendation: "Launch a targeted evening convenience campaign",
    expected_outcome: "Increase qualified conversions from high-intent weekday demand"
  };
  const campaign: Campaign = {
    campaign_id: "MTR-CAMP-001",
    action_id: action.action_id,
    creative_id: "GENIE-CREATIVE-001",
    channel: "digital-social"
  };
  const response: CustomerResponse = {
    response_id: "MTR-RESP-001",
    campaign_id: campaign.campaign_id,
    customer_id: "CUSTOMER-001",
    response_type: "converted",
    responded_at: now
  };
  const conversion: Conversion = {
    conversion_id: "MTR-CONV-001",
    response_id: response.response_id,
    value: 10000
  };
  const revenue: RevenueEvent = {
    revenue_id: "MTR-REV-001",
    conversion_id: conversion.conversion_id,
    amount: 10000,
    currency: "INR",
    occurred_at: now
  };
  const attribution: Attribution = {
    attribution_id: "MTR-ATTR-001",
    revenue_id: revenue.revenue_id,
    opportunity_id: opportunity.opportunity_id,
    campaign_id: campaign.campaign_id,
    attribution_model: "deterministic_origin_100",
    attributed_amount: revenue.amount
  };
  const learning: LearningCandidate = {
    memory_id: "MEM-001",
    signal_id: signal.signal_id,
    opportunity_id: opportunity.opportunity_id,
    campaign_id: campaign.campaign_id,
    revenue_id: revenue.revenue_id,
    lesson: "The identified Delhi NCR convenience-demand signal produced an attributable INR 10,000 revenue outcome through the selected campaign action."
  };
  return { signal, opportunity, action, campaign, response, conversion, revenue, attribution, learning };
}
