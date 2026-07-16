import uuid
from app.db.base import Base  # noqa: F401
from app.db.session import SessionLocal
from app.db.models.suggestion import Suggestion
from app.db.models.ward import Ward
from app.db.models.constituency import Constituency
from app.db.models.assembly_constituency import AssemblyConstituency

DUMMY_ISSUES = [
    {
        "id": "s_mock_1",
        "content": "Major drainage overflow causing contamination near main road.",
        "category": "Sanitation",
        "priority_score": 92,
        "status": "Resolved",
        "dispatch_status": "Resolved",
        "latitude": 12.973,
        "longitude": 77.593,
        "image_url": "/images/bfr_aft/bfr6.webp"
    },
    {
        "id": "s_mock_2",
        "content": "Dumped garbage and broken park benches in community footpath.",
        "category": "Public Spaces",
        "priority_score": 45,
        "status": "Resolved",
        "dispatch_status": "Resolved",
        "latitude": 12.970,
        "longitude": 77.596,
        "image_url": "/images/bfr_aft/bfr2.jpg"
    },
    {
        "id": "s_mock_3",
        "content": "Hanging loose electrical wires posing hazard near apartment entrance.",
        "category": "Electricity",
        "priority_score": 88,
        "status": "Resolved",
        "dispatch_status": "Resolved",
        "latitude": 12.974,
        "longitude": 77.592,
        "image_url": "/images/bfr_aft/bfr8.webp"
    },
    {
        "id": "s_mock_4",
        "content": "Deep potholes on the main junction leading to major traffic congestion.",
        "category": "Roads",
        "priority_score": 79,
        "status": "Resolved",
        "dispatch_status": "Resolved",  
        "latitude": 12.976,
        "longitude": 77.597,
        "image_url": "/images/bfr_aft/bfr9.webp"
    },
    {
        "id": "s_mock_5",
        "content": "Garbage pile-up near commercial market blocking public walkway.",
        "category": "Sanitation",
        "priority_score": 65,
        "status": "Resolved",
        "dispatch_status": "Resolved",
        "latitude": 12.971,
        "longitude": 77.594,
        "image_url": "/images/bfr_aft/bfr5.jpg"
    },
    {
        "id": "s2",
        "content": "Street lights are completely off on 4th cross road, unsafe for women walking home.",
        "category": "Safety",
        "priority_score": 85,
        "status": "Resolved",
        "dispatch_status": "Resolved",
        "latitude": 12.975,
        "longitude": 77.591,
        "image_url": "/images/bfr_aft/bfr7.webp"
    },
    {
        "id": "s_mock_6",
        "content": "Piled up garbage since one week, causing sanitation issue",
        "category": "Sanitation",
        "priority_score": 80,
        "status": "Resolved",
        "dispatch_status": "Resolved",
        "latitude": 12.9725,
        "longitude": 77.6015,
        "image_url": "/images/bfr_aft/bfr1.jpg"
    }
]

def main():
    db = SessionLocal()
    try:
        # Resolve Bangalore Central constituency (P. C. Mohan)
        pc = db.query(Constituency).filter(Constituency.name.like("%Bangalore Central%")).first()
        pc_id = pc.id if pc else 189

        # Map AC names to IDs dynamically or use hardcoded IDs
        ac_names_ids = [
            ("Mahadevapura", 166),
            ("Sarvagnanagar", 174),
            ("Rajaji Nagar", 183),
            ("Shanti Nagar", 185),
            ("Chamrajpet", 187)
        ]
        ac_map = {}
        for name, ac_id in ac_names_ids:
            ac_obj = db.query(AssemblyConstituency).filter(AssemblyConstituency.name.like(f"%{name}%")).first()
            ac_map[name] = ac_obj.id if ac_obj else ac_id

        # Route specific dummy issues
        issue_routing = {
            "s_mock_1": {"ac": "Mahadevapura", "ward": 1},
            "s_mock_2": {"ac": "Sarvagnanagar", "ward": 2},
            "s_mock_3": {"ac": "Rajaji Nagar", "ward": 3},
            "s_mock_4": {"ac": "Shanti Nagar", "ward": 4},
            "s_mock_5": {"ac": "Chamrajpet", "ward": 2},
            "s2":       {"ac": "Sarvagnanagar", "ward": 3},
            "s_mock_6": {"ac": "Shanti Nagar", "ward": 1}
        }

        added_count = 0
        updated_count = 0

        for data in DUMMY_ISSUES:
            routing = issue_routing.get(data["id"], {"ac": "Sarvagnanagar", "ward": 1})
            resolved_ac_id = ac_map.get(routing["ac"])
            resolved_ward_id = routing["ward"]

            existing = db.query(Suggestion).filter(Suggestion.id == data["id"]).first()
            if existing:
                # Update existing dummy issue
                existing.content = data["content"]
                existing.english_translation = data["content"]
                existing.category = data["category"]
                existing.priority_score = data["priority_score"]
                existing.status = data["status"]
                existing.dispatch_status = data["dispatch_status"]
                existing.latitude = data["latitude"]
                existing.longitude = data["longitude"]
                existing.image_url = data["image_url"]
                existing.ward_id = resolved_ward_id
                existing.constituency_id = pc_id
                existing.assembly_constituency_id = resolved_ac_id
                updated_count += 1
            else:
                # Create new dummy issue
                issue = Suggestion(
                    id=data["id"],
                    citizen_phone="+919999999999",
                    content=data["content"],
                    english_translation=data["content"],
                    language_code="en",
                    category=data["category"],
                    priority_score=data["priority_score"],
                    status=data["status"],
                    dispatch_status=data["dispatch_status"],
                    latitude=data["latitude"],
                    longitude=data["longitude"],
                    image_url=data["image_url"],
                    ward_id=resolved_ward_id,
                    constituency_id=pc_id,
                    assembly_constituency_id=resolved_ac_id
                )
                db.add(issue)
                added_count += 1

        db.commit()
        print(f"[seed_dummy_issues] Added {added_count} and updated {updated_count} dummy issues in database.")
    except Exception as e:
        db.rollback()
        print(f"[seed_dummy_issues] Error seeding dummy issues: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    main()
