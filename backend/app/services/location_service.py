"""Resolve a citizen's captured location to a parliamentary constituency.

Primary path: an explicit constituency_id chosen via the State -> Constituency
picker on the portal. Fallback: nearest constituency centroid to the given
lat/long.
"""

from typing import Optional
from sqlalchemy.orm import Session
from app.db.models.constituency import Constituency


class LocationService:
    def __init__(self, db: Session, geo_srv=None):
        self.db = db
        # Dependency Inversion Principle (DIP)
        if geo_srv is None:
            from app.services.geo_service import GeoService

            self.geo_service = GeoService(self.db)
        else:
            self.geo_service = geo_srv

    def resolve_constituency(
        self,
        constituency_id: Optional[int] = None,
        latitude: Optional[float] = None,
        longitude: Optional[float] = None,
    ) -> Optional[int]:
        # 1. Explicit selection wins.
        if constituency_id is not None:
            exists = (
                self.db.query(Constituency.id)
                .filter(Constituency.id == constituency_id)
                .first()
            )
            if exists:
                return constituency_id

        # 2. Precise GPS -> constituency via boundary point-in-polygon.
        if latitude is not None and longitude is not None:
            located = self.geo_service.locate_constituency_id(latitude, longitude)
            if located:
                return located

        return None
