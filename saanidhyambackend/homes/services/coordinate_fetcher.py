import requests
import re
import logging

logger = logging.getLogger('homes')


class CoordinateFetcher:
    """Fetch coordinates from Google Maps URLs"""
    
    def __init__(self):
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
    
    def fetch_from_url(self, map_url):
        """
        Fetch coordinates by following Google Maps shortened URL
        Supports multiple URL formats and patterns
        Returns: (latitude, longitude) or (None, None)
        """
        if not map_url:
            return None, None
        
        try:
            # First try to extract from URL directly without request
            lat, lng = self._extract_from_url_string(map_url)
            if lat and lng:
                # Use logger instead of print to avoid noisy stdout in production
                logger.debug("Extracted coordinates from URL: %s, %s", lat, lng)
                return lat, lng
            
            # If shortened URL, follow redirects
            if 'maps.app.goo.gl' in map_url or 'goo.gl/maps' in map_url:
                response = requests.get(
                    map_url,
                    allow_redirects=True,
                    timeout=10,
                    headers=self.headers,
                )
                full_url = response.url
                logger.debug("Expanded Google Maps URL: %s...", full_url[:100])
                
                lat, lng = self._extract_from_url_string(full_url)
                if lat and lng:
                    logger.debug("Fetched coordinates from expanded URL: %s, %s", lat, lng)
                    return lat, lng
            
            return None, None
            
        except requests.Timeout:
            logger.error("Timeout fetching coordinates from: %s", map_url)
            return None, None
        except requests.RequestException as e:
            logger.error("Request error fetching coordinates: %s", str(e))
            return None, None
        except Exception as e:
            logger.exception("Unexpected error fetching coordinates: %s", str(e))
            return None, None
    
    def _extract_from_url_string(self, url):
        """Extract coordinates from URL using multiple regex patterns"""
        
        # Multiple patterns to try
        patterns = [
            r'@(-?\d+\.\d+),(-?\d+\.\d+)',           # @lat,lng
            r'!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)',       # !3dlat!4dlng
            r'!2d(-?\d+\.\d+)!3d(-?\d+\.\d+)',       # !2dlng!3dlat (reversed!)
            r'q=(-?\d+\.\d+),(-?\d+\.\d+)',          # q=lat,lng
            r'll=(-?\d+\.\d+),(-?\d+\.\d+)',         # ll=lat,lng
            r'center=(-?\d+\.\d+)%2C(-?\d+\.\d+)',   # center=lat%2Clng
        ]
        
        for i, pattern in enumerate(patterns):
            match = re.search(pattern, url)
            if match:
                # Pattern 2 (!2d!3d) has lng,lat order - need to swap
                if i == 2:  # !2dlng!3dlat pattern
                    lng, lat = float(match.group(1)), float(match.group(2))
                else:
                    lat, lng = float(match.group(1)), float(match.group(2))
                
                # Validate coordinates are in valid ranges
                if -90 <= lat <= 90 and -180 <= lng <= 180:
                    # Extra validation: India's approximate bounds
                    if 8 <= lat <= 37 and 68 <= lng <= 97:
                        return lat, lng
                    else:
                        logger.warning(
                            "Coordinates outside India: lat=%s, lng=%s", lat, lng
                        )
                        return lat, lng  # Still return, might be valid
                else:
                    logger.warning("Invalid coordinates parsed: lat=%s, lng=%s", lat, lng)
        
        return None, None
