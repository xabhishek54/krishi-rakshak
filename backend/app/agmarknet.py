"""
Live Agmarknet price fetcher using data.gov.in API.
Falls back to seeded DB data if the API is unavailable or quota is exceeded.

API reference: https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070
"""
import os
import logging
from datetime import date, timedelta
from typing import Optional

import httpx

logger = logging.getLogger(__name__)

# data.gov.in API key — set via env var or fallback to hardcoded key
DATA_GOV_API_KEY = os.getenv("DATA_GOV_API_KEY", "579b464db66ec23bdd000001c5dbc8cb04004c3a7dbfdbe429d6a773")

# Resource ID for Agmarknet daily arrivals & prices
AGMARKNET_RESOURCE = "9ef84268-d588-465a-a308-a864a43d0070"
BASE_URL = "https://api.data.gov.in/resource"


def fetch_agmarknet_prices(
    commodity: str,
    state: Optional[str] = None,
    days: int = 7,
) -> list[dict]:
    """
    Fetch recent commodity prices from Agmarknet via data.gov.in.

    Args:
        commodity: e.g. "Tomato", "Onion", "Wheat"
        state: optional state filter e.g. "Maharashtra"
        days: how many days back to fetch

    Returns:
        List of dicts with keys: arrival_date, market, state, min_price, max_price, modal_price
    """
    from_date = (date.today() - timedelta(days=days)).strftime("%d/%m/%Y")

    params = {
        "api-key": DATA_GOV_API_KEY,
        "format": "json",
        "limit": 100,
        "filters[Commodity]": commodity,
    }
    if state:
        params["filters[State]"] = state

    try:
        with httpx.Client(timeout=15.0) as client:
            resp = client.get(f"{BASE_URL}/{AGMARKNET_RESOURCE}", params=params)
            resp.raise_for_status()
            data = resp.json()

        records = data.get("records", [])
        result = []
        for r in records:
            try:
                result.append({
                    "arrival_date": r.get("Arrival_Date", ""),
                    "market": r.get("Market", ""),
                    "state": r.get("State", ""),
                    "district": r.get("District", ""),
                    "min_price": float(r.get("Min_x0020_Price", 0) or 0),
                    "max_price": float(r.get("Max_x0020_Price", 0) or 0),
                    "modal_price": float(r.get("Modal_x0020_Price", 0) or 0),
                })
            except (ValueError, TypeError):
                continue

        logger.info(f"Agmarknet: fetched {len(result)} records for {commodity}")
        return result

    except Exception as e:
        logger.warning(f"Agmarknet API failed for {commodity}: {e}")
        return []


def get_latest_modal_price(commodity: str, state: Optional[str] = None) -> Optional[float]:
    """Get the most recent modal price for a commodity from Agmarknet."""
    records = fetch_agmarknet_prices(commodity, state=state, days=3)
    if not records:
        return None
    # Sort by date descending, take first non-zero modal price
    records_sorted = sorted(records, key=lambda x: x["arrival_date"], reverse=True)
    for r in records_sorted:
        if r["modal_price"] > 0:
            return r["modal_price"]
    return None


# Map our internal crop_type names to Agmarknet commodity names
CROP_TO_AGMARKNET: dict[str, str] = {
    "tomato": "Tomato",
    "onion": "Onion",
    "wheat": "Wheat",
    "rice": "Paddy(Dpr)",
    "potato": "Potato",
    "cotton": "Cotton",
    "maize": "Maize",
    "sugarcane": "Sugarcane",
    "soybean": "Soyabean",
    "groundnut": "Groundnut",
    "chilli": "Chilli",
    "grapes": "Grapes",
    "banana": "Banana",
    "mango": "Mango",
}


def agmarknet_commodity_name(crop_type: str) -> str:
    """Convert internal crop type to Agmarknet commodity name."""
    return CROP_TO_AGMARKNET.get(crop_type.lower(), crop_type.capitalize())


# Top crops to pre-fetch at startup (Phase 19)
TOP_CROPS = ["tomato", "onion", "wheat", "potato", "maize"]


async def background_fetch_and_store(db_session_factory) -> int:
    """
    Async background task: fetch live prices for TOP_CROPS from Agmarknet
    and upsert into the market_prices table.

    Returns: number of new records stored.
    Called at startup and by POST /api/v1/market/refresh-live-prices.
    """
    import asyncio
    from datetime import datetime as dt

    stored = 0
    db = db_session_factory()

    try:
        for crop_type in TOP_CROPS:
            commodity = agmarknet_commodity_name(crop_type)
            # Run blocking HTTP call in threadpool
            records = await asyncio.to_thread(
                fetch_agmarknet_prices, commodity, days=3
            )
            if not records:
                logger.info(f"[Phase19] No Agmarknet data for {commodity} — skip")
                continue

            # Find matching mandis in our DB
            from app import models
            mandis = db.query(models.Mandi).all()
            mandi_map = {m.name.lower(): m for m in mandis}

            new_count = 0
            for r in records:
                if r["modal_price"] <= 0:
                    continue
                # Try to match to a known mandi
                market_lower = r["market"].lower()
                mandi = None
                for name, m in mandi_map.items():
                    if any(part in market_lower for part in name.split()):
                        mandi = m
                        break

                if not mandi:
                    # Use first mandi as fallback
                    mandi = mandis[0] if mandis else None

                if not mandi:
                    continue

                # Check if we already have a recent record
                today_date = dt.utcnow().date()
                existing = db.query(models.MarketPrice).filter(
                    models.MarketPrice.mandi_id == mandi.id,
                    models.MarketPrice.crop == crop_type,
                    models.MarketPrice.date == today_date,
                ).first()

                if existing:
                    # Update existing record with live prices
                    existing.modal_price = r["modal_price"]
                    existing.min_price = r["min_price"]
                    existing.max_price = r["max_price"]
                    existing.source = "agmarknet_live"
                else:
                    mp = models.MarketPrice(
                        mandi_id=mandi.id,
                        crop=crop_type,
                        date=today_date,
                        modal_price=r["modal_price"],
                        min_price=r["min_price"],
                        max_price=r["max_price"],
                        arrivals=0,
                        source="agmarknet_live",
                    )
                    db.add(mp)
                    new_count += 1

            db.commit()
            stored += new_count
            logger.info(f"[Phase19] Stored {new_count} live prices for {commodity}")

    except Exception as e:
        logger.error(f"[Phase19] background_fetch_and_store error: {e}")
        db.rollback()
    finally:
        db.close()

    return stored
