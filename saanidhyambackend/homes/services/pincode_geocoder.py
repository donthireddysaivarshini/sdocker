import requests
import logging

logger = logging.getLogger('homes')


class PincodeGeocoder:
    """Geocode Indian pincodes to lat/lng"""
    
    @staticmethod
    def get_coordinates(pincode):
        """
        Get coordinates for Indian pincode
        Returns: (latitude, longitude, city, state) or (None, None, None, None)
        """
        try:
            # Using Nominatim (OpenStreetMap)
            url = f"https://nominatim.openstreetmap.org/search"
            params = {
                'postalcode': pincode,
                'country': 'India',
                'format': 'json',
                'limit': 1
            }
            headers = {
                'User-Agent': 'OldAgeHomeSearch/1.0'
            }
            
            response = requests.get(url, params=params, headers=headers, timeout=5)
            
            if response.status_code == 200:
                data = response.json()
                if data and len(data) > 0:
                    result = data[0]
                    lat = float(result['lat'])
                    lon = float(result['lon'])
                    
                    # Extract city/state from display_name
                    display = result.get('display_name', '')
                    parts = display.split(',')
                    city = parts[0].strip() if len(parts) > 0 else ''
                    state = parts[-2].strip() if len(parts) > 1 else ''
                    
                    logger.info(f"Pincode {pincode} geocoded to ({lat}, {lon})")
                    return lat, lon, city, state
            
            return None, None, None, None
            
        except Exception as e:
            logger.error(f"Pincode geocoding error: {str(e)}")
            return None, None, None, None
