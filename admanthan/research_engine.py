"""KALP AdManthan Research layer — provider-neutral Context Pack contract.

This module does not pretend to have internet access. A connected research provider
must supply evidence; this layer normalizes that evidence for Strategy/Creative use.
"""
from __future__ import annotations
from datetime import datetime, timezone
from typing import Any, Dict, List

RESEARCH_AREAS = [
    "brand_context", "product_facts", "market_context", "audience_insights",
    "competitive_context", "trends", "claims_evidence", "advertising_constraints",
    "creative_opportunities", "risks",
]


def build_research_questions(brief: Dict[str, Any]) -> List[str]:
    brand = brief.get("brand", "the brand")
    product = brief.get("product", "the product")
    audience = brief.get("audience", "the target audience")
    market = brief.get("market", "the target market")
    return [
        f"What verified facts define {brand} and {product}?",
        f"What is the current market/category context for {product} in {market}?",
        f"What needs, motivations, objections and language characterize {audience}?",
        f"Who are the strongest current competitors and how are they positioned?",
        f"What current trends or cultural/seasonal factors affect this opportunity?",
        "Which material advertising claims can be supported by reliable evidence?",
        "What platform, regulatory, brand-safety or reputational constraints matter?",
        "What evidence-backed creative territories and visual opportunities emerge?",
    ]


def empty_context_pack(brief: Dict[str, Any]) -> Dict[str, Any]:
    """Create an explicit empty pack; never fill missing research with invented facts."""
    return {
        "schema": "KALP-AdManthan-Context-Pack-v0.1",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "status": "RESEARCH_REQUIRED",
        "brief": brief,
        "research_questions": build_research_questions(brief),
        "sources": [],
        "verified_facts": [],
        "market_context": [],
        "audience_insights": [],
        "competitive_context": [],
        "trends": [],
        "claims_evidence": [],
        "advertising_constraints": [],
        "creative_opportunities": [],
        "constraints_risks": [],
        "confidence": "UNAVAILABLE",
    }


def normalize_provider_result(brief: Dict[str, Any], provider_result: Dict[str, Any]) -> Dict[str, Any]:
    """Normalize a connected provider result without changing its evidence."""
    pack = empty_context_pack(brief)
    pack.update({k: provider_result[k] for k in provider_result if k in pack})
    pack["status"] = "RESEARCHED"
    if provider_result.get("sources"):
        pack["sources"] = provider_result["sources"]
    pack["confidence"] = provider_result.get("confidence", "UNSPECIFIED")
    pack["provider"] = provider_result.get("provider", "CONNECTED_RESEARCH_PROVIDER")
    return pack
