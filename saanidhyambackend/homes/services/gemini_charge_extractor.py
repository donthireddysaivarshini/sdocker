# homes/utils/gemini_charge_extractor.py

import os
import json
import logging

try:
    import google.generativeai as genai
except ImportError:
    genai = None  # handle gracefully

logger = logging.getLogger("homes.gemini")


class GeminiChargeExtractor:
    """
    Uses Gemini to infer min/max monthly charges from messy NOTES text.

    Only used as a LAST RESORT when:
    - explicit min/max columns are empty
    - regex on notes couldn't confidently extract anything
    """

    _initialized = False
    _enabled = False
    _model = None

    @classmethod
    def _init(cls):
        if cls._initialized:
            return

        cls._initialized = True

        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key or genai is None:
            logger.warning("Gemini not configured or google.generativeai missing.")
            cls._enabled = False
            return

        try:
            genai.configure(api_key=api_key)
            cls._model = genai.GenerativeModel("gemini-2.0-flash")
            cls._enabled = True
            logger.info("GeminiChargeExtractor initialized.")
        except Exception as e:
            logger.error(f"Failed to init Gemini: {e}")
            cls._enabled = False

    @classmethod
    def infer_charges(cls, notes: str, context: dict | None = None):
        """
        :param notes: Raw notes text from Excel
        :param context: Optional dict with extra info (org_name, state, etc.)
        :return: (min_charge: int | None, max_charge: int | None)
        """
        cls._init()
        if not cls._enabled or not notes:
            return None, None

        ctx = context or {}
        try:
            prompt = f"""
You are extracting monthly CHARGES (in INR) from notes about an elder-care facility.

NOTES:
\"\"\"{notes}\"\"\"

Context (may help, don't hallucinate):
{json.dumps(ctx, ensure_ascii=False)}

Return ONLY this JSON, no explanation:

{{
  "min": <number or null>,
  "max": <number or null>
}}

Rules:
- Use INR per month if possible.
- If only a single value is clearly a "monthly charge", set min = max = that value.
- If multiple tiers/rooms exist, min = lowest monthly, max = highest monthly.
- If you are not reasonably confident, use null for that field.
"""
            resp = cls._model.generate_content(prompt)
            text = resp.text.strip()
            data = json.loads(text)
            mn = data.get("min")
            mx = data.get("max")

            def _norm(x):
                if x is None:
                    return None
                try:
                    return int(x)
                except Exception:
                    return None

            return _norm(mn), _norm(mx)

        except Exception as e:
            logger.error(f"Gemini inference failed: {e}")
            return None, None
