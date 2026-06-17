import pandas as pd
import re
from decimal import Decimal
from django.db import transaction
from homes.models import OldAgeHome
from .coordinate_fetcher import CoordinateFetcher
from .gemini_charge_extractor import GeminiChargeExtractor
import logging


logger = logging.getLogger("homes.data_processor")


class DataProcessor:
    def __init__(self, chunk_size=200):
        self.chunk_size = chunk_size
        self.coord = CoordinateFetcher()

    def process_excel_file(self, file_path: str, job=None):
        try:
            df = pd.read_excel(file_path)
            df = df.drop('S.NO', axis=1, errors='ignore')  
            df.columns = [str(c).strip().upper() for c in df.columns]  

            # Column mapping to handle variations
            column_mapping = {
                'NOTES ( CHARGES, ROOMS & ADMISSION CRITERIA, DOCTOR & NURSING AVAILABILITY)': 'NOTES',
                'NOTES (CHARGES, ROOMS & ADMISSION CRITERIA, DOCTOR & NURSING AVAILABILITY)': 'NOTES',
            }
            df = df.rename(columns=column_mapping)

            total_rows = len(df)

            if job:
                job.total_rows = total_rows
                job.save()

            results = {
                "total": total_rows,
                "processed": 0,
                "inserted": 0,
                "updated": 0,
                "skipped": 0,
                "errors": [],
            }

            for idx, row in df.iterrows():
                try:
                    action = self._save_row(row, idx, batch_no=job.batch_no if job else None)
                    results[action] += 1
                except Exception as e:
                    msg = f"Row {idx + 2} error: {str(e)}"
                    logger.error(msg)
                    results["errors"].append({"row": idx + 2, "error": str(e)})
                    results["skipped"] += 1

                results["processed"] += 1

                if job and idx % 5 == 0:
                    self._update_job(job, results)

            if job:
                self._update_job(job, results)

            return results

        except Exception as e:
            raise Exception(f"Failed to process Excel file: {str(e)}")

    def _update_job(self, job, results):
        job.processed_rows = results["processed"]
        job.inserted_count = results["inserted"]
        job.updated_count = results["updated"]
        job.skipped_count = results["skipped"]
        job.error_count = len(results["errors"])
        job.error_log = results["errors"][-10:]
        job.save()

    def _safe_get(self, row, column, default=""):
        col = column.strip().upper()
        if col not in row or pd.isna(row[col]):
            return default

        val = str(row[col]).strip()
        if val.lower() in ("nan", "none", "not available", ""):
            return default

        return val

    def _extract_phone_numbers(self, raw):
        if not raw or pd.isna(raw):
            return []

        s = str(raw)
        s = re.sub(
            r"(Mobile|Phone|Tel|Contact|Ph|Mr\.|Mrs\.|Ms\.|Sri\.|Smt\.|Dr\.)\s*[:\-]?",
            "",
            s,
            flags=re.IGNORECASE,
        )

        parts = re.split(r"[/,;]| and | or |\s{2,}", s, flags=re.IGNORECASE)

        numbers = []
        seen = set()

        for p in parts:
            digits = re.sub(r"\D", "", p)
            if len(digits) >= 10:
                clean = digits[-10:]
                if clean not in seen:
                    seen.add(clean)
                    numbers.append(clean)

        return numbers[:10]

    def _extract_emails(self, raw):
        if not raw or pd.isna(raw):
            return []
        emails = re.findall(
            r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}",
            str(raw)
        )
        return list(dict.fromkeys(emails))[:10]

    def _extract_websites(self, raw):
        if not raw or pd.isna(raw):
            return []

        s = str(raw)
        urls = []
        urls += re.findall(r"https?://[^\s,;]+", s)

        for w in re.findall(r"www\.[^\s,;]+", s):
            if not w.startswith("http"):
                urls.append("https://" + w)
            else:
                urls.append(w)

        return list(dict.fromkeys([u.rstrip(".,;") for u in urls]))[:10]

    def _extract_map_url(self, map_str):
        if not map_str or pd.isna(map_str):
            return ""
        s = str(map_str).strip()
        m = re.search(r"https?://[^\s,;]+", s)
        return m.group(0).rstrip(".,;") if m else ""

    def _clean_pincode(self, raw):
        if not raw or pd.isna(raw):
            return ""
        digits = re.sub(r"\D", "", str(raw))
        return digits[:6] if len(digits) >= 6 else ""

    def _parse_costing_type(self, raw):
        if not raw:
            return ""
        s = str(raw).lower()
        if "free" in s:
            return "free"
        if "pay" in s and "stay" in s:
            return "pay_stay"
        if "pay" in s or "paid" in s:
            return "pay"
        return ""

    def _parse_gender(self, raw):
        if not raw:
            return ""
        s = str(raw).lower()
        men = "men" in s or "male" in s
        women = "women" in s or "female" in s or "lady" in s
        if men and women:
            return "both"
        if women:
            return "women"
        if men:
            return "men"
        return ""

    def _parse_care_type(self, raw):
        if not raw:
            return "basic"
        s = str(raw).lower()
        if "nurs" in s:
            return "nursing"
        if "pall" in s:
            return "palliative"
        if "day" in s:
            return "day"
        if "resid" in s or "stay" in s:
            return "residential"
        return "basic"

    def _parse_decimal_from_cell(self, value):
        if value is None or pd.isna(value):
            return None

        if isinstance(value, (int, float)):
            return Decimal(str(value)) if value > 0 else None

        s = (
            str(value)
            .replace(",", "")
            .replace("₹", "")
            .replace("Rs.", "")
            .replace("Rs", "")
            .replace("/-", "")
            .strip()
        )

        match = re.search(r"\d+(?:\.\d+)?", s)
        if not match:
            return None

        try:
            d = Decimal(match.group())
            return d if d > 0 else None
        except:
            return None

    def _extract_charges_from_notes(self, notes):
        if not notes:
            return None, None

        s = str(notes)
        matches = re.findall(r"\d[\d,]{3,}", s)
        values = []

        for m in matches:
            try:
                v = int(m.replace(",", ""))
                if 1000 <= v <= 1000000:
                    values.append(v)
            except:
                pass

        if not values:
            return None, None

        return Decimal(min(values)), Decimal(max(values))

    def _resolve_min_max(self, row, notes, costing_type):
        if costing_type == "free":
            return Decimal("0"), Decimal("0")

        min_col = self._parse_decimal_from_cell(
            row.get("MONTHLY CHARGES - MINIMUM")
        )
        max_col = self._parse_decimal_from_cell(
            row.get("MONTHLY CHARGES - MAXIMUM")
        )

        if min_col is not None or max_col is not None:
            return min_col, max_col

        mn, mx = self._extract_charges_from_notes(notes)
        if mn or mx:
            return mn, mx

        try:
            gmn, gmx = GeminiChargeExtractor.infer_charges(
                notes,
                context={"notes": notes},
            )
            if gmn or gmx:
                return (
                    Decimal(gmn) if gmn else None,
                    Decimal(gmx) if gmx else None,
                )
        except:
            pass

        return None, None

    def _save_row(self, row, idx, batch_no=None):  # ✓ FIXED: Added batch_no parameter
        org_name = self._safe_get(row, "ORGANISATION NAME")
        state = self._safe_get(row, "STATE")
        district = self._safe_get(row, "DISTRICT")

        if not org_name or not state:
            logger.warning(f"Row {idx + 2}: Skipped - missing org name or state")
            return "skipped"

        city = self._safe_get(row, "CITY / TOWN / MANDAL")
        po = self._safe_get(row, "P.O. / LOCALITY / VILLAGE")
        address = self._safe_get(row, "ADDRESS")
        pincode = self._clean_pincode(row.get("PIN CODE", ""))

        phones = self._extract_phone_numbers(row.get("CONTACT NO", ""))
        emails = self._extract_emails(row.get("EMAIL", ""))
        websites = self._extract_websites(row.get("WEBSITE", ""))

        map_url = self._extract_map_url(row.get("MAP LOCATION", ""))
        lat, lng = None, None

        if map_url:
            try:
                lat, lng = self.coord.fetch_from_url(map_url)
                if lat and lng:
                    logger.info(f"Row {idx + 2}: Coordinates fetched ({lat}, {lng})")
            except Exception as e:
                logger.warning(f"Row {idx + 2}: Coordinate fetch failed - {str(e)}")

        costing_type = self._parse_costing_type(
            self._safe_get(row, "COSTING TYPE")
        )
        gender = self._parse_gender(self._safe_get(row, "GENDER"))
        care_type = self._parse_care_type(row.get("CARE TYPE", ""))

        notes = self._safe_get(row, "NOTES")  # ✓ FIXED: Simplified after column mapping

        min_ch, max_ch = self._resolve_min_max(row, notes, costing_type)

        services_type = self._safe_get(row, "SERVICES TYPE", "Old Age Home")
        call_ver = self._safe_get(row, "CALL VERIFICATION")

        data_hash = OldAgeHome.generate_hash(org_name, state, district, pincode)

        model_data = {
            "organisation_name": org_name[:500],
            "state": state[:100],
            "district": district[:100],
            "city_town_mandal": city[:200],
            "po_locality_village": po[:200],
            "address": address,
            "pincode": pincode,
            "map_location": map_url,
            "latitude": lat,
            "longitude": lng,
            "contact_number": phones if phones else [],
            "email": emails if emails else None,
            "website": websites if websites else None,
            "services_type": services_type[:100],
            "costing_type": costing_type,
            "monthly_charges_minimum": min_ch,
            "monthly_charges_maximum": max_ch,
            "gender": gender,
            "care_type": care_type,
            "call_verification": call_ver[:30] if call_ver else "",
            "notes": notes,
            "data_hash": data_hash,
            "batch_no": batch_no,  # ✓ ADDED: Save batch_no
        }

        with transaction.atomic():
            obj, created = OldAgeHome.objects.update_or_create(
                data_hash=data_hash,
                defaults=model_data,
            )

            action = "inserted" if created else "updated"
            logger.info(f"Row {idx + 2}: {action.upper()} - {org_name[:40]}")
            return action
