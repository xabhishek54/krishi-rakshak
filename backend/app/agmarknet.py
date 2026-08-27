"""
Offline Mandi price dataset reader. Loads data directly from backend/app/data/mandi_prices.csv
(sourced from data.gov.in format). Zero external API calls, zero rate-limits.
"""
import os
import csv
import logging
from datetime import date, datetime
from typing import Optional

logger = logging.getLogger(__name__)

CSV_PATH = os.path.join(os.path.dirname(__file__), "data", "mandi_prices.csv")


def fetch_agmarknet_prices(
    commodity: str,
    state: Optional[str] = None,
    days: int = 7,
) -> list[dict]:
    """
    Fetch recent commodity prices directly from the offline CSV dataset (data.gov.in format).
    """
    if not os.path.exists(CSV_PATH):
        logger.warning(f"Mandi CSV dataset not found at {CSV_PATH}")
        return []

    commodity_lower = commodity.lower().strip()
    state_lower = state.lower().strip() if state else None

    result = []
    try:
        with open(CSV_PATH, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                c_name = row.get("Commodity", "").lower().strip()
                s_name = row.get("State", "").lower().strip()

                # Match commodity & state if provided
                if not commodity_lower or commodity_lower in c_name or c_name in commodity_lower:
                    if state_lower and state_lower not in s_name:
                        continue

                    try:
                        result.append({
                            "arrival_date": row.get("Arrival_Date", ""),
                            "market": row.get("Market", ""),
                            "state": row.get("State", ""),
                            "district": row.get("District", ""),
                            "commodity": row.get("Commodity", ""),
                            "variety": row.get("Variety", "Local"),
                            "min_price": float(row.get("Min_Price", 0) or 0),
                            "max_price": float(row.get("Max_Price", 0) or 0),
                            "modal_price": float(row.get("Modal_Price", 0) or 0),
                            "arrivals": float(row.get("Arrivals_Qtl", 0) or 0),
                        })
                    except (ValueError, TypeError):
                        continue

        logger.info(f"Mandi CSV: loaded {len(result)} records for commodity='{commodity}'")
        return result

    except Exception as e:
        logger.error(f"Error reading Mandi CSV dataset: {e}")
        return []


def get_latest_modal_price(commodity: str, state: Optional[str] = None) -> Optional[float]:
    """Get the most recent modal price for a commodity from offline CSV dataset."""
    records = fetch_agmarknet_prices(commodity, state=state, days=3)
    if not records:
        return None
    records_sorted = sorted(records, key=lambda x: x["arrival_date"], reverse=True)
    for r in records_sorted:
        if r["modal_price"] > 0:
            return r["modal_price"]
    return None


CROP_TO_AGMARKNET: dict[str, str] = {
    "tomato": "Tomato",
    "onion": "Onion",
    "wheat": "Wheat",
    "rice": "Rice",
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


TOP_CROPS = ["tomato", "onion", "wheat", "potato", "maize", "rice", "soybean", "cotton"]


async def background_fetch_and_store(db_session_factory) -> int:
    """
    Load data.gov.in Mandi dataset from CSV and sync into market_prices DB table.
    """
    from datetime import datetime as dt
    from app import models

    stored = 0
    db = db_session_factory()

    try:
        records = fetch_agmarknet_prices("", days=30)
        mandis = db.query(models.Mandi).all()
        mandi_map = {m.name.lower(): m for m in mandis}

        for r in records:
            if r["modal_price"] <= 0:
                continue

            market_lower = r["market"].lower()
            mandi = None
            for name, m in mandi_map.items():
                if name in market_lower or market_lower in name:
                    mandi = m
                    break

            if not mandi:
                continue

            try:
                date_val = dt.strptime(r["arrival_date"], "%Y-%m-%d").date()
            except ValueError:
                date_val = dt.utcnow().date()

            crop_name = r["commodity"].lower()

            existing = db.query(models.MarketPrice).filter(
                models.MarketPrice.mandi_id == mandi.id,
                models.MarketPrice.crop == crop_name,
                models.MarketPrice.date == date_val,
            ).first()

            if existing:
                existing.modal_price = r["modal_price"]
                existing.min_price = r["min_price"]
                existing.max_price = r["max_price"]
                existing.source = "data_gov_in_csv"
            else:
                mp = models.MarketPrice(
                    mandi_id=mandi.id,
                    crop=crop_name,
                    date=date_val,
                    modal_price=r["modal_price"],
                    min_price=r["min_price"],
                    max_price=r["max_price"],
                    arrivals=r.get("arrivals", 0),
                    source="data_gov_in_csv",
                )
                db.add(mp)
                stored += 1

        db.commit()
        logger.info(f"Loaded {stored} records into DB from Mandi CSV dataset.")
    except Exception as e:
        logger.error(f"Failed to sync Mandi CSV into DB: {e}")
        db.rollback()
    finally:
        db.close()

    return stored
